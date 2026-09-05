#pragma once

#include <Arduino.h>

namespace app_config {
static constexpr char kApiBaseUrl[] = "https://fresh-first.vercel.app";
static constexpr char kFirmwareVersion[] = "0.2.6";
static constexpr char kScreenLayoutVersion[] = "8";

static constexpr uint32_t kDefaultRefreshSeconds = 15 * 60;
static constexpr uint32_t kPairingRefreshSeconds = 30;
static constexpr uint32_t kErrorRefreshSeconds = 60;
static constexpr uint32_t kWifiPortalTimeoutSeconds = 5 * 60;
static constexpr uint32_t kClockSyncTimeoutMs = 15 * 1000;
static constexpr uint8_t kMaximumItems = 10;

namespace pins {
static constexpr int kBusy = 25;
static constexpr int kReset = 26;
static constexpr int kDataCommand = 27;
static constexpr int kChipSelect = 15;
static constexpr int kClock = 13;
static constexpr int kDataIn = 14;
}  // namespace pins
}  // namespace app_config
