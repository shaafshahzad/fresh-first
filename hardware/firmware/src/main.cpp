#include <Arduino.h>
#include <ArduinoJson.h>
#include <Fonts/FreeMonoBold24pt7b.h>
#include <GxEPD2_BW.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <SPI.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <esp_sleep.h>
#include <time.h>

#include "app_config.h"
#include "layout_geometry.h"
#include "root_ca.h"

#if __has_include("device_secrets.h")
#include "device_secrets.h"
#define FRESH_FIRST_PROVISIONED 1
#else
namespace device_secrets {
static constexpr char kDeviceId[] = "";
static constexpr char kDeviceSecret[] = "";
}  // namespace device_secrets
#define FRESH_FIRST_PROVISIONED 0
#endif

using app_config::pins::kBusy;
using app_config::pins::kChipSelect;
using app_config::pins::kClock;
using app_config::pins::kDataCommand;
using app_config::pins::kDataIn;
using app_config::pins::kReset;

// Waveshare's current monochrome 4.2-inch V2 panel uses the SSD1683 controller.
GxEPD2_BW<GxEPD2_420_GDEY042T81, GxEPD2_420_GDEY042T81::HEIGHT> display(
    GxEPD2_420_GDEY042T81(kChipSelect, kDataCommand, kReset, kBusy));
Preferences preferences;

static_assert(app_config::kMaximumItems == display_layout::kFridgeMaximumRows,
              "Feed capacity must match the number of rendered rows");

struct DisplayItem {
  String name;
  String expiresOn;
  String tone;
  int days = 0;
  bool hasDays = false;
};

struct FridgeFeed {
  String name;
  DisplayItem items[app_config::kMaximumItems];
  uint8_t itemCount = 0;
  uint32_t hiddenItemCount = 0;
  uint32_t refreshAfterSeconds = app_config::kDefaultRefreshSeconds;
};

void drawCentered(const String& text, int16_t y, uint8_t size) {
  int16_t boundsX = 0;
  int16_t boundsY = 0;
  uint16_t boundsWidth = 0;
  uint16_t boundsHeight = 0;
  display.setTextSize(size);
  display.getTextBounds(
      text, 0, y, &boundsX, &boundsY, &boundsWidth, &boundsHeight);
  display.setCursor((display.width() - boundsWidth) / 2, y);
  display.print(text);
}

void drawCenteredInRect(const String& text, const LayoutRect& rect,
                        uint8_t size) {
  int16_t boundsX = 0;
  int16_t boundsY = 0;
  uint16_t boundsWidth = 0;
  uint16_t boundsHeight = 0;
  display.setTextSize(size);
  display.getTextBounds(
      text, 0, 0, &boundsX, &boundsY, &boundsWidth, &boundsHeight);
  const LayoutPoint cursor = centeredTextOrigin(
      rect, {boundsX, boundsY, boundsWidth, boundsHeight});
  display.setCursor(cursor.x, cursor.y);
  display.print(text);
}

String clipped(const String& text, size_t maximumCharacters) {
  if (text.length() <= maximumCharacters) return text;
  if (maximumCharacters <= 3) return text.substring(0, maximumCharacters);
  return text.substring(0, maximumCharacters - 3) + "...";
}

void beginFrame(bool clearBeforeDrawing) {
  SPI.begin(kClock, -1, kDataIn, kChipSelect);
  display.init(0, true, 2, false);
  display.setRotation(0);
  if (clearBeforeDrawing) {
    Serial.println("Screen layout changed; clearing the panel before redraw.");
    display.clearScreen();
    display.epd2.refresh(false);
  }
  display.setFullWindow();
  display.firstPage();
}

template <typename DrawFunction>
void renderScreen(const String& screenKey, DrawFunction draw) {
  const String versionedKey = String(app_config::kScreenLayoutVersion) + ":" + screenKey;
  const String previousKey = preferences.getString("screen", "");
  if (previousKey == versionedKey) {
    Serial.println("Display content is unchanged; skipping e-paper refresh.");
    return;
  }

  const String layoutPrefix = String(app_config::kScreenLayoutVersion) + ":";
  beginFrame(!previousKey.startsWith(layoutPrefix));
  do {
    display.fillScreen(GxEPD_WHITE);
    display.setTextColor(GxEPD_BLACK);
    draw();
  } while (display.nextPage());
  display.hibernate();
  preferences.putString("screen", versionedKey);
}

void drawHeader(const String& label) {
  display.setTextSize(2);
  display.setCursor(12, display_layout::kHeaderTitleY);
  display.print("FRESH FIRST");
  display.setTextSize(1);
  const String right = clipped(label, 22);
  const int16_t desiredX = display.width() - 12 - static_cast<int16_t>(right.length() * 6);
  display.setCursor(desiredX > 210 ? desiredX : 210,
                    display_layout::kHeaderLabelY);
  display.print(right);
  display.drawFastHLine(12, display_layout::kHeaderDividerY,
                        display.width() - 24, GxEPD_BLACK);
}

void showWifiSetup(const String& accessPointName) {
  renderScreen("wifi:" + accessPointName, [&]() {
    drawHeader("SETUP");
    drawCentered("CONNECT TO WI-FI", 78, 3);
    drawCentered("On your phone, join:", 120, 2);
    const LayoutRect networkBox{38, 142,
                                static_cast<int16_t>(display.width() - 76), 48};
    display.fillRoundRect(networkBox.x, networkBox.y, networkBox.width,
                          networkBox.height, 6, GxEPD_BLACK);
    display.setTextColor(GxEPD_WHITE);
    drawCenteredInRect(accessPointName, networkBox, 2);
    display.setTextColor(GxEPD_BLACK);
    drawCentered("Choose your home Wi-Fi", 226, 2);
    drawCentered("in the page that opens.", 252, 2);
  });
}

void showPairing(const String& code) {
  renderScreen("pair:" + code, [&]() {
    drawHeader("PAIR DISPLAY");
    drawCentered("YOUR PAIRING CODE", 76, 2);
    const LayoutRect codeBox{62, 101,
                             static_cast<int16_t>(display.width() - 124), 64};
    display.fillRoundRect(codeBox.x, codeBox.y, codeBox.width, codeBox.height,
                          7, GxEPD_BLACK);
    display.setTextColor(GxEPD_WHITE);
    display.setFont(&FreeMonoBold24pt7b);
    drawCenteredInRect(code, codeBox, 1);
    display.setFont(nullptr);
    display.setTextColor(GxEPD_BLACK);
    drawCentered("Tap the NFC tag", 205, 2);
    drawCentered("Sign in, then enter this code", 235, 2);
    drawCentered("This screen updates automatically", 274, 1);
  });
}

String timingLabel(const DisplayItem& item) {
  if (!item.hasDays) return "--";
  if (item.days < 0) return "PAST";
  if (item.days == 0) return "TODAY";
  if (item.days == 1) return "1 DAY";
  if (item.days > 99) return item.expiresOn.substring(5);
  return String(item.days) + " DAYS";
}

void showFridge(const FridgeFeed& feed, const String& etag) {
  renderScreen("fridge:" + etag, [&]() {
    drawHeader(feed.name);
    if (feed.itemCount == 0) {
      drawCentered("YOUR FRIDGE IS EMPTY", 130, 2);
      drawCentered("Add an item from your phone", 170, 2);
      drawCentered("and it will appear here.", 196, 2);
      return;
    }

    for (uint8_t index = 0; index < feed.itemCount; index += 1) {
      const DisplayItem& item = feed.items[index];
      const int16_t top = display_layout::kFridgeRowStartY
          + index * display_layout::kFridgeRowStride;
      const int16_t textY = top + 4;
      const bool urgent = item.tone == "expired" || item.tone == "urgent";
      const bool warning = item.tone == "soon" || item.tone == "warning";
      const String timing = timingLabel(item);

      if (urgent) {
        display.fillRect(8, top, display.width() - 16,
                         display_layout::kFridgeRowHeight, GxEPD_BLACK);
        display.setTextColor(GxEPD_WHITE);
      } else {
        display.setTextColor(GxEPD_BLACK);
        display.drawFastHLine(8, top + display_layout::kFridgeRowHeight,
                              display.width() - 16, GxEPD_BLACK);
      }

      display.setTextSize(2);
      display.setCursor(14, textY);
      display.print(warning ? "! " : "  ");
      display.print(clipped(item.name, 18));

      const int16_t timingX = display.width() - 14 - timing.length() * 12;
      display.fillRect(timingX - 4, top + 2, timing.length() * 12 + 8, 19,
                       urgent ? GxEPD_BLACK : GxEPD_WHITE);
      display.setCursor(timingX, textY);
      display.print(timing);
      display.setTextColor(GxEPD_BLACK);
    }

    if (feed.hiddenItemCount > 0) {
      display.drawFastHLine(8, display_layout::kFridgeFooterDividerY,
                            display.width() - 16, GxEPD_BLACK);
      drawCentered("+ " + String(feed.hiddenItemCount) + " MORE - TAP NFC",
                   display_layout::kFridgeFooterTextY, 1);
    }
  });
}

void showError(const String& title, const String& detail, const String& key) {
  renderScreen("error:" + key, [&]() {
    drawHeader("RETRYING");
    drawCentered(clipped(title, 22), 116, 3);
    drawCentered(clipped(detail, 34), 164, 2);
    drawCentered("Fresh First will try again", 218, 2);
    drawCentered("automatically.", 244, 2);
  });
}

#if FRESH_FIRST_DISPLAY_DIAGNOSTIC
void showDisplayDiagnostic() {
  Serial.println("Drawing uncached display diagnostic.");
  beginFrame(true);
  do {
    display.fillScreen(GxEPD_WHITE);
    display.drawRect(4, 4, display.width() - 8, display.height() - 8,
                     GxEPD_BLACK);
    display.fillRect(18, 18, display.width() - 36, 64, GxEPD_BLACK);
    display.setTextColor(GxEPD_WHITE);
    display.setFont(&FreeMonoBold24pt7b);
    drawCenteredInRect("TEST 2468",
                       {18, 18, static_cast<int16_t>(display.width() - 36), 64},
                       1);
    display.setFont(nullptr);
    display.setTextColor(GxEPD_BLACK);
    drawCentered("FULL PANEL REDRAW", 118, 3);
    drawCentered("TOP", 165, 2);
    drawCentered("MIDDLE", 210, 2);
    drawCentered("BOTTOM " + String(app_config::kFirmwareVersion), 266, 2);
  } while (display.nextPage());
  display.hibernate();
  Serial.println("Display diagnostic finished.");
}
#endif

void sleepFor(uint32_t seconds) {
  const uint32_t boundedSeconds = constrain(seconds, 15U, 24U * 60U * 60U);
  Serial.printf("Sleeping for %lu seconds.\n",
                static_cast<unsigned long>(boundedSeconds));
  Serial.flush();
  WiFi.mode(WIFI_OFF);
  esp_sleep_enable_timer_wakeup(static_cast<uint64_t>(boundedSeconds) * 1000000ULL);
  esp_deep_sleep_start();
}

String wifiAccessPointName() {
  String suffix = device_secrets::kDeviceId;
  if (suffix.length() >= 4) suffix = suffix.substring(suffix.length() - 4);
  if (suffix.isEmpty()) {
    suffix = String(static_cast<uint32_t>(ESP.getEfuseMac()), HEX);
    const int start = suffix.length() > 4 ? suffix.length() - 4 : 0;
    suffix = suffix.substring(start);
    suffix.toUpperCase();
  }
  return "Fresh First " + suffix;
}

void wifiPortalStarted(WiFiManager* manager) {
  showWifiSetup(manager->getConfigPortalSSID());
}

bool connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFiManager manager;
  manager.setAPCallback(wifiPortalStarted);
  manager.setConnectTimeout(20);
  manager.setConfigPortalTimeout(app_config::kWifiPortalTimeoutSeconds);
  manager.setWiFiAutoReconnect(true);
  const String accessPointName = wifiAccessPointName();
  return manager.autoConnect(accessPointName.c_str());
}

bool syncClock() {
  configTime(0, 0, "time.google.com", "pool.ntp.org", "time.cloudflare.com");
  const uint32_t startedAt = millis();
  while (time(nullptr) < 1700000000
         && millis() - startedAt < app_config::kClockSyncTimeoutMs) {
    delay(250);
  }
  return time(nullptr) >= 1700000000;
}

void parseFridgeFeed(JsonDocument& document, FridgeFeed& feed) {
  feed.name = String(document["fridge"]["name"] | "My fridge");
  feed.hiddenItemCount = document["hiddenItemCount"] | 0;
  feed.refreshAfterSeconds = document["refreshAfterSeconds"]
      | app_config::kDefaultRefreshSeconds;

  JsonArrayConst items = document["items"].as<JsonArrayConst>();
  for (JsonObjectConst item : items) {
    if (feed.itemCount >= app_config::kMaximumItems) break;
    DisplayItem& destination = feed.items[feed.itemCount++];
    destination.name = String(item["name"] | "Item");
    destination.expiresOn = String(item["expiresOn"] | "");
    destination.tone = String(item["tone"] | "later");
    destination.hasDays = !item["days"].isNull();
    destination.days = item["days"] | 0;
  }
}

void fetchDisplayFeed() {
  WiFiClientSecure client;
  client.setCACert(kRootCa);
  HTTPClient request;
  const String url = String(app_config::kApiBaseUrl) + "/api/device/"
      + device_secrets::kDeviceId + "/feed";
  const char* responseHeaders[] = {"ETag", "X-Refresh-After"};

  request.collectHeaders(responseHeaders, 2);
  request.setConnectTimeout(15000);
  request.setTimeout(15000);
  request.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  if (!request.begin(client, url)) {
    showError("CAN'T REACH APP", "Connection could not start", "begin");
    sleepFor(app_config::kErrorRefreshSeconds);
  }

  request.addHeader("Authorization", "Bearer " + String(device_secrets::kDeviceSecret));
  request.addHeader("X-Firmware-Version", app_config::kFirmwareVersion);

  const String etag = preferences.getString("etag", "");
  const String pairingCode = preferences.getString("pairCode", "");
  if (!etag.isEmpty()) request.addHeader("If-None-Match", etag);
  if (!pairingCode.isEmpty()) request.addHeader("X-Pairing-Code", pairingCode);

  const int status = request.GET();
  Serial.printf("Feed returned HTTP %d.\n", status);
  if (status == HTTP_CODE_NOT_MODIFIED) {
    const uint32_t refresh = request.header("X-Refresh-After").toInt();
    request.end();
    sleepFor(refresh > 0 ? refresh : app_config::kDefaultRefreshSeconds);
  }

  if (status != HTTP_CODE_OK) {
    request.end();
    showError("SYNC FAILED", "The app returned an error", String(status));
    sleepFor(app_config::kErrorRefreshSeconds);
  }

  const String payload = request.getString();
  const String responseEtag = request.header("ETag");
  request.end();

  JsonDocument document;
  const DeserializationError error = deserializeJson(document, payload);
  if (error) {
    Serial.printf("JSON parsing failed: %s\n", error.c_str());
    showError("SYNC FAILED", "The response was unreadable", "json");
    sleepFor(app_config::kErrorRefreshSeconds);
  }

  const String mode = String(document["mode"] | "");
  if (mode == "pairing") {
    const String code = String(document["pairingCode"] | "");
    if (code.isEmpty()) {
      showError("PAIRING FAILED", "No pairing code received", "pairing");
      sleepFor(app_config::kErrorRefreshSeconds);
    }
    preferences.putString("pairCode", code);
    preferences.remove("etag");
    showPairing(code);
    sleepFor(document["refreshAfterSeconds"] | app_config::kPairingRefreshSeconds);
  }

  if (mode == "fridge") {
    FridgeFeed feed;
    parseFridgeFeed(document, feed);
    const String screenEtag = responseEtag.isEmpty()
        ? String(document["generatedAt"] | "updated")
        : responseEtag;
    showFridge(feed, screenEtag);
    preferences.remove("pairCode");
    if (!responseEtag.isEmpty()) preferences.putString("etag", responseEtag);
    sleepFor(feed.refreshAfterSeconds);
  }

  showError("SYNC FAILED", "Unknown display response", "mode");
  sleepFor(app_config::kErrorRefreshSeconds);
}

void setup() {
  Serial.begin(115200);
  delay(250);
  Serial.printf("Fresh First firmware %s starting.\n", app_config::kFirmwareVersion);
  preferences.begin("freshfirst", false);

#if FRESH_FIRST_DISPLAY_DIAGNOSTIC
  showDisplayDiagnostic();
  while (true) delay(1000);
#endif

#if !FRESH_FIRST_PROVISIONED
  showError("NOT PROVISIONED", "Add device_secrets.h", "unprovisioned");
  sleepFor(60 * 60);
#endif

  if (!connectWifi()) {
    showError("WI-FI NOT SET", "Setup portal timed out", "wifi");
    sleepFor(app_config::kErrorRefreshSeconds);
  }

  Serial.print("Wi-Fi connected. IP: ");
  Serial.println(WiFi.localIP());
  if (!syncClock()) {
    showError("CLOCK NOT READY", "Secure sync could not start", "clock");
    sleepFor(app_config::kErrorRefreshSeconds);
  }

  fetchDisplayFeed();
}

void loop() {
  delay(1000);
}
