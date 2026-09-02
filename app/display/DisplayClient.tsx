"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCalendarDate } from "../../lib/calendar-date";
import { expiryPresentation } from "../../lib/expiry-urgency";

type FridgeItem = {
  id: number;
  name: string;
  expiresOn: string;
};

function dateFor(dateString: string) {
  return formatCalendarDate(dateString, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DisplayClient() {
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let active = true;

    async function sync() {
      try {
        const response = await fetch("/api/items", { cache: "no-store" });
        if (!response.ok) throw new Error("sync failed");
        const body = (await response.json()) as { items?: FridgeItem[] };
        if (active) {
          setItems(body.items ?? []);
          setLastSynced(new Date());
          setOffline(false);
          setLoading(false);
        }
      } catch {
        if (active) {
          setOffline(true);
          setLoading(false);
        }
      }
    }

    void sync();
    const interval = window.setInterval(() => void sync(), 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <main className="display-shell" id="main-content">
      <header className="display-header">
        <div>
          <p className="display-kicker">Fresh First</p>
          <h1>Use these next</h1>
        </div>
        <div className="display-meta">
          <span className={offline ? "offline" : ""}>{offline ? "Offline" : "Synced"}</span>
          <time>{lastSynced ? lastSynced.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—"}</time>
        </div>
      </header>

      {loading ? (
        <p className="display-message">Checking the fridge…</p>
      ) : items.length === 0 ? (
        <section className="display-empty">
          <span aria-hidden="true">✓</span>
          <h2>Nothing needs your attention.</h2>
          <p>Add an item from the Fresh First phone view.</p>
        </section>
      ) : (
        <section className="display-list" aria-label="Items sorted by expiry">
          {items.slice(0, 8).map((item, index) => {
            const expiry = expiryPresentation(item.expiresOn);
            return (
              <article className={`is-${expiry.tone}`} key={item.id}>
                <span className="display-index">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h2>{item.name}</h2>
                  <div className="display-status-line">
                    <p>{expiry.timing}</p>
                    {expiry.marker ? (
                      <span className={`expiry-marker light ${expiry.tone}`}>
                        {expiry.marker}
                      </span>
                    ) : null}
                  </div>
                </div>
                <time dateTime={item.expiresOn}>{dateFor(item.expiresOn)}</time>
              </article>
            );
          })}
        </section>
      )}

      <footer className="display-footer">
        <p>{items.length} {items.length === 1 ? "item" : "items"} in the fridge</p>
        <Link href="/">Manage list <span aria-hidden="true">↗</span></Link>
      </footer>
    </main>
  );
}
