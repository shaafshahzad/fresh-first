"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type FridgeItem = {
  id: number;
  name: string;
  expiresOn: string;
};

function todayIso() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function daysUntil(dateString: string) {
  const today = new Date(`${todayIso()}T12:00:00`);
  const expiry = new Date(`${dateString}T12:00:00`);
  return Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
}

function labelFor(dateString: string) {
  const days = daysUntil(dateString);
  if (days < -1) return `Expired · ${Math.abs(days)} days ago`;
  if (days === -1) return "Expired yesterday";
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}

function dateFor(dateString: string) {
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateString}T12:00:00`));
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
    <main className="display-shell">
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
            const days = daysUntil(item.expiresOn);
            return (
              <article className={days < 0 ? "is-expired" : days <= 1 ? "is-next" : ""} key={item.id}>
                <span className="display-index">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h2>{item.name}</h2>
                  <p>{labelFor(item.expiresOn)}</p>
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
