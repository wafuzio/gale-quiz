GWP Pulse Survey — Final Spec
Platform: Custom Vercel app Estimated time: 6–8 minutes Audience: All GWP members across GALE Purpose: Baseline data on AI usage, comfort, interests, and concerns across the club to shape segment programming, support resources, and presenter recruitment over the next quarter

Intro Copy
Five to seven minutes. This helps us shape what GWP looks like over the next few months — what we cover, who presents, and how we run the sessions. Most questions are multi-select. Skip anything that doesn't apply.

Responses are anonymous unless you choose to share your name at the end. We'll share aggregate results back with the club.

Questions
1. What's your primary role at GALE? (single-select, required)
Strategy
Creative / Design
Product Management
Engineering / Development
Data Science / Analytics
Marketing
Account / Client Services
Operations
Leadership
Other: ___
2. Where are you on the AI curve right now? (single-select, required)
Just getting started — still figuring out what to use it for
Dabbling — I use it for some things, mostly the basics
Comfortable — it's part of my regular workflow
Building — I'm making things with it (prompts, workflows, tools, code)
Deep end — agents, APIs, vibe coding, the works
3. How often are you using AI in a typical work week? (single-select)
Rarely / not yet
A few times a week
Daily for specific tasks
Constantly — it's woven into how I work
Skip logic: If "Rarely / not yet" → skip to Q9.

4. Which AI tools do you actually use? (matrix, multi-select per column)
Two columns: Personally and Professionally. Same list of tools, check all that apply in each.

ChatGPT
Claude
Gemini
Perplexity
Copilot (Microsoft / GitHub)
ALCHEMY AI
Midjourney
Nano Banana
Weavy
NotebookLM
Cursor / Claude Code / other coding tools
Other: ___
5. What are you using AI for right now? (multi-select)
Writing and editing
Research and synthesis
Brainstorming and ideation
Image, video, or design generation
Slides, docs, decks
Data analysis or spreadsheets
Coding or building tools
Client work and deliverables
Internal ops (notes, summaries, emails)
Personal stuff outside work
Other: ___
6. How would you describe your prompting style? (single-select)
Casual and conversational — I just talk to it like a person
Go with the flow — I start loose and refine as I go
Structured — I usually give it context, role, and constraints
Prescriptive — detailed prompts with examples, format specs, the works
Honestly, I don't have a style yet
7. How comfortable are you using AI-generated work in your job? (1–5 scale)
1 (not at all comfortable) → 5 (fully comfortable, it's part of how I work)

8. When you use AI output in your work, what's your review process? (multi-select)
I fact-check and verify everything before using it
I edit heavily before it goes anywhere
I review for tone and accuracy, then ship
I spot-check the important parts
I use it as a starting point and rewrite from there
I mostly trust it for low-stakes tasks
Depends entirely on the task
I haven't really thought about it
Other: ___
9. What's actually blocking you? (multi-select)
Don't know where to start
Don't know which tool to use when
My prompts don't get great results
Not sure what's safe for client work
Can't tell if the output is good
Tools change too fast to keep up
Nothing's blocking me — I just want to go deeper
Other: ___
10. What topics do you want GWP to cover? (multi-select — pick as many as you want)
AI fundamentals and the basics
Prompt engineering and craft
GALE tools and ALCHEMY AI
Image, video, and multimodal generation
Slides, docs, and content creation
Agentic AI and autonomous workflows
Vibe coding and building tools
Claude Code specifically
Claude Skills, Projects, and memory
RAG, knowledge graphs, and context systems
Best practices and frameworks
Legal, ethics, IP, and disclosure
AI in society and where it's headed
Tool comparisons and what's new
Industry-specific applications
Other: ___
11. What kinds of segments land best for you? (multi-select)
State of the Union briefings on what's new
Live demos of tools and workflows
Hands-on workshops where I build something
Show-and-tell from GALE colleagues
Guided tutorials with takeaway materials
Discussion and Q&A
Guest speakers from outside GALE
Short tactical tips (5-min segments)
12. What support would be most useful next? (multi-select)
1:1 office hours with someone more advanced
Curated tool recommendations for my role
Templates and starter prompts I can steal
A Teams channel for ongoing questions
Recordings of past sessions
A library of GALE-built Skills and workflows
Cohort-based learning (small group, multiple sessions)
Just keep doing what you're doing
Other: ___
13. What about AI and automation gets you excited or curious? (open text)
What's the thing that makes you want to lean in and learn more?

14. What are your near-term concerns about AI? (multi-select)
Thinking about the next 12 months. - Job displacement and role changes - Quality and accuracy of output - Client confidentiality and data privacy - Copyright, IP, and ownership questions - Regulation and legal exposure - Loss of craft and original thinking - Misinformation and deepfakes - Tools changing too fast to keep up - Honestly, not that worried right now - Other: ___

15. What are your longer-term concerns about AI? (multi-select)
Looking 3–5 years out. - Job displacement and role changes - Loss of craft and original thinking - Concentration of power in a few companies - Environmental impact - Regulation lagging behind capability - AGI / existential risk - Erosion of trust in information - Cultural and creative homogenization - Honestly, not that worried long-term - Other: ___

16. How are we doing so far? (1–5 scale)
On a scale of 1–5, how valuable has GWP been to you so far?

17. What's working — and what should we change? (open text, optional)
18. Want to run a segment or share something you've built? (open text, optional)
Built something cool? Tried something that flopped? Have an idea you want to workshop with the group? Tell us in a sentence — we'll reach out. No pitch deck required.

19. Anything else you want us to know? (open text, optional)
20. Name (optional)
Leave blank to stay anonymous. Add your name if you want us to follow up — especially if you said yes to running a segment.

Build Notes for Engineering
Required vs. optional: Q1 and Q2 are required (needed for cohorting). Everything else optional. Lower friction = more responses.

Skip logic: If Q3 = "Rarely / not yet" → skip Q4–Q8 and jump to Q9. These questions assume active AI use and feel weird otherwise. Important because the AI 101 turnout suggests a meaningful chunk of GWP is in that bucket and we don't want to lose them mid-survey.

Save progress / resume later: Cookie or local-storage based. People start on mobile, get pulled into meetings, never come back. Auto-save on every question completion.

Anonymous by default: No name field until Q20 at the very end, clearly optional. Boosts honesty on Q14, Q15, Q16, Q17.

Tools matrix (Q4) responsive behavior: - Desktop: Two-column grid, "Personally" and "Professionally" as column headers, tool list as rows with checkboxes in each column. - Mobile: Stack into two sequential sections — first "Which do you use personally?" then "Which do you use professionally?" with the same tool list each time. Avoids the cramped matrix UX.

1–5 scales (Q7, Q16): Use radio buttons or a tap-friendly slider with clear labels at both ends. Avoid star ratings — too consumer-feedback-coded for an internal pulse.

Open text fields (Q13, Q17, Q18, Q19): No character limits, but show a soft visual cue at ~500 chars. Most responses will be 1–3 sentences.

"Other" inputs: Show a text field only when "Other" is selected. Don't force people to type "N/A" if they didn't pick it.

Submission confirmation: A short thank-you screen with confirmation that aggregate results will be shared back with GWP. Optional: link back to a recent GWP recording or resource as a thank-you.

Data export: CSV export for all responses with one row per respondent. Multi-select columns can be either pipe-delimited (option1|option2|option3) or split into binary columns per option (q5_writing, q5_research, etc.) — the second format is much easier for cohort analysis later.

Analytics to instrument: - Drop-off rate per question (catches friction points) - Time-to-complete distribution - Skip-logic trigger rate (how many "Rarely / not yet" responses) - Mobile vs. desktop completion rate