#pragma once

// Copy this file to device_secrets.h only for manual development builds.
// Production units should use `bun run device:provision -- --firmware-header`.
namespace device_secrets {
static constexpr char kDeviceId[] = "FF-XXXXXXXX";
static constexpr char kDeviceSecret[] = "replace-with-a-provisioned-secret";
}  // namespace device_secrets
