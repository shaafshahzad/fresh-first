"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { parseQuickItems, type QuickItem } from "../lib/quick-add";
import {
  daysUntilCalendarDate,
  formatCalendarDate,
} from "../lib/calendar-date";
import { ExpiryScanner } from "./ExpiryScanner";

type FridgeItem = {
  id: number;
  name: string;
  expiresOn: string;
  createdAt: string;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: {
    results: ArrayLike<ArrayLike<{ transcript: string }>>;
  }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
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
  return daysUntilCalendarDate(dateString);
}

function timingLabel(dateString: string) {
  const days = daysUntil(dateString);
  if (days === null) return "Expiry date unavailable";
  if (days < -1) return `Expired ${Math.abs(days)} days ago`;
  if (days === -1) return "Expired yesterday";
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}

function toneFor(dateString: string) {
  const days = daysUntil(dateString);
  if (days === null) return "later";
  if (days < 0) return "expired";
  if (days === 0) return "urgent";
  if (days <= 2) return "soon";
  return "later";
}

function displayDate(dateString: string) {
  return formatCalendarDate(dateString, {
    month: "short",
    day: "numeric",
  });
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
  const [quickText, setQuickText] = useState("");
  const [name, setName] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [error, setError] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);
  const quickParse = useMemo(() => parseQuickItems(quickText), [quickText]);

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

  async function saveItems(inputs: Array<Pick<QuickItem, "name" | "expiresOn">>) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: inputs }),
      });
      const body = (await response.json()) as {
        items?: FridgeItem[];
        error?: string;
      };
      if (!response.ok || !body.items) {
        throw new Error(body.error ?? "Unable to add items");
      }
      setItems((current) => sorted([...current, ...(body.items ?? [])]));
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add items.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function addQuickItems(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      saving ||
      quickParse.items.length === 0 ||
      quickParse.errors.length > 0
    ) {
      return;
    }

    const saved = await saveItems(quickParse.items);
    if (saved) setQuickText("");
  }

  async function addExactItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !expiresOn || saving) return;

    const saved = await saveItems([{ name, expiresOn }]);
    if (saved) {
      setName("");
      setExpiresOn("");
      nameInput.current?.focus();
    }
  }

  function startDictation() {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setError("Voice capture is unavailable here. Your phone keyboard’s microphone works in the same field.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-CA";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (!transcript) return;
      setQuickText((current) => current ? `${current}\n${transcript}` : transcript);
    };
    recognition.onerror = () => {
      setError("I could not hear that clearly. Try once more or type it instead.");
    };
    recognition.start();
  }

  async function removeItem(item: FridgeItem) {
    if (removingId !== null) return;
    setRemovingId(item.id);
    setError("");
    try {
      const response = await fetch(`/api/items?id=${item.id}`, {
        method: "DELETE",
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error);
      setItems((current) =>
        current.filter((candidate) => candidate.id !== item.id),
      );
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
          <Link href="/display">Display <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Say it. Type it. Done.</p>
          <h1>What should you use next?</h1>
          <p className="lede">
            Add groceries the way you naturally think: “Milk tomorrow” or “Bread Sep 4.” One item per line, as many as you like.
          </p>
        </div>

        <div className="capture-stack">
          <form className="add-card quick-card" onSubmit={addQuickItems}>
            <div className="form-heading">
              <div>
                <p className="eyebrow">Quick capture</p>
                <h2>What did you put away?</h2>
              </div>
              <div className="capture-actions">
                <button
                  className="scan-button"
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  aria-label="Start a passive expiry date scan session"
                >
                  <span aria-hidden="true">▣</span> Scan dates
                </button>
                <button
                  className="voice-button"
                  type="button"
                  onClick={startDictation}
                  aria-label="Add an item by voice"
                >
                  <span aria-hidden="true">●</span> Speak
                </button>
              </div>
            </div>
            <label className="capture-label">
              <span className="sr-only">Items and expiry dates</span>
              <textarea
                value={quickText}
                onChange={(event) => setQuickText(event.target.value)}
                placeholder={"Milk tomorrow\nTortillas Sep 4\nBread Friday"}
                rows={4}
                autoCapitalize="sentences"
                spellCheck
              />
            </label>

            {quickText ? (
              <div className="parse-preview" aria-live="polite">
                {quickParse.items.map((item) => (
                  <span className="parsed-item" key={item.source}>
                    <strong>{item.name}</strong> · {displayDate(item.expiresOn)}
                  </span>
                ))}
                {quickParse.errors.map((item) => (
                  <span className="parse-error" key={item.line}>
                    Couldn’t read “{item.line}”
                  </span>
                ))}
              </div>
            ) : (
              <div className="example-row">
                <span>Try</span>
                {["Milk tomorrow", "Bread Sep 4", "Leftovers +3 days"].map(
                  (example) => (
                    <button
                      type="button"
                      key={example}
                      onClick={() => setQuickText(example)}
                    >
                      {example}
                    </button>
                  ),
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={
                saving ||
                quickParse.items.length === 0 ||
                quickParse.errors.length > 0
              }
            >
              {saving
                ? "Adding…"
                : quickParse.items.length > 1
                  ? `Add ${quickParse.items.length} items`
                  : "Add to fridge"}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <details className="exact-entry">
            <summary>Prefer exact fields?</summary>
            <form onSubmit={addExactItem}>
              <label>
                Product name
                <input
                  ref={nameInput}
                  type="text"
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
                  value={expiresOn}
                  onChange={(event) => setExpiresOn(event.target.value)}
                  required
                />
              </label>
              <div className="date-shortcuts" aria-label="Quick expiry dates">
                {[
                  { label: "Today", days: 0 },
                  { label: "Tomorrow", days: 1 },
                  { label: "+3 days", days: 3 },
                  { label: "+7 days", days: 7 },
                ].map((option) => (
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
              <button
                className="exact-submit"
                type="submit"
                disabled={saving || !name.trim() || !expiresOn}
              >
                Add item
              </button>
            </form>
          </details>
        </div>
      </section>

      <section
        className="fridge-section"
        id="fridge"
        aria-labelledby="fridge-heading"
      >
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
              <h3>Capture your first item above.</h3>
              <p>It will appear here—and on the fridge display—ordered by expiry.</p>
            </div>
          </div>
        ) : (
          <div className="item-list" aria-live="polite">
            {items.map((item, index) => (
              <article
                className={`food-item ${toneFor(item.expiresOn)}`}
                key={item.id}
              >
                <span className="item-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="item-name">
                  <h3>{item.name}</h3>
                  <p>{timingLabel(item.expiresOn)}</p>
                </div>
                <time dateTime={item.expiresOn}>
                  {displayDate(item.expiresOn)}
                </time>
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

      {scannerOpen ? (
        <ExpiryScanner
          open
          onClose={() => setScannerOpen(false)}
          onSave={(item) => saveItems([item])}
        />
      ) : null}
    </main>
  );
}
