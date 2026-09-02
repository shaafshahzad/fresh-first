import { experimental_transcribe as transcribe } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { execFile } from "node:child_process";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const execFileAsync = promisify(execFile);
const MAX_AUDIO_BYTES = 8_000_000;
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/flac",
  "audio/m4a",
  "audio/mp3",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "video/mp4",
  "video/webm",
]);
const LOCAL_MODEL_PATH = process.env.WHISPER_MODEL_PATH ?? path.join(
  os.homedir(),
  "Library",
  "Application Support",
  "Fresh First",
  "models",
  "ggml-small.en-q5_1.bin",
);
const LOCAL_WHISPER_PATH = process.env.WHISPER_CLI_PATH ?? "/opt/homebrew/bin/whisper-cli";
const GROCERY_PROMPT = [
  "Grocery items and expiry dates.",
  "Examples: Orange juice, 27 October 2026.",
  "Cream cheese, 9 November 2026.",
  "Greek yogurt, 25 September 2026.",
].join(" ");

let localTranscriptionQueue = Promise.resolve();

function publicError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function cleanTranscript(value: string) {
  const text = value
    .replace(/^\s*["“]|["”]\s*$/g, "")
    .replace(/\[(?:blank_audio|silence|music|inaudible)\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length <= 500 ? text : text.slice(0, 500).trim();
}

function extensionFor(type: string) {
  if (type.includes("mp4") || type.includes("m4a")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("wav")) return "wav";
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
  if (type.includes("flac")) return "flac";
  return "webm";
}

async function localWhisperAvailable() {
  if (process.env.NODE_ENV !== "development") return false;
  try {
    await Promise.all([access(LOCAL_WHISPER_PATH), access(LOCAL_MODEL_PATH)]);
    return true;
  } catch {
    return false;
  }
}

async function transcribeLocally(audio: Uint8Array, mediaType: string) {
  const run = async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "fresh-first-voice-"));
    const inputPath = path.join(directory, `input.${extensionFor(mediaType)}`);
    const wavPath = path.join(directory, "converted.wav");
    try {
      await writeFile(inputPath, audio);
      await execFileAsync(
        "ffmpeg",
        [
          "-loglevel", "error",
          "-y",
          "-i", inputPath,
          "-ar", "16000",
          "-ac", "1",
          "-c:a", "pcm_s16le",
          wavPath,
        ],
        { timeout: 20_000, maxBuffer: 1_000_000 },
      );
      const { stdout } = await execFileAsync(
        LOCAL_WHISPER_PATH,
        [
          "-ng",
          "-m", LOCAL_MODEL_PATH,
          "-f", wavPath,
          "-l", "en",
          "-nt",
          "-np",
          "--prompt", GROCERY_PROMPT,
        ],
        { timeout: 35_000, maxBuffer: 1_000_000 },
      );
      return cleanTranscript(stdout);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  };

  const result = localTranscriptionQueue.then(run, run);
  localTranscriptionQueue = result.then(() => undefined, () => undefined);
  return result;
}

async function transcribeWithOpenAI(file: File) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const formData = new FormData();
  formData.append("file", file, file.name || `grocery.${extensionFor(file.type)}`);
  formData.append("model", "gpt-4o-mini-transcribe");
  formData.append("language", "en");
  formData.append("prompt", GROCERY_PROMPT);
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: formData,
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`OpenAI transcription returned ${response.status}`);
  const result = await response.json() as { text?: unknown };
  if (typeof result.text !== "string") throw new Error("OpenAI returned no transcript");
  return cleanTranscript(result.text);
}

async function transcribeWithGateway(audio: Uint8Array) {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    return null;
  }
  const result = await transcribe({
    model: gateway.transcriptionModel("openai/gpt-4o-mini-transcribe"),
    audio,
    providerOptions: {
      openai: {
        language: "en",
        prompt: GROCERY_PROMPT,
      },
    },
  });
  return cleanTranscript(result.text);
}

export async function POST(request: Request) {
  const requestLength = Number(request.headers.get("content-length") ?? 0);
  if (requestLength > MAX_AUDIO_BYTES + 100_000) {
    return publicError("That voice phrase is too large. Say one item at a time.", 413);
  }

  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return publicError("Origin mismatch", 403);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return publicError("The recorded audio could not be read.", 400);
  }

  const file = formData.get("audio");
  if (!(file instanceof File)) {
    return publicError("A recorded audio phrase is required.", 400);
  }
  const mediaType = file.type.toLowerCase().split(";")[0];
  if (!ALLOWED_AUDIO_TYPES.has(mediaType)) {
    return publicError("This browser recorded an unsupported audio format.", 415);
  }
  if (!file.size || file.size > MAX_AUDIO_BYTES) {
    return publicError("That voice phrase is empty or too large.", 413);
  }

  try {
    const audio = new Uint8Array(await file.arrayBuffer());
    let text: string | null;
    let provider: "local" | "openai" | "vercel";
    if (await localWhisperAvailable()) {
      text = await transcribeLocally(audio, mediaType);
      provider = "local";
    } else {
      text = await transcribeWithOpenAI(file);
      provider = "openai";
      if (text === null) {
        text = await transcribeWithGateway(audio);
        provider = "vercel";
      }
    }

    if (text === null) {
      return publicError("Voice transcription is not configured on this server", 503);
    }
    return Response.json({ text, provider });
  } catch (error) {
    console.error("Voice transcription failed", error);
    return publicError("The voice phrase could not be transcribed", 503);
  }
}
