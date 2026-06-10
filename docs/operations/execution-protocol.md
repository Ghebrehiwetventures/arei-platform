# AREI Execution Protocol

Version 1.1 | March 2026

Companion to: Operating Model Second Pass, Founder Operating Runbook, docs/document-precedence.md

---

## 1. Purpose

This document is the execution governance layer for AREI. It defines the rules for how AI agents may work inside the repo. It is not a strategy document, not an operating model, and not a runbook.

It exists to prevent a specific set of problems that have already occurred or are likely to occur when AI tools execute work inside a shared codebase:

- Stale docs treated as present truth
- Scope creep during execution
- Builder verifying their own work
- Unclear done-definition leading to over-polish or under-delivery
- External communication going out without human judgment
- Branch or worktree hygiene failures during parallel work

> This protocol is deliberately thin. It governs execution discipline, not business operations. The Founder Operating Runbook governs everything else.

When this document conflicts with a lower-precedence memo or older research artifact, `docs/document-precedence.md` controls.

## 2. Truth Hierarchy

When making any operational claim about AREI, use this strict order. Higher sources override lower ones.

| Priority | Truth Class | What It Means |
| --- | --- | --- |
| 1 (highest) | Verified live | Directly observed on live URL, deployed app, production endpoint |
| 2 | Verified in code | Confirmed by inspecting current branch source code |
| 3 | Verified in data / output | Confirmed by query results, pipeline output, logs, test output |
| 4 | Historical doc only | Appears in docs, plans, or PR notes but not independently verified now |
| 5 (lowest) | Unverified / stale | Might be true but has not been checked in this pass |

**Core rule:** Documentation never counts as proof of current state by itself. If a doc says KazaVerde has 529 listings but the live site shows 480, the live count is truth.

## 3. Verification Requirements by Task Type

| Type | Description | Minimum Proof Required |
| --- | --- | --- |
| A | Local code fix | Verified in code + local checks/tests |
| B | Deployable product change | Verified in code + Verified live (screenshot or URL) |
| C | Data or pipeline task | Verified in code + Verified in data/output (sample records) |
| D | Investigation or audit | All findings labeled individually by truth class |

**Rejection triggers:** Missing proof. Wrong truth labels. Scope drift. Builder claims live success from code only. Docs treated as present truth. Limitations concealed.

## 4. Roles

Four roles govern AREI execution. At current scale, the Principal and Supervisor are typically the same person (founder). The Builder is typically an AI tool. The Verifier is typically the founder reviewing the AI output.

| Role | Responsibility | Current Default |
| --- | --- | --- |
| Principal | Sets priority, approves major tradeoffs or merges | Founder (Mikael) |
| Supervisor | Creates task brief, defines scope, accepts/rejects completion | Founder (Mikael) |
| Builder | Executes exactly one task, reports what changed | AI tool (Claude, Codex, etc.) |
| Verifier | Checks evidence, decides whether task is truly complete | Founder (Mikael) |

> The Builder never verifies their own work as final. Even when the founder is reviewing AI output informally, the principle holds: the person who built it is not the person who signs off.

## 5. Task Brief Template

Use this for medium-to-high-risk work: crawl pipeline changes, schema changes, portal deploys, data flow modifications. Skip for trivial fixes.

| Field | Description |
| --- | --- |
| Task ID | AREI-YYYY-MM-DD-XX |
| Title | One clear sentence |
| Task Type | A (code fix), B (deployable change), C (data/pipeline), D (investigation) |
| Objective | What needs to be achieved |
| Why now | Why this matters now |
| Assigned Builder | AI tool or person |
| Repo / Branch | Repository and required branch name |
| Allowed Scope | Exact files, folders, or components the builder may touch |
| Out of Scope | What must not be changed |
| Acceptance Criteria | Concrete pass conditions |
| Stop Condition | Exactly when the builder must stop |
| External Comms Rule | Human gate required / Pre-approved / None involved |
| Deliverable | Diff summary, changed files, commands run, proof, remaining risks |

## 6. Builder Rules

### 6a. Always

- Execute only the task brief. Do not expand scope.
- Label all claims with the correct truth class.
- Keep changes minimal and reversible.
- Prefer deterministic fixes over broad redesign.
- Report what was not done intentionally.

### 6b. When required (medium/high-risk tasks)

- Confirm repo, branch, git status, task ID, and stop condition before starting.
- Use a dedicated branch (not main).
- Use a dedicated worktree when parallel work is active.
- Produce a closeout report: files changed, commands run, checks run, remaining risks.

### 6c. Never (without explicit approval)

- Work directly on main.
- Mix multiple tasks in one worktree.
- Silent refactors or unrelated cleanups.
- Change docs to claim something is fixed when only code changed.
- Say done without evidence.
- Send external communication without a human gate.

### 6d. Escalation triggers

The builder must stop and escalate when:

- The task brief conflicts with repo reality.
- Docs and live system disagree materially.
- The change requires schema or architecture changes beyond scope.
- The builder discovers a real issue that is not part of the task.
- Success criteria are unclear or missing.

## 7. External Communication Gate

Default: all external communication is human-gated. Agents may research, draft, queue, and summarize. Agents may not autonomously send anything that crosses AREI's boundary.

| Tier | What It Covers | Rule |
| --- | --- | --- |
| Full Autopilot | Email warm-up, data enrichment, monitoring, internal alerts | No human approval needed |
| Human Review Gate | Outreach sequences, social posts, newsletter sends, content drafts | AI drafts, human approves before send |
| Human Only | First contacts, replies, complaints, legal, journalist messages | Human writes and sends. AI may research. |

> **If it crosses AREI's boundary and a real person will read it, a human must approve it. No exceptions in v1.**

## 8. Done Standard

A task is done only when all of the following are true:

1. The work matches the task brief.
2. The allowed scope was respected.
3. Required checks were run.
4. Proof exists in the required truth classes.
5. The verifier (founder) passes the result.
6. Any remaining limitations are stated clearly.

> Once acceptance criteria are met, stop. Do not continue polishing. Do not open adjacent work. Do not turn one task into three.

## 9. Document Relationships

This Execution Protocol governs how work is done inside the repo. Document precedence is defined in `docs/document-precedence.md`.

| Document | Governs |
| --- | --- |
| `docs/document-precedence.md` | Which document wins when documents overlap or conflict |
| Operating Model Second Pass | Control plane, automation boundaries, placement map, when new orchestration layers are allowed |
| Founder Operating Runbook | Weekly operating rhythm, intelligence loop, content/distribution cadence, dashboard checks, founder-facing operations |
| Execution Protocol (this doc) | How AI tools are allowed to work inside the repo |
| Launch docs | KazaVerde readiness, go/no-go gates, and launch sequencing |
| Market thesis docs | Why Cape Verde is Market 1 and what it must prove |
| Vision / strategy docs | AREI's long-term direction and architectural intent |
| Tool Stack Decision Memo | Background research and selection rationale; not final authority where later operating docs are more explicit |
| `docs/02-data-engine/source-investigation-loop.md` | The concrete Type C/D procedure for verifying and fixing a source's data quality (dry-run loop) under this protocol |
