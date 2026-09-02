# Fresh First

Fresh First is a private, phone-friendly fridge expiry tracker deployed on
Vercel. Capture groceries naturally with phrases such as `Milk tomorrow` or
`Bread Sep 4`; Fresh First parses the dates and keeps the list ordered from the
soonest expiry to the latest.

## Current MVP

- Natural-language quick capture with one item per line
- Continuous cross-browser voice capture with pause-based item separation
- Local Whisper transcription during development, including Helium support
- Batch entry for several groceries at once
- Exact product-name and date fields as a fallback
- Durable Neon Postgres storage connected through Vercel
- Automatic expiry sorting
- Clear expired, use-now, really-soon, and five-day warning states
- One-tap “Used” removal with retained history
- Inline product-name and expiry-date correction with automatic re-sorting
- Responsive management view at `/`
- Auto-refreshing fridge view at `/display`
- JSON device feed at `/api/items`

Quick capture understands `today`, `tomorrow`, `Friday`, `next Friday`,
`in 3 days`, `+3 days`, `Sep 4`, `4 Sep`, `9/4`, and ISO dates.

Start a voice session once, say one product and expiry date, pause briefly, and
continue with the next item. Development audio is transcribed locally by
whisper.cpp. A deployed instance can use `OPENAI_API_KEY` directly or the
project's Vercel AI Gateway identity; recorded phrases are processed in memory
and are not stored by Fresh First.

## Development

Requirements: Node.js 22.13 or newer. Local voice transcription also requires
`ffmpeg`, `whisper-cpp`, and a compatible GGML Whisper model.

- Install dependencies: `bun install`
- Pull development variables: `vercel env pull .env.local`
- Prepare the database: `bun run db:migrate`
- Load relative-date development examples: `bun run db:seed:mock`
- Start locally: `bun run dev`
- Optional local voice model: set `WHISPER_MODEL_PATH` and
  `WHISPER_CLI_PATH` (the macOS defaults are detected automatically)
- Run checks: `bun run lint`, `bun run test`, and `bun run build`
- Deploy: `vercel --prod --yes`

## Privacy

The GitHub repository is private and Vercel Authentication protects the
deployment. Environment files and database credentials are ignored by Git.
