import { getSql } from "./index";
import { getOrCreateDefaultFridge } from "./fridges";

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

const requestedEmail = process.env.SEED_USER_EMAIL?.trim().toLowerCase();
const users = requestedEmail
  ? await sql`
      SELECT "id", "email"
      FROM "user"
      WHERE LOWER("email") = ${requestedEmail}
      LIMIT 1
    `
  : await sql`
      SELECT "id", "email"
      FROM "user"
      ORDER BY "createdAt" ASC
      LIMIT 1
    `;

if (!users[0]) {
  throw new Error(
    "Create a Fresh First account first, or set SEED_USER_EMAIL to an existing account.",
  );
}

const fridge = await getOrCreateDefaultFridge(String(users[0].id));

await sql`
  DELETE FROM fridge_items
  WHERE source = 'mock' AND fridge_id = ${fridge.id}
`;

for (const item of mockItems) {
  await sql`
    INSERT INTO fridge_items (name, expires_on, source, fridge_id)
    VALUES (
      ${item.name},
      CURRENT_DATE + (${item.offsetDays}::integer),
      'mock',
      ${fridge.id}
    )
  `;
}

console.log(
  `Loaded ${mockItems.length} relative-date mock items into ${users[0].email}.`,
);
