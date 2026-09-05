"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { authClient } from "../../lib/auth-client";
import { formatPairingCode } from "../../lib/pairing-code";
import {
  DEFAULT_DISPLAY_HEADER,
  HEADER_WIDGET_OPTIONS,
  isHeaderWidgetId,
  resolveDisplayHeader,
  type DisplayHeaderSettings,
  type DisplayWidgetContext,
} from "../../lib/display-widgets";

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

type DisplaySettingsResponse = {
  header?: DisplayHeaderSettings;
  context?: DisplayWidgetContext;
  error?: string;
};

type AuthTransition = "idle" | "creating" | "signing-in" | "signing-out";

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
  const session = authClient.useSession();
  const userId = session.data?.user?.id;
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authTransition, setAuthTransition] = useState<AuthTransition>("idle");
  const [code, setCode] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [fridgeName, setFridgeName] = useState("My fridge");
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [deviceBusy, setDeviceBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [displayHeader, setDisplayHeader] = useState<DisplayHeaderSettings>(DEFAULT_DISPLAY_HEADER);
  const [savedDisplayHeader, setSavedDisplayHeader] = useState<DisplayHeaderSettings>(DEFAULT_DISPLAY_HEADER);
  const [widgetContext, setWidgetContext] = useState<DisplayWidgetContext>({
    fridgeName: "My fridge",
    nextItemName: null,
    itemCount: 0,
    attentionCount: 0,
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

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

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    fetch("/api/display-settings", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as DisplaySettingsResponse;
        if (!response.ok || !body.header || !body.context) {
          throw new Error(body.error ?? "Could not load display settings.");
        }
        return body;
      })
      .then((body) => {
        setDisplayHeader(body.header!);
        setSavedDisplayHeader(body.header!);
        setWidgetContext(body.context!);
        setSettingsLoading(false);
      })
      .catch((caught: unknown) => {
        if (caught instanceof Error && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "Could not load display settings.");
        setSettingsLoading(false);
      });
    return () => controller.abort();
  }, [userId]);

  async function saveDisplayHeader(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (settingsSaving || settingsLoading) return;
    setSettingsSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/display-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(displayHeader),
      });
      const body = await response.json() as DisplaySettingsResponse;
      if (!response.ok || !body.header || !body.context) {
        throw new Error(body.error ?? "Could not save display settings.");
      }
      setDisplayHeader(body.header);
      setSavedDisplayHeader(body.header);
      setWidgetContext(body.context);
      setNotice("Header saved. Your display will pick it up on its next sync.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save display settings.");
    } finally {
      setSettingsSaving(false);
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authTransition !== "idle") return;
    setAuthTransition(mode === "signup" ? "creating" : "signing-in");
    setError("");

    try {
      const result = mode === "signup"
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });

      if (result.error) {
        setError(result.error.message ?? "Account access failed. Please try again.");
        setAuthTransition("idle");
        return;
      }
      window.location.replace(nextPath);
    } catch {
      setError("Account access failed. Please try again.");
      setAuthTransition("idle");
    }
  }

  async function signOut() {
    if (authTransition !== "idle") return;
    setAuthTransition("signing-out");
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message);
      window.location.replace("/account");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign out. Please try again.");
      setAuthTransition("idle");
    }
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

  if (session.isPending || authTransition !== "idle") {
    const transitionCopy = session.isPending
      ? "Opening Fresh First…"
      : authTransition === "creating"
        ? "Creating your account…"
        : authTransition === "signing-out"
          ? "Signing you out…"
          : "Opening your fridge…";

    return (
      <main className="account-shell" id="main-content">
        <p className="account-loading" role="status">{transitionCopy}</p>
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
          <div className={`auth-card-stage${deviceId ? " has-device" : ""}`}>
            <form className="auth-card" onSubmit={submitAuth}>
            <div className="auth-mode" aria-label="Account action">
              <button type="button" aria-pressed={mode === "signup"} onClick={() => { setMode("signup"); setError(""); }}>
                Create account
              </button>
              <button type="button" aria-pressed={mode === "signin"} onClick={() => { setMode("signin"); setError(""); }}>
                Sign in
              </button>
            </div>
            {deviceId ? (
              <p className="device-context">Display <strong>{deviceId}</strong> is waiting. Sign in, then enter its on-screen code.</p>
            ) : null}
            <div className="auth-mode-panel">
              <div className="auth-card-heading">
                <p className="eyebrow">{mode === "signup" ? "Start here" : "Welcome back"}</p>
                <h2>{mode === "signup" ? "Make this fridge yours." : "Open your fridge."}</h2>
              </div>
              {mode === "signup" ? (
                <label>
                  Your name
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    maxLength={80}
                    required
                  />
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
              <button
                className="auth-submit"
                disabled={authTransition !== "idle"}
                type="submit"
              >
                {mode === "signup" ? "Create account" : "Sign in"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
            </form>
          </div>
        </section>
      </main>
    );
  }

  const resolvedHeader = resolveDisplayHeader(displayHeader, widgetContext);
  const settingsChanged = displayHeader.left !== savedDisplayHeader.left
    || displayHeader.right !== savedDisplayHeader.right;

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
          onClick={() => void signOut()}
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

      <section className="display-customizer" aria-labelledby="display-customizer-title">
        <div className="display-customizer-copy">
          <p className="eyebrow">Display widgets</p>
          <h2 id="display-customizer-title">Make the top line useful to you.</h2>
          <p>
            Choose two glanceable widgets for the header. Your expiry list stays
            untouched below it.
          </p>
          <form className="widget-form" onSubmit={saveDisplayHeader}>
            <label>
              Main widget
              <select
                value={displayHeader.left}
                disabled={settingsLoading || settingsSaving}
                onChange={(event) => {
                  const widget = event.target.value;
                  if (isHeaderWidgetId(widget)) {
                    setDisplayHeader((current) => ({ ...current, left: widget }));
                  }
                }}
              >
                {HEADER_WIDGET_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              Side widget
              <select
                value={displayHeader.right}
                disabled={settingsLoading || settingsSaving}
                onChange={(event) => {
                  const widget = event.target.value;
                  if (isHeaderWidgetId(widget)) {
                    setDisplayHeader((current) => ({ ...current, right: widget }));
                  }
                }}
              >
                {HEADER_WIDGET_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <button
              className="auth-submit inline"
              type="submit"
              disabled={!settingsChanged || settingsLoading || settingsSaving}
            >
              {settingsSaving ? "Saving…" : settingsChanged ? "Save header" : "Header saved"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
        <div className="display-customizer-preview" aria-label="E-paper header preview">
          <div className="preview-label">
            <span>Live preview</span>
            <span>Header only</span>
          </div>
          <div className="epaper-preview">
            <div className="epaper-preview-header">
              <strong>{settingsLoading ? "LOADING" : resolvedHeader.left.text}</strong>
              <span>{settingsLoading ? "—" : resolvedHeader.right.text}</span>
            </div>
            <div className="epaper-preview-row"><i /><i /></div>
            <div className="epaper-preview-row"><i /><i /></div>
            <div className="epaper-preview-row"><i /><i /></div>
            <p>ITEMS CONTINUE BELOW</p>
          </div>
        </div>
      </section>
      {notice ? <p className="account-notice" role="status">{notice}</p> : null}
      {error ? <p className="account-error" role="alert">{error}</p> : null}
    </main>
  );
}
