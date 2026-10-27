# Scalar retargeting benchmark

This is the original software-only comparator supplied with
[OTG-2026-10-16](../2026-10-16-continuous-retargeting.md#g-executed-software-benchmark-and-decisive-validation),
imported and reviewed on **2026-10-16**. It is a research illustration, not a robot
controller or an implementation of Pollen, Ruckig or rsruckig. It performs no
network requests, serial access or device actions. It is not part of `npm test`,
the browser runtime or the ordinary build.

## Retained files and provenance

| File | Purpose | Original SHA-256 |
| --- | --- | --- |
| [benchmark.py](benchmark.py) | Original comparator and idealized protocol/math fixtures; unchanged bytes | `937a30a0dd3b0b4706c972674ff58976a9e06bd84d0a520d00c2134de14bc7ce` |
| [requirements.txt](requirements.txt) | Versions used by the supplied Linux run | `1668a3152e33680d94637b13421c15e68bd97cd8701f7f555c691f5bc5c0b9f3` |
| [recorded-results.json](recorded-results.json) | Original `results/results.json`; environment, assertions and all 36 metric rows | `b18d9655ed90dadb818378ef9f5376fd83fb654660859a1988b124f73eff76e3` |

The original ZIP SHA-256 is
`23ba63289c42bcffe9fbe7b9821a604c3a34a4310edb258f6494a759ff4813eb`.
All seven hashes in its checksum list passed. The original package, README,
summary CSV and 10,338-sample trace are retained once in ignored private intake
storage. This edition avoids a second large public trace; the script regenerates
the trace, summary and metrics. Checksums verify supplied bytes, not the conclusions.
No source from the investigated upstream robot or trajectory-library repositories
is vendored in the comparator.

## Reproduce

From the repository root, use a separate Python environment. The pinned packages
are optional research dependencies, not project installation requirements.

```sh
python -m venv local/retargeting-benchmark-venv
# Activate that environment using your platform's normal command.
python -m pip install -r docs/research/retargeting-benchmark/requirements.txt
python docs/research/retargeting-benchmark/benchmark.py --output local/retargeting-benchmark-rerun
```

Package installation may require internet access; the benchmark itself is offline.
Keep generated results under `local/`. The script creates its output directory and
replaces its three result files, so choose a new directory to preserve an earlier run.

The supplied run used Python 3.13.5, NumPy 2.3.5 and SciPy 1.17.0 on Linux x86-64.
A separate project rerun used the already installed Windows x86-64 Python 3.12.10,
NumPy 2.5.2 and SciPy 1.18.0. Record that distinction when comparing results;
do not overwrite the supplied Linux metrics with local timings.

## What is measured

Six cases (step, constant velocity, reversal, chirp, noisy/irregular input and a
timer delay) are evaluated against six comparators: capped slew, restarted
quintic, carried quintic, carried quintic with instantaneous target velocity,
checked-duration quintic and unclamped critical damping. The supplied run has
36 rows and 10,338 samples; its fixture assertions passed.

Limits V=1, A=3 and J=30 and all scalar distances use **arbitrary test units**,
not Reachy specifications. Methods are illustrative, not equally tuned or equally
constrained. Several intentionally violate limits. A smaller error in an
unconstrained comparator does not establish a better admissible controller.

Polynomial extrema use endpoints and real stationary roots in floating-point
arithmetic. They are not interval-certified bounds. Critical-damping peaks use
33 samples per segment. Boundary derivative jumps are separate columns: zero
acceleration inside a constant-velocity segment does not bound acceleration at
its velocity jumps. Carrying p/v/a supports C2 handoff, not continuous or
automatically bounded jerk.

The checked-duration method searches a finite geometric duration sequence. It is
not time-optimal or a complete feasibility solver. All such claims remain scalar;
there is no full orientation, IK/FK, joint-limit, contact or braking-envelope test.
The constant-velocity equivalent lag is a signed position error divided by input
speed, not network or physical latency.

The delayed-timer experiment advances its comparator over a large interval. It
does not implement the proposed deadline guardian. Queue/intent fixtures have
idealized schedules and a common clock; they do not reproduce the Reachy native
queue, WebRTC or unsynchronized relay clocks. Finding a Ruckig installation via
`find_spec` does not execute or qualify it.

## Comparing a rerun

Check fixture assertions, case/method coverage, sample counts and deterministic
non-timing metrics against `recorded-results.json`, allowing explicit small
floating-point tolerances. Compare the detailed trace when investigating a
different result. Calculation timings and environment fields should differ;
they include Python comparator/diagnostic work and are not real-time guarantees.
No timing here measures Node, ARM64, HTTP, IK, serial dispatch or physical motion.

The Windows integration rerun passed all built-in assertions and reproduced all
36 metric rows and the full 10,338-sample trace, excluding calculation timings,
within absolute/relative tolerances of 1e-9. Across 83,184 compared numeric values,
the largest absolute difference was about 1.42e-13. This supports reproducibility
of the illustrations across these two environments, not controller qualification.
The result is also summarized in the
[research guide](../README.md#provenance-and-access-limits). Raw local rerun files
and comparison receipts stay private. Qualifying a real numerical library and
the executor remains separate work described in `OTG:G3` and `TEL:E0–E4`.
