# Reachy Mini browser control agent notes

This repository owns the standalone browser UI, hosted projection, loopback bridge,
tests and build/export tools. Read `README.md`, `docs/ARCHITECTURE.md` and
`docs/STATUS.md` for scope and current verification limits. No external planning
repository, platform gate, Unity or WebXR installation is required.

- Browser components and shared protocol logic belong in `src/`; hosted entry
  components in `public-site/`; bridge adapters in `server/`; offline tests in `test/`.
- Hardware changes require explicit user authorization and attended validation.
  An explicitly authorized autonomous experiment campaign may instead use its
  scoped telemetry mode for routine power, stationarity and continuation checks.
  Record campaign authority separately from attendance; never invent visual
  confirmation. Preserve the qualified targets, current model review, freshness,
  sole-owner, no-replay and exact setting-restoration gates. A missed arrival is
  an experimental result, not permission to repeat an uncertain command.
  Consult the installed guard diagnostic and existing recovery client before
  rebuilding for encoder noise. Fresh telemetry qualification and bounded
  original-setting reconciliation on the same owner do not require visual
  confirmation within that authorized campaign. Never widen tolerances to hide
  sustained drift or retry uncertain motion/candidate writes.
  Retain historical admission/guard receipts after recovery. Bind them to their
  session/generation and known closure; a non-null historical receipt alone is
  not evidence of a current lock. Verify current inhibition, native session,
  pending state, feedback recovery and exact originals before proceeding.
  Never send startup motion, automatically wake the robot or replay writes after
  reconnect. Preserve omitted head/body targets and validate finite targets.
- Keep requested and measured state distinct. Stop is a software motion stop,
  not a hardware emergency stop. Preserve identity/version gates and recovery locks.
- Coordinate exclusive robot/device and bridge-port use with other local operators.
  On machines configured with Agent Board, it can provide optional leases; it is
  not an installation or CI dependency. Do not disturb shared ADB infrastructure.
- Keep identities, addresses, credentials, screenshots and investigation receipts
  in ignored `local/`. Preserve unrelated work. Never recursively publish this checkout.
- Ordinary builds use the original schematic. Official CAD preparation is explicit
  `npm run prepare:cad`; keep its caches/generated assets private. Review licensing
  before redistribution.
- Use Node 24 and run the appropriate offline checks: `npm test`, `npm run build`,
  `npm run build:pages`. Do not turn automated tests into physical hardware tests.
- Public export uses an explicit reviewed source inventory. New runtime files and
  documentation links must be included deliberately, with privacy and ZIP checks.
