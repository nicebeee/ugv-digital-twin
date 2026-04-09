/**
 * UGV Digital Twin — ESP32 Firmware
 *
 * Зависимости (Arduino Library Manager):
 *   - ESPAsyncWebServer  (me-no-dev)
 *   - AsyncTCP           (me-no-dev)
 *   - ArduinoJson        >= 6.x
 *   - Adafruit INA226    (Adafruit)
 *   - Adafruit MPU6050   (Adafruit)
 *   - DHT sensor library (Adafruit)
 *   - Adafruit BMP280    (Adafruit)
 *   - TinyGPSPlus        (Mikal Hart)
 *   - OneWire            (PaulStoffregen)
 *   - DallasTemperature  (Miles Burton)
 *
 * Плата: ESP32 Dev Module, CPU 240 MHz, Flash 4MB
 */

#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include <ArduinoJson.h>
#include <Wire.h>

// Sensors
#include <Adafruit_INA226.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <Adafruit_BMP280.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ─────────────────── WiFi ────────────────────────
// Режим AP (Access Point): робот создаёт свою сеть
const char* WIFI_SSID = "UGV_Robot";
const char* WIFI_PASS = "ugv12345";
// Если хочешь подключаться к домашнему роутеру — поменяй режим на STA:
// const char* STA_SSID = "HomeNetwork";
// const char* STA_PASS = "password";

// ─────────────────── Пины двигателей (L298N) ────────────────────────
// Мотор 1 (передний левый)
#define M1_ENA  25
#define M1_IN1  26
#define M1_IN2  27
// Мотор 2 (передний правый)
#define M2_ENB  14
#define M2_IN3  12
#define M2_IN4  13
// Мотор 3 (задний левый)
#define M3_ENA  32
#define M3_IN1  33
#define M3_IN2  15
// Мотор 4 (задний правый)
#define M4_ENB  4
#define M4_IN3  16
#define M4_IN4  17

// PWM каналы
#define PWM_CH_M1  0
#define PWM_CH_M2  1
#define PWM_CH_M3  2
#define PWM_CH_M4  3
#define PWM_FREQ   20000
#define PWM_RES    8

// ─────────────────── Пины датчиков ────────────────────────
#define DHT_PIN     21
#define DHT_TYPE    DHT22
#define DS18B20_PIN 22      // OneWire шина (до 4 датчиков DS18B20)
#define ACS712_PIN  34      // АЦП (ток двигателей, аналоговый)

// HC-SR04 (4 штуки: перед, зад, лево, право)
#define TRIG_FRONT  5   #define ECHO_FRONT  18
#define TRIG_BACK   19  #define ECHO_BACK   23
#define TRIG_LEFT   2   #define ECHO_LEFT   0
#define TRIG_RIGHT  35  #define ECHO_RIGHT  36

// GPS (NEO-6M) — UART2
#define GPS_RX  16  // !!! занято M4, пересмотри пины под свою плату
#define GPS_TX  17

// I2C — INA226, MPU6050, BMP280 на стандартных SDA=21, SCL=22
// !!! DHT и DS18B20 должны быть на других пинах

// ─────────────────── Объекты ────────────────────────
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

Adafruit_INA226 ina226;
Adafruit_MPU6050 mpu;
DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_BMP280 bmp;
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);  // UART2 для GPS
OneWire oneWire(DS18B20_PIN);
DallasTemperature ds18b20(&oneWire);

// ─────────────────── Состояние ────────────────────────
struct MotorCmd {
  float vx = 0, vy = 0, omega = 0;
} motorCmd;

bool missionActive = false;
std::vector<std::pair<double,double>> waypoints;
int waypointIdx = 0;

unsigned long lastTelemetry = 0;
const unsigned long TELEM_INTERVAL = 200; // мс

// ─────────────────── PWM helpers ────────────────────────
void motorSetup() {
  ledcSetup(PWM_CH_M1, PWM_FREQ, PWM_RES);
  ledcSetup(PWM_CH_M2, PWM_FREQ, PWM_RES);
  ledcSetup(PWM_CH_M3, PWM_FREQ, PWM_RES);
  ledcSetup(PWM_CH_M4, PWM_FREQ, PWM_RES);

  ledcAttachPin(M1_ENA, PWM_CH_M1);
  ledcAttachPin(M2_ENB, PWM_CH_M2);
  ledcAttachPin(M3_ENA, PWM_CH_M3);
  ledcAttachPin(M4_ENB, PWM_CH_M4);

  pinMode(M1_IN1, OUTPUT); pinMode(M1_IN2, OUTPUT);
  pinMode(M2_IN3, OUTPUT); pinMode(M2_IN4, OUTPUT);
  pinMode(M3_IN1, OUTPUT); pinMode(M3_IN2, OUTPUT);
  pinMode(M4_IN3, OUTPUT); pinMode(M4_IN4, OUTPUT);
}

// speed: -1.0 … +1.0
void setMotor(int pwmCh, int in1, int in2, float speed) {
  int pwm = (int)(abs(speed) * 255);
  pwm = constrain(pwm, 0, 255);
  if (speed > 0.02f) {
    digitalWrite(in1, HIGH); digitalWrite(in2, LOW);
  } else if (speed < -0.02f) {
    digitalWrite(in1, LOW); digitalWrite(in2, HIGH);
  } else {
    digitalWrite(in1, LOW);  digitalWrite(in2, LOW);
  }
  ledcWrite(pwmCh, pwm);
}

// Дифференциальный привод: vx=вперёд/назад, vy=вправо/влево (tank), omega=поворот
void applyMotorCmd(float vx, float vy, float omega) {
  float fl = vx - vy - omega;
  float fr = vx + vy + omega;
  float rl = vx - vy + omega;
  float rr = vx + vy - omega;

  // Нормализуем
  float maxV = max({abs(fl), abs(fr), abs(rl), abs(rr), 1.0f});
  fl /= maxV; fr /= maxV; rl /= maxV; rr /= maxV;

  setMotor(PWM_CH_M1, M1_IN1, M1_IN2, fl);
  setMotor(PWM_CH_M2, M2_IN3, M2_IN4, fr);
  setMotor(PWM_CH_M3, M3_IN1, M3_IN2, rl);
  setMotor(PWM_CH_M4, M4_IN3, M4_IN4, rr);
}

void stopMotors() {
  applyMotorCmd(0, 0, 0);
}

// ─────────────────── Ultrasonics ────────────────────────
long readUltrasonic(int trig, int echo) {
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long dur = pulseIn(echo, HIGH, 25000); // timeout 25ms
  return dur > 0 ? (dur * 0.034 / 2) : -1; // см
}

void setupUltrasonics() {
  pinMode(TRIG_FRONT, OUTPUT); pinMode(ECHO_FRONT, INPUT);
  pinMode(TRIG_BACK,  OUTPUT); pinMode(ECHO_BACK,  INPUT);
  pinMode(TRIG_LEFT,  OUTPUT); pinMode(ECHO_LEFT,  INPUT);
  pinMode(TRIG_RIGHT, OUTPUT); pinMode(ECHO_RIGHT, INPUT);
}

// ─────────────────── WebSocket handlers ────────────────────────
void handleWsMessage(AsyncWebSocketClient* client, const String& data) {
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, data);
  if (err) return;

  const char* cmd = doc["cmd"];
  if (!cmd) return;

  if (strcmp(cmd, "ping") == 0) {
    client->text("{\"type\":\"pong\"}");
    return;
  }

  if (strcmp(cmd, "move") == 0) {
    missionActive = false;
    motorCmd.vx    = doc["vx"]    | 0.0f;
    motorCmd.vy    = doc["vy"]    | 0.0f;
    motorCmd.omega = doc["omega"] | 0.0f;
    applyMotorCmd(motorCmd.vx, motorCmd.vy, motorCmd.omega);
    return;
  }

  if (strcmp(cmd, "stop") == 0) {
    missionActive = false;
    waypoints.clear();
    stopMotors();
    return;
  }

  if (strcmp(cmd, "mission") == 0) {
    waypoints.clear();
    waypointIdx = 0;
    JsonArray wps = doc["waypoints"].as<JsonArray>();
    for (JsonObject wp : wps) {
      double lat = wp["lat"] | 0.0;
      double lng = wp["lng"] | 0.0;
      waypoints.push_back({lat, lng});
    }
    missionActive = waypoints.size() > 0;
    return;
  }
}

void onWsEvent(AsyncWebSocket* server, AsyncWebSocketClient* client,
               AwsEventType type, void* arg, uint8_t* data, size_t len) {
  if (type == WS_EVT_DATA) {
    AwsFrameInfo* info = (AwsFrameInfo*)arg;
    if (info->final && info->index == 0 && info->len == len) {
      String msg = String((char*)data, len);
      handleWsMessage(client, msg);
    }
  }
}

// ─────────────────── Mission navigation ────────────────────────
// Простой P-регулятор: едет к следующей точке маршрута
void updateMission() {
  if (!missionActive || waypoints.empty()) return;
  if (waypointIdx >= (int)waypoints.size()) {
    missionActive = false;
    stopMotors();
    return;
  }

  if (!gps.location.isValid()) return;

  double targetLat = waypoints[waypointIdx].first;
  double targetLng = waypoints[waypointIdx].second;
  double bearing = TinyGPSPlus::courseTo(gps.location.lat(), gps.location.lng(), targetLat, targetLng);
  double dist    = TinyGPSPlus::distanceBetween(gps.location.lat(), gps.location.lng(), targetLat, targetLng);

  if (dist < 1.5) { // достигли точки (1.5 м)
    waypointIdx++;
    return;
  }

  // Текущий курс из IMU (yaw) — в °
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  // (В реальности нужна магнитная компенсация. Тут упрощённо через gyro yaw)
  // bearing: 0=север, 90=восток
  double err = bearing - 0; // TODO: подключить компас
  float vx    = constrain((float)(dist / 5.0), 0.2f, 0.7f);
  float omega = constrain((float)(err / 90.0), -0.5f, 0.5f);
  applyMotorCmd(vx, 0, omega);
}

// ─────────────────── Telemetry broadcast ────────────────────────
void sendTelemetry() {
  StaticJsonDocument<1024> doc;

  // INA226 — напряжение/ток батареи
  float battV   = ina226.getBusVoltage_V();
  float battPct = constrain((battV - 3.0f * 4) / (4.2f * 4 - 3.0f * 4) * 100.0f, 0, 100);
  float currA   = ina226.getCurrent_mA() / 1000.0f;
  doc["battery_v"]   = serialized(String(battV,   2));
  doc["battery_pct"] = serialized(String(battPct, 1));
  doc["current_a"]   = serialized(String(currA,   3));

  // DS18B20 — температуры моторов
  ds18b20.requestTemperatures();
  JsonArray motorTemps = doc.createNestedArray("temp_motors");
  int devCount = ds18b20.getDeviceCount();
  for (int i = 0; i < devCount && i < 4; i++) {
    motorTemps.add(serialized(String(ds18b20.getTempCByIndex(i), 1)));
  }

  // MPU6050 — IMU
  sensors_event_t accel, gyro, temp;
  mpu.getEvent(&accel, &gyro, &temp);
  JsonObject imu = doc.createNestedObject("imu");
  imu["roll"]  = serialized(String(accel.acceleration.x, 2));
  imu["pitch"] = serialized(String(accel.acceleration.y, 2));
  imu["yaw"]   = serialized(String(gyro.gyro.z * 57.295f, 2)); // рад/с → °/с

  // DHT22 — температура/влажность
  JsonObject env = doc.createNestedObject("env");
  float t = dht.readTemperature(), h = dht.readHumidity();
  env["temp"]     = isnan(t) ? 0.0f : serialized(String(t, 1));
  env["humidity"] = isnan(h) ? 0.0f : serialized(String(h, 1));

  // BMP280 — давление
  env["pressure"] = serialized(String(bmp.readPressure() / 100.0f, 1));

  // GPS
  JsonObject gpsObj = doc.createNestedObject("gps");
  if (gps.location.isValid()) {
    gpsObj["lat"]   = serialized(String(gps.location.lat(), 6));
    gpsObj["lng"]   = serialized(String(gps.location.lng(), 6));
    gpsObj["speed"] = serialized(String(gps.speed.kmph(), 1));
  } else {
    gpsObj["lat"] = 0.0; gpsObj["lng"] = 0.0; gpsObj["speed"] = 0.0;
  }

  // HC-SR04 — препятствия
  JsonObject obs = doc.createNestedObject("obstacles");
  obs["front"] = readUltrasonic(TRIG_FRONT, ECHO_FRONT);
  obs["back"]  = readUltrasonic(TRIG_BACK,  ECHO_BACK);
  obs["left"]  = readUltrasonic(TRIG_LEFT,  ECHO_LEFT);
  obs["right"] = readUltrasonic(TRIG_RIGHT, ECHO_RIGHT);

  String out;
  serializeJson(doc, out);
  ws.textAll(out);
}

// ─────────────────── setup() / loop() ────────────────────────
void setup() {
  Serial.begin(115200);

  motorSetup();
  stopMotors();
  setupUltrasonics();

  Wire.begin();

  // INA226
  if (!ina226.begin()) Serial.println("INA226 не найден");
  else { ina226.setShuntResistor_Ohm(0.1f); ina226.setAveragingCount(INA226_COUNT_16); }

  // MPU6050
  if (!mpu.begin()) Serial.println("MPU6050 не найден");
  else { mpu.setAccelerometerRange(MPU6050_RANGE_8_G); mpu.setGyroRange(MPU6050_RANGE_500_DEG); }

  // DHT22
  dht.begin();

  // BMP280
  if (!bmp.begin(0x76)) Serial.println("BMP280 не найден");

  // DS18B20
  ds18b20.begin();

  // GPS на UART2
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

  // WiFi AP
  WiFi.softAP(WIFI_SSID, WIFI_PASS);
  Serial.print("AP IP: "); Serial.println(WiFi.softAPIP());

  // WebSocket
  ws.onEvent(onWsEvent);
  server.addHandler(&ws);

  // Serve static files if needed (опционально)
  server.on("/", HTTP_GET, [](AsyncWebServerRequest* req) {
    req->send(200, "text/plain", "UGV ESP32 WebSocket Server. Connect via ws://<IP>/ws");
  });

  server.begin();
  Serial.println("WebSocket server started at ws://" + WiFi.softAPIP().toString() + "/ws");
}

void loop() {
  // Читаем GPS
  while (gpsSerial.available()) gps.encode(gpsSerial.read());

  // Автоматический маршрут
  updateMission();

  // Автостоп при препятствии < 20 см спереди
  if (motorCmd.vx > 0) {
    long frontDist = readUltrasonic(TRIG_FRONT, ECHO_FRONT);
    if (frontDist > 0 && frontDist < 20) {
      stopMotors();
      Serial.println("OBSTACLE DETECTED — emergency stop");
    }
  }

  // Телеметрия каждые 200 мс
  unsigned long now = millis();
  if (now - lastTelemetry >= TELEM_INTERVAL) {
    lastTelemetry = now;
    ws.cleanupClients();
    if (ws.count() > 0) sendTelemetry();
  }
}
