"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";

type FridgeItem = {
  id: number;
  name: string;
  expiresOn: string;
  createdAt: string;
};

function localIsoDate(offsetDays = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function daysUntil(dateString: string) {
  const today = new Date(`${localIsoDate()}T12:00:00`);
  const expiry = new Date(`${dateString}T12:00:00`);
  return Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
}

function timingLabel(dateString: string) {
  const days = daysUntil(dateString);
  if (days < -1) return `Expired ${Math.abs(days)} days ago`;
  if (days === -1) return "Expired yesterday";
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}

function toneFor(dateString: string) {
  const days = daysUntil(dateString);
  if (days < 0) return "expired";
  if (days === 0) return "urgent";
  if (days <= 2) return "soon";
  return "later";
}

function displayDate(dateString: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateString}T12:00:00`));
}

function sorted(items: FridgeItem[]) {
  return [...items].sort(
    (a, b) =>
      a.expiresOn.localeCompare(b.expiresOn) ||
      a.name.localeCompare(b.name) ||
      a.id - b.id,
  );
}

export function FreshFirstClient() {
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [name, setName] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/items", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as {
          items?: FridgeItem[];
          error?: string;
        };
        if (!response.ok) throw new Error(body.error);
        return body.items ?? [];
      })
      .then((loadedItems) => {
        setItems(sorted(loadedItems));
        setError("");
      })
      .catch((caught: unknown) => {
        if (caught instanceof Error && caught.name === "AbortError") return;
        setError("Fresh First could not load your fridge. Try refreshing the page.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !expiresOn || saving) return;

    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, expiresOn }),
      });
      const body = (await response.json()) as { item?: FridgeItem; error?: string };
      if (!response.ok || !body.item) {
        throw new Error(body.error ?? "Unable to add item");
      }
      setItems((current) => sorted([...current, body.item as FridgeItem]));
      setName("");
      setExpiresOn("");
      nameInput.current?.focus();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add item.");
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(item: FridgeItem) {
    if (removingId !== null) return;
    setRemovingId(item.id);
    setError("");
    try {
      const response = await fetch(`/api/items?id=${item.id}`, { method: "DELETE" });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error);
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to remove item.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <main className="app-shell" id="top">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Fresh First home">
          <span className="brand-mark" aria-hidden="true">F</span>
          <span>Fresh First</span>
        </a>
        <nav className="top-actions" aria-label="Views">
          <a href="#fridge">Manage</a>
          <Link href="/display">Fridge display <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Eat what matters, first</p>
          <h1>What should you use next?</h1>
          <p className="lede">
            Add an item and its expiry date. Fresh First keeps the most urgent food at the top automatically.
          </p>
        </div>

        <form className="add-card" onSubmit={addItem}>
          <div className="form-heading">
            <div>
              <p className="eyebrow">Quick add</p>
              <h2>Add something to the fridge</h2>
            </div>
          </div>
          <label>
            Product name
            <input
              ref={nameInput}
              type="text"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Greek yogurt"
              maxLength={80}
              autoComplete="off"
              required
            />
          </label>
          <label>
            Expiry date
            <input
              type="date"
              name="expiresOn"
              value={expiresOn}
              onChange={(event) => setExpiresOn(event.target.value)}
              required
            />
          </label>
          <div className="date-shortcuts" aria-label="Quick expiry dates">
            {[{ label: "Today", days: 0 }, { label: "Tomorrow", days: 1 }, { label: "+3 days", days: 3 }, { label: "+7 days", days: 7 }].map((option) => (
              <button
                type="button"
                key={option.label}
                onClick={() => setExpiresOn(localIsoDate(option.days))}
                aria-pressed={expiresOn === localIsoDate(option.days)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="submit" disabled={saving || !name.trim() || !expiresOn}>
            {saving ? "Adding…" : "Add to fridge"} <span aria-hidden="true">→</span>
          </button>
        </form>
      </section>

      <section className="fridge-section" id="fridge" aria-labelledby="fridge-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your fridge</p>
            <h2 id="fridge-heading">
              {loading
                ? "Checking your fridge…"
                : items.length === 0
                  ? "Your fridge list is clear"
                  : `${items.length} ${items.length === 1 ? "item" : "items"} to keep an eye on`}
            </h2>
          </div>
          <p>Sorted by expiry</p>
        </div>

        {error ? <p className="error-banner" role="alert">{error}</p> : null}

        {!loading && items.length === 0 ? (
          <div className="empty-state">
            <span aria-hidden="true">01</span>
            <div>
              <h3>Add your first item above.</h3>
              <p>It will appear here—and on the fridge display—ordered by expiry.</p>
            </div>
          </div>
        ) : (
          <div className="item-list" aria-live="polite">
            {items.map((item, index) => (
              <article className={`food-item ${toneFor(item.expiresOn)}`} key={item.id}>
                <span className="item-number">{String(index + 1).padStart(2, "0")}</span>
                <div className="item-name">
                  <h3>{item.name}</h3>
                  <p>{timingLabel(item.expiresOn)}</p>
                </div>
                <time dateTime={item.expiresOn}>{displayDate(item.expiresOn)}</time>
                <button
                  type="button"
                  onClick={() => void removeItem(item)}
                  disabled={removingId === item.id}
                  aria-label={`Mark ${item.name} as used`}
                >
                  {removingId === item.id ? "…" : "Used"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer>
        <p>Fresh First</p>
        <p>Designed for a quieter, less wasteful fridge.</p>
      </footer>
    </main>
  );
}
