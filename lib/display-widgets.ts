export const HEADER_WIDGET_IDS = [
  "brand",
  "fridge_name",
  "next_item",
  "item_count",
  "attention_count",
] as const;

export type HeaderWidgetId = (typeof HEADER_WIDGET_IDS)[number];

export type DisplayHeaderSettings = {
  left: HeaderWidgetId;
  right: HeaderWidgetId;
};

export type DisplayWidgetContext = {
  fridgeName: string;
  nextItemName: string | null;
  itemCount: number;
  attentionCount: number;
};

export type ResolvedDisplayHeader = {
  left: { widget: HeaderWidgetId; text: string };
  right: { widget: HeaderWidgetId; text: string };
};

export const DEFAULT_DISPLAY_HEADER: DisplayHeaderSettings = {
  left: "brand",
  right: "fridge_name",
};

export const HEADER_WIDGET_OPTIONS: ReadonlyArray<{
  id: HeaderWidgetId;
  label: string;
  description: string;
}> = [
  { id: "brand", label: "Fresh First", description: "The Fresh First name" },
  { id: "fridge_name", label: "Fridge name", description: "Your fridge's name" },
  { id: "next_item", label: "Next item", description: "The item expiring first" },
  { id: "item_count", label: "Item count", description: "Everything currently tracked" },
  { id: "attention_count", label: "Needs attention", description: "Items expiring within five days" },
];

export function isHeaderWidgetId(value: unknown): value is HeaderWidgetId {
  return typeof value === "string"
    && HEADER_WIDGET_IDS.includes(value as HeaderWidgetId);
}

export function normalizeDisplayHeader(
  left: unknown,
  right: unknown,
): DisplayHeaderSettings {
  return {
    left: isHeaderWidgetId(left) ? left : DEFAULT_DISPLAY_HEADER.left,
    right: isHeaderWidgetId(right) ? right : DEFAULT_DISPLAY_HEADER.right,
  };
}

function quantity(count: number, singular: string, plural = `${singular}S`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function displayWidgetText(
  widget: HeaderWidgetId,
  context: DisplayWidgetContext,
) {
  switch (widget) {
    case "brand":
      return "FRESH FIRST";
    case "fridge_name":
      return context.fridgeName || "MY FRIDGE";
    case "next_item":
      return context.nextItemName || "ALL FRESH";
    case "item_count":
      return quantity(context.itemCount, "ITEM");
    case "attention_count":
      return context.attentionCount === 0
        ? "ALL FRESH"
        : quantity(context.attentionCount, "USE SOON", "USE SOON");
  }
}

export function resolveDisplayHeader(
  settings: DisplayHeaderSettings,
  context: DisplayWidgetContext,
): ResolvedDisplayHeader {
  return {
    left: {
      widget: settings.left,
      text: displayWidgetText(settings.left, context).toUpperCase(),
    },
    right: {
      widget: settings.right,
      text: displayWidgetText(settings.right, context).toUpperCase(),
    },
  };
}
