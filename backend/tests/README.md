# Tests

A starter suite, not full coverage — this codebase was tested extremely
thoroughly turn-by-turn throughout its build (every resource's happy
path, every RBAC boundary, every edge case), but every one of those
tests was a throwaway script deleted after confirming the behavior. That
was a real gap this audit caught: none of that rigor was preserved as a
regression suite. These files are the start of fixing that, not the end.

**Pattern used throughout**: mock the relevant Mongoose model's static
methods directly (`Model.findById = async () => {...}`), then exercise
the real Express app via `supertest`. No live MongoDB connection needed —
this suite runs anywhere with no setup.

**What's covered**: health check, auth register/login/RBAC flow,
`utils/ownership.js`, Incident's status-transition state machine,
Task's skill-matching accept/reject/complete flow (including the
trust-score bump and its 100-point cap), and RiskZone's riskLevel
derivation (all 4 threshold boundaries) plus its score-vs-metadata
separation. 46 tests total.

**What's not covered yet, and should be added next**: RiskZone/Task/
CitizenReport/Volunteer CRUD and validation, Socket.IO real-time flows
(chat, notifications, live activity feed), file upload/compression
paths, admin dashboard aggregation. The manual test scripts written
during each feature's original build (see this project's development
history) are the fastest starting point for porting those over — the
assertions already exist, they just need to move from a deleted
throwaway file into `tests/*.test.js`.

Run with `npm test`.
