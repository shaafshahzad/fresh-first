# Fresh First

Fresh First is a private, phone-friendly fridge expiry tracker deployed on
Vercel. Capture groceries naturally with phrases such as `Milk tomorrow` or
`Bread Sep 4`; Fresh First parses the dates and keeps the list ordered from the
soonest expiry to the latest.

## Current MVP

- Natural-language quick capture with one item per line
- Optional browser voice recognition and native phone dictation support
- Batch entry for several groceries at once
- Exact product-name and date fields as a fallback
- Durable Neon Postgres storage connected through Vercel
- Automatic expiry sorting
- One-tap “Used” removal with retained history
- Responsive management view at `/`
- Auto-refreshing fridge view at `/display`
- JSON device feed at `/api/items`

Quick capture understands `today`, `tomorrow`, `Friday`, `next Friday`,
`in 3 days`, `+3 days`, `Sep 4`, `4 Sep`, `9/4`, and ISO dates.

## Development

Requirements: Node.js 22.13 or newer.

- Install dependencies: `npm install`
- Pull development variables: `vercel env pull .env.local`
- Prepare the database: `npm run db:migrate`
- Start locally: `npm run dev`
- Run checks: `npm run lint`, `npm test`, and `npm run build`
- Deploy: `vercel --prod --yes`

## Privacy

The GitHub repository is private and Vercel Authentication protects the
deployment. Environment files and database credentials are ignored by Git.
