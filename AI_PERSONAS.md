# GALE AI Persona System Reference

This document explains all possible AI astrology personas and exactly what data is used to generate them.

Source of truth in code:
- `gale-quiz.html` → `buildAiAstrologyRead(result)`

## Overview

The persona engine selects:
- **1 readiness level** (from quiz tier + low-score split): Tier 1–3 with a Tier 3 internal split
- **1 operating mode** (from behavior/tool signals): 5 modes

That creates a **4 x 5 grid = 20 total personas**.

Why 4 rows if there are 3 tiers now?
- Tier 3 is intentionally split into two readiness rows using score (`<4` vs `>=4`) so foundational users still map into two distinct persona sets.

## Inputs Used

From `result` and `responses`, the function uses:

- `tier` (from scoring output)
- `flags` (from `computeFlags`)
- `responses.d1` (domain)
- `responses.d1_subdomain` (subdomain)
- `responses.q1b` (home vs work usage)
- `responses.q2` (areas currently using AI)
- `responses.q2b` (areas comfortable with)
- `responses.q2c` (blind spots)
- `responses.t1` (tools used)
- `responses.s0` (applied delivery evidence)
- `responses.s1` (applied AI activities)
- `responses.s2` (support preference)
- `responses.c2` (quality/verification habits)
- `responses.q2a` and `responses.q3` (prompting/refinement signal)
- `responses.q4`, `responses.q5`, `responses.q6` (document/data, multi-step, integration signals)

## Step 1: Readiness Level (row selection)

Tiering is reversed and consolidated:
- `Tier 1` = most advanced
- `Tier 2` = intermediate
- `Tier 3` = foundational (merged lower-end prior tiers)

Row selection logic:
- `Tier 1` -> row 3
- `Tier 2` -> row 2
- `Tier 3` ->
  - row 0 when `score < 4`
  - row 1 when `score >= 4`

(If missing/unknown, defaults to row 1 behavior.)

## Step 2: Operating Mode (column selection)

`modeIndex` defaults to `4` (generalist/explorer), and the other 4 modes are scored with weighted signals:

- **Builder** (`0`): automation/API/build and builder tools
- **Insight** (`1`): data/research usage + verification rigor
- **Creative** (`2`): creative/communications usage + creative tools
- **Operator** (`3`): planning/workflow orchestration signals

Selection logic:
- Compute `modeScores = [builder, insight, creative, operator]`
- Find max score
- Apply threshold by readiness:
  - row 0 (`Tier 3`, score `<4`): threshold `1`
  - rows 1–3: threshold `2`
- **Well-rounded check**: If 3+ modes clear the threshold AND the spread (max - min of qualifying modes) is ≤ 2, route to **Generalist** (`modeIndex = 4`). This captures genuinely multi-domain users rather than treating Generalist purely as a fallback.
- Otherwise, if max score meets threshold, pick one of the tied top modes using deterministic seed tie-break
- If max score is below threshold, use **Generalist** (`modeIndex = 4`) as fallback

This weighted method improves distribution, helps all persona names become reachable, and ensures Generalist personas at higher tiers reflect genuine cross-domain engagement.

## Persona Matrix (all 20)

### Tier 3 (lower foundational band, `score < 4`) personas
- Builder: **Quick Study** 📚
- Insight: **Insight Scout** 🔎
- Creative: **Creative Spark** ⚡️
- Operator: **Plan Starter** 🧭
- Generalist: **Curious Drifter** 🍃

### Tier 3 (upper foundational band, `score >= 4`) personas
- Builder: **Tinkerer** 👷
- Insight: **Evidence Driver** 🕵️
- Creative: **Story Crafter** ✍️
- Operator: **Execution Mapper** 📌
- Generalist: **Momentum Explorer** 🚀

### Tier 2 personas
- Builder: **Automation Engineer** 🦾
- Insight: **Decision Analyst** 🧠
- Creative: **Narrative Producer** 🎬
- Operator: **Operations Strategist** 🗺️
- Generalist: **Versatility Navigator** 🌐

### Tier 1 personas
- Builder: **Orchestration Architect** 🤖
- Insight: **Intelligence Director** 🎯
- Creative: **Creative Systems Lead** 🌟
- Operator: **Workflow Commander** 🏛️
- Generalist: **Adaptive Polymath** 🥷

Each persona includes these fixed text blocks from the grid:
- `spotlight`
- `superpower`
- `nextMove`
- `mantra`

## Additional Narrative Fields (dynamic)

After selecting the base persona, the engine builds dynamic text:

- **`signature`**
  - Starts with persona name + three derived traits:
    - eagerness phrase (from `q1` + `q1b`)
    - versatility phrase (from `q2` breadth + tool count)
    - stance (`pragmatic`, `balanced`, `chaos-leaning` from `c2`)
  - Then appends optional lines if:
    - `q2a`/`q3` show prompt refinement behavior
    - `s0` shows real applied delivery evidence

- **`rising`**
  - First selected `s2` support preference, else defaults to:
  - `"Prompting and instruction design"`

- **`watchout`**
  - First item from `flags` if available
  - Else default QA reminder
  - Else (if no flags but blind spots exist) blind-spot count message

- **`domain`**
  - `d1` plus `d1_subdomain` when present

- **`shareText`**
  - Concise copyable summary including emoji, sign, signature, superpower, next move, mantra, rising, and domain

## Important Implementation Notes

- A deterministic `seed` is computed from answers and is used as a **tie-breaker** when multiple mode scores are equal.
- Persona selection is deterministic based on row/column logic above.
- The final profile object returned includes:
  - `sign`, `emoji`, `signature`, `spotlight`, `superpower`, `nextMove`, `mantra`, `rising`, `domain`, `watchout`, `shareText`
