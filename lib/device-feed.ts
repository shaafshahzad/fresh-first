export const DISPLAY_ITEM_LIMIT = 9;

export function hiddenDisplayItemCount(totalItems: number, shownItems: number) {
  return Math.max(0, totalItems - shownItems);
}
