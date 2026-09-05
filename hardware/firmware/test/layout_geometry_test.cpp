#include <assert.h>

#include "layout_geometry.h"

void assertContained(const LayoutRect& rect, const TextBounds& bounds,
                     const LayoutPoint& cursor) {
  const int16_t left = cursor.x + bounds.x;
  const int16_t top = cursor.y + bounds.y;
  assert(left >= rect.x);
  assert(top >= rect.y);
  assert(left + bounds.width <= rect.x + rect.width);
  assert(top + bounds.height <= rect.y + rect.height);
}

int main() {
  assert(display_layout::kHeaderTitleY + display_layout::kHeaderTitleHeight <
         display_layout::kHeaderDividerY);
  assert(12 + display_layout::kHeaderLeftMaxCharacters * 12 <
         display_layout::kHeaderRightMinimumX);
  assert(display_layout::kHeaderRightMinimumX
             + display_layout::kHeaderRightMaxCharacters * 6
         <= 400);
  assert(display_layout::kFridgeRowStartY
             + (display_layout::kFridgeMaximumRows - 1)
                   * display_layout::kFridgeRowStride
             + display_layout::kFridgeRowHeight
         < display_layout::kFridgeFooterDividerY);
  assert(display_layout::kFridgeFooterTextY
             + display_layout::kFridgeFooterTextHeight
         <= display_layout::kScreenHeight);

  const LayoutRect pairingBox{62, 101, 276, 64};
  const TextBounds pairingCode{0, 0, 216, 32};
  const LayoutPoint pairingCursor = centeredTextOrigin(pairingBox, pairingCode);
  assert(pairingCursor.y == 117);
  assertContained(pairingBox, pairingCode, pairingCursor);

  const LayoutRect wifiBox{38, 142, 324, 48};
  const TextBounds wifiName{0, 0, 192, 16};
  assertContained(wifiBox, wifiName, centeredTextOrigin(wifiBox, wifiName));

  const LayoutRect fridgeRow{8, 42, 384, 23};
  const TextBounds rowText{0, 0, 216, 16};
  assertContained(fridgeRow, rowText, centeredTextOrigin(fridgeRow, rowText));
}
