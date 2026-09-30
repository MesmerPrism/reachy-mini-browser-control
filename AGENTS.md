# Reachy Mini browser control agent notes

This repository owns the standalone browser UI, hosted projection, loopback bridge,
tests and build/export tools. Read `README.md`, `docs/ARCHITECTURE.md` and
`docs/STATUS.md` for scope and current verification limits. No external planning
repository, platform gate, Unity or WebXR installation is required.

- Browser components and shared protocol logic belong in `src/`; hosted entry
  components in `public-site/`; bridge adapters in `server/`; offline tests in `test/`.
- Hardware changes require explicit user authorization and attended validation.
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
