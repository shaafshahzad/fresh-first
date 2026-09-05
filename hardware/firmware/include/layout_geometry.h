#pragma once

#include <stdint.h>

struct LayoutRect {
  int16_t x;
  int16_t y;
  int16_t width;
  int16_t height;
};

struct TextBounds {
  int16_t x;
  int16_t y;
  uint16_t width;
  uint16_t height;
};

struct LayoutPoint {
  int16_t x;
  int16_t y;
};

namespace display_layout {
static constexpr int16_t kHeaderTitleY = 10;
static constexpr int16_t kHeaderTitleHeight = 16;
static constexpr int16_t kHeaderLabelY = 14;
static constexpr uint8_t kHeaderLeftMaxCharacters = 15;
static constexpr uint8_t kHeaderRightMaxCharacters = 22;
static constexpr int16_t kHeaderRightMinimumX = 210;
static constexpr int16_t kHeaderDividerY = 34;
static constexpr int16_t kFridgeRowStartY = 42;
static constexpr int16_t kFridgeRowHeight = 23;
static constexpr int16_t kFridgeRowStride = 25;
static constexpr uint8_t kFridgeMaximumRows = 9;
static constexpr int16_t kFridgeFooterDividerY = 272;
static constexpr int16_t kFridgeFooterTextY = 281;
static constexpr int16_t kFridgeFooterTextHeight = 8;
static constexpr int16_t kScreenHeight = 300;

static_assert(kHeaderTitleY + kHeaderTitleHeight < kHeaderDividerY,
              "Header title must not intersect its divider");
static_assert(kFridgeRowStartY
                  + (kFridgeMaximumRows - 1) * kFridgeRowStride
                  + kFridgeRowHeight
              < kFridgeFooterDividerY,
              "Fridge rows must not intersect the overflow footer");
static_assert(kFridgeFooterTextY + kFridgeFooterTextHeight <= kScreenHeight,
              "Overflow footer must fit on the display");
}  // namespace display_layout

inline LayoutPoint centeredTextOrigin(const LayoutRect& rect,
                                      const TextBounds& bounds) {
  return {
      static_cast<int16_t>(rect.x + (rect.width - bounds.width) / 2 - bounds.x),
      static_cast<int16_t>(rect.y + (rect.height - bounds.height) / 2 - bounds.y),
  };
}
