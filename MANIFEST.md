# Swarm Mod Manifest Specification

**Version:** 0.1.0
**Status:** Draft
**File name:** `swarm.mod.json` (at the root of every mod repository)

This document defines the structure of `swarm.mod.json`, the manifest file every Swarm mod must provide. The manifest is the single source of truth about a mod's identity, version, entrypoint, and capabilities. It is consumed by the host runtime during the handshake (see `PROTOCOL.md`) and by the registry when the registry exists.

This v0.1 spec defines the **minimum viable manifest** required for the handshake. Fields for marketplace listing, pricing, UI panels, and richer metadata will be added in later versions.

---

## 1. Minimal example

```json
{
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
```

This is a complete, valid v0.1 manifest. Every field shown is required.

---

## 2. Field reference

### 2.1 `id` (string, required)

A globally unique identifier for the mod, in **reverse-DNS notation**.

**Format:** `^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*)+$`

- Lowercase only
- Must contain at least one dot (i.e., must have a namespace)
- Each segment starts with a letter, may contain letters, digits, and hyphens
- Maximum length: 128 characters

**Valid examples:**
- `com.acme.hello`
- `dev.swarmprotocol.example-agent`
- `org.openmod.summarizer`

**Invalid examples:**
- `hello` (no namespace)
- `Com.Acme.Hello` (uppercase)
- `123.acme.hello` (segment starts with digit)
- `com..acme.hello` (empty segment)

The `id` is **immutable** for the life of the mod. Renaming a mod means publishing a new mod with a new id. The host uses `id` to bind the spawned sandbox to the expected mod (see `PROTOCOL.md` §6.6).

### 2.2 `name` (string, required)

A human-readable display name for the mod.

- Length: 1–64 characters
- Any printable Unicode allowed
- Should not include version numbers (use `version` for that)

**Examples:** `"Hello Mod"`, `"Acme Summarizer"`, `"日本語エージェント"`

### 2.3 `version` (string, required)

The semver version of this specific mod release.

- Must be a valid [semver 2.0.0](https://semver.org/) string
- Must not include a leading `v`
- Pre-release and build metadata are allowed (`0.1.0-beta.1`, `1.0.0+build.42`)

**Valid:** `0.1.0`, `1.2.3`, `2.0.0-rc.1`
**Invalid:** `v1.0.0`, `1.0`, `latest`

A given `id@version` combination is **immutable** once published. Bug fixes ship as a new patch version.

### 2.4 `swarmApi` (string, required)

A semver **range** specifying which versions of the Swarm Mod API this mod is compatible with. The host satisfies the range if its `apiVersion` (advertised in `swarm:ready`) matches.

- Must be a valid semver range
- Use caret ranges (`^0.1.0`) for normal compatibility
- Use tilde ranges (`~0.1.0`) for stricter pinning
- Use exact versions (`0.1.0`) only when you really mean it

**Examples:**
- `"^0.1.0"` — accepts any 0.1.x (caret on 0.x is conservative)
- `"^1.0.0"` — accepts any 1.x.x
- `"~0.1.5"` — accepts 0.1.5 through 0.1.x but not 0.2.0
- `">=1.0.0 <2.0.0"` — explicit range

If the host's API version does not satisfy this range, the handshake fails with code `API_VERSION_MISMATCH`.

### 2.5 `entrypoint` (object, required)

Specifies how the mod is loaded into a sandbox.

```json
{
  "entrypoint": {
    "type": "iframe",
    "url": "https://hello.acme.dev/v0.1.0/"
  }
}
```

#### `entrypoint.type` (string, required)

One of: `"iframe"` or `"worker"`.

- `"iframe"` — mod runs in a sandboxed cross-origin `<iframe>`. Can render UI. Required for any mod that needs to display anything to the user.
- `"worker"` — mod runs in a `Web Worker`. No DOM access. Use for headless mods (data processors, agents, protocol handlers).

A future `"wasm"` value is reserved for the WASM component transport. It is **not** valid in v0.1.

#### `entrypoint.url` (string, required)

The absolute URL the host loads to start the mod.

- Must be a valid absolute URL
- Must use `https://` (not `http://`, except `http://localhost` and `http://127.0.0.1` for dev mode)
- For `iframe` mods, must be served from a **different origin** than the Swarm host page
- Should be version-pinned in the URL path (e.g. `https://hello.acme.dev/v0.1.0/`) so updating the manifest version forces a new URL and avoids cache poisoning

### 2.6 `permissions` (array of strings, required)

The complete set of permissions this mod declares it needs. In v0.1 the host **records and displays** declared permissions but does not enforce them at the API level (because no API beyond the handshake exists yet). Mods must still declare permissions truthfully — enforcement will be added in v0.2 and mods that under-declare will break.

- Must be an array (may be empty)
- Each entry is a permission string in the format `namespace:action[:scope]`
- Unknown permission strings are recorded but ignored

**Examples (none enforced in v0.1):**
- `"swarm:agents.read"`
- `"swarm:messages.send"`
- `"net:fetch:api.acme.dev"`
- `"storage:local:5MB"`
- `"ui:panel"`

The full permission taxonomy will be defined in `MOD_API.md` when the Mod API ships. For v0.1, declare an empty array `[]` if your mod only completes the handshake and does nothing else.

---

## 3. Complete v0.1 schema

This is the JSON Schema (Draft 2020-12) that the host validates manifests against. Any field not listed here is **forbidden in v0.1** and causes a manifest to fail validation. (This is intentional — strict validation now prevents version drift later.)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://swarmprotocol.fun/schemas/swarm.mod.json/0.1.0",
  "title": "Swarm Mod Manifest",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "name", "version", "swarmApi", "entrypoint", "permissions"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9-]*)+$",
      "maxLength": 128
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 64
    },
    "version": {
      "type": "string",
      "pattern": "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$"
    },
    "swarmApi": {
      "type": "string",
      "minLength": 1
    },
    "entrypoint": {
      "type": "object",
      "additionalProperties": false,
      "required": ["type", "url"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["iframe", "worker"]
        },
        "url": {
          "type": "string",
          "format": "uri"
        }
      }
    },
    "permissions": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

---

## 4. Validation rules beyond the schema

The host performs these checks **in addition to** JSON Schema validation. Failures at this stage produce `INVALID_MANIFEST` during the handshake.

1. **`swarmApi` is a valid semver range.** JSON Schema can't easily express this; the host parses it with a semver library and rejects on parse error.
2. **`entrypoint.url` uses HTTPS** (or localhost for dev mode).
3. **`entrypoint.url` origin differs from host origin** when `entrypoint.type === "iframe"`.
4. **Manifest size is under 64 KB.** Larger manifests are rejected to bound parsing cost.

---

## 5. Examples

### 5.1 Minimal headless mod (worker)

```json
{
  "id": "dev.swarmprotocol.echo",
  "name": "Echo",
  "version": "0.1.0",
  "swarmApi": "^0.1.0",
  "entrypoint": {
    "type": "worker",
    "url": "https://echo.swarmprotocol.fun/v0.1.0/worker.js"
  },
  "permissions": []
}
```

### 5.2 UI mod with declared (but not yet enforced) permissions

```json
{
  "id": "com.acme.summarizer",
  "name": "Acme Summarizer",
  "version": "1.4.2",
  "swarmApi": "^0.1.0",
  "entrypoint": {
    "type": "iframe",
    "url": "https://summarizer.acme.dev/v1.4.2/"
  },
  "permissions": [
    "swarm:messages.read",
    "swarm:messages.send",
    "net:fetch:api.acme.dev",
    "ui:panel"
  ]
}
```

### 5.3 Invalid: missing required field

```json
{
  "id": "com.acme.broken",
  "name": "Broken",
  "version": "0.1.0",
  "entrypoint": { "type": "iframe", "url": "https://broken.acme.dev/" },
  "permissions": []
}
```
**Why it fails:** `swarmApi` is missing. Validation error: `required property 'swarmApi' missing`.

### 5.4 Invalid: extra field

```json
{
  "id": "com.acme.future",
  "name": "Future",
  "version": "0.1.0",
  "swarmApi": "^0.1.0",
  "entrypoint": { "type": "iframe", "url": "https://future.acme.dev/" },
  "permissions": [],
  "pricing": { "model": "free" }
}
```
**Why it fails:** `pricing` is not a v0.1 field. `additionalProperties: false` rejects it. (When `pricing` is added in a later spec version, this manifest will become valid.)

### 5.5 Invalid: bad id format

```json
{
  "id": "MyCoolMod",
  "name": "My Cool Mod",
  "version": "0.1.0",
  "swarmApi": "^0.1.0",
  "entrypoint": { "type": "iframe", "url": "https://example.com/" },
  "permissions": []
}
```
**Why it fails:** `id` must be lowercase reverse-DNS with at least one dot. `MyCoolMod` matches neither requirement.

---

## 6. Forward compatibility notes

Fields **planned** for future spec versions (do not include them in v0.1 manifests):

- `author` — name, url, publisher id
- `description`, `homepage`, `repository`, `license`
- `categories`, `screenshots`, `icon`
- `ui.panels` — declared UI surfaces
- `pricing` — free / one-time / subscription / metered
- `dependencies` — other mods this mod depends on
- `minSwarmVersion` — minimum host runtime version

When these ship, they will be added as **optional** fields. Existing v0.1 manifests will remain valid. The schema's `additionalProperties: false` will be relaxed to allow them in their corresponding spec version.

---

**End of MANIFEST.md v0.1.0**
