"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { formatCalendarDate } from "../lib/calendar-date";
import {
  extractExpiryCandidates,
  type ExpiryCandidate,
} from "../lib/expiry-scan";

type OcrModule = typeof import("tesseract.js");
type OcrWorker = Awaited<ReturnType<OcrModule["createWorker"]>>;

type ScannerProps = {
  open: boolean;
  onClose: () => void;
  onSave: (item: { name: string; expiresOn: string }) => Promise<boolean>;
};

type ScannerState = "loading" | "scanning" | "reviewing" | "error";

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function captureScanBand(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight) return false;

  const cropWidth = Math.round(sourceWidth * 0.88);
  const cropHeight = Math.round(sourceHeight * 0.42);
  const sourceX = Math.round((sourceWidth - cropWidth) / 2);
  const sourceY = Math.round((sourceHeight - cropHeight) / 2);
  const outputWidth = Math.min(1280, cropWidth);
  const outputHeight = Math.round(outputWidth * (cropHeight / cropWidth));

  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;

  context.filter = "grayscale(1) contrast(1.75)";
  context.drawImage(
    video,
    sourceX,
    sourceY,
    cropWidth,
    cropHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  );
  context.filter = "none";
  return true;
}

export function ExpiryScanner({ open, onClose, onSave }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<OcrWorker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const candidateRef = useRef<ExpiryCandidate | null>(null);
  const lockedDateRef = useRef<string | null>(null);
  const blockedDateRef = useRef<string | null>(null);
  const lastSeenRef = useRef("");
  const seenCountRef = useRef(0);
  const clearCountRef = useRef(0);
  const [scannerState, setScannerState] = useState<ScannerState>("loading");
  const [statusText, setStatusText] = useState("Starting camera…");
  const [progress, setProgress] = useState(0);
  const [candidate, setCandidate] = useState<ExpiryCandidate | null>(null);
  const [productName, setProductName] = useState("");
  const [saving, setSaving] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    candidateRef.current = candidate;
    if (candidate) window.setTimeout(() => nameInputRef.current?.focus(), 50);
  }, [candidate]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function scanLoop(worker: OcrWorker) {
      while (!cancelled) {
        if (candidateRef.current) {
          await wait(250);
          continue;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || !captureScanBand(video, canvas)) {
          await wait(250);
          continue;
        }

        setScannerState("scanning");
        setStatusText("Reading the date band…");
        try {
          const result = await worker.recognize(canvas);
          if (cancelled) return;
          const topCandidate = extractExpiryCandidates(result.data.text)[0];

          if (!topCandidate) {
            lastSeenRef.current = "";
            seenCountRef.current = 0;
            if (blockedDateRef.current) {
              clearCountRef.current += 1;
              if (clearCountRef.current >= 2) blockedDateRef.current = null;
            }
            setStatusText("Looking for a printed expiry date…");
            await wait(450);
            continue;
          }

          if (topCandidate.isoDate === blockedDateRef.current) {
            clearCountRef.current = 0;
            setStatusText("Move to the next product…");
            await wait(450);
            continue;
          }

          blockedDateRef.current = null;
          clearCountRef.current = 0;
          if (lastSeenRef.current === topCandidate.isoDate) {
            seenCountRef.current += 1;
          } else {
            lastSeenRef.current = topCandidate.isoDate;
            seenCountRef.current = 1;
          }

          if (seenCountRef.current >= 2) {
            lockedDateRef.current = topCandidate.isoDate;
            setCandidate(topCandidate);
            setScannerState("reviewing");
            setStatusText("Date locked");
          } else {
            setStatusText("Hold steady—checking that date…");
          }
        } catch {
          if (!cancelled) setStatusText("Couldn’t read that angle. Keep moving slowly…");
        }
        await wait(450);
      }
    }

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera scanning is not supported in this browser.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        setStatusText("Preparing private on-device text recognition…");
        const Tesseract = await import("tesseract.js");
        const worker = await Tesseract.createWorker("eng", Tesseract.OEM.LSTM_ONLY, {
          logger: (message) => {
            if (!cancelled && typeof message.progress === "number") {
              setProgress(Math.round(message.progress * 100));
            }
          },
        });
        if (cancelled) {
          await worker.terminate();
          return;
        }
        workerRef.current = worker;
        await worker.setParameters({
          tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
          preserve_interword_spaces: "1",
        });
        setProgress(100);
        setScannerState("scanning");
        setStatusText("Looking for a printed expiry date…");
        await scanLoop(worker);
      } catch (error) {
        if (cancelled) return;
        setScannerState("error");
        setStatusText(
          error instanceof Error && error.message.includes("supported")
            ? error.message
            : "Camera access is needed for a scan session. You can still use quick capture instead.",
        );
      }
    }

    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      const worker = workerRef.current;
      workerRef.current = null;
      if (worker) void worker.terminate().catch(() => undefined);
    };
  }, [open]);

  function dismissCandidate() {
    blockedDateRef.current = lockedDateRef.current;
    clearCountRef.current = 0;
    lastSeenRef.current = "";
    seenCountRef.current = 0;
    setCandidate(null);
    setProductName("");
    setScannerState("scanning");
    setStatusText("Move to another date, then keep scanning…");
  }

  async function addDetectedItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!candidate || !productName.trim() || saving) return;

    setSaving(true);
    const saved = await onSave({
      name: productName.trim(),
      expiresOn: candidate.isoDate,
    });
    setSaving(false);
    if (!saved) return;

    setSessionCount((count) => count + 1);
    dismissCandidate();
  }

  if (!open) return null;

  return (
    <div className="scanner-backdrop" role="presentation">
      <section
        className="scanner-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scanner-title"
      >
        <header className="scanner-header">
          <div>
            <p className="eyebrow">Passive scan session</p>
            <h2 id="scanner-title">Scan one package after another</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close scanner">×</button>
        </header>

        <div className="scanner-camera">
          <video ref={videoRef} muted playsInline autoPlay aria-label="Live camera preview" />
          <div className="scanner-frame" aria-hidden="true">
            <span>Keep the printed date inside this band</span>
          </div>
          <div className={`scanner-status ${scannerState}`} aria-live="polite">
            <span />
            {statusText}
            {scannerState === "loading" && progress > 0 ? ` ${progress}%` : ""}
          </div>
          <canvas ref={canvasRef} hidden />
        </div>

        {candidate ? (
          <form className="scanner-review" onSubmit={addDetectedItem}>
            <div className="scanner-date-lock">
              <div>
                <span>Date detected</span>
                <strong>
                  {formatCalendarDate(candidate.isoDate, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </strong>
              </div>
              {candidate.confidence === "review" ? <em>Check format</em> : <em>Locked</em>}
            </div>
            <label>
              What product is this?
              <input
                ref={nameInputRef}
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="e.g. Milk"
                maxLength={80}
                autoComplete="off"
                required
              />
            </label>
            <label>
              Correct the date if needed
              <input
                type="date"
                value={candidate.isoDate}
                onChange={(event) =>
                  setCandidate((current) =>
                    current ? { ...current, isoDate: event.target.value } : current,
                  )
                }
                required
              />
            </label>
            <div className="scanner-review-actions">
              <button type="button" onClick={dismissCandidate}>Not the date</button>
              <button type="submit" disabled={saving || !productName.trim()}>
                {saving ? "Adding…" : "Add & keep scanning"}
              </button>
            </div>
          </form>
        ) : (
          <div className="scanner-instructions">
            <strong>{sessionCount} {sessionCount === 1 ? "item" : "items"} added this session</strong>
            <p>Move slowly. A date locks after it is read twice; then name the product and continue without closing the camera.</p>
          </div>
        )}

        <footer className="scanner-footer">
          <span>Frames are read on this device and are never saved or uploaded.</span>
          <button type="button" onClick={onClose}>Done scanning</button>
        </footer>
      </section>
    </div>
  );
}
