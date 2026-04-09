# ESP32 UGV Firmware

## Зависимости (Arduino Library Manager)

| Библиотека | Автор |
|---|---|
| ESPAsyncWebServer | me-no-dev |
| AsyncTCP | me-no-dev |
| ArduinoJson ≥ 6.x | Benoit Blanchon |
| Adafruit INA226 | Adafruit |
| Adafruit MPU6050 | Adafruit |
| DHT sensor library | Adafruit |
| Adafruit BMP280 | Adafruit |
| TinyGPSPlus | Mikal Hart |
| OneWire | PaulStoffregen |
| DallasTemperature | Miles Burton |

## Настройки платы
- **Board:** ESP32 Dev Module
- **CPU Frequency:** 240 MHz
- **Flash:** 4 MB, Scheme: Default 4MB with spiffs
- **Upload Speed:** 921600

## Подключение

### WiFi
ESP32 создаёт точку доступа:
- SSID: `UGV_Robot`
- Password: `ugv12345`
- IP: `192.168.4.1`
- WebSocket: `ws://192.168.4.1/ws`

### Моторы (L298N × 2)
| Сигнал | ESP32 Pin |
|---|---|
| M1 ENA (PWM) | GPIO 25 |
| M1 IN1/IN2 | GPIO 26, 27 |
| M2 ENB (PWM) | GPIO 14 |
| M2 IN3/IN4 | GPIO 12, 13 |
| M3 ENA (PWM) | GPIO 32 |
| M3 IN1/IN2 | GPIO 33, 15 |
| M4 ENB (PWM) | GPIO 4 |
| M4 IN3/IN4 | GPIO 16, 17 |

### Датчики
| Датчик | Интерфейс | Pin |
|---|---|---|
| INA226 (ток/напряжение) | I2C (SDA/SCL) | GPIO 21/22 |
| MPU6050 (IMU) | I2C | GPIO 21/22 |
| BMP280 (давление) | I2C (addr 0x76) | GPIO 21/22 |
| DHT22 (темп/влажность) | 1-Wire | GPIO 21 |
| DS18B20 × 4 (темп моторов) | OneWire | GPIO 22 |
| HC-SR04 FRONT | Trig/Echo | GPIO 5/18 |
| HC-SR04 BACK | Trig/Echo | GPIO 19/23 |
| HC-SR04 LEFT | Trig/Echo | GPIO 2/0 |
| HC-SR04 RIGHT | Trig/Echo | GPIO 35/36 |
| NEO-6M GPS | UART2 RX/TX | GPIO 16/17 |
| ACS712 (ток моторов) | ADC | GPIO 34 |

> ⚠ Пины GPIO 16/17 используются и для M4, и для GPS — **выбери другие пины** под свою плату!

## Протокол WebSocket

### Telemetry → браузер (каждые 200 мс)
```json
{
  "battery_v": 12.4,
  "battery_pct": 85.0,
  "current_a": 1.23,
  "temp_motors": [42.1, 38.5, 40.2, 39.8],
  "imu": { "roll": 1.2, "pitch": 0.5, "yaw": 0.01 },
  "env": { "temp": 22.3, "humidity": 55.1, "pressure": 1013.2 },
  "gps": { "lat": 51.50012, "lng": 31.30045, "speed": 2.1 },
  "obstacles": { "front": 120, "back": -1, "left": 45, "right": 200 }
}
```

### Команды браузер → ESP32
```json
{ "cmd": "move", "vx": 0.5, "vy": 0.0, "omega": 0.1 }
{ "cmd": "stop" }
{ "cmd": "mission", "waypoints": [{"lat": 51.5001, "lng": 31.3004}] }
{ "cmd": "ping" }   // ответ: { "type": "pong" }
```
