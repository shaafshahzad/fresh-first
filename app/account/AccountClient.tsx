"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { authClient } from "../../lib/auth-client";
import { formatPairingCode } from "../../lib/pairing-code";

type Device = {
  id: string;
  name: string;
  claimedAt: string | null;
  lastSeenAt: string | null;
};

type DeviceResponse = {
  fridge?: { id: string; name: string };
  devices?: Device[];
  error?: string;
};

function lastSeen(value: string | null) {
  if (!value) return "Waiting for first refresh";
  return `Last refreshed ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))}`;
}

export function AccountClient({
  nextPath,
  deviceId,
}: {
  nextPath: string;
  deviceId: string;
}) {
  const router = useRouter();
  const session = authClient.useSession();
  const userId = session.data?.user?.id;
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [code, setCode] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [fridgeName, setFridgeName] = useState("My fridge");
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [deviceBusy, setDeviceBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function loadDevices() {
    setDevicesLoading(true);
    try {
      const response = await fetch("/api/devices", { cache: "no-store" });
      const body = await response.json() as DeviceResponse;
      if (!response.ok) throw new Error(body.error ?? "Could not load displays.");
      setDevices(body.devices ?? []);
      setFridgeName(body.fridge?.name ?? "My fridge");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load displays.");
    } finally {
      setDevicesLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    fetch("/api/devices", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as DeviceResponse;
        if (!response.ok) throw new Error(body.error ?? "Could not load displays.");
        return body;
      })
      .then((body) => {
        setDevices(body.devices ?? []);
        setFridgeName(body.fridge?.name ?? "My fridge");
        setDevicesLoading(false);
      })
      .catch((caught: unknown) => {
        if (caught instanceof Error && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Could not load displays.");
        setDevicesLoading(false);
      });
    return () => controller.abort();
  }, [userId]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authBusy) return;
    setAuthBusy(true);
    setError("");

    const result = mode === "signup"
      ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
      : await authClient.signIn.email({ email: email.trim(), password });

    if (result.error) {
      setError(result.error.message ?? "Account access failed. Please try again.");
      setAuthBusy(false);
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  async function pairDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deviceBusy) return;
    setDeviceBusy("pair");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, deviceId: deviceId || undefined }),
      });
      const body = await response.json() as DeviceResponse & { device?: Device };
      if (!response.ok || !body.device) {
        throw new Error(body.error ?? "Could not pair this display.");
      }
      setCode("");
      setNotice(`${body.device.name} is now showing ${body.fridge?.name ?? fridgeName}.`);
      await loadDevices();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not pair this display.");
    } finally {
      setDeviceBusy("");
    }
  }

  async function unlinkDevice(device: Device) {
    if (deviceBusy) return;
    setDeviceBusy(device.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/devices?id=${encodeURIComponent(device.id)}`, {
        method: "DELETE",
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not unlink this display.");
      setDevices((current) => current.filter((candidate) => candidate.id !== device.id));
      setNotice(`${device.name} has been unlinked and can be paired again.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not unlink this display.");
    } finally {
      setDeviceBusy("");
    }
  }

  if (session.isPending) {
    return (
      <main className="account-shell" id="main-content">
        <p className="account-loading">Opening Fresh First…</p>
      </main>
    );
  }

  if (!session.data?.user) {
    return (
      <main className="account-shell" id="main-content">
        <header className="account-brand">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">F</span>
            <span>Fresh First</span>
          </Link>
          <span>Account</span>
        </header>
        <section className="auth-layout">
          <div className="auth-intro">
            <p className="eyebrow">Your fridge follows you</p>
            <h1>One account. Every fresh thing.</h1>
            <p>
              Add groceries from your phone and keep the same ordered list on your kitchen display.
            </p>
            <div className="device-path" aria-label="How Fresh First connects">
              <span><b>1</b>Create your account</span>
              <span><b>2</b>Pair the display code</span>
              <span><b>3</b>Tap the NFC tag to add</span>
            </div>
          </div>
          <form className="auth-card" onSubmit={submitAuth}>
            <div className="auth-mode" aria-label="Account action">
              <button type="button" aria-pressed={mode === "signup"} onClick={() => { setMode("signup"); setError(""); }}>
                Create account
              </button>
              <button type="button" aria-pressed={mode === "signin"} onClick={() => { setMode("signin"); setError(""); }}>
                Sign in
              </button>
            </div>
            <div className="auth-card-heading">
              <p className="eyebrow">{mode === "signup" ? "Start here" : "Welcome back"}</p>
              <h2>{mode === "signup" ? "Make this fridge yours." : "Open your fridge."}</h2>
            </div>
            {deviceId ? (
              <p className="device-context">Display <strong>{deviceId}</strong> is waiting. Sign in, then enter its on-screen code.</p>
            ) : null}
            {mode === "signup" ? (
              <label>
                Your name
                <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={80} required />
              </label>
            ) : null}
            <label>
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required />
              {mode === "signup" ? <small>At least eight characters</small> : null}
            </label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="auth-submit" disabled={authBusy} type="submit">
              {authBusy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="account-shell" id="main-content">
      <header className="account-brand">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">F</span>
          <span>Fresh First</span>
        </Link>
        <Link className="account-back" href="/">Back to fridge</Link>
      </header>
      <section className="account-heading">
        <div>
          <p className="eyebrow">Account & displays</p>
          <h1>{session.data.user.name}&apos;s {fridgeName.toLowerCase()}</h1>
          <p>{session.data.user.email}</p>
        </div>
        <button
          className="text-button"
          type="button"
          onClick={async () => {
            await authClient.signOut();
            router.push("/account");
            router.refresh();
          }}
        >
          Sign out
        </button>
      </section>

      <section className="pairing-grid">
        <form className="pair-card" onSubmit={pairDevice}>
          <div className="pair-card-heading">
            <span className="pair-symbol" aria-hidden="true">⌁</span>
            <div>
              <p className="eyebrow">Connect a display</p>
              <h2>Enter the code on its screen.</h2>
            </div>
          </div>
          {deviceId ? <p className="device-context">Pairing <strong>{deviceId}</strong></p> : null}
          <label htmlFor="pairing-code">Pairing code</label>
          <input
            className="pair-code-input"
            id="pairing-code"
            value={code}
            onChange={(event) => setCode(formatPairingCode(event.target.value))}
            placeholder="ABCD-2345"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={9}
            required
          />
          <button className="auth-submit" disabled={deviceBusy === "pair" || code.replace("-", "").length !== 8} type="submit">
            {deviceBusy === "pair" ? "Connecting…" : "Connect display"}
            <span aria-hidden="true">→</span>
          </button>
          <p className="pair-help">The code changes periodically and can only pair an unclaimed display.</p>
        </form>

        <div className="device-list-card">
          <div className="device-list-heading">
            <div>
              <p className="eyebrow">Connected to {fridgeName}</p>
              <h2>Your displays</h2>
            </div>
            <span>{devices.length}</span>
          </div>
          {devicesLoading ? (
            <p className="device-empty">Checking your displays…</p>
          ) : devices.length === 0 ? (
            <p className="device-empty">No display paired yet. Your phone list is ready whenever you are.</p>
          ) : (
            <div className="device-list">
              {devices.map((device) => (
                <article key={device.id}>
                  <span className="device-dot" aria-hidden="true" />
                  <div>
                    <strong>{device.name}</strong>
                    <small>{device.id} · {lastSeen(device.lastSeenAt)}</small>
                  </div>
                  <button type="button" disabled={Boolean(deviceBusy)} onClick={() => void unlinkDevice(device)}>
                    {deviceBusy === device.id ? "Unlinking…" : "Unlink"}
                  </button>
                </article>
              ))}
            </div>
          )}
          <Link className="display-preview-link" href="/display">Preview fridge display <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
      {notice ? <p className="account-notice" role="status">{notice}</p> : null}
      {error ? <p className="account-error" role="alert">{error}</p> : null}
    </main>
  );
}
