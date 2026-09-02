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
  formatCalendarDate,
} from "../lib/calendar-date";
import { expiryPresentation } from "../lib/expiry-urgency";

type FridgeItem = {
  id: number;
  name: string;
  expiresOn: string;
  createdAt: string;
};

type VoiceState = "idle" | "starting" | "listening" | "stopping";

const VOICE_STATE_COPY: Array<{
  action: string;
  detail: string;
  state: VoiceState;
  title: string;
}> = [
  {
    action: "Start",
    detail: "One tap. Pause between each item.",
    state: "idle",
    title: "Start speaking",
  },
  {
    action: "…",
    detail: "Just a moment…",
    state: "starting",
    title: "Opening the microphone",
  },
  {
    action: "Stop",
    detail: "Say an item and date, then pause.",
    state: "listening",
    title: "Listening continuously",
  },
  {
    action: "…",
    detail: "Just a moment…",
    state: "stopping",
    title: "Finishing the last item",
  },
];

const SPEECH_PAUSE_MS = 900;
const MAX_UTTERANCE_MS = 15_000;
const MAX_SILENT_SEGMENT_MS = 20_000;

function supportedRecordingType() {
  if (typeof MediaRecorder === "undefined") return "";
  return [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ].find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function recordingExtension(type: string) {
  if (type.includes("mp4")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  return "webm";
}

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

function displayDate(dateString: string) {
  return formatCalendarDate(dateString, {
    month: "short",
    day: "numeric",
    year: "numeric",
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editExpiresOn, setEditExpiresOn] = useState("");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [pendingTranscriptions, setPendingTranscriptions] = useState(0);
  const [captureNotice, setCaptureNotice] = useState("");
  const [error, setError] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);
  const quickInput = useRef<HTMLTextAreaElement>(null);
  const microphoneRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const vadTimerRef = useRef<number | null>(null);
  const finishSegmentRef = useRef<((transcribe: boolean) => void) | null>(null);
  const voiceAttemptRef = useRef(0);
  const voiceSessionRequestedRef = useRef(false);
  const speechStartedAtRef = useRef(0);
  const transcriptionQueueRef = useRef<Promise<void>>(Promise.resolve());
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

  useEffect(
    () => () => {
      voiceSessionRequestedRef.current = false;
      voiceAttemptRef.current += 1;
      if (vadTimerRef.current !== null) window.clearInterval(vadTimerRef.current);
      finishSegmentRef.current = null;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.stop();
      }
      microphoneRef.current?.getTracks().forEach((track) => track.stop());
      void audioContextRef.current?.close();
    },
    [],
  );

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

  function queueTranscription(audio: Blob) {
    setPendingTranscriptions((count) => count + 1);
    transcriptionQueueRef.current = transcriptionQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        try {
          const formData = new FormData();
          formData.append(
            "audio",
            audio,
            `grocery.${recordingExtension(audio.type)}`,
          );
          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
            signal: AbortSignal.timeout(45_000),
          });
          const body = await response.json() as { text?: string; error?: string };
          if (!response.ok) throw new Error(body.error ?? "Transcription failed");

          const transcript = body.text?.trim();
          if (!transcript) {
            setCaptureNotice(
              voiceSessionRequestedRef.current
                ? "I didn’t hear a complete item that time. Keep going and say it again."
                : "The last phrase was silent or unclear. You can type it below.",
            );
            return;
          }

          setQuickText((current) => current ? `${current}\n${transcript}` : transcript);
          setCaptureNotice(
            voiceSessionRequestedRef.current
              ? `Captured: “${transcript}” Keep speaking when you’re ready.`
              : `Captured: “${transcript}” Review it below, then add it to your fridge.`,
          );
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "Transcription failed";
          setCaptureNotice(
            `${message}. Your voice session can stay open; say that item again or type it below.`,
          );
        } finally {
          setPendingTranscriptions((count) => Math.max(0, count - 1));
        }
      });
  }

  function stopVoiceHardware() {
    if (vadTimerRef.current !== null) {
      window.clearInterval(vadTimerRef.current);
      vadTimerRef.current = null;
    }
    finishSegmentRef.current = null;
    microphoneRef.current?.getTracks().forEach((track) => track.stop());
    microphoneRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    recorderRef.current = null;
  }

  function beginRecordingSegment(
    attempt: number,
    microphone: MediaStream,
    analyser: AnalyserNode,
  ) {
    if (
      voiceAttemptRef.current !== attempt ||
      !voiceSessionRequestedRef.current
    ) {
      stopVoiceHardware();
      setVoiceState("idle");
      return;
    }

    const type = supportedRecordingType();
    const chunks: Blob[] = [];
    const recorder = type
      ? new MediaRecorder(microphone, { mimeType: type, audioBitsPerSecond: 64_000 })
      : new MediaRecorder(microphone, { audioBitsPerSecond: 64_000 });
    const segmentStartedAt = Date.now();
    let lastLoudAt = 0;
    let noiseFloor = 0.006;
    let shouldTranscribe = false;
    let finishing = false;
    const levels = new Float32Array(analyser.fftSize);

    recorderRef.current = recorder;
    speechStartedAtRef.current = 0;
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => {
      voiceSessionRequestedRef.current = false;
      setVoiceState("idle");
      setCaptureNotice("The browser stopped recording unexpectedly. Check microphone access and try again.");
      stopVoiceHardware();
    };
    recorder.onstop = () => {
      if (vadTimerRef.current !== null) {
        window.clearInterval(vadTimerRef.current);
        vadTimerRef.current = null;
      }
      if (shouldTranscribe && chunks.length) {
        const audio = new Blob(chunks, { type: recorder.mimeType || type });
        if (audio.size > 1_000) queueTranscription(audio);
      }

      if (
        voiceAttemptRef.current === attempt &&
        voiceSessionRequestedRef.current &&
        microphone.active
      ) {
        window.setTimeout(
          () => beginRecordingSegment(attempt, microphone, analyser),
          40,
        );
      } else {
        stopVoiceHardware();
        setVoiceState("idle");
      }
    };

    function finishSegment(transcribe: boolean) {
      if (finishing) return;
      finishing = true;
      shouldTranscribe = transcribe;
      if (vadTimerRef.current !== null) {
        window.clearInterval(vadTimerRef.current);
        vadTimerRef.current = null;
      }
      if (recorder.state !== "inactive") recorder.stop();
    }

    finishSegmentRef.current = finishSegment;
    recorder.start();
    setVoiceState("listening");
    setCaptureNotice("Listening continuously—say one product and expiry date, pause, then say the next.");

    vadTimerRef.current = window.setInterval(() => {
      if (
        voiceAttemptRef.current !== attempt ||
        !voiceSessionRequestedRef.current ||
        recorder.state !== "recording"
      ) {
        return;
      }

      analyser.getFloatTimeDomainData(levels);
      let sum = 0;
      for (const level of levels) sum += level * level;
      const rms = Math.sqrt(sum / levels.length);
      const now = Date.now();

      if (!speechStartedAtRef.current) {
        noiseFloor = noiseFloor * 0.92 + rms * 0.08;
      }
      const speechThreshold = Math.max(0.012, Math.min(0.04, noiseFloor * 2.8));

      if (rms >= speechThreshold) {
        lastLoudAt = now;
        if (!speechStartedAtRef.current) {
          speechStartedAtRef.current = now;
          setCaptureNotice("I hear you—finish the item, then pause briefly.");
        }
      }

      if (
        speechStartedAtRef.current &&
        lastLoudAt &&
        now - lastLoudAt >= SPEECH_PAUSE_MS
      ) {
        setCaptureNotice("Transcribing that item—keep going when the listener returns.");
        finishSegment(true);
      } else if (
        speechStartedAtRef.current &&
        now - speechStartedAtRef.current >= MAX_UTTERANCE_MS
      ) {
        setCaptureNotice("Transcribing this longer phrase now…");
        finishSegment(true);
      } else if (
        !speechStartedAtRef.current &&
        now - segmentStartedAt >= MAX_SILENT_SEGMENT_MS
      ) {
        finishSegment(false);
      }
    }, 90);
  }

  async function startDictation() {
    if (voiceState === "stopping") return;
    if (voiceState !== "idle") {
      voiceSessionRequestedRef.current = false;
      voiceAttemptRef.current += 1;
      setVoiceState("stopping");
      setCaptureNotice("Stopping the voice session and finishing the last phrase…");
      const finishSegment = finishSegmentRef.current;
      if (finishSegment) {
        finishSegment(Boolean(speechStartedAtRef.current));
      } else {
        stopVoiceHardware();
        setVoiceState("idle");
      }
      return;
    }

    const attempt = voiceAttemptRef.current + 1;
    voiceAttemptRef.current = attempt;
    voiceSessionRequestedRef.current = true;
    setVoiceState("starting");
    setCaptureNotice("Requesting microphone access…");

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      voiceSessionRequestedRef.current = false;
      setVoiceState("idle");
      setCaptureNotice("This browser cannot record microphone audio. Update the browser or type the items below.");
      quickInput.current?.focus();
      return;
    }

    try {
      const microphone = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      });
      if (voiceAttemptRef.current !== attempt) {
        microphone.getTracks().forEach((track) => track.stop());
        return;
      }

      const audioWindow = window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      };
      const AudioContextApi = window.AudioContext ?? audioWindow.webkitAudioContext;
      if (!AudioContextApi) throw new Error("Audio analysis is unavailable");

      const audioContext = new AudioContextApi();
      await audioContext.resume();
      const source = audioContext.createMediaStreamSource(microphone);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.25;
      source.connect(analyser);

      microphoneRef.current = microphone;
      audioContextRef.current = audioContext;
      beginRecordingSegment(attempt, microphone, analyser);
    } catch (caught) {
      if (voiceAttemptRef.current !== attempt) return;
      voiceSessionRequestedRef.current = false;
      stopVoiceHardware();
      setVoiceState("idle");
      const permissionBlocked = caught instanceof DOMException &&
        (caught.name === "NotAllowedError" || caught.name === "SecurityError");
      const microphoneMissing = caught instanceof DOMException &&
        (caught.name === "NotFoundError" || caught.name === "DevicesNotFoundError");
      setCaptureNotice(
        permissionBlocked
          ? "Microphone access was blocked. Allow it for this site in browser settings, then start speaking again."
          : microphoneMissing
            ? "No microphone was found. Connect or enable one, then try again."
            : "The microphone could not start. Close other apps using it, then try again.",
      );
    }
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

  function beginEditing(item: FridgeItem) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditExpiresOn(item.expiresOn);
    setError("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditName("");
    setEditExpiresOn("");
  }

  async function updateItem(
    event: FormEvent<HTMLFormElement>,
    item: FridgeItem,
  ) {
    event.preventDefault();
    if (!editName.trim() || !editExpiresOn || updatingId !== null) return;

    setUpdatingId(item.id);
    setError("");
    try {
      const response = await fetch(`/api/items?id=${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, expiresOn: editExpiresOn }),
      });
      const body = await response.json() as {
        item?: FridgeItem;
        error?: string;
      };
      if (!response.ok || !body.item) {
        throw new Error(body.error ?? "Unable to update item");
      }

      setItems((current) => sorted(
        current.map((candidate) => candidate.id === item.id ? body.item! : candidate),
      ));
      cancelEditing();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update item.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="app-shell" id="main-content">
      <header className="topbar">
        <a className="brand" href="#main-content" aria-label="Fresh First home">
          <span className="brand-mark" aria-hidden="true">F</span>
          <span>Fresh First</span>
        </a>
        <nav className="top-actions" aria-label="Views">
          <a href="#fridge">
            Fridge
            <span className="top-count" aria-label={`${items.length} active items`}>
              {loading ? "—" : items.length}
            </span>
          </a>
          <Link href="/display">Fridge display <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Your fridge, in the right order</p>
          <h1>Use what’s fresh, first.</h1>
          <p className="lede">
            Say what you bought and when it expires. We’ll keep the shortest dates at the top, where you can actually use them.
          </p>
          <a className="hero-jump" href="#fridge">
            See what’s next <span aria-hidden="true">↓</span>
          </a>
        </div>

        <div className="capture-stack">
          <form className="add-card quick-card" onSubmit={addQuickItems}>
            <div className="form-heading">
              <div>
                <p className="eyebrow">Quick add</p>
                <h2>Add groceries as you unpack.</h2>
              </div>
            </div>

            <button
              className={`voice-button ${voiceState}`}
              type="button"
              onClick={() => void startDictation()}
              aria-label={voiceState === "idle" ? "Start continuous voice session" : "Stop continuous voice session"}
              aria-pressed={voiceState !== "idle"}
            >
              <span className="voice-symbol" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="voice-copy" aria-live="polite">
                {VOICE_STATE_COPY.map((copy) => (
                  <span
                    className={`voice-copy-state ${copy.state}`}
                    aria-hidden={voiceState !== copy.state}
                    key={copy.state}
                  >
                    <strong>{copy.title}</strong>
                    <small>{copy.detail}</small>
                  </span>
                ))}
              </span>
              <span className="voice-action" aria-hidden="true">
                {VOICE_STATE_COPY.map((copy) => (
                  <span
                    className={`voice-action-state ${copy.state}`}
                    key={copy.state}
                  >
                    {copy.action}
                  </span>
                ))}
              </span>
            </button>

            {captureNotice ? (
              <p className="capture-notice" role="status">
                {captureNotice}
                {pendingTranscriptions > 0
                  ? ` ${pendingTranscriptions} phrase${pendingTranscriptions === 1 ? "" : "s"} queued.`
                  : ""}
              </p>
            ) : null}
            <div className="capture-label">
              <span className="capture-label-row">
                <label htmlFor="quick-entry">Or type your list</label>
                <small>One item per line</small>
              </span>
              <textarea
                id="quick-entry"
                ref={quickInput}
                value={quickText}
                onChange={(event) => setQuickText(event.target.value)}
                placeholder={"Milk tomorrow\nTortillas Sep 4\nBread Friday"}
                rows={4}
                autoCapitalize="sentences"
                spellCheck
              />
            </div>

            {quickText ? (
              <div className="parse-preview" aria-live="polite">
                {quickParse.items.map((item) => (
                  <span className="parsed-item" key={item.source}>
                    <span aria-hidden="true">✓</span>
                    <strong>{item.name}</strong>
                    <time dateTime={item.expiresOn}>{displayDate(item.expiresOn)}</time>
                  </span>
                ))}
                {quickParse.errors.map((item) => (
                  <span className="parse-error" key={item.line}>
                    <span aria-hidden="true">?</span> Couldn’t read “{item.line}”
                  </span>
                ))}
              </div>
            ) : (
              <div className="example-row">
                <span>Try:</span>
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
              className="quick-submit"
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
              <span aria-hidden="true">↗</span>
            </button>
          </form>

          <details className="exact-entry">
            <summary>Enter a name and exact date instead</summary>
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
            <p className="eyebrow">Fridge queue</p>
            <h2 id="fridge-heading">
              {loading
                ? "Checking what’s next…"
                : items.length === 0
                  ? "Nothing waiting"
                  : "Use these next"}
            </h2>
          </div>
          <p>
            {loading
              ? "Loading your list"
              : `${items.length} ${items.length === 1 ? "item" : "items"} · soonest first`}
          </p>
        </div>

        {error ? <p className="error-banner" role="alert">{error}</p> : null}

        {loading ? (
          <div className="item-list loading-list" aria-label="Loading fridge items">
            {[0, 1, 2].map((index) => (
              <div className="food-item skeleton-item" key={index} aria-hidden="true">
                <span />
                <div><i /><i /></div>
                <span />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <span aria-hidden="true">✓</span>
            <div>
              <h3>Your fridge list is clear.</h3>
              <p>Add your first item above. It will land here in expiry order.</p>
            </div>
          </div>
        ) : (
          <div className="item-list" aria-live="polite">
            {items.map((item, index) => {
              const expiry = expiryPresentation(item.expiresOn);
              return (
                <article
                  className={`food-item ${expiry.tone}${editingId === item.id ? " editing" : ""}`}
                  key={item.id}
                >
                  <span className="item-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {editingId === item.id ? (
                    <form
                      className="item-edit-form"
                      onSubmit={(event) => void updateItem(event, item)}
                    >
                    <label>
                      <span>Product name</span>
                      <input
                        type="text"
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        maxLength={80}
                        autoComplete="off"
                        required
                      />
                    </label>
                    <label>
                      <span>Expiry date</span>
                      <input
                        type="date"
                        value={editExpiresOn}
                        onChange={(event) => setEditExpiresOn(event.target.value)}
                        required
                      />
                    </label>
                    <div className="item-edit-actions">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={updatingId === item.id}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={
                          updatingId === item.id ||
                          !editName.trim() ||
                          !editExpiresOn
                        }
                      >
                        {updatingId === item.id ? "Saving…" : "Save"}
                      </button>
                    </div>
                    </form>
                  ) : (
                    <>
                    <div className="item-name">
                      <h3>{item.name}</h3>
                      <div className="item-status-line">
                        <p>{expiry.timing}</p>
                        {expiry.marker ? (
                          <span className={`expiry-marker ${expiry.tone}`}>
                            {expiry.marker}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <time dateTime={item.expiresOn}>
                      {displayDate(item.expiresOn)}
                    </time>
                    <div className="item-actions">
                      <button
                        className="item-edit-button"
                        type="button"
                        onClick={() => beginEditing(item)}
                        disabled={removingId !== null || updatingId !== null}
                        aria-label={`Edit ${item.name}`}
                        title="Edit item"
                      >
                        <svg aria-hidden="true" viewBox="0 0 20 20">
                          <path d="M4 13.8V16h2.2L15 7.2 12.8 5 4 13.8Z" />
                          <path d="m11.8 6 2.2 2.2" />
                        </svg>
                      </button>
                      <button
                        className="item-used-button"
                        type="button"
                        onClick={() => void removeItem(item)}
                        disabled={removingId === item.id || updatingId !== null}
                        aria-label={`Mark ${item.name} as used`}
                      >
                        {removingId === item.id ? (
                          "…"
                        ) : (
                          <>
                            <svg aria-hidden="true" viewBox="0 0 20 20">
                              <path d="m5 10.2 3.1 3.1L15.4 6" />
                            </svg>
                            <span>Used</span>
                          </>
                        )}
                      </button>
                    </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer>
        <p><strong>Fresh First</strong> · A quieter way to waste less food.</p>
        <Link href="/display">Open fridge display <span aria-hidden="true">↗</span></Link>
      </footer>

    </main>
  );
}
