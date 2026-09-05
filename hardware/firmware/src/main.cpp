#include <Arduino.h>
#include <GxEPD2_BW.h>
#include <SPI.h>

namespace pins {
constexpr int kBusy = 25;
constexpr int kReset = 26;
constexpr int kDataCommand = 27;
constexpr int kChipSelect = 15;
constexpr int kClock = 13;
constexpr int kDataIn = 14;
}  // namespace pins

// Waveshare 4.2-inch V2 uses the SSD1683-compatible 400 x 300 panel driver.
GxEPD2_BW<GxEPD2_420_GDEY042T81, GxEPD2_420_GDEY042T81::HEIGHT> display(
    GxEPD2_420_GDEY042T81(
        pins::kChipSelect,
        pins::kDataCommand,
        pins::kReset,
        pins::kBusy));

void drawCentered(const char* text, int16_t y, uint8_t size) {
  int16_t boundsX = 0;
  int16_t boundsY = 0;
  uint16_t boundsWidth = 0;
  uint16_t boundsHeight = 0;

  display.setTextSize(size);
  display.getTextBounds(
      text,
      0,
      y,
      &boundsX,
      &boundsY,
      &boundsWidth,
      &boundsHeight);
  display.setCursor((display.width() - boundsWidth) / 2, y);
  display.print(text);
}

void drawHardwareTest() {
  display.setRotation(0);
  display.setFullWindow();
  display.firstPage();

  do {
    display.fillScreen(GxEPD_WHITE);
    display.setTextColor(GxEPD_BLACK);

    display.drawRoundRect(8, 8, display.width() - 16, display.height() - 16, 8,
                          GxEPD_BLACK);
    drawCentered("FRESH FIRST", 65, 3);
    display.drawFastHLine(45, 86, display.width() - 90, GxEPD_BLACK);

    drawCentered("DISPLAY CONNECTED", 135, 2);
    drawCentered("ESP32 + E-PAPER ONLINE", 175, 2);

    display.fillCircle(112, 225, 8, GxEPD_BLACK);
    display.setTextSize(2);
    display.setCursor(132, 232);
    display.print("Hardware test passed");
  } while (display.nextPage());
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("Fresh First display test starting...");

  SPI.begin(pins::kClock, -1, pins::kDataIn, pins::kChipSelect);

  // A short reset pulse is required by Waveshare boards with their reset circuit.
  display.init(115200, true, 2, false);
  drawHardwareTest();
  display.hibernate();

  Serial.println("Display updated successfully; panel is now hibernating.");
}

void loop() {
  delay(1000);
}

