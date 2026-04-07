# Swarm Protocol — Security Model

**Version:** 0.1.0
**Status:** Draft
**Scope:** Host runtime, mod sandboxing, handshake

This document describes Swarm Protocol's security model: the threat model, the sandbox boundaries, the rules every implementation must follow, and the responsible disclosure process for vulnerabilities. It is the security contract between Swarm and the mod authors and users who trust it.

If you are a security researcher, see [§7](#7-reporting-vulnerabilities) for how to report issues.

---

## 1. Threat model

### 1.1 Who we trust

- **The Swarm host runtime.** It runs on the user's device, in the user's browser, on the origin the user navigated to. It is part of the trusted computing base.
- **The user.** The person operating the host. They make trust decisions about which mods to install.

### 1.2 Who we do not trust

- **Mods.** Every mod is treated as **untrusted code from an unknown author**, regardless of who actually wrote it. Mods may be buggy, malicious, hijacked, compromised, or replaced between versions. The host's job is to make sure that no matter what a mod does, it cannot harm the user or other mods.
- **Mod entrypoint origins.** A mod's `entrypoint.url` may serve different content than expected — DNS hijacked, CDN compromised, repository replaced. The host must not assume the content at a URL is the content that was there yesterday.
- **The network.** Standard web threat model: assume MITM is possible on any unencrypted connection. HTTPS is required for all mod entrypoints.
- **Other tabs and other origins.** The host must not leak data to or accept data from windows it did not spawn.

### 1.3 What we are defending against

In rough order of priority:

1. **A malicious mod stealing data from the host or other mods.** This is the top concern. A mod must not be able to read DOM, cookies, localStorage, or any state belonging to the host page or to other mods.
2. **A malicious mod escalating to host privileges.** A mod must not be able to call host code directly, inject into host scripts, or bypass the postMessage boundary.
3. **A malicious mod impersonating another mod.** A mod must not be able to claim a different `id` than it actually has, or hijack the session of another mod.
4. **A compromised mod entrypoint serving different content than the user authorized.** Detected via the `id` binding in the handshake — if the served mod's manifest `id` doesn't match what the host expected, the handshake fails.
5. **Cross-mod information leakage.** Mods must not be able to communicate with each other except through the host, and only when the host's mediation policy allows.
6. **Resource exhaustion / DoS.** A mod consuming excessive memory, CPU, or network. (v0.1 has limited defenses here; see [§5](#5-known-limitations-of-v01).)
7. **Phishing the user via mod UI.** A mod's UI must be visually distinguishable from the host UI so the user always knows what they are interacting with. (Out of scope for v0.1; see [§5](#5-known-limitations-of-v01).)

### 1.4 What we are explicitly **not** defending against

- **A malicious host.** If the user runs a compromised Swarm host, all bets are off. This is true of every browser, every OS, and every plugin system. Mod authors must trust the host they ship to.
- **A user who chooses to install obviously malicious mods despite warnings.** The host warns; the user decides. Defense in depth is good, but ultimate authority rests with the user.
- **Side-channel attacks** (Spectre, timing, cache) **between mods**. The browser's site isolation provides the practical defense here. We rely on it but do not add additional mitigation in v0.1.
- **Vulnerabilities in the browser itself.** We assume the browser correctly enforces same-origin policy, iframe sandboxing, and worker isolation. If the browser is broken, Swarm is broken.

---

## 2. Sandbox model

Mods run in one of two sandbox types. Both enforce the same trust boundary: **the only way a mod can affect the host or other mods is by sending a `postMessage` that the host chooses to act on.**

### 2.1 Iframe sandbox

Used for any mod that needs to render UI.

**Requirements:**
- The iframe element **must** have `sandbox="allow-scripts"` and only `allow-scripts`. Any additional sandbox capability must be explicitly justified and added to a future version of this spec.
- The iframe **must** be loaded from a different origin than the host page. A different subdomain is sufficient and recommended (e.g. `mod-{hash}.mods.swarmprotocol.fun`).
- The iframe **must not** have `allow-same-origin` in its sandbox attribute. With `allow-same-origin` plus a same-origin URL, the iframe could escape the sandbox entirely. Without `allow-same-origin`, the iframe is treated as a unique opaque origin even if served from a related domain.
- The host **must** verify `event.origin` on every inbound message and drop messages from any unexpected origin silently.

**What this gives us:**
- The iframe cannot read or write the host page's DOM.
- The iframe cannot access the host's cookies, localStorage, sessionStorage, or IndexedDB.
- The iframe cannot navigate the top-level window.
- The iframe cannot access other iframes' content.
- The iframe runs in (typically) its own renderer process under site isolation, providing defense against side-channel attacks.

### 2.2 Worker sandbox

Used for headless mods (data processors, agents, anything without UI).

**Requirements:**
- The worker is constructed from the mod's `entrypoint.url`. The browser enforces that the URL is same-origin or properly CORS-permitted.
- The worker **must not** be a `SharedWorker` or a `ServiceWorker`. Only dedicated `Worker`s are allowed in v0.1.
- The worker reference is the trust boundary — only messages from the specific worker instance the host spawned are processed.

**What this gives us:**
- No DOM access of any kind.
- No access to host cookies or DOM storage.
- A separate global scope and event loop.
- Termination is immediate and total via `worker.terminate()`.

### 2.3 What both sandbox types share

- The mod can only interact with the host via `postMessage`.
- Every message must conform to the envelope defined in `PROTOCOL.md` §3.
- The mod has no ambient authority — anything it wants to do (network requests beyond its own origin, storage, UI, calling other mods) requires explicit permission and explicit host mediation.

---

## 3. Required implementation rules

These rules are **non-negotiable**. An implementation that violates any of them is not conformant and must not be called "Swarm Protocol compliant."

### 3.1 Origin verification (iframe transport)

```js
window.addEventListener("message", (event) => {
  if (event.origin !== expectedModOrigin) return;  // SILENT DROP
  // ...
});
```

- The check **must** be exact string equality. No prefix matching, no regex, no "ends with."
- The check **must** happen before any field of the message is read.
- A mismatch results in **silent drop**. Do not log to the mod, do not return an error response, do not increment a counter visible to the mod. Silent drop prevents leaking information to attackers probing the host.

### 3.2 No wildcard postMessage targets

```js
// FORBIDDEN
iframe.contentWindow.postMessage(msg, "*");

// REQUIRED
iframe.contentWindow.postMessage(msg, expectedModOrigin);
```

Use of `"*"` as a `postMessage` target origin is forbidden anywhere in the host runtime or mod-sdk implementation. Code review must reject any PR that introduces it.

### 3.3 Envelope validation before field access

Every inbound message must be validated against the envelope schema (`PROTOCOL.md` §3) **before** any field is read for application logic. Malformed messages are dropped silently.

### 3.4 ID binding

Before spawning a sandbox, the host knows the expected mod `id` (from the user's project state). After receiving `swarm:hello`, the host **must** verify `manifest.id === expectedId` and reject with `ID_MISMATCH` on failure. This catches the case where an entrypoint URL has been compromised to serve a different mod.

### 3.5 Handshake timeout

The host **must** enforce a timeout between sandbox spawn and receipt of `swarm:hello`. Default: **5000 ms**. On timeout, the host sends `swarm:reject` (best effort) and tears down the sandbox. The timeout exists so a mod that never responds cannot hold a sandbox slot indefinitely.

### 3.6 Fail closed on any error

Any error during handshake validation results in `swarm:reject` followed by sandbox teardown within 100ms. There is no retry, no fallback, no degraded mode. A mod that fails the handshake is dead until the user explicitly reinstalls it.

### 3.7 No side channels between host and mod

The host and mod **must not** share state through any channel other than `postMessage`. The following are forbidden as host↔mod communication mechanisms:

- `BroadcastChannel`
- `SharedArrayBuffer`
- `localStorage` / `sessionStorage` / `IndexedDB` accessed by both sides
- Cookies accessible to both origins
- Window names
- URL fragments observed by polling

If a future feature appears to require one of these, it must be added to the protocol spec explicitly, with its own threat analysis.

### 3.8 No `eval` of mod-provided strings

The host **must not** pass any mod-provided string to `eval`, `Function()`, `setTimeout(string)`, `setInterval(string)`, or any equivalent dynamic-code mechanism. Mod data is data, never code.

### 3.9 Single hello per session

A mod may send `swarm:hello` exactly once per sandbox lifetime. A second `swarm:hello` from an already-handshook session is a protocol violation and results in `swarm:reject` with code `DUPLICATE_HELLO` followed by teardown.

---

## 4. Permissions

Permissions are **declared** in `swarm.mod.json` (see `MANIFEST.md` §2.6). In v0.1, the host records and displays declared permissions but does not yet enforce them at the API level, because no API beyond the handshake exists.

When the Mod API ships in v0.2, the host will:

1. Show declared permissions to the user at install time, and require explicit grant.
2. Store the user's grant decisions per (mod id, version, permission) tuple.
3. On every API call from a mod, check the call against the granted set and reject calls that exceed the grant.
4. Treat permission grants as **non-transitive** — granting permission to mod A does not grant it to mod B, even if A and B communicate.
5. Treat permission grants as **non-escalating** — a mod cannot ask for more permissions at runtime; it must publish a new version with an updated manifest, which re-prompts the user.

Mod authors should declare the **minimum** set of permissions their mod actually needs. Over-declaration creates user-friction at install time and signals untrustworthiness. Under-declaration causes API calls to fail at runtime when v0.2 ships.

---

## 5. Known limitations of v0.1

These are known weaknesses that will be addressed in later versions. They are documented here so implementers and users know what v0.1 does and does not protect against.

- **No resource quotas.** A mod can consume unbounded memory or CPU within its sandbox. The host cannot currently enforce per-mod limits beyond what the browser's sandbox provides natively. **Mitigation:** users should only install mods from trusted sources until v0.2 ships quota enforcement.
- **No phishing protection in mod UI.** A mod iframe could render UI that looks like the host's own UI to trick the user. v0.1 does not require visual distinction between host and mod UI. **Mitigation:** the host should render mod UI within an obvious chrome/border indicating "this is mod content" — recommended even though not required by v0.1.
- **No content security policy enforcement on mod entrypoints.** v0.1 does not require mod authors to ship a CSP. Malicious or compromised mod servers can serve whatever they want; the sandbox contains the damage but does not prevent it.
- **No signed manifests.** Manifests are fetched over HTTPS and trusted on first use. There is no cryptographic signature verifying that a manifest came from the publisher. v0.2 will add manifest signing.
- **No revocation.** If a mod is found to be malicious after the fact, there is no built-in mechanism to revoke installations across all hosts. v0.2 will add a revocation list checked at handshake time.
- **No sandbox crash recovery.** If a sandbox crashes, the host detects it via the message channel closing but does not currently auto-restart. This is a UX issue, not a security one.

---

## 6. Recommendations for mod authors

If you are writing a Swarm mod, follow these practices:

1. **Pin your entrypoint URL to a specific version.** Use `https://yourmod.example.com/v1.2.3/` not `https://yourmod.example.com/latest/`. This prevents the same `id@version` from serving different content over time.
2. **Serve your mod over a strong CSP.** Even though v0.1 doesn't require it, a strict `Content-Security-Policy` header on your mod entrypoint protects your own users from injection attacks against your mod.
3. **Declare the minimum permissions you need.** Even though v0.1 doesn't enforce, v0.2 will. Mods that over-declare will get worse install conversion when enforcement ships.
4. **Never assume the host page exists.** Your mod runs in a sandbox with no visibility into the host. Don't try to read `window.parent`, `document.referrer`, or anything else outside your iframe — it won't work and will look suspicious.
5. **Treat all data from the host as untrusted, just like the host treats your data.** The host is sending you data on behalf of users; that data may be malicious. Validate it.
6. **Version your mod with semver.** Mod consumers depend on this. Breaking changes are major bumps. Bug fixes are patch bumps. Don't ship breaking changes as patches.

---

## 7. Reporting vulnerabilities

If you find a security vulnerability in Swarm Protocol — the host runtime, the mod-sdk, the protocol spec, or any official mod — please report it responsibly.

**Do not** open a public GitHub issue.

**Do** send an email to `security@swarmprotocol.fun` with:

1. A clear description of the vulnerability
2. Steps to reproduce, ideally with a minimal test case
3. The affected component and version
4. Your assessment of severity and impact
5. (Optional) your name or handle for credit in the disclosure

We will acknowledge receipt within 72 hours, provide an initial assessment within 7 days, and coordinate a disclosure timeline with you. We do not currently offer a bug bounty but we will publicly credit reporters in the security advisory unless you prefer to remain anonymous.

For critical vulnerabilities (anything that allows a mod to escape its sandbox or read host data), we aim to ship a fix within 7 days of confirmation and publish an advisory within 14 days.

---

## 8. Security checklist for implementers

Before shipping any host runtime or mod-sdk implementation, verify:

- [ ] All `postMessage` calls specify an exact target origin (no `"*"`)
- [ ] All inbound `message` listeners verify `event.origin` before reading any field
- [ ] Origin mismatches result in silent drop (no log, no response)
- [ ] Iframe sandboxes use exactly `sandbox="allow-scripts"` (not `allow-same-origin`)
- [ ] Iframe entrypoints are served from a different origin than the host
- [ ] Worker sandboxes use dedicated `Worker` only (not `SharedWorker` or `ServiceWorker`)
- [ ] Handshake timeout is enforced (default 5000ms)
- [ ] `manifest.id` is bound and verified against the expected id
- [ ] Manifest is validated against the JSON Schema before any field is used
- [ ] All handshake failures result in `swarm:reject` + sandbox teardown within 100ms
- [ ] No mod-provided string is ever passed to `eval`, `Function()`, or equivalent
- [ ] No state is shared between host and mod outside of `postMessage`
- [ ] Duplicate `swarm:hello` messages are rejected with `DUPLICATE_HELLO`
- [ ] All HTTPS requirements on mod entrypoints are enforced (localhost exempt)

---

**End of SECURITY.md v0.1.0**
