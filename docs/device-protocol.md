# Fresh First display protocol

The physical display is a low-power client, not a second copy of the web app.
It wakes on a timer, requests a compact feed, paints the e-paper panel only when
the response changes, then returns to deep sleep.

## Manufacturing identity

Run `bun run device:provision -- "Kitchen display"` for each unit. Provisioning
creates:

- a public device ID such as `FF-2ABC3DEF`;
- a 256-bit secret that is written to the device once;
- an NFC URL in the form `https://fresh-first.vercel.app/d/FF-2ABC3DEF`.

Only a SHA-256 hash of the device secret is stored in the database. The raw
secret must be stored in protected firmware or a secure element and is never
printed on the enclosure or encoded in the NFC tag.

## Device feed

The device calls:

```http
GET /api/device/{deviceId}/feed
Authorization: Bearer {deviceSecret}
If-None-Match: {lastEtag}
X-Pairing-Code: {lastPairingCode}
X-Firmware-Version: {firmwareVersion}
```

An unclaimed device receives pairing mode:

```json
{
  "mode": "pairing",
  "pairingCode": "ABCD-2345",
  "expiresInSeconds": 1800,
  "nfcPath": "/d/FF-2ABC3DEF",
  "refreshAfterSeconds": 30
}
```

While the display is unclaimed, it persists the last pairing code and sends it
back in `X-Pairing-Code`. The API reuses that code until it expires instead of
invalidating a code while the customer is typing it. Pairing mode checks every
30 seconds; normal fridge mode returns to the 15-minute low-power cycle.

The display renders the pairing code until the customer claims it. Pairing
codes are short-lived, stored as keyed hashes, and require a signed-in account.

A claimed device receives fridge mode:

```json
{
  "mode": "fridge",
  "device": { "id": "FF-2ABC3DEF", "name": "Kitchen display" },
  "fridge": { "id": "...", "name": "My fridge" },
  "items": [
    {
      "id": 1,
      "name": "Milk",
      "expiresOn": "2026-09-04",
      "days": 2,
      "marker": "Really soon",
      "timing": "Expires in 2 days",
      "tone": "soon"
    }
  ],
  "refreshAfterSeconds": 900
}
```

The endpoint includes an `ETag`. If the list is unchanged, the device receives
`304 Not Modified` and can skip the expensive panel refresh. A 15-minute wake
cycle is the initial default; firmware should also refresh immediately after a
physical wake-button press.

## NFC customer flow

The NFC tag contains only the public `/d/{deviceId}` URL. It never contains the
device secret.

1. An unclaimed display sends the customer to account creation or sign-in and
   preselects that device for pairing.
2. The customer enters the code visible on the e-paper panel.
3. A claimed display sends its owner directly to the mobile quick-add area.
4. A display linked to another account reveals no fridge contents.

## Production hardening still required

Before commercial release, add verified-email delivery and password reset,
per-account pairing attempt throttles, firmware signing and secure updates,
device-secret rotation, manufacturing audit records, privacy/retention controls,
and a recovery process for resale or ownership transfer.
