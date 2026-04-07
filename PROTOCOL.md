# Swarm Protocol — Wire Format Specification

**Version:** 0.1.0
**Status:** Draft
**Scope:** Mod ↔ Host handshake

This document defines the wire format that mods and the Swarm host runtime use to communicate. It is the contract between the host and every mod author. Changes to this document are changes to the protocol and follow the versioning rules in [§7](#7-versioning).

This v0.1 spec covers **only the handshake**. The full Mod API surface (agents, messages, UI, storage) is specified separately in `MOD_API.md` once it exists.

---

## 1. Overview

Swarm mods run in sandboxed environments — either a cross-origin `<iframe>` or a `Web Worker` — and communicate with the host exclusively via `postMessage`. There is no shared memory, no shared globals, no DOM access across the boundary. The handshake is the first conversation a mod and host have, and it establishes:

- That both sides speak compatible versions of the protocol
- That the mod's declared API requirements can be satisfied by the host
- That the mod loaded is the mod the host expected (not a swap)
- That the mod's permission declarations are visible to the host for later enforcement

If any part of the handshake fails, the host **tears down the sandbox immediately**. There is no partial trust and no graceful degradation. Fail closed.

---

## 2. Transport

### 2.1 Iframe transport

- The mod is loaded into an `<iframe>` with `sandbox="allow-scripts"` (and *only* `allow-scripts` unless additional capabilities are explicitly granted in a later version).
- The iframe **must** be served from a different origin than the host page. A different subdomain (e.g. `mod-{id}.mods.swarmprotocol.fun`) is sufficient and recommended.
- All messages use `iframe.contentWindow.postMessage(msg, targetOrigin)` where `targetOrigin` is the **exact** mod origin. Never `"*"`.
- All inbound messages are received via `window.addEventListener("message", handler)`.

### 2.2 Worker transport

- The mod is loaded as a `Worker` constructed from the entrypoint URL.
- All messages use `worker.postMessage(msg)` and `worker.addEventListener("message", handler)`.
- Workers have no DOM access by definition; this transport is intended for headless mods (data processors, agents, protocol handlers).

### 2.3 Transport-agnostic core

The handshake state machine **must not** know which transport it is using. Both transports implement the same `Transport` interface (`send`, `onMessage`, `close`). All protocol logic is written against this interface.

---

## 3. Message envelope

Every message — in either direction — has this shape:

```json
{
  "type": "swarm:hello",
  "id": "01HXYZ...",
  "timestamp": 1759881600000,
  "payload": { }
}
```

| Field       | Type    | Required | Description                                                       |
|-------------|---------|----------|-------------------------------------------------------------------|
| `type`      | string  | yes      | Message type, namespaced with `swarm:` prefix                     |
| `id`        | string  | yes      | UUID v4 or ULID, unique per message, used for response correlation |
| `timestamp` | number  | yes      | Milliseconds since Unix epoch, set by sender                       |
| `payload`   | object  | depends  | Type-specific data; required for most types                       |

Messages that fail to match this envelope shape are dropped silently (see [§6.1](#61-origin-and-shape-verification)).

---

## 4. Handshake sequence

```
Host                                Sandbox (mod)
 │                                       │
 │  spawn iframe / worker                │
 │ ────────────────────────────────────► │
 │                                       │  loads, imports mod-sdk
 │                                       │  calls swarm.connect()
 │                                       │
 │ ◄──────── swarm:hello ─────────────── │
 │                                       │
 │  validates:                           │
 │   • envelope shape                    │
 │   • origin (iframe transport)         │
 │   • protocolVersion compatibility     │
 │   • manifest schema                   │
 │   • manifest.id matches expected      │
 │   • swarmApi range satisfied          │
 │                                       │
 │  ┌─ success ─────────────────────┐    │
 │ ─┤  swarm:ready                  ├──► │
 │  └───────────────────────────────┘    │  connect() resolves
 │                                       │
 │  ┌─ failure ─────────────────────┐    │
 │ ─┤  swarm:reject                 ├──► │  connect() rejects
 │  │  + tear down sandbox          │    │
 │  └───────────────────────────────┘    │
 │                                       │
```

### 4.1 `swarm:hello` (mod → host)

Sent by the mod-sdk immediately after the sandbox finishes loading. The mod **must not** send any other message before `swarm:hello`, and **must not** send `swarm:hello` more than once per session.

```json
{
  "type": "swarm:hello",
  "id": "01HXYZ...",
  "timestamp": 1759881600000,
  "payload": {
    "protocolVersion": "0.1.0",
    "manifest": {
      "id": "com.acme.hello",
      "name": "Hello Mod",
      "version": "0.1.0",
      "swarmApi": "^0.1.0",
      "entrypoint": {
        "type": "iframe",
        "url": "https://hello.acme.dev/v0.1.0/"
      },
      "permissions": []
    }
  }
}
```

The full manifest schema is defined in `MANIFEST.md`. The host validates the manifest against that schema as part of handshake validation.

### 4.2 `swarm:ready` (host → mod)

Sent by the host on successful handshake validation. After this message is sent, the session is **established** and normal protocol traffic may begin (in v0.1, there is no normal protocol traffic — `swarm:ready` is currently the terminal success state).

```json
{
  "type": "swarm:ready",
  "id": "01HXYZ...",
  "timestamp": 1759881600050,
  "payload": {
    "hostVersion": "0.1.0",
    "apiVersion": "0.1.0",
    "sessionId": "sess_01HXYZ..."
  }
}
```

| Field         | Description                                                                 |
|---------------|-----------------------------------------------------------------------------|
| `hostVersion` | Semver of the host runtime implementation                                   |
| `apiVersion`  | Semver of the Mod API surface (separate from `protocolVersion`)             |
| `sessionId`   | Opaque session identifier, used for correlation in logs and future messages |

### 4.3 `swarm:reject` (host → mod)

Sent by the host on any handshake validation failure. After sending this message, the host **must** tear down the sandbox within 100ms. The mod-sdk's `connect()` promise rejects with an error containing the `code` and `reason`.

```json
{
  "type": "swarm:reject",
  "id": "01HXYZ...",
  "timestamp": 1759881600050,
  "payload": {
    "code": "API_VERSION_MISMATCH",
    "reason": "Mod requires swarmApi ^2.0.0, host provides 0.1.0"
  }
}
```

See [§5](#5-failure-codes) for the complete list of failure codes.

---

## 5. Failure codes

Every handshake failure has a stable, machine-readable `code` and a human-readable `reason`. New codes may be added in minor protocol versions; existing codes **must not** change meaning between versions.

| Code                          | Meaning                                                                 |
|-------------------------------|-------------------------------------------------------------------------|
| `INVALID_HELLO`               | The `swarm:hello` message failed envelope or payload schema validation  |
| `PROTOCOL_VERSION_MISMATCH`   | The mod's `protocolVersion` is not supported by this host               |
| `API_VERSION_MISMATCH`        | The mod's `swarmApi` semver range is not satisfied by the host's `apiVersion` |
| `INVALID_MANIFEST`            | The manifest failed schema validation (see `MANIFEST.md`)               |
| `ID_MISMATCH`                 | The `manifest.id` does not match the mod ID the host expected to load   |
| `TIMEOUT`                     | The mod did not send `swarm:hello` within the timeout window (default 5000ms) |
| `DUPLICATE_HELLO`             | The mod sent more than one `swarm:hello` message                        |
| `INTERNAL_ERROR`              | The host encountered an unexpected error during validation              |

---

## 6. Security rules

These rules are non-negotiable. Implementations that violate them are not conformant.

### 6.1 Origin and shape verification

- **Iframe transport:** every inbound `message` event handler **must** verify `event.origin === expectedModOrigin` before processing the message. Messages from any other origin are dropped silently — no log to the mod, no error response. Silent drop prevents leaking information to attackers probing the host.
- **Worker transport:** origin checks do not apply (workers have no origin), but the worker reference itself acts as the trust boundary — only messages from the specific worker instance are processed.
- Every inbound message **must** be validated against the envelope schema ([§3](#3-message-envelope)) before any field is read. Malformed messages are dropped silently.

### 6.2 No wildcard targets

`postMessage` calls **must** specify an exact target origin (for iframes). Use of `"*"` as the target origin is forbidden anywhere in the host or mod-sdk implementation.

### 6.3 No shared state

The host and mod **must not** share state through any channel other than `postMessage`. `BroadcastChannel`, `SharedArrayBuffer`, `localStorage`, `IndexedDB`, cookies, and any other side channel are forbidden as communication mechanisms between host and mod.

### 6.4 Fail closed

Any error during handshake — validation failure, timeout, transport error, unexpected exception — results in `swarm:reject` (if possible) followed by sandbox teardown. There is no retry, no partial trust, no fallback to a degraded mode.

### 6.5 Timeout

The host **must** enforce a timeout between sandbox spawn and receipt of `swarm:hello`. The default is **5000ms**. If the timeout elapses, the host sends `swarm:reject` with code `TIMEOUT` and tears down the sandbox.

### 6.6 ID binding

Before spawning a sandbox, the host knows which mod ID it intends to load (from the user's project manifest or install state). The `manifest.id` in the `swarm:hello` message **must** match this expected ID exactly. A mismatch results in `swarm:reject` with code `ID_MISMATCH`. This prevents a class of attack where a hijacked entrypoint URL serves a different mod than the user authorized.

---

## 7. Versioning

Two version numbers are tracked independently and both follow [semver](https://semver.org/):

### 7.1 `protocolVersion`

The version of the wire format defined in **this document**. Bumped when message shapes, the handshake sequence, or the transport rules change.

- **Patch** (`0.1.0` → `0.1.1`): clarifications, typo fixes, no implementation changes required.
- **Minor** (`0.1.0` → `0.2.0`): backward-compatible additions — new optional fields, new message types, new failure codes.
- **Major** (`0.1.0` → `1.0.0`): breaking changes — removed or renamed fields, changed semantics, restructured handshake.

### 7.2 `apiVersion`

The version of the Mod API surface defined in `MOD_API.md`. Bumped independently from `protocolVersion`. In v0.1, both happen to be `0.1.0`, but they may diverge.

Mods declare which API version they target via the `swarmApi` field in their manifest, using a standard semver range (`^0.1.0`, `~0.2.3`, etc.). The host satisfies the range if its `apiVersion` matches.

### 7.3 Compatibility windows

After a major bump of either version, the host **should** continue to support the previous major for at least 6 months to give mod authors time to migrate. During the overlap window, the host accepts mods declaring either major version and routes them through the appropriate code path.

### 7.4 Manifests are immutable per version

A published mod version (`com.acme.hello@0.1.0`) is immutable. Bug fixes ship as `0.1.1`. This rule is not enforced by the protocol but is enforced by the registry (when the registry exists).

---

## 8. Reference: complete successful handshake

```
[T+0ms]    Host: spawn iframe with sandbox="allow-scripts", src="https://hello.acme.dev/v0.1.0/"
[T+0ms]    Host: register message listener, expectedOrigin="https://hello.acme.dev"
[T+120ms]  Sandbox: iframe loaded, mod-sdk imported, swarm.connect() called
[T+121ms]  Sandbox → Host: swarm:hello { protocolVersion: "0.1.0", manifest: {...} }
[T+122ms]  Host: verify event.origin === expectedOrigin ✓
[T+122ms]  Host: validate envelope schema ✓
[T+122ms]  Host: validate payload schema ✓
[T+123ms]  Host: check protocolVersion "0.1.0" supported ✓
[T+123ms]  Host: validate manifest against MANIFEST.md schema ✓
[T+123ms]  Host: check manifest.id === "com.acme.hello" (expected) ✓
[T+124ms]  Host: check swarmApi "^0.1.0" satisfied by apiVersion "0.1.0" ✓
[T+125ms]  Host → Sandbox: swarm:ready { hostVersion: "0.1.0", apiVersion: "0.1.0", sessionId: "sess_..." }
[T+126ms]  Sandbox: connect() promise resolves with session info
[T+126ms]  Session established. No further protocol messages defined in v0.1.
```

---

## 9. Reference: rejected handshake (API version mismatch)

```
[T+0ms]    Host: spawn iframe, expectedOrigin="https://newer.acme.dev", apiVersion="0.1.0"
[T+115ms]  Sandbox → Host: swarm:hello { protocolVersion: "0.1.0", manifest: { swarmApi: "^2.0.0", ... } }
[T+116ms]  Host: envelope ✓, payload ✓, protocolVersion ✓, manifest ✓, id ✓
[T+117ms]  Host: swarmApi "^2.0.0" NOT satisfied by apiVersion "0.1.0" ✗
[T+118ms]  Host → Sandbox: swarm:reject { code: "API_VERSION_MISMATCH", reason: "..." }
[T+119ms]  Sandbox: connect() promise rejects with the reason
[T+150ms]  Host: tear down iframe (must complete within 100ms of swarm:reject)
```

---

## 10. Open questions (deferred to later versions)

These are intentionally **not** specified in v0.1 and will be addressed when the corresponding features are added:

- Request/response correlation for normal protocol traffic (the `id` field is reserved for this)
- Pub/sub topic semantics
- Capability negotiation beyond simple permission declaration
- Heartbeats and session liveness
- Reconnect / session resume after transport interruption
- WASM transport
- Mod-to-mod communication (currently forbidden; all communication goes through the host)

---

**End of PROTOCOL.md v0.1.0**
