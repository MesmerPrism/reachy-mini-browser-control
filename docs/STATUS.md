# Status — 2026-10-30

This is an independent prototype. The following separates observed hardware
results from offline evidence; it is not a general compatibility certification.

## Direct local connection — October 30

Connect now offers Local network without a Hugging Face account, software
download or laptop bridge. It uses the existing robot WebSocket signaller and
retains the pinned SDK and WirelessControl gates. The usual 1.10.0 robot passed
stationary local preview identity/version/fresh-state/asleep checks and explicit
disconnect, with no motor writes. The robot's CORS and software were unchanged.
The deployed HTTPS route correctly reports a blocked local WebSocket in the
in-app browser; that browser cannot currently use the direct path. Standalone
browser HTTPS access and physical movement remain separate qualification; see
[local connection](LOCAL_CONNECTION.md).

The prepared sequential movement-runner change also passed the isolated ARM
generated-PTY independent and persistent three-block suites on this robot.
Strace confirmed no physical device opens or network connections and the
production inventory stayed unchanged. This qualifies the prepared runner on
ARM; it does not promote the partial historical movement comparison to complete.

## Hosted Wireless 1.11 and connection guidance — October 29

The hosted Wireless gate now accepts exact 1.10.0/1.11.0 with the pinned SDK 1.8.0.
The existing real-SDK1.11 protocol suite now covers default admission of both
versions and rejection of a session whose hardware identity differs from the
checked robot. The local bridge and motor experiments retain their own gates.

Connect shows network reachability, daemon compatibility, account/relay access
and the verified browser session as separate steps. Live local checks are
explicit GETs, expire after two minutes and reset on address change. Unknown
account routes stay unverified; pasted status is labeled reported. Bluetooth
address/identity survives Setup-to-Connect in memory, without retained secrets.

A different physical 1.11.0 Wireless robot passed read-only REST/schema/state and
app-lock checks, remaining ready/disabled with no reported errors. Its account
was signed out and relay stopped; the rendered guide correctly shows that
blocker. No power, motion, gain, network or account changes were made. Actual
WebRTC/media/physical-control validation remains separate and requires the
robot's account setup; see the [compatibility record](DAEMON_1_11_COMPATIBILITY.md).

The source checkpoint passes 536 offline tests plus local and hosted builds.
Desktop/mobile browser checks cover the blocker states, unknown optional checks,
copied-status identity binding, expiry without input, Bluetooth address handover
and a synthetic ready/asleep session. Publication retains the reviewed source
inventory and immutable versioned download; this update is 0.3.7.

The current [diagnostic sequence](STATIC_ERROR_TEST_PLAN.md#current-diagnostic-sequence--october-25)
has completed the bounded P, longer I and paired-P direction blocks. UART receive
reliability now takes priority before wider tuning or adoption. Combined P/I and
permanent gain changes remain unqualified.

## Offline native receive replay — October 27

A private replay runner now executes the actual original and candidate Rust
readers against nine saved failed attempts, two valid maintenance packet trains
and six independently retained later polls. The original follows the saved OS
read sizes; all failed attempts remain failures and valid outputs agree. An
isolated Protocol 2 Read/Sync Read candidate checks expected motor ID and a
conservative requested-data length allowance before body allocation/read. The
saved corrupt-length exchange drops from 13 read calls/133 consumed bytes to
8 calls/52 bytes. This is offline containment evidence, not measured physical
latency or a fix for the underlying byte loss.

Fifty workspace tests and all 251 full native memory/daemon tests passed. The
new native observer distinguishes rejected headers from missing bodies without
authenticating raw header IDs. Coverage includes every 16-bit length for a
four-byte read, fragmentation, CRC, ordering, existing status/stuffing behavior,
no hidden retry and delayed-reply ambiguity. Earlier parsing rejection can stop
a poll that previously took a timeout retry. Existing ordinary-reader destuffing
and error-vector limitations remain; no resynchronization or freshness guarantee
was added. No robot was contacted, candidate installed, backup replaced or mode
correction included. Device compatibility, ARM runtime and physical receive
reliability remain separate qualification steps.

## Focused UART CPU-placement comparison — October 26

An authorized autonomous original/candidate/restored comparison completed with
the daemon eligible for CPUs 0–3, then 1–3, then its exact original 0–3 masks.
IRQ36 stayed requested 0–3/effective 0; governors, runtime PM, motor gains and
planner were unchanged. Each condition retained a five-second warmup, 60 seconds
of cached-feedback observation and 120 seconds of paced register diagnostics.

| CPU eligibility | Diagnostic reads succeeded/attempted | Observed overrun increments | Workload cache gaps |
| --- | ---: | ---: | ---: |
| Original 0–3 | 56/56 | 0 | 0 |
| Candidate 1–3 | 57/57 | 0 | 0 |
| Restored 0–3 | 57/57 | 0 | 0 |

The independent observer qualified all 2,767 samples over 691.8 seconds,
including transitions and Sleep. These short, clean controls did not reproduce
the fault and do not establish a benefit from CPU placement. The candidate had
a verified independent restoration timer; original per-thread masks were
restored. Final verification confirmed 505 installed hashes, original 19 motor
setting vectors and Linux settings, disabled mode, seven sampled torque bits
off, 20 fresh advancing samples, no pending session and serial capture 4 stopped.

An earlier control recording was stopped after review found that workload
exception handling could swallow a settings-mismatch stop. It completed 57
successful reads and applied no CPU candidate. Its evidence remains separate;
a regression-tested outer guard now inhibits later conditions on that mismatch.
Several host setup/qualification failures also remain recorded. No gain
application or vertical experiment ran in this serial comparison.

Offline examination of the preceding P screen identified eight retained polls
with nine failed position-read attempts; seven enclosing polls failed. Their
signatures include malformed headers, bad CRC and a timeout after a corrupt
declared length. Seven fall within sampled overrun-counter increment brackets;
this supports investigating receive handling without proving its mechanism.
Stationarity rejections remain separate, and missing/overwritten packet history
prevents a complete failure-rate estimate.

A reusable private recovery controller and concrete existing-owner adapter now
replace per-case source extraction. They retain exact backup/session/epoch gates,
durable no-replay claims, known-original Restore, exact readback, feedback
acknowledgement and 20 fresh samples. Three saved recovery cases qualify offline.
The concrete adapter's read-only idle check completed on device in 46.3 seconds
with no mutation requests; this is not a newly provoked active-Restore trial.
It avoids a blocked pre-Restore register read and a post-response ownership
check that artificially aged otherwise fresh telemetry. The 500 ms freshness
bound and native admission limits are unchanged. Existing backups were reused;
mode correction remains separate. Serial reliability is still unresolved.

## Broader head-P screen — October 26

An authorized telemetry campaign compared motors 12 and 13 separately at
P300/P360/P300, using the original planner and the four-leg
down/neutral/up/neutral protocol. Every scored block has its own original-P300
common-start acquisition, two-second ramps and ten-second holds. Other gains,
profiles, limits and modes retained their originals. The round closed with
**20 scored legs captured and four withheld**, plus 15 acquisition/staging legs.
Motor 12 completed both controls; motor 13's final P300 control was withheld
after repeated feedback communication faults. No permanent gain was selected.

Installed Python and native telemetry authorization now admit single-head
P300/P360 for motors 11–16; higher P remains restricted to 15/16. Six actual ARM
generated-servo cases qualified motor-12/13 preparations without physical serial
access. Existing backups and the original rollback image were reused. Mode
correction, command continuity and the browser command surface remain separate.

Live integration exposed client-reader errors before native Prepare/Handoff:
an optional status field from the separate continuity candidate, and a journal
context incorrectly derived from its directory instead of the production
machine/serial binding. Separately pinned process-local readers now preserve
actual replies and validate the exact installed contracts. They change no
native position/velocity guard or motion behavior. A host confirmation launcher
also required an argument-routing correction. Failed receipts and known
original-only closures remain retained; expired recovery deadlines are not
renewed. These are integration failures, not new motor/encoder evidence.

Motor 12's upward last-two-second FK position residual was approximately
**7.51 / 6.46 / 7.18 mm** at P300/P360/P300; angular residual stayed near
**5.8 degrees**. Motor 13's corresponding P300/P360 values were about
**6.97 / 7.01 mm**, with no clear whole-head improvement. Selected-joint count
errors decreased at P360, but delivered goal vectors differed by 1–3 counts
between conditions. These are descriptive comparisons of encoder-derived FK,
not exact matched causal estimates or externally measured arrival.

Rejected and interrupted trials remain separate. One acknowledged motor-13
P360 application produced no scored legs; its ACK-to-verified-original-readback
interval was about 446 seconds. An interrupted final-control acquisition
completed one unscored staging leg, then required an explicit Sleep/Wake
centering cycle before a fresh common acquisition. The final scored Handoff
failed on feedback before any of its four scored targets were issued. Originals
were restored and recovery acknowledged; final Sleep reports seven sampled
head/body torque bits off. No scheduling candidate or continuation helper was
live-tested. Serial reliability remains unresolved.

Final read-only device verification confirmed all 505 qualified installed
hashes, original motor/Linux settings, disabled mode, seven sampled head/body
torque bits off, 20 fresh advancing cache samples, no pending native session,
clear current inhibition/recovery flags and serial capture 12 stopped. The
historical fault receipt remains retained and bound to its verified recovery;
it is not treated as a current lock. All 20 owned observers were terminal.
Their private artifacts were downloaded with hashes verified; historical
observer results remain 18 completed and two expired. Verification repeated
after download, owner CPU affinity remained 0–3, and the robot lease was released.

One retained malformed position-read header occurred after an earlier original
restoration, followed by successful feedback. Its three failure observations
describe one poll. Rolling capture overwrite is a separate retention limit;
neither observation proves the physical cause of the framing failure.

## Stationarity rejection context — October 26

A native diagnostic update is installed. A rejected maintenance snapshot now
retains the first rejected motor's goal/present counts, device tick and separate
configuration/runtime read intervals from its existing buffers. It covers all
nine motors and both snapshot phases. Invalid clocks mark timing unavailable;
the original rejection, velocity limits, position windows and 4096-byte event
cap remain unchanged. No bus reads or movement behavior were added. Installation
changed the native image and its package RECORD only; daemon Python is unchanged.
Final device verification confirmed 505 qualified installed hashes, original
motor/Linux settings, disabled mode, seven sampled head/body torque bits off,
20 advancing fresh cache samples, no pending session and capture 1 stopped.
The original native rollback image and existing backups were reused. Mode
correction remains separate; the robot lease was released.

Qualification includes ten focused health tests, all 249 distinct native cases
across a 247/249 broad run plus two unchanged isolated timing-fixture passes,
and 18 generated-PTY ARM cases with zero physical serial opens or connections.
It is not a claim that the concurrent broad batch passed in one run. A separate
host recovery policy passes 20 tests: known original-only closure, fresh
qualification, one new preparation and a new copied-backup witness. That policy
is still an injected offline module; its live adapter is not integrated.

Saved-file analysis of the longer awake recording found **11 velocity-2 samples
on motor 16**, all with Moving=0. All seven goal registers stayed fixed across
266 diagnostic reads and 1,061 workload cache samples. Motor 16 remained at
1676–1677 counts against goal 1639; every sampled motor position stayed within
one count. Motor 12 reported velocity 1 throughout despite a constant measured
count. This shows why a velocity estimate alone cannot establish sustained
rotation. It does not prove the cause of individual pulses, externally measured
head stability or qualification of a wider velocity allowance. The earlier
20-second sample remains a separate observation that caught no velocity-2 pulse.

## Awake UART interrupt comparison — October 26

An autonomous original-settings IRQ0/3/0 comparison completed. Each condition
contained 60 seconds quiet and 120 seconds of paced diagnostic reads, preceded
by a five-second warmup. All **266/266 reads succeeded** (86/90/90); the first
condition rotated its capture once to retain fault context. UART overrun
increments were **1/0/0**. Cached feedback remained usable: the independent
observer qualified all 2,764 samples over 692.3 seconds, including preparation,
transitions and Sleep, and counted one overrun overall. An overrun therefore
need not produce a visible cache gap or a failed diagnostic request.

The native capture contains one periodic position-read failure with a malformed
reply header; its three failure markers describe that same poll. The next
observed position poll succeeded about 20.28 ms later. No OS read error was
reported. This is receive-stream corruption alongside a kernel overrun, rather
than simply logger history loss. It does not establish why bytes were lost.
The first workload diagnostic window has 110.49 seconds of counter coverage
within its scheduled 120 seconds because fault capture consumed the tail; the
independent observer also records a 0.997-second sample gap during trace export.
Qualified samples do not imply continuous sensing.

The unchanged return control also had no overrun, so this run establishes no
CPU-assignment improvement. IRQ36 is shared, receive exposure differs by window,
and sparse events plus bounded trace/native retention do not establish a cause.
The original requested/effective assignment 0-3/0, four ondemand governors and
runtime-PM settings were restored. Final verification confirmed original motor
settings, 505 installed hashes, 207 retained source pins, advancing feedback,
disabled mode, seven sampled head/body torque bits off, capture 4 stopped,
no pending session, private trace removed and global tracing unchanged. Backups
were reused; mode correction remains separate.

## Awake verification load and motion audit — October 26

The subsequent command-continuity experiment is **partially validated**. The
original-code four-leg baseline completed and exposed 73/81-count goal resets
on its final two boundaries. A corrected private Python candidate completed
two legs: the continued leg began with exactly the preceding final joint
command. Its remaining two legs were withheld before target intent after a
position-read timeout/parsing failure coincided with a new UART overrun.
Those larger baseline reset cases remain untested with the candidate. Endpoint
following error persisted; different held body coordinates and final count
rounding prevent a matched improvement claim. Original code was restored.

An earlier candidate stopped during its first leg because it compared raw IK
body-coordinate metadata against the held input with exact equality. A
3.47e-18-radian arithmetic difference triggered that check. The correction
preserves the exact IK input separately and leaves raw solver metadata intact;
it does not widen a motion tolerance. Original-setting recovery completed,
followed by one user-confirmed power cycle. The interrupted leg is excluded.

The restored-code return control stopped at stationarity admission before any
target command: motor 15 reported raw velocity 2. Original-only recovery and
Sleep completed without another power cycle. A later 20-second read-only sample
had 263 cached samples, 19 paced register reads, fixed goal counts and at most
one count of measured variation. It caught no velocity-2 pulse and supports no
velocity-guard relaxation. Historical rejection receipts remain distinct from
current closed-session state. Mode correction remains separate.

One autonomous original-settings quiet/load/quiet block completed: 60 seconds
quiet, 120 seconds of repeated full installed-file/proc-FD owner verification,
then 60 seconds quiet. All **53 scans** matched the exact 505-file owner. Scan
median/max duration was 2.003/2.141 seconds; actual load counter exposure was
120.691 seconds, including final scan spillover. Scored phases and their recorded
transitions had **zero new UART overruns** and no failed cache reads. The
independent observer covered scan-delayed sampling gaps. The earlier two-block
attempt stopped at remaining-lifetime admission before captures or measurement;
one complete block was then admitted without repeating Wake.

The continuous observer recorded **one** overrun during preparation, about
352 seconds before the first load scan. Its first-fault timing trace overlaps
none of the scored phases. This did not reproduce receive loss under verification
load and identifies no root cause. Three separate native phase captures had
zero fault observations, substantial explicit history overwrites and dropped-event
counts 1/0/1. Their retained tails are approximately 1.84 seconds, not complete
wire histories. Timing trace ring loss and text clipping remain explicit.

The offline movement audit identifies an independent **new-leg reference reset**:
actual grouped goal writes change some joints by 50–87 counts across roughly
33 ms after briefly repeating the preceding command. This is a goal-reference
step, not proof of an equally large physical jump. Existing interpolation with a
continuous commanded start removes that initial step in the offline examples.
The later private candidate above received a fresh actual-path review; it is
currently restored and remains only partly qualified. Quantization-only FK deviation is at most
0.107 mm / 0.278 degrees across the audited traces; the upper terminal following
error remains about 7.20 mm / 5.93 degrees. See the
[continuity follow-up](STATIC_ERROR_TEST_PLAN.md#command-boundary-continuity--october-26).

The expired finite campaign was renewed by changing its identifier/expiry only,
with one disabled no-startup-Wake daemon restart. All 505 installed package hashes,
the native image and 207 audited source pins remain unchanged. Backups were
reused; mode correction remains separate. After the user reported an antenna
obstruction during Sleep and confirmed the path clear, one separately recorded
Wake/Sleep reset completed. Antenna feedback returned near the factory sleep
positions. Final verification confirmed disabled mode, seven sampled head/body
torque bits off, original motor/Linux settings, advancing feedback, capture 3
stopped, both private observers closed and global tracing unchanged. The robot
lease was released. This supplies no visual or external position certification.

## Awake-idle versus vertical UART observation — October 26

The original-settings comparison completed autonomously: explicit Wake, 60
seconds of ordinary awake-idle polling, 120 seconds of paced diagnostic reads,
two common-start vertical legs, four direction/return legs, original closure
and Sleep. All **90/90 diagnostic reads qualified**; maximum native read time
was 14.656 ms. Both scored idle windows and all six sampled command-to-pause
intervals had **zero new UART overruns**. Targets and gains used the existing
qualified clients; P15/P16 remained 300/300.

The continuous observer nevertheless recorded **three new overruns** over
748.251 seconds and 4.675 MB received. All three occurred before the first
vertical command: the first about 48.2–48.4 seconds after Wake confirmation,
the second about 2.2–2.5 seconds after the idle workload ended, and the third
within a sampling bracket ending about 0.22 seconds before the first common
leg was accepted. Transition and preparation exposure remains separate from
scored movement. Two earlier counter increments since the previous experiment
occurred while unobserved and are excluded from this run.

The first failed native position poll falls within the first overrun bracket.
Its three retained error markers describe one failed poll. The private timing
trace stopped at that first fault and retained approximately 4.94 seconds of
context, with ring loss and text clipping recorded. Nearby shared-UART interrupt
entry-to-exit spans reached 43 microseconds; this does not measure when an
interrupt became pending or establish a scheduling cause. IRQ 36 serves two
UARTs. Later fault metadata aligns with the third bracket, but its wire events
were no longer retained. The native capture had zero dropped events and explicit
overwritten-history counts; a complete export is not a continuous wire history.

This reproduces receive loss without vertical movement. It prioritizes a matched
awake quiet-versus-verification/preparation workload probe over attributing the
fault to the vertical trajectory. It does not identify the cause or qualify a
permanent transport change. The original-gain upper endpoint still had about
7.14 mm / 5.94 degrees of joint-derived pose error; receive diagnosis has not
resolved the coupled following error.

The same owner and native image were reused, with all 505 installed hashes and
207 source pins verified. Existing full backups were reused; fresh 1,143-byte
session preimages were copied as required by the existing transactions. Final
original settings, seven torque bits off, advancing feedback and capture 13
stopped were verified. The private trace instance was removed, global tracing
was unchanged and the robot lease was released. Mode correction remains separate.

## Read-only UART workload comparison — October 26

The nine-minute on-device comparison completed autonomously with the robot
asleep: three 180-second conditions at original CPU-0 interrupt delivery, CPU 3,
then restored CPU 0. Each condition contained 60 seconds of ordinary cached
polling and 120 seconds of paced head-motor-loop diagnostic reads through the
existing serial owner. All **270/270 diagnostic reads qualified**, with no failed
or unknown replies. All six sampled windows recorded **zero new UART overruns**;
the three logger captures also recorded zero fault observations. One dropped
logger event in the CPU-3 condition remains a coverage limitation.

Maximum native diagnostic durations were 15.070/15.000/15.458 ms, within the
unchanged 200 ms budget. Both original controls were healthy, so this comparison
does not demonstrate an interrupt-placement benefit or reproduce the earlier
intermittent receive fault. Diagnostic reads transmit UART read instructions;
read-only here means no motion or servo-setting writes.

The existing native image, owner and rollback backups were reused. Original
gains, profiles, modes and limits remained exact; original interrupt placement,
`ondemand` governor, automatic runtime PM and seven disabled torque bits were
verified after the comparison. Mode correction remains separate.

A separate three-minute follow-up held the original CPU-0 placement and ran 54
full installed-file/serial-owner verification scans between quiet intervals.
All scans passed; the cumulative UART counter stayed at 104 across approximately
1.255 MB received, and the native logger recorded zero fault observations and
zero dropped events. Each scan took about two seconds, producing explicitly
retained sampling gaps up to 2.392 seconds. This load also failed to reproduce
the fault; its earlier timing correlation remains a hypothesis.

The follow-up used an isolated interrupt/softirq trace with an independent stop
timer. Its ring overwrote older events and the export retained a bounded recent
tail covering approximately the final 5.8 seconds of the quiet-after interval;
no verification-load trace remained in that export. It supplies no complete
three-minute interrupt history or interrupt-assertion latency measurement. The
kernel rounded the requested 2048 KiB buffers
to 2051 KiB; a preparation attempt stopped before logger startup, and a fresh
attempt recorded the actual allocation. Global tracing was unchanged. Final
verification confirmed the same owner and 505 installed hashes, original servo
and Linux settings, seven torque bits off and logger capture 12 stopped. The
private trace instance was removed and the robot lease released.

## Continuing serial history and UART reliability — October 25

The improved default-off logger is installed. It preserves the first fault window
and continues a separate recent ring, exporting at most 8,192 ordered unique events.
Latest fault timing, cumulative categorized observations and first/recent loss
metadata remain visible after older events are overwritten. Observations can
duplicate one failed poll; they are not counts of independent motor failures.
Host qualification passed 11 native and seven daemon cases. The exact ARM image
passed a two-fault/long-gap logger case, six transaction cases and a four-leg case
on generated PTYs, without physical serial opens or network connections. The
cached native build took 41.28 seconds. Existing rollback content was reused.

The deployed-version source inspection identifies interrupt-driven PL011 receive
without an assigned DMA channel. Original interrupt delivery is on CPU 0 alongside
USB, I2C and camera-related interrupts. Serial-core runtime-PM activity alone does
not establish physical UART clock suspension. These findings prioritize a
reversible interrupt-placement comparison over a power-management guess.
[Pinned deployed kernel source](https://github.com/raspberrypi/linux/blob/a1073743767f9e7fdc7017ababd2a07ea0c97c1c/drivers/tty/serial/amba-pl011.c).

An excluded original-setting attempt retained a malformed packet and a new kernel
overrun within the same 0.523-second outer sampling interval. Its full monitor span
was 140.512 seconds, with 983,300 received bytes and one additional overrun. The
three fault markers describe one poll. This is timed evidence of receive-path loss;
it does not explain every historical fault. The logger retained the fault despite
a later healthy tail. The attempt ended before comparison legs when the observer
treated a maintenance HTTP 503 as fatal; original-only closure and Sleep were
confirmed. The revised observer retains such cache gaps while existing motion
freshness and recovery checks remain unchanged.

A separate campaign-policy budget was initially rejected before serial startup.
It was corrected to the existing finite limits without rebuilding native code;
planning now invokes the production policy validator before installation. Rejected
and recovery receipts remain retained.

The fixed-original-gain comparison completed all twelve direction legs, with
P15/P16 at 300/300 throughout. Interrupt placement changed independently of gains:

| Window | Received bytes | New UART overruns | Interrupt delivery |
| --- | --- | --- | --- |
| Original control, 398.466 s | 2,670,199 | 2 | CPU 0 |
| Resumed candidate, 419.968 s | 2,889,896 | 0 | CPU 3 |
| Restored control, cumulative 610.692 s | 4,132,675 | 5 | Original placement |

The last row uses cumulative endpoints across an explicitly retained 191.127-second
sampling gap; it does not reconstruct continuous observation or fault timing.
The candidate observer reached its finite limit after all four legs and Sleep;
the restored observer covers only the first two scored holds. Expiry receipts
remain failures to complete the planned observer finish, independently of the
completed motion/closure receipts. A1/candidate raw goals
match every leg; restored-control goals have one-count differences on some motors.
These are transport comparisons, not a new gain or optical tracking claim.

An earlier CPU-3 interval retained one overrun over 419.563 seconds and 1,579,237
received bytes. A cached native header-parsing failure falls within its overrun
sampling bracket. Moving the interrupt therefore has not eliminated receive loss.
Its lower error rate in the resumed window remains a candidate result, with unequal
exposures, diagnostic gaps and interrupted attempts visible.

That earlier interval's four-leg grant was separately withheld when motor 16's
sampled velocity was 2 rather than the permitted -1 to 1. No comparison target was
issued. Original-only reconciliation and fresh preparation continued on the same
awake hold, reusing its completed common start without Wake, daemon restart or
native rebuild. A later motor-14 velocity-2 restoration rejection also closed with
verified originals through the bounded recovery path. Thresholds and servo modes
were unchanged. Historical admission receipts remain bound to their known closures.

A separate motion-free CPU-governor comparison then completed with the robot asleep:
180 seconds at original `ondemand`, 180 seconds at `performance`, then 180 seconds
at restored `ondemand`. Each received about 1.254 MB, with **0/0/0 new overruns**.
Both original controls were clean, so this trial does not demonstrate a governor
benefit. Every sampled cache response qualified and advanced; maximum sampled CPU
temperature remained below 47°C. UART configuration, baud, interrupt placement and
servo settings were unchanged. A verified independent restore timer protected the
temporary governor write; all three phases ran on-device without operator checks.

Final verification confirms the same native owner, all 505 installed file hashes,
exact original gain/profile/mode/limit settings, disabled mode and seven sampled
torque bits at zero. Twenty advancing cached samples had a maximum age of
26.852 ms. The logger is off with capture 8 retained; interrupt requested/effective
placement, governor and serial-core PM controls match their originals. Owned
observer services and restore timers are inactive. Backups were reused, no full
backup was added, and mode correction remains separate. No runtime mitigation or
gain was adopted permanently.

## Combined motors 15/16 and serial diagnostics — October 25

The explicitly authorized paired-P transaction is installed. It admits only
ordered motor-15/16 P300/P420 vectors, with I0/D0 and all other settings original.
A durable attempted marker precedes either write; partial or uncertain application
blocks replay, and recovery reconciles both original gains. Existing single-P/I
authority remains separate. Host qualification passed 63 gain regressions,
eight pair/compiled-binding cases, nine serial cases and 161 daemon cases.
The exact ARM image passed five ordered pair conditions plus a lost-second-write
acknowledgement case on generated PTYs, with exact original restoration and no
physical serial opens or network connections. Six of 505 package files changed;
rollback content was reused, with no full backup or startup Wake.

Five physical single-upward conditions completed under telemetry authority:

| Condition | P15 / P16 | Motor-15 / motor-16 signed error | Six-head RMS | FK angle |
| --- | --- | --- | --- | --- |
| A1 | 300 / 300 | +86 / -61 counts | 50.583 counts | 5.837 degrees |
| Motor 15 only | 420 / 300 | +44 / -61 counts | 40.998 counts | 3.662 degrees |
| Motor 16 only | 300 / 420 | +86 / -34 counts | 47.417 counts | 5.181 degrees |
| Both | 420 / 420 | +42 / -33 counts | 35.026 counts | 1.967 degrees |
| A2 | 300 / 300 | +85 / -62 counts | 50.355 counts | 5.936 degrees |

Each used the frozen +10 mm target, two-second ramp and ten-second hold, with
original-setting acquisitions between conditions. BOTH translation error was
4.715 mm versus 6.648/6.723 mm in the controls. Its residual vector on motors
11–16 was +3/-47/+47/-9/+42/-33 counts: motor 14 worsened to -9 from zero in
both controls. Improvement is reversible and useful, with coupled tradeoffs.
It does not establish causal synergy, an optimum or permanent adoption. A1 and
motor-15-only goals matched. BOTH/A2 goals matched each other, with one-count
body/head differences from A1; the motor-16-only condition also retained
one-count goal differences. Each raw final-two-second score contained one
register read; native/FK tails provide separate temporal evidence with native
coverage and sensor-age limits retained.

A feedback fault interrupted the original-P300 acquisition before BOTH, before
any acquisition target or candidate gain. Its first fault and unused session
were retained, originals reconciled, fresh feedback acknowledged and P300
requalified through no-write closure on the same owner. A fresh acquisition
then completed; the interrupted attempt is excluded from the five scores.
After the primary block, independent checks verified originals, all 505 package
hashes, ready/disabled service, no pending/recovery lock and seven torque bits
off, with maximum cached age 22.970 ms. No candidate gain was retained.

The default-off serial observer delegates existing calls without extra reads,
writes, retries or drains. It retains a 4096-event ring with 64-byte prefixes,
explicit gaps/truncation, operation/poll/generation context and 128 events after
the first fault before freezing. Capture-ID comparison prevents accidental
reset; stopped pages come from one immutable cached snapshot. Enabled disabled-
only qualification retained 50 advancing samples with maximum age 29.560 ms.

Physical captures now show successful OS reads returning malformed headers,
including one after 124 complete valid nine-motor polls. That first marker was
after original restoration and before Sleep; no intervening target write or
known incomplete earlier poll explains it in the retained window. Another
capture shows an anomalous declared length of 255 leading to body consumption
and timeout. These are observations of the received stream, not proof of a
motor-bus, UART/driver or firmware cause. First-fault freezing and overwrites mean
the retained serial spans do not cover the scored holds; incomplete drain bytes
and dropped-event counters remain explicit. No transport repair was installed.

The actual owner uses a direct SoC PL011 UART. Its kernel receive-overrun counter
increased from 92 to 93 during one measurement interval and remained 93 during
the next. This establishes a new overrun during the run, not its exact timing
or a causal match to a particular gain condition or malformed packet. Linux
serial core defines `oe` as the overrun count; the PL011 driver increments it
from the receive overrun status bit. See [serial core](https://github.com/torvalds/linux/blob/master/drivers/tty/serial/serial_core.c)
and [PL011 receive handling](https://github.com/torvalds/linux/blob/master/drivers/tty/serial/amba-pl011.c).
No UART, kernel, power-management, retry or parser configuration was changed.

The pair then completed separately scoped direction/return validation. Its
distinct model-review pin was loaded through a disabled no-Wake policy-only
restart, with the native image and all 505 package files unchanged. The same
image passed a generated-PTY four-leg pair test before this physical phase.

| Direction target | FK angle, original / both P420 / restored original |
| --- | --- |
| Down -24 mm | 0.764 / 0.754 / 0.809 degrees |
| Up to neutral | 4.405 / 1.434 / 4.014 degrees |
| Up +10 mm | 5.935 / 2.429 / 5.927 degrees |
| Down to neutral | 0.687 / 0.663 / 0.638 degrees |

All twelve active legs and three paired original-setting closures qualify. All
four complete raw goal vectors, including body, matched exactly across A1/B/A2.
Upper motor-15/16 errors were +86/-66, +52/-35 and +86/-68 counts; six-head RMS
53.482/40.751/54.560 counts. Upper FK translation was 7.243/5.749/7.449 mm.
Up-neutral errors were +74/-53, +45/-29 and +70/-48 counts. Coupled tradeoffs
remain: candidate up-neutral motors 11/12/14 worsened against the first control,
and upper motors 12/14 also worsened despite the aggregate/FK benefit.

An earlier original-control attempt completed two legs before a feedback fault
withheld the third target. Those two legs and recovery are archived and excluded
from the active matrix. Originals were reconciled and normal recovery Sleep
completed; only that control condition was repeated from a fresh qualified start.
A reviewed wrapper then ran the unchanged stage programs consecutively on-device,
removing eighteen PC round trips across the three conditions. All nineteen frozen
runtime files, targets, two-second ramps, ten-second holds, current model reviews,
backup checks, feedback guards and no-replay behavior stayed unchanged. Thirty-nine
offline direction/batch tests passed. This does not establish a transport fix.

Final independent checks verified all 505 package hashes, exact original protected
settings, ready/disabled service, no pending/recovery lock and seven torque bits
off after final factory Sleep. Twenty advancing cache samples had maximum age
25.975 ms. The robot lease was released; no candidate gain was retained.
Mode correction remains separate.

## Adaptive P/I diagnostics — October 25

The subsequent motor-16 contribution extension is installed. Higher P420/P480
is now restricted to awake motor 15 or 16, with one selected P gain per
transaction; I authority remains motor 15 only. Its final source passed six new
native scope cases, the P/I regression subset and 63 daemon cases. The exact ARM
image passed eight generated-PTY cases covering motors 15/16 at P300/360/420/480,
with original restoration and no physical serial opens. Installation again
changed four of 505 package files and reused rollback content; no full backup
or startup Wake was introduced. This qualification permits experiments, not
permanent adoption or simultaneous gains.

The private common-start client now handles a narrowly proven preparation-health
rejection before any backup, candidate write or motion. It requires a fresh
same-owner/session/generation diagnostic, performs typed no-write closure, then
permits one fresh preparation under the existing campaign budget. Unknown
transport outcomes, changed identity, unrelated failures and candidate/motion
writes do not enter that retry path. Nineteen helper tests and eleven selected-P
client/integration checks passed. Existing bounds and immutable references remain
in force across servos; a fresh attempt is not a rebase or tolerance increase.

The motor-15 P420 return/direction block completed all twelve scored legs:
P300/P420/P300, each with downward, neutral return, upward and neutral return
targets, two-second ramps and ten-second holds. All three original-setting
closures and final Sleep completed. Separate no-target interruptions included a
raw-velocity-2 preparation rejection and a feedback CRC fault at original P300.
Both recovered on the same owner. A retained historical fault receipt then
blocked the client's current-state certification; a fresh original-P300
preparation and verified no-write closure requalified idle state without
replaying motion, widening tolerances or rebuilding software.

| Direction leg | Motor-15 steady error, P300 / P420 / P300 |
| --- | --- |
| Down to -24 mm | 3 / 4 / 3 counts |
| Up to neutral | 69 / 45 / 74 counts |
| Up to +10 mm | 86 / 58 / 85 counts |
| Down to neutral | 5 / 5 / 5 counts |

Upper whole-head RMS was **53.124 / 45.973 / 53.683 counts**, with FK angle
**5.745 / 4.366 / 5.778 degrees**. Downward-return FK angle remained
**0.583 / 0.570 / 0.614 degrees**. A1/B raw goals matched on all four legs;
A2 retained one-count body/head goal differences, including motor 15 on the
upper leg. This supports an upward gain-dependent component and pronounced
direction/history dependence, not general physical arrival or stability.
The P420 upper residuals on motors 12/13/16 were -54/+48/-64 counts.

The motor-16-only P300/P360/P300 contribution block then completed, with motor 15
held at P300. Motor-16 signed steady errors were **-62.5 / -42 / -64 counts**;
six-head RMS **50.911 / 48.137 / 51.572 counts**; FK angle
**5.917 / 5.442 / 5.939 degrees**; and translation
**6.871 / 6.883 / 6.751 mm**. A1/B goals matched exactly; A2 had one-count
differences on the body and motors 14/15/16. Motor-13 error increased
**47 / 52 / 47.5 counts** while motor 15 remained **85 / 85 / 86 counts**.
This is a coupled tradeoff, not uniformly improved joint tracking or translation.
Candidate motor-16 sampled PWM/current magnitude decreased, temperature stayed
32 degrees, and its recorded hold/tail position range was one count with no
first-to-final drift. Native coverage remains unqualified. Original closures,
final Sleep, all 505 installed hashes and seven disabled torque bits verified.
Its motor-11 raw-velocity-2 Reclaim rejection was handled by the existing
bounded cleanup helper: output revocation was verified and originals reconciled
on the same owner. The unchanged velocity limit remained in force; no movement,
candidate gain or service restart was replayed.
The separately controlled motor-16 P300/P420/P300 block also completed:
signed errors **-59 / -35 / -65 counts**, six-head RMS
**48.296 / 44.982 / 51.127 counts**, FK angle
**5.668 / 4.691 / 6.034 degrees**, and translation
**6.383 / 6.290 / 6.765 mm**. These controls differ from the P360 block and
must not be pooled. Candidate residuals on motors 11–16 were
**+1 / -47 / +47 / -4 / +80.5 / -35 counts**. Motor 12 was worse than both
controls (-42/-45), and motor 14 changed from zero to -4 counts; motor 13
matched the final control. This is useful aggregate improvement with coupled
tradeoffs, not a uniform joint correction or an optimal gain recommendation.
Selected motor-16 native first-to-tail drift was zero in all three conditions;
candidate hold/tail range was one count. Other joints were not uniformly
stationary, and native coverage remains unqualified. No lost/overflow/interrupted
trace events were reported. B/A2 goal vectors matched; both differed from A1
by minus one count on motors 14/15/16. Those differences remain explicitly scored.

Final independent checks verified the same owner, all **505** installed hashes,
original protected settings, ready/disabled service, no pending/recovery lock and
all seven sampled torque bits off. Twenty advancing cache samples had maximum
age **28.676 ms** after final factory Sleep. A motor-14 raw-velocity-2 cleanup
rejection was handled autonomously through verified revocation and fresh original
reconciliation. The robot lease was released. No candidate gain was retained;
motor-16 P480, combined gains and mode correction were not performed.

Twelve scored single-upward captures completed under explicit telemetry authority:
three P300/candidate/P300 blocks and one separate P300 I0/I1/I0 block. Each used
the frozen +10 mm target and two-second ramp. No candidate setting was retained.

| Block | Hold | Motor-15 steady error, A1 / B / A2 |
| --- | --- | --- |
| P300 / P360 / P300, I0 | 10 s | 85 / 57 / 85 counts |
| P300 / P420 / P300, I0 | 10 s | 85 / 42 / 86 counts |
| P300 / P480 / P300, I0 | 10 s | 85 / 33 / 85 counts |
| I0 / I1 / I0, P300 | 20 s | 85 / 58 / 85 counts |

These are final-two-second register-window medians, not interchangeable protocol
scores or best final samples. Raw tail windows contain one or two register reads;
higher-rate native position traces provide separate hold evidence. Small raw
goal/body differences remain labeled, and FK is joint-derived rather than optical.

An autonomous P300/P360/P300 single-upward confirmation completed, with motor-15
final-two-second errors **85/57/85 counts** and six-head RMS error
**49.46/41.26/49.35 counts**. FK translation medians were 6.605/5.359/6.432 mm;
angle medians were 5.894/4.010/5.847 degrees. Motor-15 goals matched. B differed
by one count on body/motors 11/12, so this is not an exactly matched full-vector
comparison. All original closures and Sleep steps completed without visual pauses.

The native/daemon candidate list was extended once to P300/P360/P420/P480.
Higher values require awake motor 15; existing P300/P360 scope and I0/other
protected settings remain unchanged. Final-source host checks passed eight
bounded native cases, 27 P regressions, 22 I regressions and 56 daemon cases.
The earlier broad native batch had 219/220 passes plus an isolated passing rerun
of the unchanged timing-sensitive I fixture; it predates two tightening motor-scope
filters and is not a full final-source passing run.

The exact ARM image/daemon completed seven generated-PTY conditions
P300/P360/P300/P420/P300/P480/P300 with original readback after every condition,
injected one-count antenna variation, and rejected unauthorized/unlisted entries.
The audited processes opened no physical serial device or network connection.
Deployment changed the native library, daemon maintenance module and their two
RECORD files, plus the private native pin and renewed finite campaign. Existing
rollback bytes were reused, with no full backup. One service stop/start preserved
no-startup-Wake. All 505 expected package hashes and the loaded owner verified;
50 advancing disabled samples had maximum cached age 30.841 ms.

The first higher-P physical block completed P300/P420/P300 with motor-15 steady
errors **85/42/86 counts**, six-head RMS **49.40/38.78/50.58 counts**, and FK angle
**5.806/3.272/5.908 degrees**. The selected joint's native final-two-second position
range was zero counts in each condition. A1/B selected goals matched at 2550;
A2 used 2551. Other one-count goal differences remain labeled. Original settings
and final Sleep verified. This pilot ranking supports testing P480; it does not
establish a global optimum, general stability or a permanent gain recommendation.

The P480 block completed with six-head RMS **49.25/38.48/49.73 counts** and FK
angle **5.847/3.155/5.883 degrees**. It further improved motor 15, but added little
whole-head benefit over the separate P420 block. Motors 16, 12 and 13 retained
large errors. These different ordered blocks do not establish a statistically
optimal P; P420 is a candidate for return/direction validation before adoption,
and remaining joint contributions deserve attention before more motor-15 escalation.

Before P480 was applied, its common-start preparation had two retained interruptions:
a native feedback communication fault and a separate raw-velocity-2 Handoff
rejection. Both occurred before acquisition targets or candidate writes. Exact
original reconciliation, separate fresh-feedback acknowledgement when required,
and fresh attempts recovered on the same owner. No motion was replayed or service
restarted. The failed receipts and directories remain archived separately from
the three completed scored captures.

The longer I1 hold showed delayed steps: approximately 14 counts after four
seconds of hold and 27 counts total after fourteen seconds, ending at a stable
58-count raw error. Its FK angle median was 4.393 degrees, versus 5.948/5.823 in
I0 controls. Native clock alignment describes observed cache samples, not firmware
activation or integrator reset. This supports an integral-response component,
but P produced larger correction earlier; no combined P/I trial was performed.

The earlier retained communication cache contained five position-read parsing/checksum
failures and one separate stationarity rejection. Offline replay through the
actual unwrapped parser and diagnostic wrapper agreed for 20 fragment cases and
eight synthetic late-reply cases; four valid controls succeeded. This found no
wrapper-induced difference in those tests. A synthetic earlier timeout was needed
for the late-tail model and was absent from that earlier live cache. Physical, driver and
buffering attribution remains unresolved; no transport fix or wider tolerance
was installed.

The later direction-control CRC fault occurred **2.410 seconds** after Handoff,
with a successful native position sample **69 ms** after Handoff. It therefore
was not the first resumed position poll failing. This original-P300 session had
issued no scored target or candidate gain. Earlier entries in this owner's
cache contained a partial-header timeout followed **20.688 ms** later by a
header-magic failure, consistent with the retained timeout/retry boundary but
without request correlation. Synchronous periodic reads are not cancelled by
maintenance entry; bounded register-read error paths can leave unread bytes,
and a pre-send availability check cannot exclude later arrivals. The next
transport diagnostic is a bounded timeline of existing transactions, TX/clear
and RX chunk boundaries, operation IDs, generations and timestamps, without
extra bus reads. No physical cause or installed transport repair is claimed.

The shared scorecard retains all joint errors, effort trends, actual goals, FK,
sparse-read timing, exposure/closure and native coverage limitations. Eighteen
scorer tests, three aggregate tests and 28 longer-I client tests passed. Final
independent checks verified the same sole owner, all 505 installed package hashes,
original protected head/body register arrays, ready/disabled state, no pending
or recovery lock and seven sampled torque bits off. Twenty advancing cached
samples had maximum age **26.198 ms**. Final factory Sleep completed; the robot
lease was released. Mode correction and permanent gain adoption remain separate.

## Autonomous vertical execution — October 25

Three telemetry-driven single-upward captures completed in I0/I1/I0 order,
using a +10 mm target, a two-second ramp and a ten-second hold. No visual
confirmation was requested or recorded. The final baseline also encountered an
antenna raw-velocity value of 2 during Reclaim: the client verified that native
output was already revoked, retained the actual locked state, and proceeded to
fresh original-settings restoration without an agent-turn pause, repeated motion,
service restart or rebuild.

| Condition | Motor 15 I gain | Final goal counts | Final measured counts | Following error counts |
| --- | ---: | ---: | ---: | ---: |
| A1 | 0 | 2551 | 2465 | 86 |
| B | 1 | 2551 | 2465 | 86 |
| A2 | 0 | 2550 | 2465 | 85 |

A1 and B delivered the same final six-head goal vector. A2 used the same frozen
Cartesian target but three head goals differed by one count and body hold by two
counts; this is not a perfectly identical register-target comparison. The result
does not show an I1 benefit in these captures. Multiple head joints still lagged,
so one-count encoder variation does not explain the larger following error.
The underlying cause of that persistent error remains unresolved.

A1/B completed movement and capture but their original trial records ended in
cleanup rejection. Separate same-session reconciliation succeeded on the first
attempt for each; the failed records remain intact. B's cleanup delay extended
its I1 exposure, so uninterrupted cleanup timing is not qualified. A health
snapshot phase alone cannot prove whether an original-setting write preceded
the rejection. Recovery reads the actual setting and reconciles the immutable
original; no candidate-gain or movement command is replayed.

The three traces retained 628/625/626 consecutive feedback events with no
lost/overflow/expiry/interruption flags. Their general `coverage_qualified` and
`sensor_age_known` fields remain false; these counts do not assert physical
arrival or sensor-age qualification. Firmware integrator reset remains unverified.

Final independent checks verified all 505 installed package hashes, the same
sole daemon owner, original gains/profiles/modes and protected head register
arrays, no pending state or recovery lock, ready/disabled mode and seven sampled
head/body torque bits off. Twenty advancing cached samples had maximum age
27.581 ms. Sleep completed under telemetry qualification. Backups were reused,
and the mode correction was not installed. The finite campaign is complete;
the following-error diagnosis remains open.

The first unscored common start completed autonomously. A subsequent I0
preparation was withheld before backup, gain write or scored movement when
antenna 17's measured position changed 1927 → 1928 counts. Its unused transaction
closed on the same awake owner without replay or a power cycle. That receipt
motivated the following native policy correction; the rejected attempt remains
excluded from the new captures.

The installed follow-up now applies the awake P/I one-count measured-position
window consistently to both antennas. Goals, profiles, torque, modes and protected
configuration remain exact, and Moving/velocity health checks are unchanged.
Both current snapshots and the immutable prepared snapshot must fit one count;
Apply/Reclaim anchors cannot accumulate drift. The prepared second snapshot is
the immutable baseline, rather than the first preliminary observation. Changes
of two counts, opposite-side samples spanning two counts and changed goals or
configuration still reject. Head arrival criteria and disabled behavior are
unchanged. No automatic tolerance widening is implemented.

Seven focused native encoder cases and the affected P/I/stationarity regressions
passed. An exact ARM native/daemon I0/I1/I0 sequence accepted an injected antenna
count change between preparation snapshots, rejected duplicate movement and
restored original settings without physical serial opens. The follow-up changed
only the native library/RECORD and native hash pin, reusing the previous image
for rollback. Fifty disabled samples had maximum cached age 30.36 ms. The robot
was put to Sleep with original settings for that replacement; the new measured
campaign then resumed. No visual confirmation is required by this explicit
campaign authority.

The explicitly authorized private autonomous native/daemon candidate is installed.
It uses a distinct telemetry authority instead of claiming attendance or visual
confirmation. Existing attended entry defaults and the mode correction remain
separate. Host qualification passed 207 native tests and 62 focused daemon tests;
the ARM native/daemon generated-PTY sequence completed I0/I1/I0, rejected duplicate
movement, restored original settings, and opened no physical serial device.
The same focused daemon regressions also passed on ARM.

Installation changed exactly five of 505 package files plus the private native
pin and bounded campaign configuration. Existing native rollback bytes were
reused; only necessary small preimages were retained. Startup Wake was disabled.
Fifty advancing disabled feedback samples had maximum cached age 26.85 ms;
original gains, profiles and operating modes were verified. These checks do not
establish improved movement or serial reliability. The physical results above
retain the distinction between command completion and measured arrival.

## Stationary-health patch installed; disabled checks — October 25

The exact ARM-qualified diagnostic native image is now **installed**. Only the
native library, its RECORD and the private native hash pin changed. All **505
package files** matched the expected result; daemon source and daemon RECORD
remain unchanged. All nine native RECORD rows and both installed additions were
preserved, along with permissions, ownership, mtime and xattrs. Of **298 protected
records**, only the intended configuration hash changed. Existing rollback bytes
and archives were reused; no new full backup was made.

Baseline and candidate each passed recorder **off/on/off**, with 100 fresh,
advancing cached samples per window: **600 samples** overall. Maximum sampled
cache ages were **38.255 / 37.817 ms**. CPU percentages of one core were
**47.85 / 48.94 / 47.64 baseline** and **46.54 / 46.75 / 48.05 candidate**. No material
overhead increase appeared in these finite ordered windows; they do not establish
statistical equivalence, moving-load timing or serial reliability.

Exported traces contained **514 / 514 consecutive feedback events**, with no lost,
overflow, interrupted or expired flags and no head-target events. Maximum feedback
completion gaps were **23.243 / 22.209 ms**. Original gains, profiles, modes and
remaining protected register arrays matched before and after. The service stopped
once without Sleep and started once with startup Wake disabled. The new sole
owner, loaded native inode/hash, private peer and HTTP listener were verified.

Final state was ready/disabled, with no pending or recovery lock; 20 advancing
cached samples had maximum age **26.187 ms**. The operator confirmed asleep/settled posture without unexpected movement. No Wake, Sleep, Stop, motion, experimental
gain or mode-change request was sent. Normal service initialization still produces
bus traffic. Mode correction remains separate.

No stationary-health rejection was deliberately provoked on hardware. The patch
improves retained diagnostic evidence while preserving admission rules; it does
not fix following error or qualify a new tuning choice. Eight retained virtual
header timeouts remain unresolved. See the [installation details and limits](I_GAIN_TRANSACTION.md#stationary-health-installation-and-disabled-checks--october-25).

## Stationary-health diagnostics — ARM qualification, October 25

At this qualification checkpoint the candidate was uninstalled. It has passing
functional evidence for **38 generated-PTY
cases across two ARM batches**, plus **21 daemon admission/receipt checks**.
The cases cover P, awake-I and disabled-I maintenance, both snapshot phases,
signed velocity extrema, unchanged velocity boundaries, stale-session fencing,
closed verification and daemon receipt preservation. Three cases applied a
virtual candidate gain, verified rejection of restoration on unhealthy feedback,
then restored the exact original gain after fresh checks. All final virtual
register images matched their starting images.

The first batch passed 37 cases. The remaining case recorded the expected health
rejection, then hit a **virtual serial-header timeout during no-write closure**.
Its worker exited; the failure was retained. That case passed on a fresh PTY with
the same candidate, fixture and deadlines. This is functional coverage across
batches, not an uninterrupted suite pass or a resolution of serial reliability.

Resolved syscall traces verified all **39 native-worker PTY opens**, no physical
serial opens and no network connections by the qualification processes. The
virtual peer accepted exactly six gain packets and rejected head-goal, mode and
torque writes. Production read-only checks verified the same owner, all **505
package files** and **298 protected-file records** unchanged, ready/disabled state
and no pending or recovery lock. Five final advancing cached samples had a maximum
age of **22.507 ms**. This was not an overhead or physical movement test.

Existing caches and rollback files were reused; no new full backup, production
installation, service restart, motor-register request or motion command was made.
Mode correction remains separate. Any later installation and disabled-device
overhead checks require a separately authorized attended stage. See the
[qualification scope and limits](I_GAIN_TRANSACTION.md#stationary-health-diagnostics--arm-qualification-october-25).

## Stationary-health diagnostics — offline candidate, October 25

An **uninstalled, host-tested native candidate** now records the current P/I
maintenance request when the early stationary check rejects a Moving flag or a
raw velocity outside the existing −1…+1 range. It retains the first rejected
motor, exact raw values, register addresses, snapshot phase and session/generation/
operation in the existing bounded private diagnostic cache. It adds no serial
read, retry or write. The daemon already preserves that cache in its fault receipt.

This closes a specific evidence gap from October 23: two early “Motors must be
stationary” rejections retained a difference from an older session. Their actual
Moving/velocity values were not saved and cannot be reconstructed afterward.
The separate antenna 17 one-count snapshot rejection was recorded correctly;
its admission policy is unchanged. General identity/health and serial I/O errors
can still occur before this diagnostic, so cached context must still be checked.

Eight focused native tests reproduced the missing/stale evidence before the fix
and pass afterward. **206 unique native tests have passing coverage across
retained batches**, plus **21 daemon admission/receipt checks**. The first full
run had 201 passes and five missing-fixture failures; targeted reruns passed after
the pinned fixture inputs were supplied. These are generated bus/model fixtures,
not an uninterrupted full-suite pass or physical reliability evidence.

Source-delta checks retain the exact admission predicates, snapshot read spans,
timing, gain writes, recovery and body/antenna rules. Existing build dependencies
and caches were reused; no new full backup was made. No robot connection,
installation, restart, gain/mode change or motion command was sent. The last
confirmed physical state remains the historical October 23 Sleep checkpoint.
At this offline checkpoint, isolated ARM qualification was next; its later result
is recorded above. Mode correction stays separate. See the
[diagnostic scope and limits](I_GAIN_TRANSACTION.md#stationary-health-diagnostics--offline-october-25).

## Single-upward I0/I1/I0 captures — October 23

Three scored upward captures are complete. Each requested the same **+10 mm**
target over **two seconds**, followed by a ten-second observed hold. Original
P300 and profiles were retained; only motor 15 used I1 in B. Each condition
re-established the same frozen reference within 1 mm / 1°, with original settings
for factory Wake/Sleep. A2's motion completed, but its interrupted restoration
needed a separate guarded closure; this was not an uninterrupted three-pass run.

| Condition | Motor 15 I | Last register goal-minus-present error | Last sampled pose rotation error |
| --- | --- | --- | --- |
| A1 | 0 | 85 counts | 6.09° |
| B | 1 | 58 counts | 4.55° |
| A2 | 0 | 85 counts | 5.99° |

Under I1, the error stayed near 85 counts for most of the hold while PWM rose,
then reduced late. Restored I0 reproduced the baseline. This supports a delayed
partial response in this sequence; it does not establish a permanent setting,
long-duration stability or an integrator reset. Whole-head error remained.
Pose and register reads are asynchronous, not one synchronized endpoint sample.
The operator reported upward tilt in A1/A2; B's movement was **not watched**.
All three final/between-condition Sleeps were visually confirmed.

The scored traces retained **626 / 626 / 631 consecutive feedback events** with
no loss/overflow/expiry/interruption flags. Maximum sampled cache ages were
**32.608 / 31.010 / 35.290 ms**. A rejected B preparation sent no candidate Apply
or scored target and was closed before a fresh attempt. A2's original restoration
was withheld on antenna 17's one-count snapshot change; fresh checks eventually
closed it under unchanged native bounds, without repeating movement.

Final readback verified original settings, ready/disabled service, no pending or
recovery lock, the same owner and all 505 installed package files. All 252
pre-existing protected-file records remained exact. No software installation,
service restart, mode correction or new full backup was made in this capture
stage. See the [method, interrupted attempts and limits](I_GAIN_TRANSACTION.md#single-upward-i0i1i0-capture--october-23).

## Stationary-guard installed; disabled checks — October 23

The corrected ARM native image is now **installed**. The attended procedure
changed exactly the native library and its native RECORD, plus the private native
hash pin. All 505 package files matched the expected result; daemon Python source
and daemon RECORD remained unchanged. Both installed native RECORD additions were
preserved. Of 238 protected-file records, only the intended configuration hash
changed. File permissions, ownership, mtime and xattrs were preserved. Existing
rollback files were reused; no new full backup was made.

Baseline and candidate each passed recorder **off/on/off**, with 100 cached
samples per window: **600 fresh advancing samples** overall. Maximum cache age
was **39.820 ms baseline / 38.183 ms candidate**. Their sealed, exported traces
contained **512 / 515 consecutive feedback events**, with no lost, overflow,
interrupted or expired flags and no head-target events. Original P300/I0,
profiles, modes and the other protected register arrays matched before and after;
head/body torque readbacks were disabled.

CPU use was **49.55/48.75/48.15% baseline** and **47.05/48.05/47.25% candidate**,
as percentages of one core. Maximum feedback-completion gaps were
**23.361 / 22.539 ms**. These ordered finite disabled windows detected no material
overhead increase; they do not establish statistical equivalence, serial
reliability or moving-load timing. Seven earlier virtual header timeouts remain
unresolved.

The service stopped once without Sleep and started once with startup Wake
disabled. The new sole owner, loaded native inode/hash, private status peer and
HTTP listener were verified. Final service was ready/disabled, with no pending or
recovery lock and a maximum cached read age of **26.924 ms**. The operator confirmed
that Reachy remained asleep and settled, without unexpected movement. No Wake,
Sleep, motion, gain-change or mode-change request was sent. Mode correction stayed
separate. At this disabled-installation checkpoint the single-upward comparison
was still pending; the later captures are recorded above. The installation alone
does not establish a fix for upward tilt or jitter.

See [installation scope and limits](I_GAIN_TRANSACTION.md#stationary-guard-installation-and-disabled-checks--october-23).

## Stationary-guard ARM qualification — October 23

The corrected native candidate passed **38 focused generated-PTY scenarios** on
ARM across three retained batches. **188 unchanged-daemon regression cases** also
passed on ARM. The scenarios cover P/awake-I body-count admission, immutable
original bounds, excluded configuration/goal/profile/antenna changes, stale
generation, cached diagnostics, exact gain restoration and independent P/I
recovery after an owned worker crash. The accepted cases decoded 14 virtual gain
writes, exactly the selected candidate/original pairs, and no head-goal packets.
They use 38 native worker opens and two recovery-custodian opens on generated PTYs.

The first image correctly rejected a body-profile change but misreported its
register. A diagnostic-only correction reproduced that failure in a host test;
all **15 focused native regressions** passed afterward. The corrected ARM image
then passed profile-reporting cases for both original/first-snapshot and
original/second-snapshot differences. Guard predicates, write paths and ownership
logic were unchanged by this reporting correction.

**Seven virtual serial-header timeouts remain unresolved** across the retained
attempts. Those attempts were not counted as guard passes; fresh PTYs exercised
only the remaining cases after their owned processes exited. Serial deadlines,
retry policy and guard thresholds were not relaxed. These results establish
functional PTY coverage across batches, not uninterrupted serial reliability,
moving-load timing or physical motion quality.

The candidate was **uninstalled at this qualification checkpoint**. No production restart, Wake, Sleep,
movement, parameter write or on-demand motor-register request was sent. Final
read-only checks retained the same production serial owner, all **505 package
hashes** and **238 protected-file records**, ready/disabled status and no pending
or recovery lock. Ten cached samples advanced, with maximum age **26.408 ms**.
Resolved syscall targets and complete overlay inventories were audited; all
qualification children exited. Backups and build caches were reused, with no new
full robot backup. Mode correction remains separate. The later attended disabled
installation/overhead stage is recorded above; movement remains pending.

See [qualification and diagnostic limits](I_GAIN_TRANSACTION.md#stationary-guard-arm-qualification--october-23).

## Stationary-guard follow-up — offline candidate, October 22

The native candidate now retains bounded motor/register differences for failed
P/awake-I snapshot and original-configuration comparisons. It records the phase,
session/generation and raw expected/observed values from snapshots already read
by the existing worker. Status adds no serial read; the unchanged daemon preserves
the details before cleanup in its private admission receipt. Earlier health or
I/O failures do not necessarily produce a snapshot difference.

A scoped body-encoder policy admits a one-count change only when both fresh
snapshots, the immutable original encoder and the unchanged goal fit one common
one-count window. Body configuration/profile/goal bytes remain exact; head,
antenna, legacy-profile and disabled-I policies are retained. Existing post-motion
restoration compatibility remains separate: an unchanged body pair can use its
previous original-encoder bound. A newly tolerated differing pair must satisfy
the full immutable window, including during restoration and closed verification.

This is an **uninstalled, offline candidate**, not a fix for physical upward tilt
or evidence that the observed body tick was sensor noise. Source review found and
corrected an initial restoration-window bypass. Host validation and its retained
failure records are described in the [focused guard follow-up](I_GAIN_TRANSACTION.md#stationary-guard-follow-up--offline-october-22):
**197 native tests, 45 daemon admission/recovery tests and eight public
export/privacy checks passed**. Generated registers and synthetic geometry do
not establish physical motion, moving-load overhead or serial reliability.
ARM runtime qualification was a separate later stage, recorded above; attended
installation and device checks remain pending. No robot connection, restart, Wake, movement, gain change or
new full backup was made in this offline stage. Mode correction remains separate.

## Single-upward comparison withheld; stationary guard diagnosis — October 22

An attended attempt completed factory Wake with visual confirmation, but neither
original-P300 common-start attempt reached its acquisition trajectory. The first
failed preparation; the second prepared and retained its exact preimage, then
failed handoff. Both reported the native stationary-hold check. No scored target
or I1 change was issued. Setup used two measured-pose holds and disabled competing
tracking/wobbling sources; these are distinct from a completed comparison.

A bounded serial syscall trace during a later **no-write closure check** contained
four sync-read requests and 36 CRC-verified status packets, with no parameter-write
packet. The only motor failing the reconstructed hold comparison was body motor
10: its encoder changed **2048 → 2049**, with its goal unchanged at 2048. One count
is about **0.088°**. Moving remained clear and velocity stayed within the existing
one-unit gate. All protected configuration, goals and profiles matched. Head motor
15 also changed by one count, which the existing six-head policy permits; body and
antenna readings must match exactly. This identifies that instrumented rejection,
not the precise register differences in the earlier untraced attempts. Ptrace may
affect timing; this capture does not establish serial reliability or physical drift.

The first unchanged transaction closed through bounded no-write checks. The second
closed through original-P300 restoration, without a candidate Apply. The same
daemon owner was retained; no installation, service restart, guard change or mode
correction was performed. Existing backups were reused. Factory Sleep completed.
Final checks verified ready/disabled service, original registers, all 505 package
hashes and 229 pre-existing protected-file records, with no pending lock and a
maximum cached read age of **26.193 ms**. The operator confirmed normal Sleep and
that Reachy remained asleep and settled.
At that checkpoint the single-upward I0/I1/I0 comparison was still pending;
the later captures are recorded above.

The offline follow-up above adds motor/register reporting and tests a narrowly
scoped body-count policy separately from exact configuration/goal invariants.
It is not installed. Do not treat this withheld run as I1 evidence.
See [guard evidence and scope](I_GAIN_TRANSACTION.md#stationary-admission-rejections--october-22).

## Single-upward daemon installed; disabled checks — October 20

The qualified single-upward daemon patch is now **installed**. Exactly the
maintenance module and its installed RECORD changed; all 133 installed RECORD
additions were preserved. The new daemon's Python 3.12 bytecode cache matched the
candidate source. Native image, configuration, six static launcher/service files
and all **229 protected-file records** remained unchanged. Existing backups were
reused; no new full archive was made. Mode correction remains separate.

Baseline and candidate each passed recorder **off/on/off**, with 100 cached samples
per window: **600 fresh advancing samples** overall. Maximum cache age was
**30.048 ms baseline / 35.083 ms candidate**. Their sealed traces contained
**511 / 510 consecutive feedback events**, with no lost/overflow/interrupted/expired
flags or head-target events. Original P300/I0, profiles, modes and the remaining
protected register arrays matched before/after; head torque readbacks were disabled.

CPU use per window was **57.02/55.53/46.15% baseline** and
**54.43/55.43/47.05% candidate**, expressed as a percentage of one core. These finite,
ordered windows detected no material overhead increase; they do not establish
statistical equivalence, moving-load overhead, serial reliability or real-time bounds.

The daemon stopped once without Sleep and started once with startup Wake disabled.
No Wake, Sleep, motion, gain-change or mode-change request was sent. Final checks
verified the new sole owner through both private UNIX peer and HTTP listener,
all 505 expected package hashes, ready/disabled service and no pending/recovery lock.
Ten final cached samples advanced, with maximum age **25.657 ms**.

The operator confirmed Reachy stayed asleep and settled through installation and
restart, with no unexpected movement. The next movement experiment
remains separate and requires new authorization and its existing visual Wake gate.
See [installation evidence and limits](I_GAIN_TRANSACTION.md#single-upward-daemon-installation-and-disabled-checks--october-20).

## Live owner adapter and installation preparation — October 20

**25 focused host tests and four complete isolated ARM wire transactions passed**,
including one uninterrupted I0/I1/I0 batch. The adapter authenticates the existing
UNIX peer and binds loopback HTTP to that same PID/listener and network namespace.
It preserves request identities, epoch/ownership gates, fresh advancing feedback,
diagnostic cooldown after failures and exact protected-register checks. Foreign
sessions, competing apps, body drift and incomplete common-start receipts are
rejected. The original single-leg runner, daemon wheel and native wheel are unchanged.

The successful fixtures used generated PTYs, the retained Pollen player and actual
1,025-sample model review against synthetic register limits. Common-start and
feedback geometry remain synthetic. The PC durably acknowledged each exact
preimage before Apply. Selected successes retained four virtual I writes and
1,985 six-head packets; all four traces passed coverage and terminal-hold checks.
This establishes protocol integration, not physical I1 benefit or arrival.

Nine failed/partial wire attempts remain separate. They include fixture setup
errors, a diagnostic cooldown rejection and five native communication failures.
Full syscall audits passed after enabling kernel filtering of traced calls;
this reduces instrumentation interference but does not prove the earlier timeout
cause or establish serial reliability. Timeouts, retries and recovery guards were
unchanged. No uncertain writes were replayed.

The real production transport also passed read-only peer/listener checks and ten
fresh cached samples. Final checks retained the same sole owner, all 505 package
hashes and 228 protected-file records, ready/disabled service, no pending lock and
all fixture children exited. Maximum final cache age was **21.442 ms**. No production
register request, installation, restart, gain, Wake, Sleep, Stop or motion was sent.

The daemon candidate remains **uninstalled**. Its exact two-file installation and
baseline/candidate disabled recorder-off/on/off checks are **prepared and unarmed**,
with installed RECORD additions preserved and existing backups reused. The next
stage is an explicitly authorized attended installation and disabled-load check;
motion comparison remains later. Mode correction and publication stay separate.
See [adapter evidence and remaining gates](I_GAIN_TRANSACTION.md#live-owner-adapter-and-installation-preparation--october-20).

## Single-upward I trial isolated ARM qualification — October 20

The exact host candidate passed **186 ARM Python cases and ten generated-PTY
scenarios across retained batches**, using the unchanged qualified native wheel.
The actual ARM worker, bindings, daemon entry and client completed I0/I1/I0 with
one upward leg per condition. Negative cases cover changed starts, lost Apply/
Restore and capture replies, interruption, log fsync failure and cross-process
restore-only recovery. Failed logs stay unresolved after independent recovery;
no uncertain target or gain write is replayed.

Selected passing cases retained 12 trial logs, 20 virtual motor-15 I writes and
3,438 six-head goal packets, with protected settings and excluded motors unchanged
and originals checked at closure. All three matched captures passed completeness
and terminal-hold checks. B's host bracket was **12.833–13.800 seconds**, including
a **12.128-second observer-active host bracket**. These are virtual register and
synthetic IK/FK results, not physical integral response or arrival evidence.

Four failed/partial batches remain separate. They include protected-register
timeouts, an unqualified handoff failure and an unplanned position-read timeout
with zero received reply bytes. Fixture diagnostics were improved; runtime bytes,
timeouts, retries, freshness and recovery guards were unchanged. Completed cases
do not establish serial reliability or explain the earlier physical parser fault.

Audits found no fixture physical-device opens or INET connections. Final read-only
checks retained the same sole production owner, all 505 package hashes and 228
protected-file records, ready/disabled service and no pending transaction or lock.
Ten cached samples advanced, with maximum age 20.005 ms. All qualification children
exited and the robot lease was released. No production register request, gain,
Wake, Sleep, Stop, motion, installation or restart was sent; backups were reused.

The candidate remains **uninstalled**. Qualify the live owner adapter and exact
installation/disabled-load procedure before a separately authorized attended
single-upward comparison. Mode correction and publication remain separate.
See [qualification and retained limits](I_GAIN_TRANSACTION.md#single-upward-isolated-arm-qualification--october-20).

## Single-upward I trial and monotonic exposure log offline — October 20

A private **uninstalled host candidate** now admits one +10 mm upward leg per
I transaction, using a two-second ramp and ten-second observation hold. The
I0/I1/I0 sequence keeps the frozen full pose, original-P300 common start, path
review and exact preimage confirmation before Apply. Advancing post-handoff
feedback and unchanged start checks remain required. The client seals and
retains the trace, restores I0 and verifies originals before any separate return
or power action. The native runtime is unchanged; one daemon module and its
package RECORD differ. Existing backups and the installed observer wheel are reused.

**186 Python cases, 20 native I-maintenance cases, the exact fixture-root check
and the actual compiled-worker three-condition trial passed.** All three saved
traces passed completeness and terminal-hold checks. B's virtual host Apply/
Restore bracket was 12.531–13.359 seconds; its observer-active host bracket was
12.062 seconds, leaving 1.297 seconds outside it within the upper bracket.
This is synthetic register/IK/FK evidence, not a physical I1 result or an exposure
deadline. Failed fixture attempts remain separate and are documented.

The new log preserves monotonic dispatch/confirmation/unknown brackets, separate
clock domains and unresolved restoration. It neither infers hidden integral
state nor guarantees recovery after process or disk failure. No uncertain writes
are replayed; a failed ledger requires independent qualified recovery. The
existing no-watchdog and original-settings Wake/Sleep requirements remain.

No robot connection or hardware action occurred. Isolated ARM qualification,
live-adapter/recovery qualification, disabled overhead and the attended single-
leg comparison remain pending. Mode correction and publication stay separate.
See the [protocol, evidence and remaining gates](I_GAIN_TRANSACTION.md#single-upward-scope-and-monotonic-log-offline--october-20).

## Serial observer installation and disabled overhead — October 20

The qualified observer is installed on the test robot. The exact delta is one
native extension, its installed package RECORD and the existing private native
image pin. Daemon modules, service configuration and type declarations did not
change. The single controlled restart used no shutdown Sleep or startup Wake.
Telemetry before and after it reported disabled motors, with original gains,
profiles, limits and modes.
The retained rollback image was reused. Only 1,486 bytes of distinct RECORD/config
preimages plus metadata were retained for this change; no full backup was made.

Matched before/after recorder-off/on/off windows yielded **600 fresh advancing
cached-state samples**, with maximum cache age **26.23 ms**. Both recorder windows
retained 505 consecutive feedback events without loss. Read/publication p95 was
**2.239 → 2.101 ms**, maximum **4.356 → 4.226 ms**; maximum feedback gap was
**22.922 → 22.818 ms**. CPU use for the corresponding three windows was
52.63/62.32/54.04% before and 50.94/63.01/53.11% after, measured against one core.
These samples show no material disabled-load regression. Whole-daemon I/O rates
were similar; they are not counts of serial transactions. The existing recorder's
additional CPU use remains visible in both conditions.

Final checks retained the new sole owner, all 505 expected package hashes,
protected files and metadata, original register settings, ready/disabled state
and no pending transaction or fault receipt. Twenty further cached samples
advanced, with maximum age 19.03 ms. No Wake, Sleep, software motion Stop, head
target, gain or mode command was sent. No physical serial fault was injected.
The operator confirmed Reachy stayed asleep and settled, with no movement
through the installation and restart.
This finite disabled-only comparison does not qualify moving/browser/media load,
prove sensor freshness or fix the earlier serial cause. The single-leg I runner
and monotonic exposure ledger remain pending; mode correction and publication
remain separate. See the [installed observer record](I_GAIN_TRANSACTION.md#installed-observer-and-disabled-overhead--october-20).

## Serial observer isolated ARM qualification — October 20

The exact host-tested observer sources were cross-built and exercised through
generated serial terminals on ARM. **30 observer cases, 106 daemon cases and
17 native maintenance/recovery cases across retained batches passed.** Packet
failures at the first, middle and last motor retained the expected reply context,
CRC verification distinction, bounded capture and first-fault history after valid
feedback resumed. The daemon's private first-fault receipt retained the new wire
details through guarded restoration and feedback recovery.

A virtual comparison attempt timed out before receiving any reply bytes within
the existing serial timeout. Its guard withheld output. The failure is retained;
the affected and remaining cases subsequently passed without changing candidate
bytes, timeouts or retries. This does not explain the earlier physical parsing
fault or establish that serial reliability is fixed.

Syscall audits found no fixture physical-device opens or INET connections.
Production software, protected configuration and the sole serial owner remained
unchanged and disabled. No production register request, gain write, Wake, Sleep,
Stop, installation or restart was performed. Existing backups were reused.
Only the native image and its package RECORD differ for a future installation;
daemon modules and types remain unchanged. Physical overhead validation and
the proposed single-leg I scope/monotonic ledger remain pending. I0 is retained;
mode correction and publication remain separate. See the
[qualification and remaining gates](I_GAIN_TRANSACTION.md#isolated-arm-observer-qualification--october-20).

## Integral return bias and serial parsing follow-up offline — October 19

The saved I1 trial's 150.09-second conservative host interval contained only
49.94 seconds of recorded cached-feedback spans; **100.15 seconds, about two
thirds, lay outside the captures**. A new offline analyser preserves those gaps
and checks clock consistency instead of treating scored ramps/holds as total
exposure or reconstructing a hidden integrator. A proposed single-upward-leg
comparison moves path review before I1 and restoration before unscored returns;
it needs separate entry qualification and is not yet a hardware-ready runner.

An uninstalled native candidate captures bounded bytes already passing through
the existing position reader and retains precise private packet-failure context.
Packet acceptance, errors, retries, timeouts, ownership and recovery gates stay
unchanged. It distinguishes malformed-reply classes without silently repairing
or skipping a packet. The earlier physical parsing failure's exact cause remains
unknown because that fault did not capture its bytes.

Fifteen focused native diagnostic cases, 183 distinct native cases across
batches, eight Python recovery/receipt cases and all 525 JavaScript offline tests
passed. Earlier fixture-input failures are retained. ARM runtime and physical
overhead checks remain pending. No robot connection or hardware action occurred;
the latest physical checkpoint remains original I0, asleep/settled. Backups were
reused, with no mode correction or publication. See the
[analysis, candidate and next gates](I_GAIN_TRANSACTION.md#offline-follow-up-exposure-and-serial-evidence--october-19).

## Attended matched vertical I0/I1/I0 — October 19

All twelve scored movements and six original-settings common-start movements
completed. Only B changed motor 15 to I1; P300, other gains, profiles, modes and
protected limits stayed original. Delivered and independently read-back terminal
goals matched across all conditions. Motor-15 upward-return errors were
**74 → 69 → 74 counts**, upper-target errors **85 → 42 → 85**, and final-return
errors **+5 → −37 → +5**. The negative return error is a retained position offset,
not proof of dynamic overshoot. Whole-head tilt remained; the operator reported
similar upward tilt and no concerns. I0 is retained; I1 is not a tuning recommendation.

A position-read parsing error inhibited A2 before its first scored target.
Original closure, a guarded fresh-native-cache acknowledgement and a new matched
start allowed the unissued sequence to complete in the same Wake, with the failed
attempt retained. The communication cache also retained an earlier timeout
predating I1. Network access remained available. Neither the serial cause nor
firmware integrator/reset behavior is established.

All scored traces qualified: 29,435 events, 7,313 complete target/write frames and
7,496 feedback reads. I1's conservative host exposure interval was 150.09 seconds,
including between-leg path reviews; sparse voltage reads were 7.3–7.5 V. Final
read-only checks confirmed original I0/P300/profiles/modes, ready service,
disabled motors, the same owner and 505 package hashes, no pending/recovery lock
and twenty advancing samples with maximum cache age 19.38 ms. The operator
confirmed normal final Sleep. Backups were reused; no installation, restart,
mode correction or publication occurred. See the
[matched results, recovery and limits](I_GAIN_TRANSACTION.md#attended-matched-i0i1i0-comparison--october-19).

## I-gain disabled hardware qualification — October 19

The qualified private native/daemon patches are installed. Unchanged I0 and
motor-15 I1 → I0 transactions passed with all nine motors disabled. Offline serial
decoding verified 383 CRC-valid replies, independent configuration readbacks and
exactly two register writes: motor 15, address 82, I1 then I0. Other gains, modes,
profiles and limits remained original. No Wake, Sleep, Stop or movement target
was sent. The operator confirmed asleep/settled behavior during the final checks.

Device traces exposed torque-off one-count goal/present changes on both head and
antenna motors, non-atomic register reads and a changed passive antenna pose.
The final I-only correction handles the one-count disabled readings and permits
a strictly read-only exit from a never-applied disabled session. Awake admission,
changed-gain restoration and profile/P-only policies retain their guards. The
correction passed 25 focused host cases and four isolated ARM PTY cases; earlier
failed attempts and virtual timeout evidence are retained separately.

Final service is ready with I0/P300, original modes/profiles, disabled motors,
one serial owner and no pending transaction or recovery lock. A ten-second idle
window retained 100 advancing samples, maximum cache age 24.17 ms and about 51.7%
of one CPU core. Backups were reused; mode correction and website publication
were excluded. This qualifies register handling and recovery, **not the physical
effect of integral action**. See the
[hardware evidence and next comparison](I_GAIN_TRANSACTION.md#disabled-hardware-qualification--october-19).

## I-gain isolated ARM runtime qualification — October 19

At the earlier, pre-installation checkpoint, the I-gain candidate passed
**106 Python cases and 17 native PTY
cases on ARM**, including the complete virtual twelve-leg I0/I1/I0 comparison,
uncertain-write inhibition, lost-acknowledgement reconciliation, feedback-fault
recovery and cross-process restoration. The real restore-only custodian was
exercised for disabled and simulated awake holds. The exact native/daemon packages
are unchanged from the host candidate. Only motor-15 register 82 changed at the
virtual peer; P gains, modes, profiles, torque and excluded goals stayed original.

The harness was corrected for post-handoff advancing feedback, a frozen reference
and stable proxy identity; earlier failures are retained. Crash tests reused the
fixture-only PTY terminal-flag reset after confirmed child exit. Physical UART
crash reopening and physical integral response remain unqualified. No freshness,
serial timeout or ownership guard was relaxed.

Audits found no physical serial-device opens or fixture INET connections. The
production daemon retained its sole owner, all 505 package files, protected
configuration, ready state, disabled motors and no pending transaction. Ten
advancing cached samples had maximum age 19.72 ms. All fixture children exited.
No production gain/motion command, installation, service restart, new full backup,
mode correction or website publication occurred. See the
[qualification scope and next gates](I_GAIN_TRANSACTION.md#isolated-arm-runtime-qualification--october-19).

## Reversible I0/I1 trial prepared offline — October 19

A private, uninstalled candidate now admits **motor 15 only, Position I0/I1**
through a separate typed transaction on the existing native worker. P300 and
all other gains, profiles, modes and protected limits remain fixed. Exact copied
preimage confirmation, journaled one-shot Apply, fresh readback, head-only handoff,
feedback-fault inhibition and explicit original restoration are retained. The
daemon permits the four frozen vertical targets in order, with the same two-second
ramps, and checks the post-Apply measured starting pose again.

**169 native host cases and 106 Python cases** were verified, including a compiled
same-worker virtual I0/I1/I0 comparison with exact two-byte register-82 writes,
independent gain readbacks and lost-restoration-reply reconciliation. One existing
P-only capture fixture missed its sample-count threshold under concurrent host
load and passed unchanged in isolation; failed attempts remain in the private
receipt. These are register-bus and synthetic IK/FK tests, without a physical
integrator, torque or stability model. ARM runtime and disabled-only device
qualification remain pending. No robot was contacted or moved, and no new full
backup, operating-mode correction or website publication was made.

I1 is a conservative first mechanism probe, not an expected whole-head tilt fix.
Its effect can accumulate during holds. Exact I0 register restoration does not
prove hidden integrator reset, and output revocation is not gain restoration.
The [I-gain protocol and limits](I_GAIN_TRANSACTION.md) preserve these distinctions
and require original settings for later Wake/Sleep and common-start acquisition.

The ARM extension cross-built locally, with its ELF architecture, packaged type
stubs and wheel RECORD verified. A cross-build is not an ARM execution test.

## Attended common start and matched P300/P360/P300 — October 19

The original-P300 common-start procedure passed on the robot before **all three
conditions**, followed by the complete matched A1/B/A2 vertical comparison.
Six unscored acquisition legs and twelve scored legs completed on the same
installed image and daemon owner. Scored post-maintenance starts were within
0.25 mm / 0.65° of one frozen reference, under the unchanged 1 mm / 1° criterion.
All twelve traces and terminal holds qualify: **7,320 complete frames and 7,489
feedback reads**, with identical corresponding delivered and independently
read-back six-head goals.

| Upward leg | Motor-15 held error, A1 P300 → B P360 → A2 P300 | FK position error, A1 → B → A2 |
| --- | --- | --- |
| Return from −24 mm to neutral | 74 → 59 → 74 counts | 4.96 → 4.17 → 4.97 mm |
| Neutral to +10 mm | 86 → 58 → 86 counts | 7.18 → 6.21 → 7.19 mm |

The operator saw less upward tilt in B and more again in A2, without contact,
strain or unexpected motion. This single ordered A/B/A supports a reversible
gain-dependent following-error component. Other joints still lagged substantially;
it does not justify a permanent gain change or establish a complete leveling fix.
FK is not independent head-pose metrology, and sampled 7.2–7.5 V does not exclude
brief electrical transients. The new protocol remains separate from earlier scores.

Only the planned Wake/Sleep transitions between conditions were used; no service
restart, mode correction or new full backup was needed. Final readback confirms
original gains/profiles and protected settings, disabled motors, ready service,
no pending transaction and no fault/admission receipt. The operator confirmed
normal final Sleep. No feedback interruption required recovery during the moving
sequence; the earlier intermittent fault remains unexplained. See the
[complete comparison and limits](P_GAIN_TRANSACTION.md#october-19-completed-common-start-and-matched-p300p360p300).

## Communication/common-start installation and disabled checks — October 19

The ARM-qualified communication/common-start candidate is now **installed**.
Three package members, their two existing RECORD files and the private native
image pin were updated using verified rollback archives and small exact preimages.
One service stop/start preserved the no-startup-Wake policy; no Wake, Sleep,
comparison target, gain experiment or mode correction was requested.

Disabled trace off/on/off checks passed: **506 consecutive feedback events**,
no target events, no lost events and sampled cache age below **25 ms**. CPU use
varied from about **54–62% of one core**, against a preceding short baseline near
56%; these finite windows do not establish a precise incremental overhead cost
or moving performance. Final independent checks confirm the loaded native image,
all 505 package files, original gains/profiles and unchanged modes, sole owner,
ready service, disabled motors and no pending transaction or fault receipt.
The operator confirmed Reachy stayed asleep and settled without movement.

Physical common-start acquisition and the revised P300 follow-up remain pending.
The next moving stage needs actual-model path clearance and the same new
acquisition history for every compared condition. These disabled results neither
resolve the earlier following error nor reproduce its intermittent communication
fault. See the [installation record](P_GAIN_TRANSACTION.md#communication-and-common-start-disabled-deployment-october-19).

## Communication and common-start ARM qualification — October 19

A private, uninstalled candidate now retains bounded native communication errors
and distinguishes register header, ID, length, CRC, status and stuffing failures.
The daemon saves this existing cache in private fault/admission receipts; ordinary
status stays sanitized. Capture adds no serial read, retry, recovery or target.
The amended candidate passed **68 Python cases on ARM and 14 native PTY cases**,
with the exact compiled extension and daemon wheel loaded in isolation. The PTY
peer admitted only virtual six-head targets; it observed no gain, mode or torque
writes. Syscall audits found no physical serial-device opens or fixture network
connections. The earlier 48 native host cases remain separate regression evidence.

A separate original-P300 common-pose procedure approaches the unchanged frozen
neutral from above using two reviewed, unscored local legs. It requires fresh
feedback, an actual higher staging position, stable arrival within the existing
1 mm / 1° criterion and verified original restoration before comparison. It does
not compensate targets, rebase the reference or cycle Wake automatically. This is
a new protocol for every condition; its scores cannot silently complete or pool
with the preceding A1/B experiment.

Integration exposed two gaps in the preparation: the old vertical-only lease
correctly refused rotation/sideways acquisition, and the reader could still be
paused immediately after known restoration. The amended private operation allows
exactly two fixed acquisition targets under original P300, configured once; ordinary
comparison scope is unchanged. A bounded read-only wait now requires fresh,
advancing feedback after restoration, while native errors remain failures.
The complete common-start/restore path passed on the actual native ARM worker
and daemon manager with synthetic pose/IK. Actual robot path clearance and
physical acquisition remain unqualified. See the [runtime evidence and limits](P_GAIN_TRANSACTION.md#communication-and-common-start-isolated-arm-runtime-october-19).

No production installation, service restart, Wake or physical movement occurred.
Final read-only checks retained the same sole owner, all 505 package files and
private configuration, ready service, disabled motors and no pending transaction.

## Latest P-only comparison and recovery — October 19

The same-image vertical comparison completed **A1 P300 and B motor-15 P360**,
then one A2 P300 leg. Its nine completed traces qualify: **5,489 complete frames
and 5,623 feedback events**. All corresponding delivered six-head goal counts
matched exactly, including independent held servo-register readback.

At the upward return, motor 15's median error decreased from **74 to 59 counts**;
at the upper target, **86 to 60 counts**. Upper pose error decreased from
**7.33 mm / 5.97° to 6.68 mm / 4.64°**, while several unchanged joints retained
large errors. This is provisional A/B evidence consistent with position-loop
following error, not a completed A/B/A, a gain recommendation or a smoothness result.
Sampled voltage was 7.3–7.6 V; brief transients remain unmeasured.

A2 stopped after its first completed leg because native feedback reported a motor
communication fault while output was paused. HTTP/SSH and the same daemon owner
remained available. An original-P restoration initially rejected an invalid head
register reply; one fresh **read-only P300 check** then closed it. Explicit
fresh-cache acknowledgement restored readiness, followed by factory Sleep.
A fresh A2 attempt was withheld before a gain transaction or comparison target:
its Wake pose differed by 0.72 mm / 1.16°, outside the frozen 1° start criterion.
The original reference and admission criterion were preserved.

Final independent checks confirm **factory Sleep completed, motors disabled,
original gains/profiles and unchanged modes, ready guarded service, no pending
transaction, and all 505 installed package files matching the reviewed image**.
The operator's standing attendance authorization covered execution; technical
checkpoints do not imply a new visual confirmation or visual smoothness ranking.

This follows a preliminary P300 block and a qualified, restoration-only fix for
one-count excluded-encoder variation. The operator power-cycled once; volatile
observer/maintenance overrides then required explicit restoration. No new full
backup, mode correction, permanent gain change or website publication was made.
See the [detailed comparison and exclusions](P_GAIN_TRANSACTION.md#october-19-same-image-p300p360-comparison-and-interrupted-a2).

## Earlier handoff admission checkpoint — October 19

The ARM-qualified P-only handoff candidate is now **installed**. Six package
members and the private native-image pin were updated using the existing rollback
archives and small exact metadata/RECORD preimages. One service stop/start used
the existing no-startup-Wake policy. Disabled trace off/on/off checks passed:
505 contiguous feedback events, no target events, sampled cache age below 25 ms,
and CPU use of about 51–53% of one core across the three short windows. These
measurements do not qualify moving performance or general real-time overhead.

The attended P300/P360/P300 comparison **did not run**. After visually confirmed
factory Wake and one original-settings measured-hold setup, initial preparation
rejected a fresh-stationary-hold check. Explicit no-write closure later passed on
the same owner. A fresh preparation and off-device preimage confirmation then
passed, but the motion handoff was refused. No comparison target or candidate
Apply command was sent; P360 was never applied. Handoff cleanup replaced the
native failure state with `ReclaimingLocked`, so the underlying handoff cause
remains unknown. It must not be inferred from the earlier stationarity failure.

Original P and profiles were restored and independently read back before one
factory Sleep. Final checks confirm disabled motors, the exact 505-file installed
inventory, the same sole owner, and no pending maintenance marker, inhibition or
feedback-recovery requirement. The operator confirmed normal Sleep and a settled
robot. The candidate remains installed; physical P-motion handoff and gain benefit
remain **unqualified**. Backups were reused, redundant uploaded wheels removed,
and no publication or mode correction occurred.

Next is a focused offline fix to preserve the pre-cleanup handoff exception and
native status, with bounded joint/anchor diagnostics. The private comparison
client also stopped requesting unavailable optional target-pose state after
maintenance retirement; measured feedback and commanded intent remain separate.
See the [admission attempt and recovery](P_GAIN_TRANSACTION.md#october-19-attended-installation-and-withheld-comparison).
The dated uninstalled statements below describe their earlier checkpoints.

## Latest P-motion ARM checkpoint — October 18

The private P-gain motion handoff passed isolated qualification on aarch64
Python 3.12 using generated PTYs. The exact final native image passed **40
focused Python cases**, all **twelve two-second vertical A/B/A legs** and
restore-only cross-process recovery. All twelve traces qualify: **1,117 complete
frames and 1,310 feedback events**, with correct per-leg P readback. The comparison
made exactly two virtual P writes, 360 then 300 on motor 15. Additional tests
covered lost acknowledgements, an actual native cache checksum fault, inhibited
trace export, separate recovery acknowledgement and refusal of wrong
session/type, corrupt proof, live-owner and unexpected-torque cases.

Qualification exposed misleading startup diagnostics: recovery-admission errors
were mapped to a generic serial-open failure. The final native amendment retains
the actual cause without changing admission or motion policy. Fifteen focused
native P cases passed after this amendment. Two failed fixture attempts remain
failed evidence; the final exact image passed the full integration sequence.

The fixture used synthetic kinematics, servo response, power/context and readiness.
It establishes no physical P benefit, arrival accuracy or power-loss recovery.
Independent syscall/packet review retained generated PTY-only access and no
fixture INET connections. Read-only production checks matched 505 installed
files, the same sole serial owner, configuration, journal and service units;
motors reported disabled. No installation, daemon restart, Wake, Sleep, Stop or
physical movement request was made. All fixture processes exited and about
355 MB of verified temporary remote staging was removed after evidence retention.

The candidate is **uninstalled**. The unarmed next stage is attended exact-file
installation/disabled overhead checks, then the prepared P300/P360/P300 vertical
comparison with original P/profiles for Wake and Sleep. Existing backups are
reused; no new full backup, publication or mode correction was added. See the
[ARM qualification and limits](P_GAIN_TRANSACTION.md#october-18-p-only-motion-handoff-isolated-arm-qualification).

## Preceding host P-motion checkpoint — October 18

A private P-only motion handoff candidate passed **143 native tests** and **106
Python cases** on the host. Its separate parameter authority permits one selected
head servo's two RAM P bytes to use P300 or experimental P360, with exact backup,
off-device hash confirmation, independent readback and original restoration.
Profiles, I/D, modes, limits and other motors remain protected.

The combined compiled-worker fixture completed twelve two-second vertical A/B/A
legs with correct per-leg gain readback and exactly two P writes, 360 then 300,
on motor 15. All twelve traces qualify: 752 complete frames and 1,222 feedback
events. It also qualified read-only reconciliation after losing the completed
native Restore result. The first target rechecks a fresh post-maintenance starting
pose; stale pre-Apply cache data cannot admit the candidate movement.

This is a host memory-bus test with synthetic IK/FK and servo response. The
candidate is **uninstalled and not ARM/PTy-qualified**; it proves neither physical
gain benefit nor safe hardware tuning. The unarmed comparison is original P300,
motor-15 P360, then P300, using the two-second vertical targets and ten-second
holds, with original P/profiles for Wake and Sleep. See the
[handoff policy and qualification limits](P_GAIN_TRANSACTION.md#october-18-p-only-motion-handoff-offline-qualification).

The Python wheel and native source/stub pins are prepared for isolated ARM build
and PTY qualification. Existing rollback archives are reused; no new full backup,
robot connection, installation, restart, Wake, movement or publication occurred.
Mode correction remains separate. Robot state in the physical record below is
historical; this pass made no fresh hardware observation.

## Latest attended speed/power checkpoint — October 18

Original-settings daemon-local vertical conditions at **15, 2 and 1 second** are
complete, with matched starts, ten-second endpoint holds and factory Sleep/Wake
between conditions. Faster motion looked smoother to the operator, while tilt
seemed similar across conditions. The upper endpoint still missed by respectively
6.88 mm / 6.30°, 6.85 mm / 6.09° and 6.35 mm / 5.10°. Downward returns to neutral
were within 0.21 mm / 0.36°. Speed helps appearance but did not fix upward following.

Thirteen complete traces qualify, including a repeated slow down/return pair:
10,751 complete frames, 11,119 feedback events and thirteen qualified terminal
holds. Sampled cache completion age stayed below 30 ms. **140 bounded native
register brackets** recorded goal, internal trajectory, measured position,
PWM/current and voltage. Servo goal vectors matched across speeds; internal
trajectories were within three counts of goals at the held neutral/upper targets,
while measured errors remained as large as 88 counts in the upper-target summaries.
The lower target retained up to nine counts of goal/trajectory difference.

Sampled voltage stayed at 7.3–7.5 V. Peak sampled PWM/current magnitudes were
121/73 raw against configured limits 885/1750. This does not support sustained
power starvation or output clipping, but sparse sequential reads cannot exclude
brief transients or establish a mechanical/controller root cause. See the
[full speed and electrical comparison](HEAD_RESPONSE.md#attended-vertical-speed-and-electrical-comparison-october-18).

One initial capture failed after the client scheduled a native read inside its
cooldown. That incomplete capture is retained separately. The corrected schedule
and a new measured down/return pair completed without restarting the daemon or
replaying an uncertain target. No feedback-cache fault occurred in the completed
captures; this is not a network endurance or physical fault-recovery qualification.

Original settings and all 505 installed files are unchanged. There was no
installation, daemon restart, additional full backup, publication or mode correction.
Final telemetry/native readback confirms disabled motors, and final Sleep was
visually confirmed. The robot reservation is released. The next diagnostic is a
reviewed reversible P-only comparison, rather than a presumed power-supply fix.
The existing disabled-only P transaction does not yet qualify gain-to-motion
handoff; that step requires separate review before changed-gain movement.

## Preceding offline trace checkpoint — October 18

Saved-trace analysis now isolates constant encoded-goal terminal windows and
separates their error from floating-reference quantization and moving-ramp lag.
All twelve preceding A/B/A traces qualify. Each matched neutral pair has the same
complete pose, body reference and six encoded goals; its final two seconds contain
100 aligned reads with at most one count of per-joint variation. Upward returns
retain up to 81 counts of error; downward returns are within three counts.

Exact-model replay reconstructs Wake's software target within 0.003°, with about
0.15° of head quantization, versus 3.36–3.57° from recorded measured joints.
The tested software/numerical effects cannot explain the discrepancy. A fixed
calibration offset alone cannot explain the matched direction-dependent encoder
errors; mechanical, actuator, power and controller-response contributions remain
unresolved. No compensating target or tuning change was selected.

The analyzer changes passed **520 offline tests**, including seven new regression
cases; final focused analyzer/public-export checks passed 23. Tests ran directly
with Node 24 because the npm child shell could not resolve node. No browser or
robot runtime changed. The [head-response audit](HEAD_RESPONSE.md#offline-upward-following-and-wake-audit-october-18)
and [unarmed power/actuator capture](STATIC_ERROR_TEST_PLAN.md#power-and-actuator-follow-up-after-the-vertical-aba)
retain the evidence and next step: original settings, post-Wake baseline and
bounded voltage/PWM/current/trajectory reads at matched held poses.

No robot connection, request, installation, restart or movement was made during
this pass. Existing backups were reused, no full backup or publication was added,
and mode correction stays separate. Hardware state below is historical.

## Preceding attended profile checkpoint — October 18

The qualified Python-only feedback-recovery patch is now **installed**. Fresh
readback matched the saved package inventory before installation; only the
maintenance module and daemon RECORD changed. The native image, configuration,
service policy, operating modes and gains stayed unchanged. Existing rollback
artifacts were reused, with **zero new full backups**.

Disabled off/on/off recorder checks retained 506 feedback events without loss or
head writes. Cache completion age stayed below 25 ms. Recorder-on CPU use was
61.8% of one core, against 61.7% and 53.9% in the two off windows; this finite
sample does not isolate all patch overhead or establish real-time guarantees.

The attended **vertical A/B/A completed all twelve legs**, with original profiles
for every Wake and Sleep. All twelve traces passed coverage analysis: **14,585
complete frames and 15,302 feedback events**. Sampled cache completion age stayed
below 28 ms. No feedback-cache fault occurred, so physical fault recovery was not
exercised; the earlier ARM/PTy fault-injection qualification remains separate.

Original A1, candidate acceleration/velocity 42/13, and restored-original A2 all
showed similar visible interior jitter and upward tilt, with no reported concerns.
Upward endpoints missed by 6.82–7.04 mm / 6.02–6.36°, while final downward returns
were within 0.09 mm / 0.54°. Unequal joint following errors support the operator's
observation of uneven supporting-arm extension. No profile benefit or root cause
is established. See the [full result and direction table](SERVO_PROFILE_EXPERIMENT.md#feedback-recovery-installation-and-complete-vertical-aba).

One initial preparation and a no-write closure rejected stability checks; a fresh
no-write reconciliation released the same owner without a new power cycle.
A1/B reclaim acknowledgements were unavailable, but read-only status confirmed
revocation and explicit original restoration completed. These remain diagnostic
limitations, rather than passes of every maintenance gate.

Final readback verified 505 package files, the same loaded native image and sole
owner, original profiles/gains/modes, disabled torque and no pending transaction
or inhibition. Final Sleep was visually confirmed asleep and settled. The robot
lease is released. No publication or mode correction was included. Saved power
and reachability facts are historical outside their receipts.

## Preceding ARM checkpoint — October 18

The exact feedback-error recovery candidate passed **isolated native-worker and
ARM/PTy qualification** with the existing native image. Corrupted position-read
reply checksums produced actual native cache errors during a trajectory and
between captures. The same backend/native owner and private socket survived;
the first fault was retained, the interrupted capture exported under inhibition,
and a completed job stayed completed when the fault occurred between captures.

Explicit original restoration cleared each virtual transaction while leaving
Python output inhibited. Persistent bad feedback rejected acknowledgement; later
fresh feedback alone emitted no target. Acknowledgement required the exact
restored handle, retired its request and rejected an older transaction's reply.
A new explicit session then completed fresh movements. The 24 focused regression
cases also passed on ARM, including simulated uncertainty and authentication
boundaries; those negative cases do not all inject real native bus faults.

Four completed captures passed coverage analysis: 367 complete frames and 440
feedback events. The failed capture is saved separately and excluded. The peer
accepted 379 six-head goal packets and 36 allowed profile writes; it rejected
other packet types. Final virtual profiles, protected configuration and excluded
motors matched their originals. Kinematics, servo response, power/context and
readiness publication were synthetic.

An earlier fixture attempt passed its 24 ARM cases and two movements but failed
to induce the intended cache error: its full-length instruction-error reply was
accepted by the retained generic position-read path. That failed qualification
and its traces remain separate. The passing fixture used CRC corruption; no
runtime source or production deadline changed between attempts.

Process-tree syscall review found generated PTYs and no physical-device opens or
INET connections. Read-only production checks matched all 505 package files,
the same sole serial owner, journal, configuration and service units, with motors
disabled. Hash-verified temporary staging was removed after evidence retention.
No production installation, restart, Wake, Sleep, Stop or movement was sent.
The candidate remains **uninstalled**, existing backups were reused, no full
backup was added and mode correction stays separate. This qualifies the tested
recovery sequence, not physical arrival, smoothness or the original bus-fault cause.
See the [native-worker/ARM record](SERVO_PROFILE_EXPERIMENT.md#feedback-error-recovery-native-worker-and-armpty-qualification).

## Preceding offline checkpoint — October 18

The feedback-error teardown fix is implemented and validated **offline**, in an
uninstalled Python-only candidate. A classified native-cache failure now revokes
the existing head lease and clears readiness while retaining the native/backend
owner, authenticated status and observer export. The first failure has bounded
diagnostic codes and a bounded private diagnostic receipt. Uncertain revocation
and unrelated publisher exceptions still escape to the fatal path.

Returning feedback does not resume output. Explicit original-profile restoration
leaves the feedback-fault fence latched; a separate authenticated acknowledgement
requires fresh native feedback, known completed restoration and the existing
identity, ownership, attendance and idle gates. It retires old targets and epochs
without a servo write. The candidate avoids setting Pollen's fatal-error field,
which would otherwise leave daemon status stuck in ERROR after recovery.

Twenty-four new focused cases passed, along with retained guard, trajectory,
observer and power regressions: **90 successful Python test executions** in the
final run, including repeated retained cases. Packaging verified 494 baseline
non-record wheel members against the saved installed inventory; only the
maintenance Python module and wheel record change. The existing native image
and rollback artifacts are reused, with zero new full backups. No robot request,
installation, restart, Wake or movement was sent. Mode correction remains separate.
The actual native-worker/ARM recovery sequence still needs qualification before
deployment; these synthetic fault cases do not establish the physical read-error
cause or improve the measured profile/jitter result. See the
[feedback-fault recovery contract](SERVO_PROFILE_EXPERIMENT.md#feedback-error-owner-retention-offline).

## Preceding physical checkpoint — October 18

The qualified head-only/inhibited-export Python candidate is now **installed**.
The attended physical comparison completed all four original-profile A1 legs and
the changed-profile B downward leg and return. All six completed captures passed
coverage analysis: 7298 complete target frames and 7654 feedback events. The
operator reported visible interior jitter in A1 and similar jitter in B. B's
upward target was never submitted, A2 never started, and **A/B/A is incomplete**.
No profile benefit has been established.

The downward endpoint residuals were about 0.28 mm / 0.77° for A1 and
0.28 mm / 0.73° for B. The following neutral returns missed by 4.63 mm / 3.89°
and 4.69 mm / 4.13°, respectively. Completed trajectory generation and good trace
coverage remain distinct from measured arrival. During the six captures, median
group-write durations were 0.069–0.073 ms and the largest native queue delay was
4.73 ms; these host timings do not timestamp individual servo acceptance.

After B's return, the daemon reported a **motor-communication error**, closed its
native backend and removed the maintenance socket. HTTP and SSH stayed reachable;
this is separate from the earlier network-route disappearance. The completed
return's capture had already been exported. No active upward capture or request
existed to recover, and no target was replayed. The physical read-failure cause
is unproven. A focused unchanged-code offline reproduction shows how a native
cached-feedback error can escape even a paused publisher and reach Pollen's
backend-closing wrapper; it does not prove the missing physical stack trace.

The qualified cross-process custodian restored the six original head profiles
and cleared the transaction. Syscall decoding verified six profile-restoration
writes and no goal, torque, mode, gain or reboot write during that recovery.
A temporary original-initialization startup then regained ordinary factory Sleep
access without startup Wake. Sleep completed and the operator confirmed asleep
and settled. That temporary policy was removed. The guarded service is restored
with disabled motors, original profiles/gains/modes, the same native image, all
505 package files verified and no pending transaction. Thirty final cache samples
advanced, with 21.1 ms maximum sampled completion age. Existing backups were reused;
no full backup or publication was added, and mode correction remains separate.
The next focused work is preserving fault evidence and recovery access when the
native feedback cache fails, before another moving profile comparison. See the
[partial A/B/A and recovery record](SERVO_PROFILE_EXPERIMENT.md#head-only-physical-comparison-and-backend-loss).

## Preceding isolated ARM checkpoint — October 18

The exact head-only/inhibited-export candidate subsequently passed **isolated
ARM/PTy qualification**, using the existing native image. A single simulated
owner completed all twelve two-second A1/B/A2 legs, a 15-second downward leg and
its 15-second return, then an interrupted changed-profile leg with inhibited-state
trace export and explicit original restoration. All fourteen completed traces
passed the public analyzer: 2461 complete frames and 2831 feedback events. The
interrupted job remained excluded from completed-comparison evidence.

The generated peer accepted 2470 six-head goal packets and 24 profile application/
restoration writes. It rejected every unreviewed packet type; no torque, mode,
gain or excluded-motor goal write was accepted. Final virtual profiles and protected
configuration matched their originals. Actual native worker, Pollen interpolation,
private Unix service and in-process HTTP trace routes were exercised; kinematics,
servo response and readiness publication remained synthetic fixture surfaces.

Process-tree syscall evidence showed only generated PTY devices and no INET
connections. Before/after checks matched the same sole production serial owner,
505 installed files, journal, configuration and service units; production status
remained disabled. No production installation, restart, Wake or movement was sent.
Only hash-verified temporary staging was removed after evidence download. Existing
artifacts were reused, no full backup was added, and mode correction stays separate.
At that checkpoint the Python candidate was **uninstalled**; physical A/B/A remained unfinished.
See the [ARM qualification record](SERVO_PROFILE_EXPERIMENT.md#head-only-continuation-isolated-armpty-qualification).

## Preceding offline checkpoint — October 18

The head-only trajectory and inhibited-state trace export fixes are implemented
and validated **offline**, in an uninstalled Python-only candidate. The adapter
retains Pollen's minimum-jerk head curve and returns no body/antenna samples to
`play_move`. The excluded-target guards remain strict. Authenticated trace
stop/snapshot/clear now use the current retained backend/native owner when
readiness is cleared; starting a capture still requires ordinary admission.
Bounded failure codes preserve the first cause before revocation without exposing
raw exception text. See the
[continuation contract](SERVO_PROFILE_EXPERIMENT.md#head-only-continuation-and-inhibited-export-offline).

Fifty distinct Python cases passed (66 executions including retained regression
reruns), plus 45 targeted JavaScript tests. An actual compiled native worker with
generated servo registers completed twelve two-second A1/B/A2 vertical legs and
an injected ownership fault. All twelve completed traces passed the public
analyzer; the fault capture was sealed/exported under inhibition and excluded
from completed-comparison evidence. IK/FK and servo response were synthetic.
This is not ARM runtime, physical arrival or smoothness qualification.

Packaging verified 494 baseline wheel members against the saved installed
inventory. Only three Python runtime files and wheel metadata change; the
existing native wheel and rollback artifacts are reused. No robot request,
installation, restart, full backup or publication was made. ARM qualification
and an attended A/B/A retry remain pending. Mode correction is separate.

## Preceding physical checkpoint — October 18

The attended continuation passed the awake handoff and completed the first
original-profile vertical leg: 24 mm down over 15 seconds, followed by a ten-second
hold. The measured endpoint residual was 0.28 mm and 0.87°. The operator reported
visible jitter, without contact or strain. Its saved trace passed the public
analyzer with 1215 complete frames and 1276 feedback reads, without exclusions.
Median native group-write duration was 0.071 ms; maximum queue-to-execution time
was 3.72 ms. These host timings do not timestamp individual servo acceptance.

The return was accepted and then failed inside the guarded daemon. It was not
replayed. Its exact exception was not retained, and the interrupted return trace
could not be exported after readiness was cleared. Therefore the A/B/A comparison
is **incomplete**, and no candidate servo profile was applied.

Recovery captured a one-count body-encoder change with its goal and configuration
unchanged. This prevented original-state closure under the previous exact excluded-
motor comparison. A restoration-only native fix passed 127 offline tests and three
focused ARM/PTy custodian cases: accept one-count body noise, reject two counts,
and reject a changed body goal. Earlier multi-operation instrumented fixtures hit
deadlines and are retained as failures; they do not qualify the full comparison.
The focused pass used syscall filtering without extending production deadlines.

The fix was installed and the real original-only custodian cleared the pending
transaction. Factory Sleep completed with visual asleep/settled confirmation.
The temporary cleanup startup was removed, and the guarded no-startup-Wake service
is restored. Final checks verified 505 installed files, the loaded native image,
disabled motors, original profiles/gains/modes and no pending transaction. Thirty
final cache reads advanced, with a maximum sampled completion age of 19.3 ms.
Existing backups were reused; no full backup or website publication was added.
Mode correction remains separate.

That attempt identified two continuation gaps: a truly head-only trajectory
adapter, and authenticated observer sealing while ordinary control is inhibited.
The subsequent offline candidate above addresses both. Retained Pollen
goto/play_move plus a synthetic owner
reproduces an immediate failure when a newly measured omitted body target differs
from the held lease by one count. This explains a plausible return-failure path;
the physical exception itself remains unproven. See the
[physical comparison and recovery record](SERVO_PROFILE_EXPERIMENT.md#first-physical-leg-and-restoration-only-recovery).

## Preceding checkpoint — October 17

The resumed attended A/B/A attempt was **withheld before any vertical target or
candidate-profile application**. Wake completed and was visually confirmed.
Preparation and handoff encountered stationarity failures. After bounded no-write
recovery, factory Sleep completed; fresh readback and the operator confirmed
disabled/asleep/settled, with original profiles and no pending transaction.

A traced closure window retained 16 complete nine-motor snapshots across eight
checks. Only two head encoders varied, by one count each; goals, profiles and
configuration were unchanged, all Moving flags were clear and absolute raw
velocity stayed at or below one. This diagnoses the traced closure failures;
earlier untraced velocity/stationarity failures remain separate evidence.

A **new native revision** allows a one-count difference only in the
six head encoder comparisons. It retains the saved anchor so drift cannot accumulate,
and keeps goals/configuration/body/antenna positions exact. The existing dwell,
velocity/Moving checks, freshness, ownership and write/recovery fencing remain.
All 124 native offline tests passed, including actual compiled-worker integration
with synthetic feedback. Twenty-one focused ARM/PTy cases then passed, including
awake/disabled boundaries, head-only noise, exact goal/anchor checks and lost-ACK
restoration without replay. Syscall auditing found no physical bus access; the
production owner, packages and journal were unchanged during qualification.
The revision was then installed with motors disabled, reusing rollback artifacts.
Fresh Wake completed in software; its visual confirmation and the A/B/A movements
are still pending. No physical smoothness or profile-lag score was obtained.
See the [noise-bound proposal](SERVO_PROFILE_EXPERIMENT.md#awake-hold-encoder-variation-and-offline-candidate).

### Installed awake-handoff checkpoint

The amended awake-handoff candidate is now **installed on the attended device**.
Disabled recorder checks retained advancing fresh cache samples, at approximately
61–62% of one CPU core with recording versus 50–54% without. Moving-load behavior
and physical profile smoothness remain unqualified.

Device integration exposed two Python admission issues. A publisher-lock collision
could reject ordinary Wake/trajectory calls. A bounded wait now retains the
pre-wait epoch, so maintenance transitions still retire a waiting request. Actual
Pollen Wake/Sleep with synthetic feedback passed in 21 focused Windows/ARM tests.
A subsequent real Wake completed, and the operator confirmed raised/settled.

Before any comparison target, handoff rejected the real FK rotation's small
orthonormality defect. A second fix projects bounded **measured** rotations onto
SO(3), preserving translation. Requested matrices retain strict validation and
matched starts retain the 1 mm/1° limits. All 27 focused Windows/ARM tests passed.
This fix is installed; its physical handoff and the A/B/A movements remain pending.
A later ten-second disabled check had zero non-advancing samples, 18.8 ms maximum
sampled cache age and about 51% CPU of one core.

A separate no-write closure interruption was traced to a one-count variation on
one disabled encoder. Captured instructions were reads only; all nine torques were
off, with profiles, goals and configuration unchanged. Bounded fresh verification
passed the existing exact checks. No candidate servo profile or vertical target
was applied in this device pass. Existing backups were reused, with small exact
package-record preimages retained. Mode correction remains separate. See the
[deployment record](SERVO_PROFILE_EXPERIMENT.md#awake-handoff-installation-and-admission-fixes).

### Preceding isolated ARM checkpoint

The **amended awake handoff passed isolated ARM runtime qualification** and remains
**uninstalled at that checkpoint**. The final native and daemon wheels ran on generated PTYs using
the real native worker, private service, retained Pollen trajectories, head
publisher and restore-only custodian. All twelve A/B/A captures passed the public
analyzer (1099 complete frames); a 15-second leg and eight startup/fault/recovery
boundary cases passed. The native checks total 114, with 16 focused awake daemon tests.

This pass fixed two issues: an awake recovery custodian incorrectly inherited the
disabled startup rule, and a paused publisher could consume observer frame IDs
without sending a target. Awake recovery now requires its validated journal and
all nine enabled torque states; ordinary maintenance requires all nine disabled.
Pause is checked before frame allocation. Freshness, target expiry, ownership,
unknown-write and recovery guards remain enforced. Mode correction is separate.

Independent syscall and serial decoding found no physical device opens or fixture
network connections, and no excluded writes. The production service, sole serial
owner, all 505 installed files, real profile journal and private configuration were
unchanged; status remained disabled. Existing backups were reused and all owned
remote scratch was removed after evidence verification. No physical Wake, Sleep,
Stop, movement, installation or restart was sent. This qualifies virtual execution
and recovery; physical profile dynamics, smoothness and arrival remain unqualified.
See the [ARM result and next stage](SERVO_PROFILE_EXPERIMENT.md#awake-handoff-arm-runtime-qualification).

### Preceding offline awake-handoff checkpoint

The **awake profile handoff is implemented and validated offline** in a later,
uninstalled private candidate. It retains pending recovery state while granting
session/generation-bound head-only output. Reclaim revokes queued targets before
fresh stationary readback and exact original-profile restoration at the new held
head pose. Ordinary power, mode, gain, raw-write, body and antenna commands remain
blocked. The disabled-only physical installation described below is unchanged.
No robot request, SSH connection, Wake, movement, installation, restart or new
full robot backup occurred in this offline pass. Mode correction stays separate.

Validation passed **113 native tests**, including a compiled-worker A/B/A run with
twelve generated vertical legs and real process-exit recovery of an awake journal;
**15 awake daemon tests**, **20 Linux service/recovery tests**, **ten existing daemon
tests**, and **29 targeted project tests**. The compiled run used the retained
Pollen trajectory and actual head-publisher branch, with synthetic IK/FK and servo
registers. All twelve exported traces passed the public analyzer's coverage checks,
covering 750 reference/enqueue/execution frames. Exact profile restoration and
blocked excluded writes were verified. This is execution/trace evidence, not
physical smoothness, arrival or clearance evidence.

The handoff suppresses Pollen's unchanged body/antenna setter outputs, waits for
resumed fresh feedback without admitting stale targets, and computes cache age
inside the native clock domain. A separate output pause plus observer worker
barrier permits export without restarting the condition. Late coroutines and
unknown job outcomes cannot replay or resume targets. See the
[awake contract and remaining qualification](SERVO_PROFILE_EXPERIMENT.md#awake-handoff-offline-contract).
Private wheel records, a Windows import and the ARM release cross-build passed.
The later Stop-specific Python amendment preserves all native ARM build inputs.
At that offline checkpoint, ARM runtime qualification was still required before installation and an attended
original/candidate/restored vertical comparison. Existing backup artifacts are
reused; no website or browser-runtime change is part of this experiment.

### Preceding attended disabled-only profile qualification

The private recorder/profile candidate is now **installed and qualified for a
disabled-only physical profile roundtrip and no-write recovery**. Six head
motors received the reviewed acceleration/velocity fields, followed by six exact
restoration writes. Independent serial-packet decoding confirms those twelve
writes and no goal, torque, gain, mode or reboot writes in the roundtrip capture.
All nine motors' final readbacks show disabled torque and original profiles.
An unchanged transaction also closed without writes. A separate custodian closed
an earlier preparing transaction using reads only; pending state was not deleted
to bypass recovery. Normal service is running with one serial owner, no pending
transaction and the candidate retained for further work. No Wake, Sleep or
movement command was sent. The operator confirmed that Reachy remained asleep and settled throughout the
service transitions and profile tests, with no unexpected movement.

Physical integration exposed four gaps: the CLI's default gain configuration
conflicted with maintenance startup; exact-zero velocity rejected stationary
motors reporting one raw velocity unit; native close could hold the Python GIL
while joining a worker that needed it; and the fixture incorrectly modeled the
two antenna motors as the head model. A temporary explicit startup adapter and
targeted native fixes addressed these. The final native suite passed 98 tests;
focused isolated ARM tests covered mixed models, stationarity noise, profile
restoration and the close regression before installation. Identity checks remain
exact per motor, and the stationarity check requires disabled torque, Moving=0
and unchanged encoders/configuration across fresh reads at least 200 ms apart.
See the [physical qualification record](SERVO_PROFILE_EXPERIMENT.md#disabled-only-physical-qualification).

Five ten-second recorder off/on/off/on/off windows retained 505 and 506
consecutive feedback events without loss, overflow, expiry or interruption. All
500 sampled cache timestamps advanced; maximum observed cache completion age
was 33.6 ms. Recording CPU was about 61% of one core versus 49–53% while off;
whole-process read syscall rates did not increase. This finite disabled-only
sample does not qualify concurrent motion producers, long-term overhead or
physical sensor age. See [recorder overhead](JOINT_TRACE.md#recorder-fix-disabled-device-check).

All 505 installed package files and the loaded native image were verified.
Existing rollback wheels and one content-addressed register preimage were
reused; no new full robot backup was created. Private evidence was downloaded
and hash checked. The maintenance startup adapter is a temporary runtime service
override, with startup Wake, shutdown Sleep and gain initialization disabled;
the persistent launch configuration is unchanged. Changed-profile motion
handoff remains **unimplemented**, so there is no new smoothness or arrival
result and no changed-profile movement admission. Mode correction stays separate.

### Preceding ARM daemon/recovery qualification

The **daemon integration and cross-process recovery now pass isolated ARM/CPython
runtime qualification using generated PTYs**. The actual daemon startup hooks,
robot-backend constructor, private socket service and native worker completed a
same-owner profile/restoration roundtrip. A producer then exited after a lost
third apply acknowledgement; a separate custodian using the real native factory
restored only the three changed virtual fields. Another exited producer's prepared
transaction closed without writes. All original fixture bytes and disabled torque
were verified. Fourteen rejected processes failed before serial opening, including
live-owner, pending-state, corrupt-binding and corrupt-preimage cases.

The fixture made 18 virtual profile writes. Media/kinematics base initialization,
normal publishers, WebSocket listening and hardware identity were fixture surfaces;
this does not qualify full production startup or physical servo behavior.
Independent process-tree syscall review found zero physical device opens or INET
connections. Read-only checks preserved all 503 installed files and the same sole
physical serial owner; final status reports disabled motors. Downloaded evidence
was verified and all owned remote staging removed. No physical motor command,
installation, daemon restart or new full backup occurred. Existing rollback is
reused, and mode correction remains separate. At that checkpoint the candidate was uninstalled;
device overhead, disabled-only physical profile restoration and changed-profile
motion handoff remain pending. See the
[ARM integration qualification](SERVO_PROFILE_EXPERIMENT.md#arm-daemon-and-recovery-qualification).

### Preceding offline daemon/recovery integration

The latest **offline daemon/recovery integration** attaches a default-off private
Unix-socket service to the existing daemon/native owner and adds an explicit
cross-process custodian. The custodian requires the old owner to be absent,
acquires an exclusive OS lease before serial opening, checks the persisted
machine/serial binding and immutable preimage, and permits only restoration or
verified no-write closure. It never starts normal control or a service. New v2
journals carry the binding and health policy; legacy or corrupt pending data
remains inhibited. Daemon target/power writers and delayed work are fenced across
maintenance, and old intents are retired before ordinary admission resumes.

Validation passed 92 native tests, including real helper-process exit/recovery and
the daemon manager on the compiled worker; 20 Linux service/custodian tests;
ten existing daemon tests; all 513 project tests and both production builds.
Private wheel records, Windows import and an offline ARM release cross-build
passed. At that offline checkpoint the new candidate was **not installed or
ARM-runtime-qualified**; its later ARM result is above, while the older fixture
result below belongs to its preceding source version. No robot/SSH
request, Wake, movement, installation, restart or new full backup occurred in this
pass. Existing rollback artifacts are verified and reused; mode correction and
changed-profile motion handoff remain separate. See the
[integration and recovery contract](SERVO_PROFILE_EXPERIMENT.md#daemon-integration-and-cross-process-recovery).

### Preceding ARM fixture qualification

The guarded profile entry and retained recorder fix now pass **ARM release/runtime
qualification using isolated PTYs**. Three same-owner profile trials completed
18 virtual profile writes, exact restoration, lost-ACK reconciliation without
replay, one reused preimage and pending-marker constructor inhibition. A separate
recorder check completed 80 virtual grouped goal writes and 20 traced frames with
zero lost events; overflow, expiry, conversion and analyzer coverage passed.
Both process-tree syscall audits found zero physical device opens and zero INET
connections. Read-only preflight/final checks verified all 503 installed files and
the same sole physical serial owner; daemon status remained disabled. No physical
motor command, install, restart, gain/mode correction or new full backup occurred.
Both generated overlays and the verified remote staging files were removed after
evidence download. This is ARM execution against virtual registers, not physical
servo-profile behavior. At that checkpoint integration and recovery were pending;
their subsequent offline implementation is recorded above. Disabled-only device
qualification and changed-profile motion handoff still remain pending. See the
[profile entry contract](SERVO_PROFILE_EXPERIMENT.md).

### Preceding offline profile-entry validation

The latest **offline profile-entry pass** adds an acknowledged disabled-only
transaction to the existing native worker. It persists pending state before queue
admission, fences old commands, backs up exact bytes by content hash, verifies
each write and restores only fields that fresh reads show still differ. Unknown
outcomes retain inhibition; explicit no-write closure and terminal persistence
reconciliation are covered. Constructor admission checks pending state before
opening the serial port. All 86 native tests passed, including actual worker and
compiled Python tests; the Windows wheel imports with verified package records.
All 513 project tests, ten daemon tests and both production builds also passed.
The trace-loss fix is retained and daemon sources are unchanged. See the
[entry contract and ARM qualification limits](SERVO_PROFILE_EXPERIMENT.md#guarded-native-entry-offline-qualification).
At that offline checkpoint ARM inputs were prepared; the subsequent ARM results
are recorded above. Motion handoff with changed
profiles and cross-process restoration are still pending. No robot request,
installation, restart, Wake, movement or new full robot backup occurred.

### Preceding recorder and profile-oracle preparation

The latest **offline follow-up** fixes the recorder's shared exclusive append
contention in a private native candidate. Concurrent publishers reserve distinct
preallocated slots; lifecycle races, missing publications and other partial
capture flags still exclude coverage. Eight-producer stress retained 98,304
events without loss. The installed recorder and robot software remain unchanged;
ARM functional qualification subsequently passed as recorded above; device
overhead qualification of this fix remains pending.
Validation passed 65 native tests, 16 profile-oracle fault tests, all 513 project
tests, both production builds and the 197-file source privacy/ZIP checks. A
compiled memory-worker capture passed Python serialization and analyzer coverage;
the Windows wheel imports and its package records verify. The daemon, native
controller/worker/conversion sources and hardware settings are unchanged.

A separate [reversible servo-profile experiment](SERVO_PROFILE_EXPERIMENT.md)
now has a concrete original/candidate/restored A/B/A plan, twelve synthetic
vertical legs and an offline transaction oracle with fault tests. Only the six
head motors' two profile RAM fields may change; mode correction, gains and
protections stay separate. Original profiles are required for Wake and Sleep.
The oracle accepts memory fixtures only; the subsequent native entry above now
implements disabled maintenance, while motion handoff remains pending. No robot request,
Wake, motion, install, restart or new full backup occurred in this offline pass.

### Preceding attended vertical traces

The later **attended vertical joint-trace experiment** completed eight daemon-local
legs at 15/2 seconds, with identical −24 mm / neutral / +10 mm / neutral requests
and unchanged settings. All eight captures were exported after movement and
observation, then cleared. Six have complete coverage; two slow return captures
each lost one observer event and are excluded from qualified following-error
association. No overflow, expiry, unknown motion write or movement freshness
failure occurred. Only four legs passed combined measured arrival.

Slow goals repeated on roughly 50–84% of per-joint updates, versus 11–27% at two
seconds. The six head goals still use a grouped write, whose observed host-call
95th percentile was 0.106–0.119 ms; occasional write intervals reached 60 ms.
The operator reported slow coordination-related jitter with no contact/strain,
and much better two-second motion, upward still smoother than downward.
Identical neutral goal registers left Z about 2.6–2.8 mm low from below, versus
0.07–0.09 mm low from above, at both speeds. This separates the static shortfall
from one-count staircases. It does not establish a profile/gain/mechanical remedy.

Explicit Sleep/Wake separated conditions. Final native disabled checks, both
503-file/sole-owner audits and the operator's final asleep/settled confirmation
passed. All owned coordinators exited. No new full backup, install, daemon restart,
gain, protection or mode change occurred; mode correction remains separate.
The startup optional-target GET assertion was handled in the local disabled
diagnostic bracket; awake target guards stay strict. Journals contain no movement
traceback/IK error, but cloud relay/TURN warnings persist. See the
[full trace record and next experiment limits](JOINT_TRACE.md#attended-152-second-vertical-traces).

### Preceding trace installation

The **bounded joint trace is installed**, following ARM release/runtime validation
and a disabled-only physical overhead check. An isolated PTY fixture exercised
80 virtual goal writes, exact conversion, 20 traced frames and capacity/expiry
behavior without opening physical hardware. All ten daemon checks passed on ARM.
The eight-path installation produced a verified 503-file inventory, reusing the
rollback wheels and saving only 68,754 bytes of original installed package records.
One controlled daemon restart preserved no-startup-Wake. No Wake, head target,
gain, protection or mode-correction command was sent.

Five off/on/off/on/off windows collected 500 advancing cache samples. Each active
trace retained 505 consecutive feedback events without loss; median feedback
spacing stayed near 20 ms and sampled cache age stayed below 24.4 ms. Recording
and captures are cleared; final telemetry confirms disabled motors and the same
sole daemon owner. The private observer environment is runtime-only under `/run`,
expiring at reboot; persistent configuration is unchanged.
The attending operator confirmed asleep/settled behavior with no movement.

Snapshot/export cost 110–129 ms and belongs outside movement capture. CPU was
higher in active windows, but these short samples do not isolate tracing cost
from other daemon work. The later movement sample above records joint-write timing;
moving on/off overhead and maximum-size export remain unqualified. See the
[trace findings and limits](JOINT_TRACE.md).
The daemon journal retained cloud relay authentication and TURN DNS warnings;
local control availability passed, while cloud media remains unqualified.
Older prepared hardware helpers expecting 501 files must be freshly prepared
against the new installed baseline before another movement experiment.

The preceding offline validation passed 58 native tests, 10 daemon checks, all 513
project tests, both production builds and the 196-file public privacy/ZIP checks.
The Windows debug native wheel imported and both candidate package records verified;
the daemon preserves 327 bundled assets and 488 unchanged payloads.

The later **focused vertical speed experiment** completed 16 attended daemon-local
legs at nominal 15, 10, 2 and 1 seconds, with the same −24 mm / neutral / +10 mm /
neutral targets and original settings. Sleep/Wake separated conditions. All legs
completed their observation windows without an interruption or uncertain write;
8 passed combined measured arrival. The operator reported similar jitter at
15/10 seconds, upward motion generally smoother than downward, two seconds quite
smooth and one second good. No new software, gain, mode or protection setting was
installed on the robot. The session is closed, visually asleep, native-disabled,
with unchanged 501-file audits and all owned controllers/observers exited.

Neutral returns from below retained Z errors of 2.39–2.63 mm, while returns from
above ended 0.07–0.09 mm below nominal. The two returns had identical observed
seven-motor goal-register vectors within each condition, but different measured
positions. Sampled poor returns retained up to 63 counts of joint error with PWM
below 8.4% of its cap. This supports a direction-dependent following-error
investigation, without establishing friction, backlash or load as the cause.

Four finite communication captures recorded 847 successful PC status reads and
778 successful loopback reads, no captured IPv4 route/conflict event and no ARP
capture drops. One independent PC probe took 625 ms before Wake; availability is
not a freshness qualification. The original network fault remains unreproduced.
An offline 50 Hz/encoder-count model demonstrates staggered small goal changes
for the saved actual-start geometry at slow speed, but does not measure bus or
physical motor timing. See the [complete findings and next diagnostic](MOVEMENT_COMPARISON_MATRIX.md#october-17-vertical-speed-and-direction-experiment).
The proposed matched PC follower comparison was deferred when the operator
requested animation-speed tests; no faster follower or gain-to-motion experiment
was performed. Earlier checkpoints below remain historical.

The attended continuation is **closed and asleep**, with visual normal-Sleep
confirmation, disabled native diagnostics, the unchanged 501-file software audit
and coordinator exit verified. The operator selected **vertical-only** for the
last, daemon-local condition. Its other 20 movements were explicitly excluded.
This is a partial comparison, not a completed matched four-condition matrix.

Across retained history and today's results, PC-linear completed 24/24 attempts,
PC-minimum-jerk 21/24, bounded follower 23/24, and daemon-local 3/4 vertical trials.
Interrupted trials remain failed; qualitative feedback was preserved without
invented numeric scores. The operator preferred the bounded follower over the
earlier PC approaches, and described daemon-local vertical coordination as pretty
good with some jitter. No strict comparative ranking is established.

Vertical endpoints were similar across approaches: about −24 mm for the downward
request and 7.8–7.95 mm for +10 mm. Nominal 15 s vertical ramps took roughly
22 s through PC streaming versus 15.15 s for daemon-local tasks. Actual speed is
therefore a comparison confound; visual smoothness and static following error
remain separate issues. A private task-list race was fixed: accepted UUIDs stay
owned until causally later telemetry sees membership and then disappearance.
The two unissued daemon legs subsequently completed with that fix. See the
[dated comparison and vertical-first plan](MOVEMENT_COMPARISON_MATRIX.md#october-17-selected-continuation-and-vertical-findings).

Future tuning should start with repeated vertical trials, report achieved as well
as nominal duration, and expand axes after a useful improvement. No robot software
installation, daemon restart, new full backup, gain, mode or protection change was
made. Mode correction remains separate. The following same-day checkpoints are
retained as intermediate history.

The later **October 17 protocol-3 attended continuation** completed four eased
pitch trials, four roll trials and the negative forward/back excursion and
return. The operator again reported interior jitter, smoother starts/stops and
no contact or strain. The slow profile may affect visibility of jitter; no speed
comparison has isolated that effect. The positive forward stream then lost its
HTTP reply after 555 acknowledged targets in that leg. Further targets were
withheld behind the existing unknown-outcome lock; software Stop was unconfirmed.
The daemon's later stored head/body target exactly matched the timed-out output,
which is stored-target evidence, not measured arrival or a recovered HTTP reply.

After direct stationary-state inspection, the old controller was retired. A
separate inspected connection permitted only one explicit Sleep and cancellation
of its own task. Sleep was acknowledged and visually normal; fresh disabled
native diagnostics and the original 501-file software/sole-owner audit passed.
The original uncertainty receipt remains intact. No daemon restart, deployment,
new backup, gain, mode or protection change occurred. Ten new movements completed,
one was interrupted and 57 remained unissued; the comparison remains incomplete.
An offline closed-session import now retains that failure and permits preparation
of only the unissued suffix after independently verified reset evidence. It does
not unlock the old controller or replay its target. See the
[runner API](MATRIX_RUNNER_API.md#protocol-3-pauses-and-historical-continuation).

The subsequent inspected-reset continuation finished the unissued eased blocks
and attempted all 24 bounded-follower movements. Twenty-three follower movements
completed; the last vertical return was withheld before dispatch because the
measured pose changed during model review. A measured hold and Stop succeeded.
The operator described the bounded follower as clearly best visually across the
tested approaches, with vertical motion easiest to distinguish. This is a
subjective single-session preference; static errors and unmatched starts remain.
The planned Sleep, visual confirmation, disabled native qualification and
unchanged software audit passed. Daemon-local has not yet been evaluated in this
continuation. At the operator's request its next comparison is vertical only;
future tuning should begin with repeated vertical trials before expanding axes.

The **October 17 offline procedure revision** adds protocol 3 centering
checkpoints and in-process continuation. Missed neutral returns remain failed
measurements; a larger residual from the preceding axis needs a frozen envelope
and explicit exact-path review before the next unmatched movement. Bounded GET
refreshes can pause PC output; running daemon tasks still Stop on stale feedback.
Known interrupted trials can advance only after current idle/native qualification
and confirmed Stop/drain, without replay or another Wake. Historical rows remain
separate from new-protocol scores. See
[procedure and limitations](MOVEMENT_COMPARISON_MATRIX.md#protocol-3-centering-checkpoints-and-continuation).
This revision is offline only: no robot request or movement, installation,
daemon restart, new full backup, gain, mode or protection change occurred.

The [October 17 comparison continuation](MOVEMENT_COMPARISON_MATRIX.md#october-17-partial-pc-minimum-jerk-yaw)
is **closed, asleep and incomplete**. Four PC-minimum-jerk yaw trials were
attempted: two returns completed, and two outward trials were interrupted by
admission/freshness checks. All 1,972 target writes were acknowledged, with no
unknown write outcome. The operator reported smoother starts and stops than
PC-linear, but continued interior jitter and no strain or problems. This is
subjective partial evidence, not a matched ranking or a six-axis qualification.

The final streamed neutral return retained approximately +7.2° yaw, exceeding
the frozen matrix's 7° inactive-axis starting-pose allowance. Pitch and the
remaining conditions were withheld; the allowance was not changed during the
run. Explicit Stop/Sleep, visual normal Sleep, final native disabled-state
qualification and the unchanged 501-file software audit passed. The coordinator
exited and no background robot polling remains. Existing backups were reused;
no installation, daemon restart, gain, protection or mode change occurred.
That run exposed the need for predeclared centering-shortfall handling before
resuming the unissued axes and conditions. Private GET-refresh and known-Stop
continuation checks were added; the GET-refresh branch passed synthetic checks
but was not exercised by the final physical return.

The following October 16 checkpoint is retained as history.

The first [attended six-axis condition](MOVEMENT_COMPARISON_MATRIX.md#october-16-first-attended-condition)
is **paused at the operator's request after PC-linear**. All 24 scored movements
completed on the common slow profile (10 s rotations / 15 s translations).
Three passed measured arrival; two had matched prescribed starts. The operator
reported visible jitter on all six axes. All 15,071 streamed writes were accepted,
with no unknown write outcome. Median actual ramp times were 15.18 s and 22.13 s,
respectively. The other three approaches have not run; no comparative ranking
follows. The final neutral return passed at 0.31° / 0.17 mm residual.

Stop/Sleep, subsequent fresh disabled/idle status, visual normal Sleep and the
unchanged 501-file software audit passed. A late post-Sleep native qualification
read failed its freshness check; that native phase remains pending despite the
later fresh 130 ms status read. The local coordinator was retired asleep, with no
background robot polling. Resume needs current attendance and targeted read-only
requalification, retaining the frozen plan and completed condition. No installation,
new full backup, gain, protection or mode change occurred.

The [persistent bounded follower](BOUNDED_FOLLOWER.md) and
[four-condition six-axis runner](MOVEMENT_COMPARISON_MATRIX.md) are implemented
offline. Condition D carries commanded position/velocity/acceleration and checks
whole quintic segments against experimental fixed-chart bounds. Synthetic tests
cover reversals, omitted coordinates, finite/order/freshness/epoch rejection,
no-catch-up timing, retained ownership, unmatched starts and unknown writes.
The nominal four-condition matrix completes 96 synthetic scored segments; four
balanced rounds contain 384. These are simulated outcomes, not physical arrivals.
A cached-model screen passed 1,560 nominal path samples with at least 314 encoder
counts to historical joint limits; actual paths and clearance remain unqualified.
Validation passed 478 package tests, 12 additional private guarded-owner checks,
and both production builds under Node 24. Public-source privacy and ZIP checks
passed. Perfect synthetic feedback does not establish physical tracking quality.

The default future physical protocol uses an explicit operator-controlled
Sleep/Wake checkpoint between whole conditions, with native/status and visual
confirmation and unchanged frozen references. No power command is automatic in
the matrix loop. Confirmation read failures can be retried without replaying
Sleep/Wake; Stop remains separate. The retained-awake alternative has a separate
plan hash. See [runner API](MATRIX_RUNNER_API.md). No robot request, deployment,
new full backup, gain, protection or mode change was made in this implementation.
The normal browser motion engine remains unchanged; physical qualification and
live phone/WebXR follower integration are pending.

The [matched PC-linear / PC-minimum-jerk / daemon-local comparison](TRAJECTORY_COMPARISON.md)
was prepared offline. Its default synthetic geometry is 15° roll over 3 s with
counterbalanced conditions, matched complete targets and a common observation
window. Thirty numeric samples match extracted installed-matching Pollen math;
33 focused execution/owner/observer checks passed, covering freshness, unknown
outcomes, Stop draining and late task UUIDs. A 453-sample cached-model IK/FK screen
retained at least 379 counts to historical joint limits; it does not prove shell
clearance or qualify a real measured start. These are preparation results, separate
from the later hardware attempt below.

The **subsequent attended trajectory attempt is closed but incomplete**. Wake,
visual readiness, disabled/awake observer checks and a 453-sample actual-path
screen passed, with at least 434 counts of model joint margin. PC-linear issued
151 accepted writes for the 15° roll excursion: the nominal 3 s ramp took 4.193 s,
and feedback remained 1.30° / 1.30 mm from its target. A separately recorded
daemon-local return also failed arrival, at 4.44° / 2.07 mm from the frozen
baseline. The baseline could not be re-established; PC-minimum-jerk and matched
daemon trials were withheld. This does not rank the three paths or establish a
smoothness improvement. The operator's visual evidence was insufficient to judge.

Native loop brackets retained goal/trajectory differences of at most two counts
in their final samples, alongside larger goal/present errors. A streamed reference
timing deficit and static following error therefore remain separate questions.
Final Stop/Sleep, native disabled feedback, visual normal-Sleep confirmation,
the original 501-file audit and local coordinator exit passed. A late confirmation
read was stale; a later 106 ms read verified disabled idle state. Existing backups
were reused; no installation, daemon restart, gain or mode change occurred.
Mode correction remains separate. See the experiment record for handoff and
matching limitations; live completion of E1 remains pending.

The [geometry 1 movement-comparison matrix](MOVEMENT_COMPARISON_MATRIX.md)
defines 12 interior-range head excursions and 12 scored returns: yaw ±30°,
pitch ±18°, roll ±20°, X −11/+10 mm, Y ±22 mm and Z −24/+10 mm. The forward
selection uses an earlier inner trial, excluding the pressure-limited outer
request. Fixed targets, condition order, repeated runs, visual cues/ratings and
matched/unmatched data rules are documented with a machine-readable CSV. This is
offline preparation: the injected protocol-2 runner has synthetic qualification;
no certified safe workspace or physical runner qualification follows from the table.

The [October 16 research intake](research/README.md) adds two dated engineering
reports, an evidence/decision map and a reproducible scalar benchmark. The
original comparator completed a separate Windows run with 36 experiments,
10,338 samples and passing built-in assertions. Non-timing metrics and the full
trace matched the supplied Linux results within 1e-9 absolute/relative tolerance.
This is offline mathematical evidence; no numerical trajectory library, robot
planner or transport was qualified or deployed by this documentation work.

The **October 16 physical range-survey session is closed**. It recorded 99
head-target attempts: 96 survey attempts across 94 original leg IDs, plus three
centering-comparison legs. All 48 original single-axis size/direction excursions
were requested, including interrupted and contact-limited attempts. Two full-yaw
neutral returns were deliberately unissued. This is request coverage, not accuracy
or usable-range certification. Seven vertical attempts met the full measured/native
arrival rule; most other attempts failed full-pose settling.

The final −50/+22.25 mm vertical requests measured −49.12/+21.61 mm. Both failed
full-pose settling. Their neutral returns measured −2.35/−0.14 mm; the latter met
the arrival rule. The operator reported minor brushing on the downward trial and
no concerns during the upward and final centering trials. Final Stop/Sleep,
native disabled readback, human normal-Sleep confirmation, helper drain/exit,
the unchanged original 501-file audit and robot reservation release passed.

The +50 mm forward request was contact-limited: the operator saw front-shell
pressure tilting the head, consistent with fresh Stop feedback around +31 mm
forward and +12.5° pitch despite a zero-pitch target. Exclude this request from
further tests; a finite IK solution and joint margin do not establish shell
clearance. The ±46 mm sideways trials measured −45.93/+46.17 mm, with minor
brushing reported on the negative side. Full-pose settling still failed.

The helper now parks incomplete/error stages after Stop. Sleep is fenced to
completed plans or explicit operator aborts. Sixteen focused checks passed,
including concurrent controller/native read latency, native-only idle latency,
unrelated blocked errors and uncertain writes. A physical stale-read pause passed
fresh/native review and resumed the next unissued leg under the same owner,
without Sleep or target replay. A subsequent local checkpoint-file parse race
parked before any downward target. Atomic publication/complete-JSON reading and
an explicit retired-owner awake transfer passed four focused checks and fresh
read-only/native/original-file admission. The transfer sent no Wake or Sleep and
advanced beyond the prior Stop epoch. The adopted owner then completed the final
seven legs without another Wake and performed one final Sleep.

The exact identity/body-zero streamed return retained 4.67° roll, with 4.77°
combined angular and 2.63 mm translation error. The operator saw Sleep center
better and described streamed motion as jittery/apparently poorly coordinated,
unlike smooth Pollen Wake/Sleep. Installed-matching source shows a shared
six-axis slew scale and synchronized six-linkage-motor goal writes. The upstream
PC HTTP ramp and daemon-local eased playback differ; physical response timing
is not established by a grouped write or a visual observation.

The final Sleep observer captured one native bracket, then HTTP 503 only 292 ms
after its preceding register read. Its 250 ms cadence violates the native
one-second cooldown; rate limiting is consistent with the evidence, although the
route hides the exact exception. No native bracket covered the center dwell, so
measured Sleep-center arrival remains unqualified. The private observer now
separates fresh pose sampling from native reads spaced at least 1.25 s after
completion, retaining prior cooldown state. Ten focused offline checks passed;
this change has not been tested on hardware. A matched trajectory-delivery
comparison is next, with gains/mode correction kept separate.

Earlier completed batches contained 44 head-target attempts: yaw through ±65° relative to the body,
pitch through ±40°, and roll through ±30° and −40°, including smaller steps and
neutral returns. Forty attempts failed full-pose settling, one controller arrival
lacked sustained/native qualification, and three attempts were interrupted by
freshness or body-reference faults. The interrupted +15° roll trial was later
repeated as a new, freshly admitted trial; both records remain. Translation and
+40° roll and its adjacent returns were pending at that checkpoint and were later
exercised. See [wider survey](STATIC_ERROR_TEST_PLAN.md#october-16-wider-range-survey).

Larger requests often have lower proportional error, but absolute and return
errors remain. Example yaw endpoints were −66.14° against −65.18° requested and
+58.36° against +64.82°. The later +15° roll reached +14.92°, while the complete
pose still failed settling. Feedback is derived from joint encoders and FK;
these are not independent optical angle measurements. The operator reported
minor bottom-of-head/front-shell contact at the full yaw trials, acceptable at
that test height but potentially problematic with the head lowered. Pitch through
±40° also produced minor shell contact; its direction was not identified. No
combined-pose clearance or mechanical hard-stop limit is qualified.

The range survey now has a separate body-relative policy: fresh body alignment
per leg, up to 20° accumulated heading change and an explicit 2° per-command
diagnostic allowance. Ordinary controls and matched comparisons retain 0.25°.
The 500 ms write/arrival freshness gate, endpoint receipts and recovery fencing
remain unchanged. Thirty-seven manual-head tests and focused survey/recovery
checks passed. No gain, mode, motor limit or installed robot package was changed.

Earlier helper revisions ended whole batches after recoverable read delays. A
revised private runner now stops and pauses a known stale-read interruption under
the same owner. An explicit resume requires fresh stable feedback, matching native
diagnostics and the same frozen plan; it records the interrupted leg as failed and
advances without replay. Two offline actual-controller scenarios passed, including
a 650 ms delay, one Wake/Sleep cycle for the whole resumed campaign, and a failed
read-only qualification that sent no new target. Nineteen existing policy/session
checks also passed. The later physical stale-read pause/resume is described above.

A subsequent attempt exposed a remaining pre-target readiness path: a 1.05 s
snapshot caused the old helper cleanup to send Stop/Sleep before any head target.
Native disabled readback, visual Sleep and the final original-file audit passed.
The private read-only baseline loop now discards stale responses and requires
fresh stable readings; an exhausted readiness wait pauses without Sleep. Explicit
read-only review preserves the acknowledged Wake and visual observation. Eight
focused offline checks passed, including the reproduced delay and sustained-stale
pause. These checks do not qualify delayed-read recovery on hardware.

The next attended batch passed readiness and completed five roll targets in one
awake session. Requested −30°/+30° measured −33.11°/+33.28°; their neutral returns
measured −4.38°/+4.63°. Requested −40° measured −40.83°. All five failed full-pose
settling. The exact measured-start envelope then withheld the neutral return and
ended the batch with Stop/Sleep. This was a runner admission decision, not a
daemon restart or observed network failure. The operator reported minor contact
only and normal Sleep. Native disabled readback, original 501-file audit, helper
exit and reservation release passed. Translation and the remaining roll legs
were still untested at that checkpoint. The later reviewed inward-return policy
and remaining-axis trials are described above.

The operator's observation that Sleep visibly recenters better prompted an
installed-source comparison. Sleep uses the identity head pose, body yaw zero,
daemon-local minimum-jerk playback and secondary-aim quiescence. The streamed
neutral target differs by the small retained body heading and its ramp delivery.
Sleep does not apply the browser's combined 1°/1 mm arrival test, and no native
brackets were captured during its brief centering stage. Superior measured
centering or a trajectory-related cause is therefore not yet established. See
[centering comparison](HEAD_RESPONSE.md#october-16-sleep-centering-comparison).

One captured mandatory GET batch took 625 ms and then returned HTTP 200. Later
reads and Stop/Sleep recovered. This demonstrates a bounded read delay, not a
reproduction of the earlier persistent network failure. One earlier body-reference
fault also exposed a cleanup allowlist gap: after confirmed Stop and read-only
idle verification, the exact idle helper was retired and a qualified recovery-only
controller sent the previously unattempted Sleep. Native disabled readback, visual
Sleep and the final original 501-file audit passed. That exceptional closure is
retained separately from normal helper finalization.

An offline encoder-conversion reproduction found a possible measured-hold drift
contributor: raw count 2044 decodes and re-encodes as 2043 under the pinned truncating
conversion. A narrow numeric candidate passed three extracted checks but remains
uninstalled and unqualified as a package/ARM fix. It does not explain the larger
head residuals. See [roundtrip investigation](HEAD_RESPONSE.md#october-16-measured-hold-roundtrip-investigation).

The **October 16 attended fixed-target run completed with failed settling**.
Five complete head targets were acknowledged; all five failed the unchanged
combined 1°/1 mm arrival rule. The upper waypoint never established a measured
upper-side approach, so its common-target write was withheld. Two lower-side
common targets have matching native evidence, but a comparison from both
directions remains incomplete. No tuning benefit or reliable yaw is established.

The two common targets used identical complete matrices, body targets and servo
goals. Against +0.059° requested yaw, measured yaw was −2.400° and −3.307°.
Sampled goal/trajectory gaps were at most two counts; goal/present gaps reached
41 counts, with sampled PWM at most 46 against its unchanged 885 limit. The
different residuals at the same target and the intervening recovery holds need
further investigation; this does not prove a gain, friction or kinematics cause.

All 48 native brackets met their read budgets: maximum native read 14 ms and
diagnostic HTTP read 126 ms. The 374 recorded leg snapshots took at most 265 ms;
no freshness failure interrupted this run. Original P200/P300 and mode 3 were
verified. Wake, Stop and Sleep completed; the operator confirmed normal Wake,
normal final Sleep and no unexpected motion. The final read-only audit verified
the same daemon owner and all 501 original diagnostic files. The helper exited
and released its robot reservation. No installation, new full backup, gain/mode
change or publication was performed. Hosted transport and independent physical
pose accuracy were not tested. See [dated result](STATIC_ERROR_TEST_PLAN.md#october-16-attended-fixed-target-result).

Two helper defects were corrected during admission: native alert arrays contain
booleans/nested flags, and measured body yaw can vary by one encoder count.
An initial comparison was withheld before any head-target write. The revised
controller can bind a finite body reference within 0.25° of measured yaw while
keeping requested and measured state distinct. Exact target matching, freshness,
ownership, recovery and the full-pose arrival criteria remain unchanged.

After this correction, all **433 package tests and 33 capture checks passed**
under Node 24, and the local and hosted production builds passed. These are
offline software checks; the physical settling failures above remain unresolved.

Before this physical run, the **fixed-target capture integration was prepared
offline** using the installed diagnostics. A single local controller/capture
process starts read-only, requires explicit Wake and visual confirmation, freezes
the complete six-axis plan, then admits its six targets once. Failed settling
remains failure; independent continuation requires confirmed Stop and fresh state.
Native brackets must match the acknowledged matrix/body/joint targets and exact
converted goals. Stop/Sleep cleanup, final visual confirmation and a read-only
original-package/owner audit close the run. No installation or new full backup
is required; mode correction and gain changes remain separate.

All **31 focused offline checks passed**, including actual controller and HTTP
adapter code with synthetic feedback, failure/uncertainty cases, withheld targets
and a mocked-network file-protocol run. The final abort change passed its targeted
file-protocol retest. Node/Python syntax, PowerShell parsing and Windows argument
construction were checked; unattended launch was rejected before resource/robot
access. No physical robot was contacted, moved, installed or restarted in this
preparation pass. The later physical result above supersedes its pending-test
status. See [integrated experiment](STATIC_ERROR_TEST_PLAN.md#october-16-integrated-capture-prepared-for-attendance).

The **October 16 iteration-workflow candidate** supports explicit next-trial
retirement after verified restoration and Disarm, using the same maintenance
owner. It rechecks native/disk proof and fresh disabled diagnostics, retires the
old request epoch and preserves earlier backups. Thirty-one focused Linux entry
checks passed. One ARM virtual-servo run then completed three transactions with
the same compiled owner. Offline replay verified 1,012 requests, 8,840 status
frames and exactly four intended P writes; all other virtual registers were
unchanged. The installed daemon stayed running with its original inventory.
The fixture exited, temporary overlays/uploads were removed and its reservation
was released. This candidate is uninstalled and has no physical reuse evidence.

A separate inert response policy passed 12 focused checks. It keeps six fixed
target legs and records settling failure as failure; a later preplanned leg needs
a distinct confirmed Stop and fresh admission. It preserves measured approach
direction and complete target/matrix matching. This is not yet an integrated
hardware runner. Both native and Python maintenance policies still block ordinary
motion, so changed-gain response requires a qualified handoff. The next causal
test should use the installed diagnostics for the revised unchanged-gain target
comparison, without another maintenance deployment. See [reusable trials](P_GAIN_TRANSACTION.md#october-16-reusable-trial-candidate)
and [campaign proposal](STATIC_ERROR_TEST_PLAN.md#october-16-campaign-revision-prepared-offline).

The **October 16 disabled changed-P roundtrip passed on Reachy**: one Stewart
motor's RAM P gain went **300 → 299 → 300**, with one Prepare, Apply and Restore.
Fresh P/I/D readback and the complete restored 735-byte observation matched the
original backup exactly. The native terminal was `RestoredVerified`, sequence 3,
with both write flags true. All nine motors reported torque off at maintenance
startup and ordinary control stayed inhibited. Independent review verified the
backup, raw Apply evidence, fresh restored projection and terminal record.
Restore's retained diagnostic JSON describes the earlier Apply comparison;
fresh restoration evidence comes from its observation bytes and timestamps.

The native binary was reused unchanged. The private entry adds an explicitly
authorized, one-shot 300-to-299 path. Sixteen focused Linux tests and one actual
ARM/virtual-servo case passed, including lost Apply reply, replay rejection and
restoration after authorization expiry. Trace review verified 330 requests,
2,870 status frames, exactly the two intended P writes and 16 clean task exits.
These fixture results are separate from the physical register test.

The original 501 diagnostic package files and normal service are restored.
Existing archives were reused; no full backup or whole-environment reconstruction
was repeated. The new native backup is 793 bytes. After restoration, one guarded
Wake/Sleep cycle ran with original gains verified before and afterward. The
operator confirmed the gain phase stayed asleep, Wake/Sleep behaved normally and
Reachy remained asleep without unexpected movement. Final raw head torque bits
are zero. Mode correction remains separate; changed-gain motion, tuning benefit
and reliable yaw remain unqualified.

Targeted network logging completed: all **191 TCP checks** succeeded, and all
54 HTTP failures occurred within intentional daemon downtime. There were no
recorded new conflict events. The static route workaround remained present while
the native kernel subnet route was absent before and after. This does not explain
the original conflict or establish prevention or Stop causality. Network/logging
settings were unchanged. Temporary overlays and install caches were removed;
the capture helpers exited and the robot reservation is released. No publication
was performed. See [changed-P result](P_GAIN_TRANSACTION.md#october-16-disabled-changed-p-roundtrip).

The **October 16 focused P-only policy test passed on Reachy**. The candidate
excludes only Goal Position bytes 116–119 from static configuration comparison;
their exact raw bytes remain in backups and diagnostics. Static controls 98–115,
P/I/D, identity, torque-off, freshness, ownership and recovery checks remain
strict. Fifty focused native tests, the ARM build/import check and exact
seven-path scratch install/rollback passed. Existing backups were reused;
another full environment backup or reconstruction was not performed.

One unchanged-P Prepare and one original-P Restore completed for a Stewart motor
at P 300. Goal and paired Present again varied by one count, now correctly
recorded as diagnostic data. Restore reached `RestoredVerified`, independently
read back the original P/I/D bytes and retained the exact 793-byte native backup.
Both gain-write flags stayed false. Independent review decoded the raw profiles,
backup and terminal record. This clears the observed maintenance comparison
blocker; changed-gain restoration, motion/tuning benefit and firmware cause
remain unqualified. The backed-up no-write closure branch was not exercised.

The original 501 package files, configuration, runtime and normal service are
restored. Final read-only checks report disabled control, seven zero head torque
bits, no pending transaction and a sole normal serial owner. Temporary wheel,
overlay and rollback preimages were removed; existing archives and protected
history remain intact. No Wake, Sleep, motion, gain write, mode correction or
network change was sent. On October 16, the operator confirmed Reachy remained
asleep and settled throughout the test and service transitions, with no unexpected
movement. Attended visual validation is complete. The robot reservation is released.
The static route workaround remains present and the native kernel subnet route
is still absent; this test does not explain the earlier network disappearance.
See [focused policy result](P_GAIN_TRANSACTION.md#october-16-focused-p-only-policy-and-device-test).

The latest **October 15 disabled device follow-up** installed the qualified
closure candidate with all nine motors disabled. One unchanged-P Prepare failed
before backup: motor 11's paired Goal and Present values changed **1869 to 1870
counts**. The exact guard rejected it; no gain write began. Explicit pre-backup
`ClosedWithoutGainWrite`, independent terminal proof, disarm and graceful owner
exit succeeded. The new backed-up closure branch was not reached and remains
physically unqualified.

Before rollback, a fresh read-only owner reused the installed candidate for
22 diagnostic reads at two sampling rates. All 20 paired samples matched Goal
to Present; motors 11, 15 and 16 showed one-count variation. Head torque remained
disabled and P gains were unchanged. This reproduces the variation without a
gain transaction; it establishes neither firmware cause nor a read-rate effect.
The original 501 package files and normal service are restored, with seven zero
head torque-enable values. Only 864 bytes of new backup content were needed;
9,990 files reused existing archives. No Wake, Sleep, motion, gain or mode change
was sent. On October 16, the operator confirmed Reachy remained asleep and
settled throughout the test, probe and restarts, with no unexpected movement.
Attended visual validation of this run is complete.

All 400 passive SSH banner checks succeeded across the cycle. Daemon HTTP
unavailability occurred within its intentionally stopped interval. The static
route workaround remains present; the native kernel subnet route is still
absent. The original network-disappearance trigger remains unresolved. The
bounded recorder is stopped and the robot reservation is released. See
[device follow-up](P_GAIN_TRANSACTION.md#october-15-device-follow-up-and-read-only-maintenance-probe).

The latest **October 15 native backed-up no-write closure candidate** adds an
explicit terminal path for a future unchanged-gain transaction whose first
Restore rejects its exact comparison before any gain write. The live native
owner must prove that no Apply was admitted, exactly one Restore was admitted,
and both gain-write flags remain false. Closure performs no serial I/O, retains
the exact backup and records `ClosedBackedUpWithoutGainWrite`; it does not claim
restoration or current motor readback. Ordinary control remains inhibited for
that maintenance owner's lifetime. Partial journal failures remain locked.

Qualification passed 110 native tests, 65 existing and 14 new Linux entry tests, compiled package
and rollback checks, and five cases on the robot's actual ARM Python runtime
using generated virtual servos. Independent review decoded 1,278 requests and
11,171 response frames and checked all 78 traced task exits. No physical serial
opens occurred. At that checkpoint, the candidate had not been installed; the real normal daemon
and original software stayed unchanged and reported disabled motors throughout
the fixture stages. A final read-only audit again confirmed the same original
normal owner and seven zero head torque-enable values. About 236 MB of exact
archived or pinned generated device staging was removed; the original backup and
protected recovery history remain intact. This does not qualify physical closure, gain restoration,
changed-gain safety, yaw improvement or power-loss durability. The mode correction
remains separate. See [native closure candidate](P_GAIN_TRANSACTION.md#october-15-native-backed-up-no-write-closure-candidate).

The latest **October 15 no-write recovery** closed the retained backed-up session
through a separately reviewed external outcome. The exact original software and
normal service are restored. Fresh identity/version and ownership checks passed;
motor control reports disabled, all seven raw head torque-enable values are zero,
and the original startup-Wake prohibition remains in effect. No Wake, Sleep,
motion, gain write, mode correction or network change was submitted. The operator
confirmed Reachy remained asleep and settled throughout recovery and restart,
with no unexpected movement. Attended recovery validation is complete.

Qualification used the robot's actual ARM Python runtime with generated files:
15 recovery cases, 17 fence tests and 12 restoration tests passed. Independent
review checked the complete fixture syscall trace and archived inventories.
Actual recovery then verified a graceful maintenance-owner exit, no serial
owners, a persistent normal-service mask and custody of the original journal
directory before recording the external outcome. The pending record was moved
into protected history after the committed evidence was synced. Its original
backup remains intact. Rollback verified all 501 original package files and the
startup/runtime baseline before one normal-service start.

The outcome is `ExternallyAdjudicatedNoGainWriteWithBackup`. Native
`RestoredVerified`, original-gain readback, changed-gain safety, tuning benefit,
smooth yaw and power-loss behavior remain unqualified. The recovery is scoped to
the exact reviewed session and trusted local operators. It supplies no browser
bypass for pending transactions. See [recovery result](P_GAIN_TRANSACTION.md#october-15-no-write-recovery-and-original-service-restoration).

The preceding **October 15 disabled paired-snapshot physical trial** passed the
13-case ARM/virtual-servo prerequisite, checkpoint reconstruction and attended
maintenance admission. All nine motors reported disabled. A single unchanged-P
Prepare succeeded and its exact native backup was verified and copied off-device.
The subsequent explicit original-P closure failed before any gain write: motor
13's Goal and Present values both changed **1942 to 1941 counts**, triggering the
unchanged exact restore-before comparison. The new paired diagnostics expose this
correlation; they do not establish its firmware cause or physical movement.

At that checkpoint, read-only status confirmed `UnresolvedLocked`, both gain-write flags false,
and ordinary control inhibited. The maintenance owner, pending marker and backup
were retained; the normal service was stopped. Closure was not replayed, and package
rollback/restart was blocked pending a separately reviewed recovery path for a
backed-up session with no gain write. Preparation/backup is now physically
observed; restoration, changed-gain safety and tuning benefit remain unqualified.
No Wake, Sleep, motion, changed gain, mode correction or network change was sent.
The operator confirmed it stayed asleep and settled with no movement. Normal
daemon HTTP unavailability during this maintenance state is intentional; it is
not new evidence of the earlier network disappearance. See
[paired physical result](P_GAIN_TRANSACTION.md#october-15-paired-physical-prepare-and-restore-before-rejection).

The preceding **October 15 offline paired-maintenance-snapshot candidate** retains
Goal Position and Present Position from the same motor status payload in failed
comparison diagnostics. The immutable backup projection and exact comparison
remain unchanged: Present-only variation leaves backup bytes unchanged, while
Goal variation still rejects preparation. The bounded read family covers all
16 ordinals without extending into additional tail registers. This private
candidate was uninstalled at that checkpoint; the subsequent ARM and physical
results are recorded separately above. See
[paired snapshot candidate](P_GAIN_TRANSACTION.md#october-15-offline-paired-maintenance-snapshots).

The preceding **October 15 disabled Goal/Present investigation** reproduced the
one-count changes through the existing daemon without installation or restart.
An untraced read sequence and a subsequent selected-serial-descriptor capture
each returned 70 paired goal/measured values; all pairs matched. In the traced
sequence, motor 12 changed by one count seven times. Independent review verified
8,450 complete frames and found only read instructions in the captured traffic,
with no transmitted or attempted register writes. The parser preserves the
distinction between goal and measured positions. The exact preparation comparison
remains unchanged and still blocks a changing goal register.

The tracer detached cleanly; native samples and heartbeat advanced afterward.
The original software, daemon owner and disabled state were preserved. This is
evidence about the selected descriptor during one window, not a firmware-cause,
unobserved-bus, movement or gain-benefit qualification. No Wake, Sleep, motion,
gain/mode change, network setting or publication occurred. See
[Goal/Present capture and limits](P_GAIN_TRANSACTION.md#october-15-disabled-goalpresent-read-only-capture).

The earlier **October 15 snapshot-diagnostics follow-up** passed offline/package
checks and ten ARM entry cases against private simulated servos, followed by an
attended disabled-only physical trial. All nine motors remained disabled.
Preparation again rejected before saving a gain backup or starting a gain write;
both snapshots now identify the sole failed comparison: motor 12's Goal Position
changed **2640 to 2641 counts**. Small voltage/temperature differences were within
the existing allowances. The cause of that goal-register change is unresolved.
The comparison guard was not relaxed and preparation was not retried.

The corrected Python entry accepted explicit same-owner `ClosedWithoutGainWrite`
and independently verified its terminal journal and absent pending/backup files.
This is distinct from verified gain restoration. Original software was restored,
the normal daemon is ready with motors disabled, and the operator confirmed no
movement. Preparation/restoration and gain benefit remain unqualified. See
[snapshot diagnostics and physical follow-up](P_GAIN_TRANSACTION.md#october-15-snapshot-diagnostics-and-physical-follow-up).

Network observations retained access through the persistent workaround. Review
corrected an earlier counter that mistook local broadcast routes for native
subnet routes: the sampled main tables contain the workaround, with no native
unicast subnet route. A new no-action baseline passed all 37 PC and loopback
status reads. The transition recorder then failed on a local Windows file-access
error; that partial capture does not qualify the maintenance cycle or its network
effects. The original trigger remains unresolved. No Wake, Sleep, motion, changed
gain, mode correction or website publication occurred in this test.

The latest October 14 attended moving capture followed a verified backup and installation
of the qualified private motor-controller and daemon diagnostic patches. Assets,
configuration, permissions and dependencies were preserved; version admission
remains 1.10.0. The restarted daemon loaded the qualified native extension and
returned advancing joint-cache timestamps. Wake was explicitly sent and visually
confirmed before yaw. A six-degree command and an explicitly requested
twelve-degree repeat both failed the unchanged settling criteria. The larger
turn was clearly visible with no unexpected motion reported. Actual daemon
computed joint targets now confirm a gap from measured joints. Complete capture
journals contained no reported native execution or IK errors, but motor
goal-register acceptance remains unverified and the cause unresolved. Recovery
holds and Stop completed, normal Sleep was visually confirmed, and a final
30-second asleep window remained reachable. Hosted control, camera/audio,
other axes and physical phone motion were not tested in this pass.
See [head response and settling](HEAD_RESPONSE.md). This source follow-up has not
been published to the hosted controller.

The subsequent **offline servo-register readback candidate** uses the existing
native worker and serial owner for explicit bounded goal/present-count reads.
It adds no ordinary polling, motion, retries or cache fallback. **27 native
tests**, **82 installed daemon/rollback checks**, exact compiled Windows package
checks and the controller's **401 offline tests** passed; both production builds
passed. Windows and ARM64 Linux wheels were built, but the new ARM runtime and
physical bus remain unverified. The candidate is private and uninstalled. No
robot was contacted, restarted or moved in this pass, and the website publication
is unchanged. See [readback limits](HEAD_RESPONSE.md#offline-servo-register-readback-candidate).

| Area | Current evidence and limit |
| --- | --- |
| Motion/media control | Default admission remains daemon **1.10.0** for local bridge and hosted control. |
| Daemon 1.11 candidate | Synthetic fixtures exercise the installed SDK parser/writer and adapter guards. They do **not** admit 1.11 or verify live transport, camera/audio or motion. |
| Previously attended update | A robot previously on **1.2.11** was confirmed updated to **1.11.0**. This observation does not verify the app's in-page update path or widen control admission. |
| Wi-Fi setup | Prior attended real scans, credential submission and a network switch were confirmed. A complete fresh factory access-point path remains unverified. |
| Bluetooth setup | The observed factory Bluetooth service lacked the provisioning commands the wizard needs. Capabilities are probed explicitly; daemon version alone cannot prove them. |
| In-page updater | Implemented with readiness, single-submission and uncertain-outcome guards; not hardware verified. |
| Simulation and CLI | Hardware-free demo and read-only diagnostics are available. |
| Fresh root review | **273 offline tests passed** and **119 local publication artifact files were verified** before this housekeeping pass. These are dated receipts, not a claim that every later revision has run the same checks. |
| Standalone housekeeping | **278 tests passed**, local and portable hosted production builds passed. A relocated browser demo rendered and its head control responded. The production webcam worker initialized its real model without capture; no robot, camera or microphone was used. |
| Static source projection | A live check found that Pages reserves `.github/`. The source manifest now binds a `github/` website projection while the repository and ZIP retain canonical CI paths. Version **0.1.2** preserves the earlier 0.1.1 archive identity. |
| Previous hosted verification | The 0.1.2 deployment was verified against 139 build/source/archive files. A later website commit affected Fleet only. This is a dated publication receipt. |

The October 1 interface pass adds compact spatial head/antenna gestures, a bounded
page console and an integrated experimental WebXR view. Offline tests cover the
new gesture, command grammar and XR mapping/gate behavior. Browser simulation
checks include keyboard gestures, requested/measured feedback, negative numeric
input, read-only console output and explicit simulated writes. The production
page and local bridge also render without a framework error overlay.

A different initialized Wireless robot was observed on daemon **1.10.0**, healthy
and asleep, with remote access and media available and no current app lock.
Read-only daemon/ownership/measured-state checks passed through the local bridge.
Attended local-page tests completed Wake, small left/right antenna movements,
Stop and Sleep. Both antenna targets reached measured feedback. Small head-turn
tests encountered stale telemetry and recovered by holding measured pose; they
do not establish reliable head control on this connection. The robot was confirmed
asleep after testing. No firmware, Wi-Fi or new camera/microphone capture was tested.
The final interface revision passed **297 offline tests**, both production builds
and the **133-file** public source audit. Browser checks verified explicit console
write enablement and actual read-only WebMCP status discovery and invocation.
Hosted authenticated WebRTC and physical WebXR still require their account/device
validation. The desktop browser viewport override did not change its
layout size, so mobile rendering is not claimed as verified.

The **0.2.1** agent-interface follow-up passed **303 offline tests** and both
production builds. WebMCP discovery and direct status, arm, bounded head command,
measured readback, Stop and disarm calls passed in browser simulation without
cursor interaction. Motion and power commands require explicit arming; Stop
remains callable on the active connection after movement authorization is revoked.
These tool tests do not add physical hardware validation.

The **0.3.0** workspace pass keeps camera, measured 3D and head controls visible
together on a 1280×800 desktop viewport. Antenna gestures and numeric inputs are
integrated into the model panel. Browser simulation verified ordinary orbit without
antenna movement, explicit 3D drag with measured readback, Stop revoking drag mode,
and numeric input outside drag mode. A 390×844 viewport stacked the panels without
horizontal overflow. **305 offline tests** and both production builds passed.
The source inventory includes **135 reviewed files**. This pass adds no physical
robot, camera/audio capture or headset validation.

The **0.3.1** revision prioritizes camera and gesture controls over a narrow 3D
panel. Compact antenna sliders return, a visible sideways/vertical translation
pad and forward/back slider complement look/tilt gestures, and dragging the camera
uses the same turn/nod mapping as the look pad without a visual overlay. Browser
simulation verified camera-to-head requested/measured feedback, position input,
antenna slider input and mobile reflow without horizontal overflow. **306 offline
tests** and both production builds passed. No new physical validation is claimed.

The **October 13 offline continuation** fixes a held Look direction or Tilt drag
resuming after Stop. These controls now share camera/translation gesture
cancellation: a changed control context, disabled gate, hidden page, lost focus,
lost pointer capture or rejected submission requires a new press. Tilt retains
its relative glyph drag and all controls retain their existing target mapping.
**312 offline tests** and both production builds passed; the public source audit
still covers **135 reviewed files**. Chromium simulation checked Stop and focus
loss for all four gesture surfaces in both local and hosted builds, fresh drags,
keyboard and precision inputs, and the hosted agent arm/write/readback/Stop/disarm
flow. The 1280×800 desktop layout and 390×844 mobile reflow passed without app
console errors. These are local build checks, not a new deployment or hardware
validation.

The same-day boundary follow-up fixes partial Wireless requests being rejected
when an omitted measured axis crosses its limit only through floating-point
roundoff (for example, −15.000000000000002° tilt). The adapter permits a small
machine-precision allowance on omitted measurements and preserves their values.
Explicit head and antenna targets retain strict limits; material measured
overshoot remains blocked. **315 offline tests** and both production builds
passed, including positive/negative boundaries on all six head axes and both
antennas, strict explicit overshoot rejection, and preservation of measured state.

An **October 13 attended hardware session** freshly matched a daemon **1.10.0**
robot and confirmed free ownership, no running moves, and healthy initial
telemetry. Wake, small left/right antenna movements, software Stop and Sleep
completed with fresh measured confirmation. An earlier power-action confirmation
read timed out; controller-page visibility changes also interrupted power actions.
The subsequent power/antenna checks passed with that page suspended.

Small yaw and pitch requests produced measured movement within the bridge's
existing 1° / 1 mm arrival criterion. A roll request remained active with about
1.07° combined angular error and was stopped at the attended test deadline.
Its traced snapshot reads stayed below 53 ms, so this particular failure did not
establish stale telemetry as its cause. These observations do not establish
reliable six-axis head control or precision below the existing arrival tolerance.
Translation checks were not completed. Camera/audio checks were blocked by
media-status timeouts and later loss of robot reachability; no live video or
audio stream was verified. After operator power-button recovery, a further Wake
attempt was rejected by the existing 500 ms snapshot-freshness gate. Final fresh
identity/version, motor-mode and ownership reads confirmed the robot asleep and
idle; media reported available again, without establishing a working stream.
Physical WebXR, hosted authenticated WebRTC, factory
onboarding and the updater remain outstanding. Private receipts retain the
individual requests, readbacks, timing and operator observations.

The **October 13 offline telemetry/settling follow-up** reduces optional media
polling to once per 1.5 seconds and drains failed mandatory snapshot batches before
another coalesced batch can start. Mandatory identity, ownership, pose and running
motion reads remain live; the 500 ms freshness gate and motion limits are unchanged.
Timing now separates response headers from JSON-body completion and retains the
last slow snapshot after healthy reads resume. Head diagnostics expose signed
per-axis errors and combined settling error, including post-write read freshness.
**321 offline tests**, both production builds and the **135-file** source audit
passed. An offline replay of the saved roll plateau reproduced its combined-error
failure, no destination replay and one guarded measured hold. This improves read
coordination and evidence for the next attended session; it does not establish
the cause of the physical connectivity loss or correct physical roll calibration.
No robot requests or hardware tests were performed in this follow-up.

A subsequent **October 13 attended diagnostics retest** used the updated bridge
with the retained ±2° / ±2 mm pilot limits. Fresh identity/version and ownership
reads confirmed daemon **1.10.0**, asleep and idle. Explicit Wake completed before
any head target. One small roll request settled with **0.91° combined angular
error** and **0.52 mm combined translation error**, within the unchanged arrival
criterion. The following small yaw request plateaued with **1.31° combined
angular error**, almost entirely yaw, and **0.34 mm translation error**. Its
10-second settling deadline triggered the recovery guard; the attended sequence
halted, and Stop and Sleep completed. Fresh final reads confirmed disabled motor
mode, asleep, idle and ready with no recovery lock.

The retest recorded **72 snapshots at 15–118 ms** (median 26 ms), with no mandatory
request errors or slow snapshots. This yaw failure occurred under fresh telemetry;
the run does not resolve the earlier intermittent delays or establish a physical
calibration cause. One roll arrival does not establish reliable head control or
sub-degree precision. Pitch and translation tests were not reached. Media status
was available, but no camera/audio stream was tested. The temporary bridge stopped
and both resource reservations were released; private receipts retain the complete
per-route timing, six-axis settling errors and final state.

The subsequent **October 13 offline yaw investigation** found 52 post-write
settling samples in that retest. Measured yaw remained effectively unchanged
during the final five seconds, with about 1.30° yaw error and healthy HTTP reads.
Saved read completion times do not establish the age of the robot's underlying
sensor sample. Pose reconstruction preserved the requested absolute yaw and
omitted pose fields; replay still failed the existing combined arrival criterion.
The physical residual's cause remains unresolved.

A separate ramp bug could end transmission with a remaining error below 0.01°
or 0.01 mm, such as sending 0.100° for a 0.105° request. Limited ramps now send
the exact bounded endpoint before settling. This small correction does not
explain the attended yaw residual. Diagnostics now retain the last manual target
matrix, six-axis values, preserved body yaw, epoch, sequence and write duration,
distinguishing pending, acknowledged, failed and unknown outcomes. Settling
faults retain that evidence through measured recovery without replaying the
destination. An acknowledgement remains distinct from physical arrival.
Optional daemon timestamps and native head-joint readings are also retained for
the next diagnosis, without assuming synchronized clocks or changing admission.

**327 offline tests**, both production builds and the **135-file** source/ZIP
audit passed. A private replay of the saved yaw plateau confirmed an acknowledged
exact endpoint, unchanged settling rejection, and one guarded measured recovery
hold. No robot requests or hardware tests were performed in this investigation;
motion limits, freshness, ownership and recovery gates remain unchanged.

A later **October 13 attended yaw-retest recovery attempt** did not reach Wake
or a head target. Bluetooth freshly matched the robot identity and accepted PIN
authentication, then one explicitly authorized daemon-restart request returned a
GATT protocol error. The operator observed brief Wake/Sleep motion. Restart
completion remains unconfirmed: subsequent daemon HTTP and SSH checks failed,
and a fresh uncached Bluetooth identity read also timed out. The request was not
replayed; no current daemon version, motor state or ownership was established.
The temporary robot reservation was released; no bridge or port was started.

An isolated offline reproduction of the official **1.10.0 Bluetooth source**
found that the generic maintenance-command branch runs its script but returns
no reply string, causing the reply encoder to raise after execution. Both mocked
successful and failed script exits reproduced that error, so a GATT error alone
cannot establish whether a restart succeeded. This is a possible explanation for
the observed reply failure, not verification of the installed Bluetooth service
or the cause of HTTP/SSH loss. No robot software was changed. The yaw retest
remains pending recovery and fresh admission checks, followed by explicit Wake.

The following **October 13 attended yaw retest** recovered connectivity after an
operator power cycle. Eight fresh identity/version/ownership snapshots passed
at 23–78 ms on daemon **1.10.0**. The daemon initially reported disabled motors;
explicit Wake completed before either yaw target. A small negative yaw target
settled at **0.28° combined angular error** and **0.27 mm translation error**.
The subsequent positive target failed the unchanged settling deadline. The fault
retained the exact acknowledged endpoint, post-write reads and **1.38° combined
angular error** with **0.38 mm translation error** at the deadline. Native daemon
timestamps advanced; optional native head joints were not present in the response.
Reliable yaw control remains unverified.

Measured recovery, software Stop and Sleep completed, followed by a fresh asleep,
idle and ready snapshot. A later independent status read failed again. Another
explicitly authorized Bluetooth daemon-restart trial accepted PIN authentication
and returned an uncertain protocol-error outcome; the operator observed brief
Wake/Sleep motion. No target was replayed. Read-only monitoring subsequently found
an IPv6 SSH greeting while IPv4 connections timed out, showing that complete
robot/network loss cannot be inferred from the HTTP failure. The Stop/Sleep cause
remains unresolved: healthy reads followed the earlier Stop and the final Sleep.
Hosted control, camera/audio, pitch and translation were not tested in this run.

The hosted **0.3.2 reconnection guide** provides current-address/status checks,
bounded copied-status summaries, an explicit browser Bluetooth capability check,
official maintenance handoffs and attended physical power-cycle instructions.
It explains Brave and other unsupported-browser fallbacks and uncertain restart
replies. The guide sends no robot commands, opens no chooser during capability
inspection and adds no automatic Wake, reconnect replay or admission exception.
This page workflow still requires its own attended recovery validation.

For the **0.3.2 release**, **332 offline tests**, the local production build and the
hosted production build passed on Node 24. Rendered browser checks covered the
guide's status branches, unsupported/available/unavailable Bluetooth, denied
and timed-out capability checks, unsafe hosts and malformed copied status.
The hosted demo loaded its camera and model and completed a simulated measured
head target, Stop and disarm. Desktop and 390 px mobile layouts had no horizontal
overflow or console errors. The reviewed public inventory contains **141 source
files**. These are offline and simulation results; hosted authenticated robot,
media and recovery tests remain outstanding.

The later **October 13 OS-network investigation** established a local IPv4 route
failure while Wi-Fi association, the assigned address, gateway access and loopback
daemon health remained available. NetworkManager **1.52.1-1+rpt4** reported an
address conflict; subsequent TRACE configuration showed ACD not ready and the
generated direct subnet route absent. A controlled temporary-route A/B trial
restored external daemon status and reproduced the failure on removal. Installed
service logs also confirmed that an earlier Bluetooth daemon restart ran without
repairing the route. These later observations supersede the earlier uncertainty
about whether that particular restart executed. An arbitrary lost reply still
cannot establish success, and the original conflict trigger and Stop/Sleep
causality remain unresolved.

One additional on-link route was saved in the existing Wi-Fi profile and survived
one authorized OS reboot. Reapply restored the native route too. This establishes
persistence for that reboot, not prevention under the original trigger. The
workaround is subnet-specific and can mask a real conflict. The stock package was
unmodified and the daemon returned on **1.10.0** with disabled motors. That reboot
was authorized with possible startup/shutdown motion; it was not an attended
physical motion observation or a head/media test. All current robot facts must
still be checked afresh before hardware actions.

A separate candidate NetworkManager recovery change was validated in isolated
x86-64 Linux namespaces using the actual NML3Cfg/n-acd and kernel route engine.
The unchanged source retained the CONFLICT state and missing route after its
120-second retry. The candidate reprobed, restored the native route without a
duplicate and rejected a live duplicate. **10 Linux cases passed; four known
upstream cases were skipped.** The recovery fixture used ONCE defense and an
externally retained address; normal DHCP ALWAYS defense and the original field
event were not reproduced. ARM, the robot kernel/driver, eBPF, complete DHCP
behavior and additional USED/address/link lifecycle paths remain unverified.
The candidate is **not installed on the robot** or included in public downloads.

The **0.3.3 recovery guidance** adds a second-device comparison, an expandable
explanation of OS routing failure, daemon-restart limitations and a redacted
support checklist. Host and observation changes clear the comparison. The guide
remains observation/navigation only: no robot requests, route repair, package
installation, automatic Wake or write replay. The robot-side maintenance report
and attended validation plan remain private preparation, not submitted or executed.

For this revision, **332 offline tests** and both production builds passed on
Node **24.13.1**. Rendered production checks at **1280×800** and **390×844** covered
the comparison branches, reset behavior and keyboard disclosure. Offline fixtures
covered Bluetooth availability/denial/timeout/insecure contexts, unsafe hosts and
bounded copied-status handling. The hosted demo reached a measured simulated
head target, then completed Stop and disarm. There were no app console errors or
horizontal overflow; the demo emitted browser GPU performance warnings. These
checks made no robot requests and add no physical recovery or control validation.
Read [recovery findings and limits](RECOVERY.md) before OS maintenance.

The **0.3.4 controller diagnostics** adds a read-only, copyable connection summary
and `window.reachyAgent.diagnostics()`. It excludes identity, addresses,
credentials and raw errors. Receipt freshness is separate from unknown sensor
age; stale or missing motor evidence is unknown, and disconnecting does not
resolve an earlier uncertain command. Simulation is labelled explicitly.
Staged manual head/antenna sending expires 15 seconds after new input. Only a
later measurement can satisfy the existing explicit-axis comparison. Expiry
discards unsent targets without automatic Stop or any replay.

This revision passed **348 offline tests** and both production builds on Node
**24.13.1**. Browser simulation covers a non-converging target with fresh receipts,
deadline expiry without automatic Stop, stale telemetry, a reported running move,
uncertain Wake and reconnect without replay. Production desktop/mobile checks
cover the copyable summary, disconnected diagnostics and measured demo controls.
These checks add no hardware validation. Public source now includes **146 reviewed
files**; raw browser receipts and screenshots remain private.

Later separate Linux runs added **six protective edge cases** and **two real DHCP
transactions** to the earlier network investigation. A live-duplicate link reset
was accepted by both baseline and candidate source, exposing an unresolved policy
outside the patch. The candidate remains uninstalled and unsuitable for production
without further work. No single full-suite or original-event reproduction is
claimed. See [updated recovery findings](RECOVERY.md).

A subsequent authorized guarded local yaw pilot used a freshly verified address
after an old address stopped answering; the native and workaround routes remained
present. Explicit Wake preceded movement. The negative target met the unchanged
settling criterion; the next target failed at **1.23° combined angular error** and
**0.39 mm translation error**, with later receipts plateauing. Separate observation
windows after Stop and after Sleep remained reachable. This was local bridge
telemetry evidence without an attended visual observation, not hosted browser
physical validation. Reliable yaw response and Stop/Sleep conflict causality remain
unverified. Further physical testing waits for an attended operator.

The daemon 1.11 candidate requires attended browser/robot transport, telemetry,
camera/audio, identity and safe control checks before a separately reviewed gate
change. Offline success alone is insufficient. Read [candidate compatibility](DAEMON_1_11_COMPATIBILITY.md)
for the scoped synthetic evidence.

The **0.3.5 phone demo** adds Android-first orientation input and a separate paired
phone-to-PC sender. Phone access, neutral, following, held input and PC approval
are explicit. These inputs exist only in simulation; the sender has no robot
connection or power/general-command capability. Relative rotation preserves
translation, body yaw and antennas. Input ownership is excluded synchronously,
and loss clears staged intent before software Stop. Phone input expires after a
short gap; the existing manual target deadline is not used as its loss watchdog.

Pairing uses two private, bounded, single-use codes and local WebRTC candidates,
without a signaling server or STUN/TURN relay. Periodic receiver-clock challenges
bound delayed input without assuming synchronized sensor clocks. A distinct
approval nonce prevents rapid Stop/reapproval from resuming an old held gesture.
The loopback bridge and physical control admission remain unchanged. Read
[phone setup and limits](PHONE_CONTROL.md).

For this revision, **397 offline tests**, the local production build and the
hosted production build passed on Node **24.13.1**. Synthetic browser sensors at
**1280×800** and **390×844** exercised neutral without movement, held yaw/pitch/roll,
competing-input exclusion, release, stale readings and denied permission. Two
browser contexts completed the actual WebRTC offer/answer exchange and moved the
PC simulation, including a lost first pose packet and a lost release packet;
Stop/reapproval left the prior hold disarmed. App console and
overflow checks passed. The reviewed source inventory contains **156 files**.

These are synthetic sensor and same-machine peer results. They do not verify
physical Android sensor cadence, drift, permissions or two-device LAN behavior.
No phone device, robot, camera or microphone was accessed. Physical robot testing
remains waiting for an attended operator; phone input remains simulation-only.

The **October 14 attended local pilot** confirmed normal Wake and Sleep visually
and an obvious larger antenna movement. Both small and larger positive-direction
yaw changes failed settling despite healthy HTTP timings. Separate 30-second
windows after Stop and Sleep remained reachable. The robot was confirmed asleep
at the end. These local receipts do not verify hosted robot or phone control.

The **offline head-response follow-up** found no demonstrated matrix/unit/Euler
conversion error. It adds native measured joints to the existing local state GET
and labels the observed 1.10 daemon timestamp as response construction, with
sensor age still unknown. Independent rotation fixtures and both saved plateau
replays preserve the existing arrival, recovery and no-replay guards. An upstream
target-state serialization defect was reproduced with an extracted release model
and fake backend; its proposed patch remains private and uninstalled. Reliable
physical yaw control remains unresolved. See [head response](HEAD_RESPONSE.md).
**399 offline tests**, both production builds and the **157-file** public source
privacy audit passed on Node 24.13.1. This follow-up made no robot requests.

The subsequent **offline motor-delivery audit** found a native observability
defect: queued commands can encounter execution errors that the motor worker
silently discards. Absence of logged IK errors therefore does not exclude serial
write failure. Exact pinned conversion fixtures cannot account for the saved
directional joint gaps through one-count rounding. No physical cause is established.
The controller now requires seven finite diagnostic joints, retains an optional
native cache timestamp without changing freshness, and reports unknown motor
delivery explicitly. Private diagnostic proposals for bounded native error logs
and joint-cache timestamps remain uninstalled. No robot was contacted or moved;
the hosted publication remains unchanged. See [motor audit limits](HEAD_RESPONSE.md#motor-conversion-and-delivery-audit).
**401 offline tests** and both production builds passed on Node 24.13.1. Separate
native conversion/fault-injection and extracted daemon harnesses cover the private
diagnostic proposals; they do not establish full-package or hardware compatibility.

The preceding **full-package pass** built Windows and ARM64 Linux native wheels
and passed nine complete native-library tests with an in-memory serial bus.
Five installed daemon-wheel variants passed 217 integration assertions; additional
checks used the exact production native wheel and asset-preserving daemon artifact.
Package payload, RECORD and rollback checks passed. Source-built daemon wheels
with LFS placeholders were rejected; the qualified private candidate preserves
all 327 official asset entries. Forty-six isolated import/ASGI assertions passed
on the robot's ARM CPU with fake backends and no motor-controller construction.
Temporary files were removed and the original running daemon and package bytes
remained unchanged. Status still reported asleep/disabled. No Wake, movement,
service restart or deployment occurred. Physical delivery, settling and live
daemon lifecycle remain unverified; the hosted publication is unchanged.

Setup, Wi-Fi changes, remote account authorization and control are separate checks.
A successful update job or submission acknowledgement is not confirmation of the
result; inspect fresh robot status. Unsupported versions retain robot-owned
Settings and official recovery routes. Never change firmware merely to bypass
a control gate.

The subsequent **October 14 servo-readback deployment** passed 76 isolated
import/ASGI assertions on the robot's ARM64 runtime. A verified package/configuration
backup preceded installation of the reviewed native/daemon payloads and a service
restart. The daemon stayed disabled/asleep with healthy ordinary telemetry and
advancing joint-cache timestamps. Its new register endpoint returned 503: all seven
captured motor replies passed CRC/identity/length checks but carried the hardware
alert bit. Captured routine reads reported an input-voltage alert and 7.3–7.4 V;
the pinned upstream code filters voltage errors below its 7.8 V threshold. Actual
motor model and configured limits remain unverified, and no cause of the earlier
yaw shortfall is established. Wake and yaw were withheld pending usable readback;
no Wake, movement, Stop or Sleep was sent in this window. Final status reported
disabled and reachable. The private patches are now installed; the earlier offline
candidate's uninstalled status is historical. See [live readback limits](HEAD_RESPONSE.md#arm-deployment-and-live-readback-blocker).

The **offline alert/metadata follow-up** retains raw hardware-alert status in
register observations and adds bounded, fixed model/firmware, voltage-limit and
error/configuration reads through the same controller worker. Both diagnostics
share one request slot, cooldown and 200 ms deadline; alerts do not become motor
health or motion clearance. Thirty-eight native tests, 285 daemon installation/
rollback checks, and 31 export plus 278 ASGI checks against compiled Windows
packages passed. Windows and ARM64 wheels passed payload/architecture checks,
all 327 official assets were preserved, and byte-exact rollback was verified.
The 401 controller tests and both production builds passed on Node 24.13.1.
The new candidate is uninstalled, with ARM execution and firmware support still
unverified. No robot requests, restart or movement occurred; the hosted page is
unchanged. See [alert and metadata limits](HEAD_RESPONSE.md#offline-alert-reporting-and-motor-metadata).

The subsequent **device alert/metadata test** passed 278 isolated ARM checks,
verified backups and installed the alert-bearing candidate. Live testing found
an additional PyO3/Pydantic conversion defect missed by fake-owner tests. A real
native-sample/model/API regression reproduced it; a one-module daemon correction
passed package/rollback checks and another 278 isolated ARM checks before installation.
Three metadata and three goal/present reads then succeeded while disabled, with
explicit alerts, advancing sequences and expected shared cooldown rejection.
All seven tested motors reported model 1200, firmware 53, configured voltage
limits 3.5–7.0 V, present voltage 7.4 V and input-voltage error status 1. This
supports the alert observation, not a safe supply rating or a cause of the yaw
shortfall. Ordinary telemetry and final service/ownership checks passed. No Wake,
movement, Stop or Sleep was sent; the corrected private patches are now installed.
The hosted publication is unchanged. See [device diagnostic evidence](HEAD_RESPONSE.md#device-alert-and-metadata-validation).

The operator subsequently clarified they were absent during that diagnostic
deployment window. Those disabled-state observations have no visual confirmation;
they do not constitute attended physical validation.

The subsequent **attended moving-register capture** confirmed normal Wake and
Sleep visually. A small yaw trial and an operator-requested larger repeat both
failed settling; the larger turn was clearly visible with no unexpected motion.
Repeated target-stable samples showed all seven servo goal registers exactly
matching the converted daemon joint targets, while measured positions remained
short. Every observed motor torque bit stayed enabled, with only input-voltage
error status 1 and voltage 7.3–7.5 V. The original adapter label and Pollen's
documented voltage policy explain why that alert is retained without treating it
alone as proof of the yaw cause. No native execution/IK failure was reported.
The repeat observer also exposed a retained-fault harness limitation; independent
capture recorded its fresh command-epoch settling failure. Final Sleep and a
30-second reachable window passed. No motor settings or packages were changed;
hosted and phone validation remain outstanding. See
[moving-register evidence and limits](HEAD_RESPONSE.md#attended-moving-register-comparison).

The **offline servo-loop follow-up** corrects signed PWM/trajectory types in a
private controller fork and adds bounded raw mode, gain, limit, current/PWM and
trajectory diagnostics through the existing owner. No demonstrated cause of the
yaw shortfall was found. Forty-six native tests, 729 actual Windows installed-
package ASGI checks, 510 strict-schema checks and 279 rollback checks passed;
Windows/ARM64 artifact and byte-exact source rollback checks preserved all 327
daemon assets. New ARM runtime, register-span and live timing support remain
unverified. A separate gravity-exit mode/torque-order correction passed 31 inert
checks; it is outside the diagnostic wheel and the observed yaw path. The retained-
fault observer fix is staged separately. All proposals are uninstalled. No robot
was contacted, restarted or moved; no motor setting or browser guard changed.
See [servo-loop audit and limits](HEAD_RESPONSE.md#offline-servo-loop-audit).

The subsequent **disabled servo-loop deployment** passed 1,239 isolated ARM64
checks, verified the package/configuration backup on both machines and installed
only the diagnostic candidate. All 496 candidate payloads and installed RECORD
mappings were verified before restarting with startup Wake disabled. Three live
loop reads succeeded in 22–27 ms through the existing owner. All seven tested
motors reported position-control mode 3, position I/D gains zero, P gains 200/300,
raw PWM limits 885 and current limits 1750. Disabled-state goals, trajectories and
present positions matched, with zero observed PWM/current output; input-voltage
alerts remained explicit. Final torque bits were zero and a 30-second reachable
window passed. No Wake, movement, Stop or Sleep was sent; no motor setting was
changed and no new visual confirmation was obtained. This qualifies the observed
firmware's disabled diagnostic reads, not moving response or a yaw cause. The mode
correction remains separate and uninstalled. The private diagnostic patches are
now installed; the prior offline uninstalled status is historical. The hosted
publication is unchanged. See [deployment evidence and limits](HEAD_RESPONSE.md#disabled-servo-loop-deployment).

The subsequent **moving servo-loop capture** Woke the robot explicitly and used
a roughly 12° local yaw change. Three destination-stable brackets showed exact
converted-target/servo-goal agreement, trajectories within 2 encoder counts of
goals and measured positions up to 48 counts short. Sampled PWM in those brackets
was at most 6.33% of its cap, with position I/D gains zero and mode 3 retained.
The full 11.7° destination was acknowledged; the freshness guard interrupted
settling with retained yaw feedback about 6.5°. This was a stale-status failure,
not successful arrival or a settling timeout. Stop and subsequent Sleep were
acknowledged, disabled-state windows passed, and the final asleep/settled state
was visually confirmed. The turn itself was not watched. A withheld initial yaw
and a Sleep observer that sent no command remain recorded separately; a narrowly
Stop-fenced, Sleep-only cleanup observer passed 19 offline receipt checks. No
runtime motion gate or motor setting changed. Sparse output samples establish no
yaw cause or exclusion of transient saturation. The mode proposal remains
separate and uninstalled, and the hosted publication is unchanged. See
[moving comparison and timing limits](HEAD_RESPONSE.md#moving-servo-loop-comparison).

The **offline proportional-output and freshness follow-up** found no demonstrated
gain/PWM decoding defect and made no motor-setting changes. The documented P/128
gain cannot alone establish firmware raw-PWM conversion; the larger positive
captured pairs' half-scale fit remains empirical. Saved local timing shows a
131 ms cached read reaching 525 ms start-age while a 323 ms replacement was pending.
The bridge now uses sequential motion polling with at least 100 ms between
attempts and retains cached/pending ages in stale faults. Six deterministic cases
reproduce the scheduling failure and verify coalescence, cleanup and continued
rejection of stale reads. **407 offline tests** and both production builds passed
on Node 24.13.1. The 500 ms freshness gate and motion/arrival/recovery guards remain
unchanged. Maximum monitor attempts increase from 4 to 10 per second; hardware
load and response effects remain unvalidated. No robot was contacted, restarted,
Woken or moved and no packages were installed. The mode correction remains
separate and uninstalled; the hosted publication is unchanged. See
[offline findings and limits](HEAD_RESPONSE.md#offline-proportional-output-and-freshness-follow-up).

The subsequent **disabled polling load qualification** exercised five 30-second
old/new comparisons and a final independent 30-second disabled-state check.
The previous schedule produced about 20 GETs/s with sampled cache ages up to
317–342 ms; the new schedule produced 48 GETs/s with maxima of 180–196 ms. With
24 bounded native diagnostics added, traffic was 49 GETs/s, the largest snapshot
took 214 ms and the largest sampled cache age was 305 ms. No recorded read or
sampled cache age exceeded the unchanged 500 ms gate; all requests completed,
mandatory batches never overlapped, all daemon samples reported disabled motors
and all ten raw metadata samples reported zero torque bits. Reported loop errors
were zero, but the new phases showed modestly lower median daemon loop frequency
and higher peak loop intervals. This qualifies the bounded disabled read load,
not moving performance or the cause of the earlier stale event. No Wake, movement,
Stop, Sleep, restart, installation or setting change occurred, and no new visual
confirmation was obtained. The sampler exited and its robot lease was released.
The mode correction remains separate and uninstalled; the hosted publication
is unchanged. See [measurements and limits](HEAD_RESPONSE.md#disabled-polling-load-qualification).

The subsequent **new-polling yaw capture** was explicitly authorized without an
attended operator and has no visual confirmation. Wake and independent awake
diagnostics preceded the roughly 12° yaw change. The full +11.3° destination was
acknowledged, but retained yaw reached +6.28° and the guard reported an
**unsettled-target** failure with post-write feedback, rather than stale status.
During the 10.011-second monitor window, bridge traffic including observer/guard
callers was 62.53 GETs/s; 124 mandatory batches never overlapped. The largest
snapshot took 45 ms and the largest sampled cache start-age was 159 ms, below the
unchanged 500 ms gate. Separate localhost servo sampling added daemon load.
Three stable brackets again showed exact converted-target/goal agreement, at
most 2 trajectory counts and up to 48 measured-position counts of error, with
sampled PWM at most 6.33% of cap. The measured hold, Stop and Sleep completed;
two final 30-second telemetry windows reported disabled motors and final raw
torque bits were zero. All traced requests drained without errors or dropped logs,
owned helpers exited and leases were released. This qualifies freshness during
one instrumented local run while the yaw shortfall persisted; wider moving load
and its physical cause remain unverified. Motor settings and the separate mode
proposal were unchanged, and no website publication occurred. See
[capture evidence and limits](HEAD_RESPONSE.md#new-polling-yaw-capture).

The **offline quantized-output follow-up** corrects the earlier interpretation
of negative one-count error: an integer-floor model fits all 42 stable servo
observations across both saved captures, including −1 → −2 PWM. These are repeated
samples with only six distinct nonzero gain/error/output triples. Across all 196
loop observations, 193 fit and three differ by one raw PWM count; the firmware
equation and physical yaw cause remain unverified. Target delivery, gain encoding
and signed feedback showed no demonstrated defect. Near-rest raw velocity 1 is
retained without treating it as sustained physical rotation. A new offline-only
trace analyzer separates delivery, trajectory/position error, sampled caps and
provisional model residuals, with strict timing, epoch, command and private-output
checks. All 419 offline tests and both production builds passed on Node 24.13.1.
No robot request, restart, movement, setting or installation occurred.
The mode correction remains separate and uninstalled; the website is unchanged.
See [comparison and tooling limits](HEAD_RESPONSE.md#offline-quantized-output-comparison).

The **offline static-error investigation** found the goal/present gap already
present at the nominal Wake target: four observations spanning about 30.32 seconds
retained identical sampled positions, with a maximum 54-count gap. Error patterns
also differ between earlier positive and negative yaw targets, but complete-pose
differences prevent a matched approach comparison. Holding load/friction remains
a hypothesis. A [reversible plan](STATIC_ERROR_TEST_PLAN.md) freezes all six target
axes and the body target, checks actual approach direction, and terminates failed
legs with existing Stop/Sleep cleanup. A later RAM P-only comparison remains
conditional on a validated owner transaction and exact restore/readback; no gain
value or armed runner is supplied. No robot requests, state queries, settings,
restart or movement occurred. The mode correction remains separate and unchanged;
no website publication was added.

The subsequent **unchanged-gain matched-approach attempt** was explicitly
authorized without visual attendance. Wake was confirmed by telemetry before
freezing all six head coordinates and the body target. The first 3° lower
waypoint's exact endpoint was acknowledged, but post-write settling failed with
1.212° combined angular error. The sequence ended before any common-target
return, opposite approach or repeat, so no matched-direction conclusion is
available. Four stable native brackets again showed exact converted-target/goal
agreement, up to 13 counts of goal/present error and sampled PWM at most 1.92%
of cap. Freshness remained within its unchanged gate under this bounded load.
Measured hold, Stop and Sleep completed; final disabled/zero-torque observations
passed. There was no visual confirmation. Reads drained, owned helpers exited
and leases were released. No motor setting, package, restart or network change
was made; the mode correction remains separate and uninstalled. The conditional
gain experiment is still unqualified, and no website publication occurred. See
[failed-waypoint evidence and limits](HEAD_RESPONSE.md#unchanged-gain-matched-approach-attempt).

The **offline first-waypoint follow-up** reconstructed a sampled plateau: all
108 distinct admitted snapshots across 9.207 seconds after endpoint acknowledgement
failed arrival, with early/late mean angular errors of 1.187°/1.180°. Native goals
and trajectories stayed unchanged; positions varied by at most one count across
four brackets spanning 5.629 seconds. Cached kinematics replay reproduced the
joint targets and separated a roughly 0.224° goal-quantization contribution from
the larger measured-count error. Neither longer settling nor a conversion,
calibration or gain correction was established as a remedy. A new offline-only
history analyzer verifies epochs, endpoint/ACK chronology and measured evidence,
rejects conflicting duplicates, and reports trend/coverage without changing
arrival. All 430 offline tests and both production builds passed on Node 24.13.1.
No robot was contacted, moved, restarted or modified; current power/network facts
were not queried. The mode correction remains separate and unchanged, and the
website publication is unchanged. See
[history and model-replay limits](HEAD_RESPONSE.md#offline-first-waypoint-settling-history).

The **October 15 offline P-gain transaction candidate** adds exact immutable
backup, single candidate admission, independent readback and explicit original-P
restoration through the existing native worker. It remains disabled by default,
private and uninstalled; ordinary control stays inhibited until verified closure.
Lost replies, queue/cancellation races and terminal filesystem failures are
covered by **79 native tests**. The **430 browser-controller tests** and both
production builds passed on Node 24.13.1. Windows and ARM64 packages and source
rollback are checked offline; ARM execution and physical timing are unverified.
No production motor or candidate P has been selected, and the later gain/motion
handoff remains unqualified. No robot was contacted, restarted, woken or moved;
mode correction and website publication remain unchanged. See
[transaction evidence and limits](P_GAIN_TRANSACTION.md).

The **October 15 ARM P-gain runtime qualification** exercised the exact candidate
binary through a private pseudo-terminal emulator: **five cases/95 checks** and
**729+510 inert daemon/schema checks** passed. Backup, application, exact restore,
lost acknowledgements and rejection used fixture registers only. Native-open
tracing recorded private PTY access without physical serial opens/connects in
these tests. This was root execution with reviewed path confinement, not an OS
device sandbox. The real daemon owner/payload/configuration and sampled disabled
state were unchanged; temporary children/staging were removed. No installation, daemon restart or physical gain write was performed; no Wake
or movement command was sent.
An unarmed hardware plan and staged existing-owner callable passed **11 offline
guard tests**. Deployment/in-process invocation and possible original-P restoration
still need separate qualification/authorization. The mode correction is unchanged;
physical bus/timing and gain/motion remain unqualified. See
[ARM evidence and limits](P_GAIN_TRANSACTION.md#october-15-arm-runtime-qualification).

The **October 15 offline maintenance entry** adds a private dedicated process and
authenticated Unix client around its sole native owner. It exposes original-P
preparation/restoration without Apply or ordinary motion/control transports.
Lifetime inhibition, cancellation/replay guards, private receipt reservation and
the native journal-root contract passed **51 Linux WSL fake-owner/Unix tests**.
Exact installed Windows packages passed inert real daemon/backend integration,
**729+510 daemon/schema checks**, and **729 exact-rollback checks**; existing daemon
source/assets and the native candidate are unchanged. All **430 controller tests**
passed after fixing a race in an existing pre-ACK snapshot test fixture; production
freshness behavior is unchanged. The exact private backup/deployment procedure is
prepared and unarmed. The combined entry/ARM runtime remains unqualified, and the
unchanged native constructor's conditional servo reboot blocks a strict no-reboot
deployment claim. No robot was contacted or changed; mode correction and website
publication are unchanged. See
[entry-point evidence and deployment limits](P_GAIN_TRANSACTION.md#october-15-offline-maintenance-entry-point).

The **offline no-reboot maintenance startup candidate** now selects a separate
read-only native initialization branch and keeps ordinary native commands
inhibited after restore. It checks per-motor raw state and reviewed head/body
identity, requires explicit input-voltage alert allowance and records antenna
identity as unqualified. Normal startup defaults and older-native adapter
compatibility are retained. **96 native tests**, **51 service/Unix tests**, installed
Windows adapter/package checks, **729+510 daemon/schema checks** and **729 exact
production-rollback checks** passed; Windows/ARM packages and source reversal are
verified. The new combined ARM constructor/entry test is prepared and unarmed,
with nine planned PTY cases and **12 offline plan guards** passing. It has not
executed; the preceding ARM binary's evidence does not qualify this changed one.
No robot contact or hardware action occurred. Mode correction and publication
remain unchanged. See
[startup policy and combined-test limits](P_GAIN_TRANSACTION.md#october-15-offline-no-reboot-startup-policy).

The subsequent **combined ARM maintenance-entry qualification** executed the exact
new native/daemon wheels in isolated overlays on ARM64/CPython 3.12. All **nine
PTY cases** passed: normal default, complete no-Apply entry round trip, hardware
error, one enabled torque bit, mixed mode, wrong returned ID, voltage alert
rejection/explicit allowance and pending-before-native-open rejection. **16
offline harness guards** and **10 Linux watchdog guards** passed. An initial
round-trip fixture had incorrect Unix-socket permissions; matching the production
launcher fixed the fixture without weakening the real client. Independent review
accepted exact packets/CRCs/IDs, no physical serial opens or external connections,
complete child exits, immutable backup bytes, verified closure and pending-marker
handling. Root execution is not an OS device sandbox. All newly owned staging,
fixture scratch and finite observers were removed or exited; downloaded private
evidence remains retained.

Four read-only diagnostic profiles through the installed physical owner retained
the seven sampled motors' disabled torque, existing position modes/gains and
explicit input-voltage alerts, with HTTP reads of approximately **22–27 ms**.
Two **180-second** network windows each completed **36 PC and 36 loopback GETs**.
The first PC maximum was **1,109 ms**, versus **281 ms** in the second; availability
does not establish motion freshness. Captured address events were IPv6 lifetime
refreshes, with no observed IPv4 route loss. Initial/final boot identity matched;
final routes retained the explicit workaround. Later raw-table review corrected
the initial classifier: its counted kernel route was a local broadcast record,
not a main-table native subnet route. The historical conflict trigger and
prevention remain unresolved. No package installation,
daemon restart, physical gain/mode write, Wake, Sleep or movement occurred; the
real owner/payload/configuration were unchanged. Disabled-only physical startup
and transaction qualification remain separate next steps. Website publication
and the mode correction are unchanged. See
[ARM qualification limits](P_GAIN_TRANSACTION.md#october-15-combined-arm-maintenance-entry-qualification)
and [network follow-up](RECOVERY.md#october-15-bounded-network-follow-up).

The first disabled-only physical test used a reconstructed, verified
checkpoint that reuses existing content by hash. Missing dependency content was
captured once; unchanged iterations need fresh metadata and only changed blobs.
Seven candidate files were installed and verified, then restored after the
preparation failure. Native `ClosedWithoutGainWrite` receipts, both false
write-start flags, exact terminal journal bytes and pending-marker removal
supported graceful maintenance exit. At that revision, the Python entry expected
`RestoredVerified` for this no-write closure, so its error was retained and
independent native proof was required. The consistency guard was not relaxed or
retried. Final sampled gains, configuration and runtime match the baseline.
Temporary installation wheels/preimage caches were removed; reusable checkpoint
content and native terminal records remain private. This does not complete the
physical transaction qualification.

Public source is prepared from a sanitized standalone history. Original private
authoring history and investigation/validation/outreach receipts remain local and
are excluded from public export. No robot addresses, identities, credentials or
private machine paths are required to build or contribute.
