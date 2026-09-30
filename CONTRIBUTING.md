# Contributing

Use Node 24 and start from the lockfile:

```sh
npm ci
npm test
npm run build
npm run build:pages
```

Tests use offline fixtures. Dependency installation needs network access; builds
also download a pinned, checksum-verified Google webcam model on first use, then
reuse it locally. No robot, account, camera, microphone, secret or external
planning repository is required. Use
`npm run demo` after the local build to review the UI without hardware.
The GitHub checks run the same commands on Windows and Linux; they do not deploy.

Keep changes within the [architecture](docs/ARCHITECTURE.md). Prefer small,
reviewable changes with a concrete problem, resulting behavior and relevant
validation in the pull request. Add tests for changed protocol, safety, recovery
or privacy behavior. Report failures and verification limits accurately.

Preserve explicit input for robot actions, identity/version checks, finite-target
validation, omitted targets, requested/measured state distinction and uncertain
outcome locks. Never add startup movement or reconnect replay. Stop is software
control, not an emergency stop. Hardware validation requires a separately
authorized, attended session and coordination with other operators.

Do not commit robot identities, addresses, credentials, raw logs, screenshots or
private receipts. Keep them in ignored `local/` and sanitize examples. The public
export allowlist must deliberately include new runtime files and linked public
docs. Verify source ZIP links and privacy checks when changing publication tools.
Export releases from a clean Git HEAD. Manifests record `sourceRevision` and
`sourceTreeSha256`; an existing release version cannot be replaced with different
source bytes. Make changed releases under a newly reviewed package version.

Use the original schematic for public builds. `npm run prepare:cad` is an explicit
private staging option, not a contributor prerequisite. Review
[third-party notices](THIRD_PARTY_NOTICES.md) before redistributing hardware-derived
assets. Dependencies retain their own licenses.

Compatibility claims belong in dated [status](docs/STATUS.md) notes. Synthetic
fixtures demonstrate their exercised behavior; they do not prove live hardware
compatibility or justify widening a version gate by themselves.
