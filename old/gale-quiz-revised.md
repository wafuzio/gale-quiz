# GALE Quiz Revised (Merged Assessment + Pulse)

## Intent

This revision merges the colleague pulse-survey strengths into the existing GALE skills assessment while preserving scoring depth, tier reliability, and persona inputs.

Goals:
- Keep diagnostic scoring integrity (tiers + applied evidence)
- Add stronger pulse/programming signal for GWP planning
- Keep canonical IDs stable for downstream admin + analysis

### Current wiring decisions (revised HTML)

- Removed from wired flow by current-number review: Q4, Q6, Q9, Q13, Q15
- `q4` kept but now binary (`Yes/No`) — no `Sometimes`
- `s0` treated as experience/aptitude evidence (not interest framing)
- Revised scoring excludes removed question keys

---

## Canonical Question Set (Final)

### A) Scored Assessment Core

1. `d1` (single)
- Prompt: What is your primary role/domain at GALE?
- Source: Pulse Q1
- Use: Cohorting, persona context (non-numeric score-lite)

2. `q1` (single)
- Prompt: How often are you using AI in a typical work week?
- Options:
  - Constantly — it's woven into how I work
  - Daily for specific tasks
  - A few times a week
  - Rarely / not yet
- Source: Pulse Q3 (adapted)
- Use: Core scoring
- Follow-up trigger: low-frequency answer -> `q1a`

3. `q1a` (single follow-up)
- Prompt: Which best describes where you are?
- Options:
  - I haven’t really had the chance to try AI tools yet
  - I’ve tried them a couple of times but they didn’t stick
  - I use them for personal stuff but not for work
- Source: Current assessment
- Use: Core scoring disambiguation

5. `t1` (multi matrix / dual list)
- Prompt: Which AI tools do you actually use?
- Structure:
  - `t1_personal[]`
  - `t1_professional[]`
- Tool options include (minimum): ChatGPT, Claude, Gemini, Perplexity, Copilot, ALCHEMY AI, Midjourney, Nano Banana, Weavy, NotebookLM, Cursor/Claude Code, Other
- Source: Pulse Q4
- Use: Tool-profile scoring signal + persona context

6. `q2` (multi)
- Prompt: What are you using AI for right now?
- Source: Pulse Q5
- Use: Usage breadth scoring

7. `q2b` (multi)
- Prompt: From your selected use cases, which do you already feel comfortable doing in real work?
- Source: Kept from current model concept
- Use: Comfort score + gap logic

9. `q2a` (single)
- Prompt: How would you describe your prompting style?
- Options:
  - Prescriptive — detailed prompts with examples, constraints, and format specs
  - Structured — I usually give context, role, and constraints
  - Go with the flow — I start loose and refine as I go
  - Casual and conversational — I mostly ask naturally
  - Honestly, I don’t have a style yet
- Source: Pulse Q6 (adapted)
- Use: Prompt-structure scoring
- Follow-up trigger: low-structure responses -> `q2a1`

10. `q2a1` (single follow-up)
- Prompt: Which sounds most like your current prompting behavior?
- Options:
  - I usually keep prompts short and unstructured
  - I add some detail, but not consistently
  - I include some structure, but I’m still refining what works
- Source: Current assessment
- Use: Prompt-structure scoring disambiguation

11. `q3` (single)
- Prompt: When AI gives you a weak result, do you rewrite your prompt rather than just rerun the same ask?
- Options: Yes / Sometimes / No
- Source: Current assessment
- Use: Core scoring

12. `q4` (single)
- Prompt: Have you used AI with documents/spreadsheets/data in actual work (not just testing)?
- Options: Yes / No
- Source: Current assessment
- Use: Core scoring

15. `c2` (multi)
- Prompt: When you use AI output in your work, what is your review process?
- Source: Pulse Q8 (mapped)
- Use: Verification maturity adjustments

16. `s0` (multi)
- Prompt: Which GALE-relevant outputs have you used AI to help produce in real work?
- Source: Current Q16 family
- Use: Applied delivery evidence score

17. `s1` (multi)
- Prompt: Which applied AI activities have you done in real work?
- Source: Current Q17 family
- Use: Applied depth score

---

### B) Non-Scored Pulse + Programming Signals

18. `s2` (multi)
- Prompt: What support would be most useful next?
- Source: Pulse Q12 + current S2 intent
- Use: Training recommendations + persona “rising” cue

19. `program_topics` (multi)
- Prompt: What topics do you want GWP to cover?
- Source: Pulse Q10
- Use: Program planning analytics

20. `segment_pref` (multi)
- Prompt: What kinds of segments land best for you?
- Source: Pulse Q11
- Use: Format planning analytics

21. `blockers` (multi)
- Prompt: What’s actually blocking you?
- Source: Pulse Q9
- Use: Program planning + support design

22. `excitement_open` (text)
- Prompt: What about AI and automation gets you excited or curious?
- Source: Pulse Q13
- Use: Qualitative insight

23. `feedback_value` (1–5)
- Prompt: How valuable has GWP been to you so far?
- Source: Pulse Q16
- Use: Program KPI trend

24. `feedback_text` (text)
- Prompt: What’s working — and what should we change?
- Source: Pulse Q17
- Use: Program qualitative feedback

25. `share_segment` (text)
- Prompt: Want to run a segment or share something you built? (Optional name inline)
- Source: Pulse Q18 + Q20 merge
- Use: Presenter pipeline

26. `anything_else` (text)
- Prompt: Anything else you want us to know?
- Source: Pulse Q19
- Use: Catch-all qualitative signal

---

## Removed as Standalone UI Questions

Removed from standalone flow:
- `q7`
- `q8`
- `t1b`
- `t1c`
- `q2c`
- `q5`
- `q6`
- `c1`

Note: comfort intent is retained via `q2b`; blind-spot item (`q2c`) is currently removed from wired flow pending redesign.

---

## Scoring Retool (Depth Preserved)

### Final score components

1) Core behavior score
- Inputs: `q1`, `q1a`, `q2a`, `q2a1`, `q3`, `q4`
- Preserve existing additive semantics (high behavior evidence -> higher points)

2) Usage/comfort depth score
- Inputs: `q2`, `q2b`
- Keep usage breadth + comfort depth signals

3) Verification maturity adjustment
- Input: `c2`
- Positive adjustments for verification rigor
- Negative adjustments for over-trust/no-review patterns

4) Applied evidence score
- Inputs: `s0`, `s1`
- Preserve high-value applied signals for reliable advanced classification

### Tier thresholds (unchanged initially)
- Tier 1 (Advanced): `23.0+`
- Tier 2 (Intermediate): `16.0–22.9`
- Tier 3 (Foundational): `<16.0`

### Calibration flags
- Keep verification-based calibration using `c2`

---

## Skip Logic

- If `q1` = Rarely / not yet:
  - still collect `q2a`, `c2`, `s2`
  - optionally bypass deeper applied blocks (`q4`, `s0`, `s1`) if minimizing friction is required
- If minimized path is used, apply low-confidence marker on tier and prompt for revisit later

---

## Data Contract (Submission Payload)

Required minimum for tiering confidence:
- `q1`, `q2a`, `q3`, `q4`, `q2`, `q2b`, `c2`, `s0`, `s1`

Optional pulse fields:
- `program_topics`, `segment_pref`, `blockers`, `excitement_open`, `feedback_value`, `feedback_text`, `share_segment`, `anything_else`

---

## Implementation Notes

- Keep canonical response keys stable for admin dashboards and LLM analysis.
- Ensure matrix question (`t1`) is mobile-safe with stacked personal/professional sections.
- Continue autosave on every answer write.
- Keep optional identity only at the end (inside `share_segment` field or separate optional `name`).
- Re-evaluate tier distribution after first 50–100 submissions before changing thresholds.
