# GALE AI Skills Assessment — Redesign Draft

## Design Principles

- **Yes = move on, No = dig deeper.** The branching now works in your favor: skilled users breeze through, less experienced users get more diagnostic follow-ups.
- **Every core question is yes/no.** Low cognitive load, honest self-sorting.
- **Follow-ups are multiple choice, not yes/no.** They disambiguate *why* someone said No — "don't know what that is" vs "tried it, didn't stick" are very different training needs.
- **Everyone hits calibration and qualifying signals.** These validate and enrich the core placement.
- **Scoring is additive.** No single "No" creates a ceiling. The pattern across all areas determines the tier.

---

## Section 1: Core Skills (Branched Yes/No)

Each area is a gate. "Yes" confirms and advances. "No" opens a short follow-up.

---

### Q1 — Basic Usage

**Do you use AI tools like ChatGPT, Claude, or Copilot for work tasks at least a few times a month?**

→ **Yes:** advance to Q2

→ **No:** follow-up Q1a

**Q1a: Which best describes where you are?**
- I haven't really had the chance to try AI tools yet
- I've tried them a couple of times but they didn't stick
- I use them for personal stuff but not for work

---

### Q2 — Prompt Shaping

**When you prompt AI, do you include specific instructions — like who the audience is, what format you want, or how long the response should be?**

→ **Yes:** advance to Q3

→ **No:** follow-up Q2a

**Q2a: Which sounds most like you?**
- I just type what I need and see what comes back
- I've thought about being more specific but I'm not sure what to include
- I tweak the output after the fact instead of giving instructions upfront

---

### Q3 — Iterative Refinement

**When AI gives you a weak result, do you rewrite your prompt — changing what you asked for or how you asked it — rather than just trying again?**

→ **Yes:** advance to Q4

→ **No:** follow-up Q3a

**Q3a: What do you usually do with a bad result?**
- I mostly accept what I get or give up
- I try again with roughly the same request
- I make small changes but I'm not sure what actually helps

---

### Q4 — Document & Data Work

**Have you given AI a document, spreadsheet, or dataset and used the output in actual work — not just tested it?**

→ **Yes:** advance to Q5

→ **No:** follow-up Q4a

**Q4a: Which is closest?**
- I didn't realize AI could work with files and data
- I've thought about it but haven't had the right use case
- I tried but the output wasn't good enough to use

---

### Q5 — Multi-Step Prompting

**Have you intentionally broken a complex task into multiple prompt steps — feeding the output from one step into the next — to get a better result?**

→ **Yes:** advance to Q6

→ **No:** follow-up Q5a

**Q5a: Which sounds most like you?**
- I handle everything in a single prompt
- I've gone back and forth with AI but not in a deliberate, structured way
- I didn't know that was a technique

---

### Q6 — Automation & Integration

**Have you connected AI to other tools or workflows — through APIs, automation platforms like Zapier or Make, or custom code?**

→ **Yes:** advance to Calibration

→ **No:** follow-up Q6a

**Q6a: Which is closest?**
- I'm not sure what that means technically
- I know it's possible but it's beyond my current skills
- I've explored it but haven't built anything yet

---

## Section 2: Calibration (Everyone Answers)

These validate the core placement and catch mismatches between what people report and how they actually work.

---

### C1 — Self-Placement

**Which best describes how you use AI today?**
- I ask it questions or get basic drafts
- I give it detailed instructions and shape the results
- I use it regularly with documents, data, and recurring tasks
- I build workflows or integrations that use AI automatically

---

### C2 — Error Awareness

**Have you ever caught AI giving you an incorrect or made-up answer?**
- I haven't noticed that happening
- Yes, and I can usually tell when something's off
- Yes, but I'm not always confident I'd catch it

---

### C3 — Verification Habits

**Before using AI output in real work, what do you typically do?**
- Use it mostly as-is
- Give it a quick read-through
- Check specific facts, tone, or accuracy
- Verify against original sources before using anything

---

## Section 3: Qualifying Signals (Multi-Select, Everyone Answers)

These add dimension to the tier placement — subtag strengths that indicate where someone has depth.

---

### S1 — Prompting Techniques

**Which of these have you done?** *(select all that apply)*
- Given AI specific examples before asking it to generate something similar
- Assigned AI a role or persona (e.g., "Act as a senior editor...")
- Created a reusable prompt template you use more than once
- None of these

---

### S2 — Data & Document Skills

**Which of these have you done with data or documents?** *(select all that apply)*
- Pasted raw data (spreadsheet, CSV) into AI for analysis
- Asked AI to clean up, restructure, or summarize messy information
- Used AI-generated output to create a deliverable you shared with others
- None of these

---

### S3 — Workflow & Code

**Which of these have you done?** *(select all that apply)*
- Used AI as a regular part of a recurring workflow
- Connected AI to other tools through an automation platform
- Written code that calls an AI API
- Built a custom tool or app powered by AI
- None of these

---

## Scoring Model

### Core Skills (Q1–Q6)

Each area contributes to an overall skill score. The scoring accounts for both the yes/no gate AND the follow-up context.

| Answer | Points | Meaning |
|---|---|---|
| Yes | 3 | Confirmed skill |
| No → "don't know what that is" / "haven't had the chance" | 0 | No exposure |
| No → "thought about it" / "know it's possible" | 1 | Awareness, no practice |
| No → "tried but didn't stick/work" | 1.5 | Attempted, needs support |

**Max core score: 18** (all Yes across Q1–Q6)

### Tier Mapping

| Tier | Score Range | Profile |
|---|---|---|
| Tier 1 — Foundational | 0–5 | Little to no AI usage, or early exploration only |
| Tier 2 — Developing | 6–10 | Comfortable with basics, building prompt and refinement skills |
| Tier 3 — Proficient | 11–15 | Strong across prompting, data work, and multi-step usage |
| Tier 4 — Advanced | 16–18 | Full range including automation and integration |

### Calibration Adjustments

**C1 (Self-Placement)** maps to an implied tier:
- "Questions or basic drafts" → implies Tier 1
- "Detailed instructions, shape results" → implies Tier 2
- "Documents, data, recurring tasks" → implies Tier 3
- "Workflows or integrations" → implies Tier 4

If the C1 implied tier is **2+ levels above** the computed tier → flag: **"Self-assessment gap — may benefit from guided placement"**

If the C1 implied tier is **2+ levels below** → flag: **"Underselling skills — may be ready for more advanced track"**

**C2 + C3 (Verification Maturity):**
- Tier 2+ who answered C2 "haven't noticed" → training note: **"Prioritize output verification skills"**
- Tier 2+ who answered C3 "use as-is" → training note: **"Prioritize quality review habits"**
- Tier 3+ who answered C3 "use as-is" → training note: **"High priority: verification practices"**

### Subtags from Qualifying Signals

- S1: 2+ real selections → **Prompting depth**
- S2: 2+ real selections → **Data & documents depth**
- S3: options 1–2 selected → **Workflow depth**
- S3: options 3–4 selected → **Code & API depth**

---

## Question Count by User Path

| User Profile | Core Qs | Follow-ups | Calibration | Signals | Total |
|---|---|---|---|---|---|
| Advanced (all Yes) | 6 | 0 | 3 | 3 | **12** |
| Mid-level (3 Yes, 3 No) | 6 | 3 | 3 | 3 | **15** |
| Early (1 Yes, 5 No) | 6 | 5 | 3 | 3 | **17** |
| Brand new (0 Yes, 6 No) | 6 | 6 | 3 | 3 | **18** |

Everyone gets a proportionate experience. Nobody gets ejected early. Nobody clicks Yes nine times in a row.

---

## Changes from Original

1. **9 core yes/no → 6.** Collapsed Q5/Q6 overlap, removed the redundant "weekly usage" vs "ever used" split, tightened scope of each question.
2. **Cascade branching → universal branching.** Everyone answers all 6 core areas. "No" expands instead of ejecting.
3. **Follow-ups diagnose the "No."** Three options per follow-up that map to distinct training placements (no exposure / awareness / attempted).
4. **Scoring is additive, not pass-fail.** Pattern across all areas determines tier. A "No" in one area doesn't cap you.
5. **Calibration question C4 removed.** C3 already captures verification behavior; C4 was redundant.
6. **D1 (tool selection) removed.** Folded into S3 conceptually — tool selection is an advanced signal, not worth a standalone gate.
7. **Flag language softened.** "Critical risk" → training notes. "Over-reporter" → "self-assessment gap." Results are recommendations, not diagnoses.
8. **Summary screen won't show raw JSON.** (Implementation detail for the build phase.)
