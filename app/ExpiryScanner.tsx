"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
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

type ScanRegion = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function cameraErrorMessage(error: unknown) {
  if (!(error instanceof DOMException)) {
    return "The camera could not start. Open Fresh First directly in Chrome, Edge, or Safari and try again.";
  }
  if (error.name === "NotAllowedError" || error.name === "SecurityError") {
    return "Camera access was blocked. Allow camera access for this site in your browser settings, then retry.";
  }
  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "No camera was found on this device. You can scan an existing photo instead.";
  }
  if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    return "The camera is already in use by another app. Close that app, then retry.";
  }
  return "The camera could not start. Check its browser permission, or scan a photo instead.";
}

function drawEnhancedRegion(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  canvas: HTMLCanvasElement,
  region: ScanRegion,
) {
  const sourceX = Math.max(0, Math.min(sourceWidth - 1, region.left));
  const sourceY = Math.max(0, Math.min(sourceHeight - 1, region.top));
  const cropWidth = Math.max(1, Math.min(sourceWidth - sourceX, region.width));
  const cropHeight = Math.max(1, Math.min(sourceHeight - sourceY, region.height));
  const outputWidth = Math.round(Math.min(2200, Math.max(1600, cropWidth)));
  const outputHeight = Math.round(outputWidth * (cropHeight / cropWidth));

  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.filter = "grayscale(1) contrast(2)";
  context.drawImage(
    source,
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

function captureScanBand(
  video: HTMLVideoElement,
  frame: HTMLDivElement,
  canvas: HTMLCanvasElement,
) {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight) return false;

  const videoBounds = video.getBoundingClientRect();
  const frameBounds = frame.getBoundingClientRect();
  if (!videoBounds.width || !videoBounds.height) return false;

  // The preview uses object-fit: cover. Translate the visible guide rectangle
  // back into source-camera pixels so mobile portrait video is not over-cropped.
  const scale = Math.max(
    videoBounds.width / sourceWidth,
    videoBounds.height / sourceHeight,
  );
  const hiddenX = (sourceWidth * scale - videoBounds.width) / 2;
  const hiddenY = (sourceHeight * scale - videoBounds.height) / 2;
  const sourceX = (frameBounds.left - videoBounds.left + hiddenX) / scale;
  const sourceY = (frameBounds.top - videoBounds.top + hiddenY) / scale;
  const cropWidth = frameBounds.width / scale;
  const cropHeight = frameBounds.height / scale;

  return drawEnhancedRegion(
    video,
    sourceWidth,
    sourceHeight,
    canvas,
    { left: sourceX, top: sourceY, width: cropWidth, height: cropHeight },
  );
}

async function recognizePhotoDate(
  worker: OcrWorker,
  file: File,
  onPass: (pass: number, total: number) => void,
) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const canvas = document.createElement("canvas");
  const regions: ScanRegion[] = [
    { left: bitmap.width * 0.04, top: bitmap.height * 0.27, width: bitmap.width * 0.92, height: bitmap.height * 0.4 },
    { left: bitmap.width * 0.04, top: bitmap.height * 0.02, width: bitmap.width * 0.92, height: bitmap.height * 0.4 },
    { left: bitmap.width * 0.04, top: bitmap.height * 0.58, width: bitmap.width * 0.92, height: bitmap.height * 0.4 },
    { left: 0, top: 0, width: bitmap.width, height: bitmap.height },
  ];

  try {
    for (let index = 0; index < regions.length; index += 1) {
      onPass(index + 1, regions.length);
      if (!drawEnhancedRegion(bitmap, bitmap.width, bitmap.height, canvas, regions[index])) {
        continue;
      }
      const result = await worker.recognize(canvas);
      const candidate = extractExpiryCandidates(result.data.text)[0];
      if (candidate) return candidate;
    }
    return null;
  } finally {
    bitmap.close();
  }
}

export function ExpiryScanner({ open, onClose, onSave }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<OcrWorker | null>(null);
  const workerPromiseRef = useRef<Promise<OcrWorker> | null>(null);
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
  const [retryKey, setRetryKey] = useState(0);
  const [photoBusy, setPhotoBusy] = useState(false);

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
    let cameraStarted = false;
    let permissionTimer: number | undefined;

    async function scanLoop(worker: OcrWorker) {
      while (!cancelled) {
        if (candidateRef.current) {
          await wait(250);
          continue;
        }

        const video = videoRef.current;
        const frame = frameRef.current;
        const canvas = canvasRef.current;
        if (!video || !frame || !canvas || !captureScanBand(video, frame, canvas)) {
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
      async function prepareWorker() {
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
          throw new Error("Scanner closed");
        }
        workerRef.current = worker;
        await worker.setParameters({
          tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
          tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-./: ",
          preserve_interword_spaces: "1",
          user_defined_dpi: "300",
        });
        return worker;
      }

      const workerPromise = prepareWorker();
      workerPromiseRef.current = workerPromise;
      void workerPromise.catch(() => undefined);

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          if (!cancelled) {
            setScannerState("error");
            setStatusText(
              "This browser cannot open a live camera. Open Fresh First directly in Chrome, Edge, or Safari—or scan a photo instead.",
            );
          }
          return;
        }

        setStatusText("Waiting for camera permission…");
        permissionTimer = window.setTimeout(() => {
          if (!cancelled) {
            setStatusText(
              "Still waiting for camera permission. Check for a browser prompt, or scan a photo instead.",
            );
          }
        }, 4000);

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 2560 },
            height: { ideal: 1440 },
          },
        });
        window.clearTimeout(permissionTimer);
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        cameraStarted = true;
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack?.getCapabilities) {
          const capabilities = videoTrack.getCapabilities() as MediaTrackCapabilities & {
            focusMode?: string[];
          };
          if (capabilities.focusMode?.includes("continuous")) {
            await videoTrack.applyConstraints({
              advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
            }).catch(() => undefined);
          }
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        setStatusText("Preparing private on-device text recognition…");
        const worker = await workerPromise;
        setProgress(100);
        setScannerState("scanning");
        setStatusText("Looking for a printed expiry date…");
        await scanLoop(worker);
      } catch (error) {
        if (permissionTimer) window.clearTimeout(permissionTimer);
        if (cancelled) return;
        setScannerState("error");
        setStatusText(
          cameraStarted && !(error instanceof DOMException)
            ? "The on-device date reader could not start. Refresh the page and retry, or enter the item manually."
            : cameraErrorMessage(error),
        );
      }
    }

    void start();
    return () => {
      cancelled = true;
      if (permissionTimer) window.clearTimeout(permissionTimer);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      const worker = workerRef.current;
      workerRef.current = null;
      workerPromiseRef.current = null;
      if (worker) void worker.terminate().catch(() => undefined);
    };
  }, [open, retryKey]);

  function retryCamera() {
    setScannerState("loading");
    setStatusText("Retrying camera…");
    setProgress(0);
    setRetryKey((key) => key + 1);
  }

  async function scanPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || photoBusy) return;

    setPhotoBusy(true);
    setScannerState("loading");
    setStatusText("Reading the selected photo on this device…");
    try {
      const worker = await workerPromiseRef.current;
      if (!worker) throw new Error("OCR unavailable");
      const detected = await recognizePhotoDate(worker, file, (pass, total) => {
        setStatusText(`Checking photo area ${pass} of ${total}…`);
      });
      if (!detected) {
        setScannerState("error");
        setStatusText(
          "No clear expiry date was found. Move closer until the stamp is sharp, avoid glare, and try again.",
        );
        return;
      }
      lockedDateRef.current = detected.isoDate;
      setCandidate(detected);
      setScannerState("reviewing");
      setStatusText("Date found in photo");
    } catch {
      setScannerState("error");
      setStatusText("The photo could not be read. Retry the camera or enter the item manually.");
    } finally {
      setPhotoBusy(false);
    }
  }

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
          <div ref={frameRef} className="scanner-frame" aria-hidden="true">
            <span>Fill this band with the printed date</span>
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
            <div>
              <strong>{sessionCount} {sessionCount === 1 ? "item" : "items"} added this session</strong>
              <p>
                {scannerState === "error"
                  ? statusText
                  : "Move close enough that the stamp is sharp, avoid glare, and hold still for 1–2 seconds. The date locks after it is read twice."}
              </p>
            </div>
            <div className="scanner-fallback-actions">
              {scannerState === "error" ? (
                <button type="button" onClick={retryCamera}>Retry camera</button>
              ) : null}
              {scannerState !== "scanning" ? (
                <label className="scan-photo-button">
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(event) => void scanPhoto(event)}
                    disabled={photoBusy}
                  />
                  {photoBusy ? "Reading photo…" : "Scan a photo instead"}
                </label>
              ) : null}
            </div>
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
