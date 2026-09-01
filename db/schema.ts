export type FridgeItem = {
  id: number;
  name: string;
  expiresOn: string;
  createdAt: string;
};

export type FridgeItemRow = {
  id: number;
  name: string;
  expires_on: string | Date;
  created_at: string | Date;
};

function toIsoDate(value: string | Date) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function toFridgeItem(row: FridgeItemRow): FridgeItem {
  return {
    id: Number(row.id),
    name: row.name,
    expiresOn: toIsoDate(row.expires_on),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}
