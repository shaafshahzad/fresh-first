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
static constexpr int16_t kHeaderDividerY = 34;

static_assert(kHeaderTitleY + kHeaderTitleHeight < kHeaderDividerY,
              "Header title must not intersect its divider");
}  // namespace display_layout

inline LayoutPoint centeredTextOrigin(const LayoutRect& rect,
                                      const TextBounds& bounds) {
  return {
      static_cast<int16_t>(rect.x + (rect.width - bounds.width) / 2 - bounds.x),
      static_cast<int16_t>(rect.y + (rect.height - bounds.height) / 2 - bounds.y),
  };
}
