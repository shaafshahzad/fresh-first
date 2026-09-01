# Fresh First

Fresh First is a private, phone-friendly fridge expiry tracker. Add a product
name and expiry date, and the list stays ordered from the soonest expiry to the
latest. A separate high-contrast display view is ready for a future e-paper
fridge screen.

## Current MVP

- Manual product-name and expiry-date entry
- Quick date shortcuts for today, tomorrow, three days, and seven days
- Durable Cloudflare D1 storage
- Automatic expiry sorting
- One-tap “Used” removal
- Responsive management view at `/`
- Auto-refreshing fridge view at `/display`
- JSON device feed at `/api/items`

## Development

Requirements: Node.js 22.13 or newer.

- Install dependencies: `npm install`
- Start locally: `npm run dev`
- Run lint: `npm run lint`
- Build and test: `npm test`
- Generate a migration after changing the schema: `npm run db:generate`

## Data shape

Each item stores a product name, an ISO `YYYY-MM-DD` expiry date, and a creation
timestamp. The database index matches the main expiry-then-name ordering query.

## Privacy

The production site is deployed with owner-only access. No secrets or personal
fridge contents belong in the repository.
