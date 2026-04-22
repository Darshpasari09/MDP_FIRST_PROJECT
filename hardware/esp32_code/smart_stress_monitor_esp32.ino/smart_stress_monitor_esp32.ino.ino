#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h" // Essential for stable pulse detection

MAX30105 particleSensor;

/* -------- WiFi Config -------- */
const char* ssid = "free ka net";
const char* password = "123456789";

/* -------- Server Config -------- */
const char* serverName = "http://10.124.224.21:8000/api/v1/readings";

/* -------- Hardware Pins -------- */
const int tempPin = 4; // LM35 Middle Pin

/* -------- Heart Rate Variables -------- */
const byte RATE_SIZE = 4; 
byte rates[RATE_SIZE]; 
byte rateSpot = 0;
long lastBeat = 0; 
float beatsPerMinute;
int beatAvg = 0;

/* -------- Timing Variables -------- */
unsigned long lastSend = 0;
const unsigned long sendInterval = 2000; // Send data every 2 seconds

/* -------- Temperature Function -------- */
float getTemperature() {
  // Use a larger sample size (100) to stop the jumping values
  long sum = 0;
  for(int i = 0; i < 100; i++) {
    sum += analogRead(tempPin);
    delay(1);
  }
  float rawADC = sum / 100.0;

  /* CALIBRATION: 
   * ESP32 ADCs often read low. If your room is 25C but code says 17C, 
   * change 3600.0 to 3900.0 until the room temperature matches.
   */
  float millivolts = (rawADC / 4095.0) * 4800.0; 
  return millivolts / 10.0;
}

/* -------- Server Upload Function -------- */
void sendToServer(int bpmVal, float tempVal) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverName);
    http.addHeader("Content-Type", "application/json");

    String jsonPayload = "{\"bpm\":" + String(bpmVal) + 
                         ",\"temperature\":" + String(tempVal, 2) + "}";

    int httpResponse = http.POST(jsonPayload);
    
    Serial.print("Data Sent. Server Response: ");
    Serial.println(httpResponse);
    
    http.end();
  } else {
    // Serial.println("WiFi Disconnected. Reconnecting...");
    WiFi.begin(ssid, password);
  }
}

void setup() {
  Serial.begin(115200);
  
  // WiFi Init
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");
  pinMode(tempPin, INPUT);
  // I2C Init (SDA: 21, SCL: 19)
  Wire.begin(21, 19);

  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 was not found. Check wiring/I2C address.");
    while (1);
  }

  // Sensor Settings
  particleSensor.setup(); 
  particleSensor.setPulseAmplitudeRed(0x0A); // Low brightness (Red)
  particleSensor.setPulseAmplitudeIR(0x0F);  // Medium brightness (IR)
}

void loop() {
  long irValue = particleSensor.getIR();

  // Step 1: Handle Finger Detection & BPM
  if (irValue < 30000) { 
    // No finger detected: Reset everything to zero immediately
    beatAvg = 0;
    for(byte i = 0; i < RATE_SIZE; i++) rates[i] = 0; 
  } 
  else {
    // Finger is detected: Check for a heartbeat
    if (checkForBeat(irValue) == true) {
      long delta = millis() - lastBeat;
      lastBeat = millis();

      beatsPerMinute = 60 / (delta / 1000.0);

      // Filter out unrealistic values
      if (beatsPerMinute < 255 && beatsPerMinute > 20) {
        rates[rateSpot++] = (byte)beatsPerMinute; 
        rateSpot %= RATE_SIZE;

        // Calculate the rolling average
        beatAvg = 0;
        for (byte x = 0; x < RATE_SIZE; x++) {
          beatAvg += rates[x];
        }
        beatAvg /= RATE_SIZE;
      }
    }
  }

  // Step 2: Periodically Send Data
  if (millis() - lastSend > sendInterval) {
    float currentTemp = getTemperature();
    
    // Print to Serial for debugging
    Serial.print("IR: "); Serial.print(irValue);
    Serial.print(" | Avg BPM: "); Serial.print(beatAvg);
    Serial.print(" | Temp: "); Serial.print(currentTemp);
    Serial.println(" C");

    // Only send if a finger is actually detected AND we have a valid BPM
    if (irValue > 30000 && beatAvg > 0) {
      sendToServer(beatAvg, currentTemp);
    }
    
    lastSend = millis();
  }
}