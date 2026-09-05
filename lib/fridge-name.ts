export const MAX_FRIDGE_NAME_LENGTH = 60;

export function defaultFridgeName(userName?: string | null) {
  const name = userName?.trim();
  if (!name) return "My fridge";
  const possessive = name.toLowerCase().endsWith("s") ? "'" : "'s";
  return `${name}${possessive} fridge`;
}
