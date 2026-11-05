# Security

The position behind briefing §7. This is an engineering position, not legal advice;
the client's data protection officer has to review it.

## Design

The strongest measure is that there is nothing to attack on the server. Photos are
processed in the employee's browser, and the app has no route that accepts a file, no
database and no customer data at rest.

## Uploading photos and folders

"Upload" here means opening a file in the browser. Each file passes these checks, and
`e2e/` proves them in a real browser.

| Measure | Stops | Where |
|---|---|---|
| Type read from the file's bytes, not its name | Disguised files | `io/upload.ts` |
| 30 MB limit per file | Oversized files | `io/upload.ts` |
| 100 MP limit read from the header, before decoding | Decompression bombs | `io/upload.ts` |
| PDF zoom capped before any canvas exists | PDFs declaring huge pages | `browser/decode.ts` |
| End-of-image marker check | Interrupted transfers, half-grey photos | `io/upload.ts` |
| Redraw to pixels, nothing else kept | EXIF/GPS, hidden payloads, PDF scripts | `browser/decode.ts` |
| Folder cap of 50 files; system files skipped; duplicates refused | Runaway folders | `io/upload.ts` |
| File names shown, never exported | Customer names leaking into exports | `browser/folder.ts` |
| Resolution and exposure warnings | Messenger copies, unusable photos | `vision/photo-quality.ts` |

There is **no virus scan**, because files are only drawn as images: never executed,
stored or forwarded. The employee's own antivirus stays responsible. A scan becomes
mandatory the moment server storage is added.

## Application

- **Login:** HTTP Basic behind HTTPS, compared in constant time. Production refuses
  every request if credentials are missing or the password is under 12 characters.
- **Guessing:** 10 failed logins lock that client out for 15 minutes. State is per
  process. The host's proxy must overwrite `x-forwarded-for`, or a guesser could
  rotate it.
- **Logs:** failed logins log an event name only, with no address or username.
- **Browser policy:** `connect-src 'self' blob:`, `img-src` and `form-action 'none'`
  block requests, image beacons and forms to other hosts. Browsers do not let a CSP
  block a page navigating away, so a compromised dependency could still leak data
  that way. Keeping dependencies few and audited covers that gap.
- **Headers:** CSP, HSTS, `nosniff`, `frame-ancestors 'none'`, no referrer, same-origin
  opener and resource policies. No `X-Powered-By`.
- **Exports:** CSV defuses spreadsheet formulas, PDF escapes its text, and DXF contains
  no free text at all.
- **Dependencies:** `pnpm audit --prod` must be clean; see the `test-security` skill.

## Known weaknesses

- **`script-src` allows `unsafe-eval` and `unsafe-inline`.** `unsafe-eval` is needed
  because `heic2any` builds functions at run time; without it, iPhone HEIC photos
  hung forever. `unsafe-inline` covers Next.js bootstrap scripts. So the CSP does not
  stop injected script from running; it only limits how that script can send data. The app renders user
  text through React and has no server data, so the injection surface is small.
  Replacing `heic2any` with a WebAssembly-only decoder would remove `unsafe-eval`, and
  nonces would remove `unsafe-inline`.
- **`heic2any` is unmaintained** (0.0.4). It parses untrusted files, though inside a
  worker with the same no-network policy.
- **One shared password.** No 2FA, SSO, roles or per-person access log, which §7 wants.
- **The lockout resets on restart** and does not span several server instances.

## Before going live

1. Host in the EU, with a DPA, over HTTPS only.
2. Set `APP_USERNAME` and a long random `APP_PASSWORD`.
3. Make sure the proxy overwrites `x-forwarded-for`.
4. Decide on SSO or 2FA with the client's IT.
5. Have the data protection officer review this file.
