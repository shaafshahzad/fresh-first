import { getSql } from "./index";

const mockItems = [
  { name: "Baby spinach", offsetDays: -2 },
  { name: "Leftover pasta", offsetDays: -1 },
  { name: "Fresh salmon", offsetDays: 0 },
  { name: "Opened oat milk", offsetDays: 1 },
  { name: "Bagged salad", offsetDays: 2 },
  { name: "Fresh berries", offsetDays: 3 },
  { name: "Soft cheese", offsetDays: 4 },
  { name: "Chicken broth", offsetDays: 5 },
  { name: "Tortillas", offsetDays: 8 },
  { name: "Free-range eggs", offsetDays: 14 },
  { name: "Roasted red pepper hummus", offsetDays: 30 },
] as const;

const sql = getSql();

await sql`DELETE FROM fridge_items WHERE source = 'mock'`;

for (const item of mockItems) {
  await sql`
    INSERT INTO fridge_items (name, expires_on, source)
    VALUES (${item.name}, CURRENT_DATE + (${item.offsetDays}::integer), 'mock')
  `;
}

console.log(`Loaded ${mockItems.length} relative-date mock fridge items.`);
