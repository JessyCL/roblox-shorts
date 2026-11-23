# Story & Audio Formula: Roblox story Shorts

Sources: measurements of 10 sample Shorts (S1-S10): word timings, loudness and audio features.

Machine-readable targets and the script schema are in `analysis/story_audio.json`.

## 0. Data basis

| id | dur (s) | words¹ | wpm¹ | pauses ≥0.6 s | numbers² | hero at | inciting at | music turn³ | realization/twist | LUFS / LRA / TP | title |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **S1** | 118.1 | 523 | 266 | 6 | 14 | 34.0 (29%) | 51.0 (43%) | 51.4 (44%) | 85.8 (73%) | −13.1 / 1.9 / +0.1 | A |
| **S2** | 160.4 | 707 | 265 | 7 | 11 | 35.9 (22%) | 71.4 (45%) | 71.0 (44%) | 112.8 (70%) | −10.0 / 1.6 / +0.1 | B |
| S3-N | 144.5 | 591 | 245 | 6 | 5 | 33.5 (23%) | 42.8 (30%) | 44.5 (31%) | 109.4 (76%)⁴ | −13.9 / 3.5 / −0.3 | A |
| S4 | 147.6 | 547 | 222 | 7 | 2 | 27.5 (19%) | 62.2 (42%) | none (swells only) | 97.1 (66%) | −17.2 / 2.8 / −2.0 | A |
| S5 | 111.2 | 461 | 249 | 2 | 2 | 16.2 (15%) | 51.9 (47%)⁵ | 48.7 (44%) | 81.8 (74%) | −17.2 / 2.7 / −2.9 | A |
| S6 | 123.5 | 546 | 265 | 3 | 2 | 24.2 (20%) | 41.1 (33%) | 41.4 (34%) | 86.7 (70%) | −13.1 / 3.3 / 0.0 | A |
| S7 | 158.3 | 669 | 254 | 9 | 11 | 34.8 (22%) | 49.3 (31%) | 140.1 (89%) | 115.1 (73%) | −12.7 / 1.8 / +0.1 | B |
| S8 | 109.8 | 464 | 254 | 5 | 11 | 26.6 (24%) | 49.5 (45%) | 49.9 (46%) | 83.1 (76%) | −16.8 / 2.3 / −2.9 | A |
| **S9** | 117.8 | 540 | **275** | **1** | 2 | 20.2 (17%) | 51.6 (44%) | **~30 (25%)**, again 55 | 86.4 (73%) | −12.8 / 1.9 / −0.1 | **outlier** |
| S10 | 151.4 | 645 | 256 | 5 | 9 | 50.9 (34%) | 61.8 (41%) | 62.1 (41%) | 106.0 (70%) | −12.9 / 1.8 / +0.2 | B |

Notes:
1. Words are tokens in the original English ASR track. Digits count as one token ("60,000" = 1), which is also how our script words are counted. The reports' cleaned counts run 3–8% higher (S1 560 words / 283 wpm).
2. "Numbers" = tokens containing a digit. Spelled-out numbers are not counted.
3. My detector: the largest sustained step in the 20th-percentile 30–120 Hz energy. It reproduces every report-timed entry within 0.7 s (S1 51.0, S2 71.3, S5 49.1, S7 139.4, S8 49.75, S10 61.7). New finds: S6 +18 dB at 41.4 s and S3 +17 dB at 44.5 s, both exactly on their inciting lines.
4. S3 is an action plot. Its reversal comes at 59.8 s (41%) and its "insight" line ("All that power was going through one thin fishing line") at 76%.
5. In S5 the antagonist starts at 33.9 s ("Then the mayor started his statue"). The crisis and music turn come at 47% and 44%.

---

## 1. Story formula

### 1.1 Premise patterns
Each premise is a one-sentence rule for how a whole society works. It implies four things: a caste or hierarchy, a rule nobody breaks, someone who doesn't fit, and a hidden truth about where the system came from.

| Pattern | Examples |
|---|---|
| **Attribute at birth**: "In this world, everyone is born with/holding a ___" | S1 (number ticket), S8 (warning label), S2 ("nobody is born. You're found… where you're found is what you are") |
| **Universal behaviour or constraint**: "everyone is ___ing / lives on ___" | S6 (running), S5 (giant seesaw), S4 (towns on giant animals) |
| **Sorting ritual at an age**: "on your Nth birthday you ___" | S7 (16th, graveyard, one of four monsters), S9 (7th, the pet you deserve; the weak one) |
| **Economy or geography**: "every X has a Y / makes one thing" | S10 (each town makes one thing; "Ours makes the clouds"), S3 (every fish has a power) |

How to choose a premise:
- The rule must put a strange, readable picture on screen in the first second: a baby holding "No. 59,998", a screaming runner, a town on a seesaw.
- It must create a visible underclass that the hero belongs to.
- It must hide one fact about the system that the twist can reveal: who calls the numbers, what is in the dust, what Hollow makes.
- Prefer systems over individual rewards. "You get the pet you deserve" (S9) is the only premise built on judging one person, and it is the flop.

### 1.2 Beat map (measured across 10 videos)

| # | Beat | Start (% runtime): median [range] | Marker phrase / content | Evidence |
|---|---|---|---|---|
| 1 | **Hook** | 0% (premise complete by 1.2–5.0 s) | "In this world, ___, and ___." | 9/10 start at 0.0 s with "In this world" (S5 says "In this town"). The first sentence ends at 1.2–6.2 s. |
| 2 | **World rules** | 2–6% | "You see, ___" then a montage of three examples, the third a punchline | "You see" in 10/10, at 2.3–6.5 s. S1: hat, horse, house, then "a nap". S3: diamond, rain, healing. |
| 3 | **Open question / forbidden thing** | 7–26% | "Nobody knows / Nobody goes / Nobody's ever seen it" | S1 8.9 s, S6 21.8, S2 19–36, S10 30–51, S3 22–28. "Nobody" appears 5–9 times in S1, S2, S6 and S10, 1–3 times elsewhere. |
| 4 | **Protagonist + wound** | **22% [15–34]** | "My name is ___, and there's one thing you should know about me." A stigma, a nickname insult and one humiliating detail | "Blank" (S1), "Balloon… the record's 40" (S2), "zombie" (S7), "Still a rock?" (S9). |
| 5 | **Mentor plant** (optional) | 24–40% | Grandparent states a rule of thumb that later solves the climax | S5 26.6 ("The further out you sit, the heavier you get"), S8 45.1 ("Emergency equipment waits its whole life"). S4 plants its horn just in time (104 s, paid off at 113). |
| 6 | **Inciting incident** | **42% [30–47]**; top two 43% and 45% | "Then one morning / Until one day / Then this ___ / Then came ___" plus a 0.6–0.9 s pause before it | 8/10 use a "Then/Until one…" opener. **The music turn lands here** (see §4). |
| 7 | **Hero breaks the rule / rising** | 40–60% | The rule set up in beat 2 is broken on purpose | S6 "Don't stop" → 49.2 "And I stopped." S1 "In line, you don't sit" → Grandpa sits, Tam walks up to the desk. S2 "nobody goes up" → Dex steps off the roof. |
| 8 | **Low point / false climax** | **54% [44–63]** | The expected solution fails or the threat peaks | S8 59.3 (the envelope stays shut in front of the whole fair), S5 61.7 ("It slowed the slide. It didn't stop it."), S6 61.6 (shape in the dust), S1 59.9 (Mrs. Pell steps in front of Grandpa). |
| 9 | **Twist / realization** | **73% [70–76]** for system plots | "That's when I realized ___." The hero's stigma turns out to be the key to the system, often with a one-line origin story carrying a number | S1 85.8 ("my ticket wasn't broken. It was a clerk's ticket"; "300 years ago…"), S7 115 (skeletons until 1626), S10 106, S9 86.4, S8 83.1 ("that's when Oscar felt it"). Action plots twist earlier: S3 41%, S4 66%. |
| 10 | **Climax: hero acts** | 74–90% | Short sentences, countdowns, lists of three | S1 "I sat in the chair. I rang the bell." then "6, 7, 8". S5 "past 11, past nine, past five". |
| 11 | **Rival comeuppance** (if there is a rival) | 82–90% | The physical, visible loss of exactly what the rival hoarded | S5 90.7 (golden statue dropped piece by piece), S3 118 ("shrank into a wet, angry old man"), S9 107 (tiger walks home, tail between its legs). |
| 12 | **Payoff via callbacks** | **88% [82–94]** | A planted line or object returns with a new meaning | S1 "I'd like a chair." / "I gave him mine." S2 "41 seats". S3 "That's the big one, kiddo." |
| 13 | **Ending button** | last 3–8 s (median ~5 s) | Present-tense "now" coda with a number, then a 2–5 word line that answers or reverses the opening rule. Audio stops 0.28–1.0 s after the last word starts. No CTA in 10/10. | "They've got chairs." "Grandpa only had one." "He's never once been late." "I didn't say anything." |

### 1.3 POV and tense
- **First person, kid narrator, in 7/10 videos, including both top videos** (S1's Tam and S2's Dex, 12). Third-person storyteller in S8, S5 and S3.
- **Tense pattern:** world rules in present tense ("you're born in line"). The story in past tense from the hero section onward. A present-tense "now" coda in 7/10 ("We're up to 9,000 now", "I do robins now", "The power eater lives in a bucket by Ryan's bed now").
- Dialogue is quoted inside the narration, in the narrator's own voice. Only S4 (an older upload) voice-acts a shout and a whisper. Exclamation marks are rare: 0–4 per video.
- Protagonist age is about 12. A grandparent is the emotional stake in 5/10 (S1, S6, S8, S5, S4) and a parent in 2/10 (S3, S10).

### 1.4 Recurring devices (counted)
- **Specific numbers.** S1 14 numbers (59,998, 300 years, 94, 60,000, 12, 81, 9,000); S2 11 (1900, 40, 100 ft, 1851, 41). The two most-viewed videos are among the four most number-dense. S9 has 2.
- **Lists of three, then a turn:** in 10/10 videos. Used for rules (hat, horse, house), escalation (S6's "keep up, keep up, keep up"), and senses (S10's "No birds, no wind in the leaves, no crickets").
- **Run-on "and… and…" sentences** for emotional peaks. S1: "So I wrote it in the book, and the baker ran one over, and she sat down on the bricks and cried."
- **Callbacks and plants:** 2–4 per video. S1: nap → the clerk's nap; "you don't sit" → chairs. S7: "never once been in a hurry" → "never once been late". S8: 40 kids → 40 heroes → "Grandpa only had one". S3: show-and-tell gag at 18 s → the punchline at 143 s.
- **Rival comeuppance:** in 4/10 (S5, S3, S9, S4). The top two have no villain; the antagonist is the system or plain indifference.
- **Loop or answer ending:**
  - seamless sentence loop: S5 ("perfectly balanced. / In this town…")
  - loose loops: S2, S6, S3
  - last image answers the last line: S1 (the seated queue)
- **Literal illustration:** about 95% of shots show exactly the noun just spoken.

### 1.6 Do / Don't

**Do:**
- Open with "In this world, [rule], and [consequence]." Finish it in 4.5 s or less, over a moving shot of the strangest object in the world.
- Line 2 starts with "You see,".
- Give three examples, with the third as the punchline. Every example must be filmable as one literal shot.
- Plant an open question with "Nobody…" before 26%.
- Give the hero a stigma tied to the premise, a nickname, and one concrete humiliation. Bring the hero in between 15% and 35%.
- Put the inciting line at 38–47%, opening with "Then one…" or "Until one…", with a 0.6–0.8 s pause before it and the music turn on its first word.
- Have the hero break the beat-2 rule on purpose.
- Include a low point at about 54%.
- Put "That's when I realized…" at 66–78%: the stigma is the key, plus a one-line origin with a number.
- Make the climax the hero's own action, in short sentences, with a countdown or a list of three.
- Use at least 3 plants, each paid off. Use at least 8 specific numbers (ages, years, counts, distances).
- End with a present-tense coda and a last line of 8 words or fewer that answers or reverses line 1, then a hard stop.

**Don't:**
- Use second-person or emoji titles.
- Write a premise about judging one person.
- Let the hero be rescued.
- Bring in the bass layer before the inciting incident.
- Use generic intensifiers ("enormous" ×16).
- Write 30-word sentences outside the one emotional run-on.
- Include a CTA, outro, music tail or end card.
- Use meme sounds.
- Cut or retime for the music beat (none of the 10 do).

### 1.7 Length
- Observed: 109.8–160.4 s and 461–707 words. The top two are 118 s and 160 s, so length alone does not decide performance in that range.
- **Recommended: 120–150 s (target about 135 s) and 520–650 words** at 262 wpm.
- Hard limits: 105–165 s and 450–720 words.
- Sentences: aim for a median of 6–9 words, with 25–36% of sentences at 4 words or fewer (S1 36%, S6 35%), and no line over 32 words.

### 1.8 Title formula
- **Pattern A** (6/10): `Every(one) [Has/Is/Lives on] (a/the) [CAPS noun or adjective]...` Examples: "Everyone Has a [NOUN]...", "Everyone is [VERB]ING...", "Every [THING] Has a [NOUN]...", "Everyone Lives on a GIANT [THING]...".
- **Pattern B** (3/10): a cryptic 2–3 word noun phrase plus an ellipsis: "[Cryptic Phrase]...", "[Cryptic Phrase]...", "[Cryptic Phrase]...".
- Always end with ` #shorts #roblox #viral`. Put 1–2 words in caps, and make them the premise noun. Keep it under 8 words before the ellipsis. Never spoil the twist. No emoji, no question.
- Descriptions and tags were empty in our scrape. We must still add the Incompetech CC-BY credit to the description.

---

## 2. Script template and worked example

### 2.1 Template (about 600 words at 262 wpm, about 135 s)

| Beat | Starts at | Words | Fill-in line pattern |
|---|---|---|---|
| hook | 0% | 16–20 | "In this world, [everyone/every X] [rule], and [stakes]." Pause 500–700 ms. |
| world | 3% | 90–110 | "You see, [mechanism]." then "[A] get [x]. [B] get [y]. And [C] [absurd consequence]." then "[Name] is [age], and [lifelong absurdity]." then "There are [big number] people in this town, and every one of them [obeys the rule]." |
| mystery / plant | 12–26% | 30–60 | "Nobody knows [the hidden fact]." or "Nobody goes [place]. The [authority] sent [n] people in [year]. They came back and wouldn't say why." Plus a planted object or person with a number. |
| hero / wound / rival | 22–40% | 60–80 | "My name is [Name], and there's one thing you should know about me. [Stigma]." / "Kids call me [Nickname]." / "[Rival] [daily taunt in quotes]." |
| mentor plant | 32–42% | 15–35 | "[Grandpa] has one rule: '[line that solves the climax]'." Pause 600–800 ms. |
| **inciting** (music turn) | **42%** | 25–35 | "Then one [morning/day/night], [loved one or system] [breaks]." |
| rising / low point | 46–62% | 100–130 | The hero breaks the rule ("And I [verb]."), then the low point: "[Attempt]. [It failed.]" Pause 600–900 ms after a shout or quote. |
| **twist** | **70–74%** | 35–50 | "That's when I realized [stigma] wasn't [defect]. It was [key]." plus "[N] years ago, [origin]." Pause up to 1.2 s before it if a reveal card or number precedes it. |
| climax | 74–88% | 70–90 | The hero acts, in short sentences: "I [verb]. I [verb]. I [verb]." Countdown "[n], [n], [n]." Rival comeuppance. |
| payoff | 88–95% | 30–40 | Callback to the plant and the loved one, closing on a 3–5 word emotional line. |
| ending | 95–100% | 10–20 | "[Present-tense coda with a number] now." then a 2–5 word last line. Hard stop. |

### 2.2 Worked example (new premise): "Everyone Gets ONE Hour..."
Title: `Everyone Gets ONE Hour... #shorts #roblox #viral` (Pattern B alternative: "Low Day...").
Narrator: Fen, 12, first person. Voice: am_fenrir. 35 lines, 535 words, **129.6 s at 262 wpm** (timed with the pauses listed), 23 numbers.

Plants:
- **P1:** the piano, 40 feet (L09–10 → L28, L33)
- **P2:** "never early, never late" (L16 → L25, L31)
- **P3:** "never been out" / "Dry" (L12, L14 → L27, L35)
- **P4:** nobody stays past the third bell (L11 → L23, L25)
- **P5:** the Abbotts' silver and Cole the rival (L04, L15 → L32, L34)

| Line | Beat (start) | Text (draft) | Shot hints / audio |
|---|---|---|---|
| L01 | hook 0.0 s | In this world, the sea goes out one hour a year, and whatever you carry back is yours. *(pause 550)* | Frame-0 zoom-blur: kid sprinting over wet seabed hugging a gold anchor → on "sea", aerial of drained bay, ships on their sides, hundreds running, sea a wall on the horizon → "whatever" CU of wheelbarrow of coins. **SFX** whoosh at w0, −12 dB. **Music M1** bed starts. |
| L02 | world 4.7 s (4%) | You see, at dawn on Low Day, the harbor bell rings once, and the water walks away, past the lighthouse, past the horizon. | Bell tower at dawn. **SFX** single bell ding on "once", −12 dB. Water receding; lighthouse. |
| L03–L06 | world 10–17 s | And everybody runs. / The Abbotts found a chest of silver in 1952, and they've owned the harbor ever since. / The baker found a brick oven. / The school found a whole school bus. Nobody can explain the bus. | One shot per find, 0.6–1.5 s each. The bus punchline gets the longest hold (about 2 s). |
| L07–L08 | world 19–22 s | At 50 minutes, the bell rings twice. That means turn around. / At 60, it rings three times, and the sea comes back all at once. | Hourglass insert; crowd turning; wave wall advancing. |
| L09–L10 | plant 25 s (19%) | Old Mr. Dunn found a grand piano in 1975. You can't drag a piano a mile in an hour, so every year he drags it a little closer. / He's 88. He's got 40 feet to go. | Old man straining on a rope tied to a piano in the sand; carved "40 FT" marker. |
| L11 | mystery 33.7 s (26%) | Nobody knows where the sea goes. Nobody's ever stayed out past the third bell to find out. | Horizon wall at dusk; empty seabed. |
| L12–L14 | hero 37.8 s (29%) | My name is Fen, and there's one thing you should know about me. I've never been out. / My grandpa rings the bell. He's rung it for 70 years. I'm his apprentice, so while every kid in town fills buckets, I sit in the tower holding the hourglass. / Kids call me Dry. | Tower window POV of kids running out; Fen's face swaps to sad on "Dry". |
| L15 | rival 49.9 s (39%) | Every year, Cole Abbott holds a seashell up to the tower window and yells, "Want it, Dry?" | Low angle up at the tower; smug rival with a shell. |
| L16 | plant | Grandpa has one rule. The bell is never early, and the bell is never late. *(pause 700)* | Grandpa CU, finger raised. |
| L17 | **inciting 58.1 s (45%)** | **Then** this Low Day, at minute 41, Grandpa sat down on the tower stairs and didn't get up. | **Music M2 turn on "Then"** (bass drone added, 500 ms fade-in). Hourglass half run; grandpa slides down the wall; face swaps to worried. |
| L18 | inciting | He pushed the hourglass into my hands and said, "Fen, you ring it." | Insert: hourglass into hands. |
| L19–L21 | rising 65.5 s (51%) | At 50 minutes, I rang it twice, and the whole town turned around and ran. Everyone except two. / Mr. Dunn, leaning on his piano, 40 feet from the sand. / And Cole Abbott, way past the lighthouse, farther than anybody's ever gotten, digging at a wreck. | **SFX** bell ×2, −12 dB. Two isolated figures on a vast seabed. |
| L22 | rising (hero_action) | The sand ran out. 60 minutes. I grabbed the rope, and I didn't pull it. | ECU of the last sand grain; hand on the rope, frozen. |
| L23 | low point 79.8 s (62%) | 61. 62. The sea sat on the horizon like a wall, and it didn't come. *(pause 700)* | Long hold (about 3 s) on the motionless wave wall. |
| L24–L26 | **twist 84.0 s (65%)**; realization at about 67% | Grandpa laughed on the stairs. "Took me until I was 16," he said. / That's when I realized the bell isn't a warning. The sea doesn't come back at 60 minutes. It comes back when it's called. / And for 70 years, the only person calling it was my grandpa. | Grandpa's grin; sepia flashback of young grandpa at the rope; Fen's realization face. |
| L27–L28 | climax 95.4 s (74%) | So I went out. First time in my life. The seafloor was cold, and it smelled like pennies. / I put my shoulder on Mr. Dunn's piano, and we pushed. 30 feet. 20. 10. | Feet on wet sand (first step); 3 fast countdown cuts at about 0.4 s each. |
| L29–L31 | climax | Cole was waving from the wreck. He'd found a chest of gold as big as a bathtub, and he couldn't lift it. / "Make it wait!" he yelled. *(pause 650)* / I told him what Grandpa told me. The bell is never late. Then I climbed the tower, all 112 steps. | Wreck and gold chest; climbing montage. |
| L32 | comeuppance 115.0 s (89%) | Cole dropped the chest at step 90. I rang it three times, and the sea came home and swallowed the gold. | **SFX** bell ×3 at −10 dB, then a water rush (1.5 s, −14 dB) over the wave swallowing the chest. |
| L33–L34 | payoff 119.9 s (93%) | Mr. Dunn's piano made it. 49 years, 40 feet. He played one note, and it was terrible, and he cried. / Cole came back with sand in his shoes. | Piano on dry sand, old man crying with a smile; Cole emptying sand from a shoe. |
| L35 | ending 126.6 s (98%) | Kids still call me Dry. Fine. I'm the one the sea waits for. | Fen at the rope; the sea on the horizon. **Music stops** 200 ms after "for." |

**Checklist:**
- Hook audio ends at about 4.1 s.
- "You see" at 4%.
- Hero at 29%; inciting at 45%, with the turn on it.
- Low point at 62%; twist at 65–67%; hero action at 74%; payoff at 93%; button at 98%.
- The last line reverses the "one hour" rule.
- The hero decides twice: "I didn't pull it" and "So I went out".

---

## 3. Narration and voice

**What works:**
- **Pace:** 222–275 wpm (words counted the same way ours are); both top videos 265–266. The reports' cleaned counts give 224–283.
- **Speed:** the median gap between word starts is 0.20 s in all the November videos (0.24–0.28 s in the slower October ones).
- **Pauses:** sentence gaps are 0.1–0.25 s. Only 1–9 pauses per video reach 0.6 s (top two: 6–7), and the longest is 1.6 s (S10, after the "1,788" quota card). S4 has no gap over 250 ms at all.
- **Loudness:** very even (LRA 1.6–3.5), no breaths. Silence is never used for drama; the narration *says* "it got very quiet" while the bed keeps running (S6, S9).
- **AI TTS likelihood: high.** All 10 reports call it likely AI TTS (ElevenLabs-style), with medium to medium-high confidence: constant rate, no breaths, flawless ASR. Pitch medians are 165–208 Hz (most about 180–195), which reads as a youthful or sped-up voice. One narrator voices all dialogue, and only S4 acts its shouts and whispers.

**Pause rules for our scripts** (set with `pause_after_ms`; the TTS stage trims each line's own trailing silence, then inserts this):

| Where | ms |
|---|---|
| default between lines | 150 (120–200) |
| after the hook sentence (before "You see") | 500–700 |
| before the inciting "Then…" line | 600–800 |
| after a shout or quoted punch line | 600–900 |
| after a big reveal (number, card, "it didn't come") | 800–1200 (max 1600) |
| total pauses ≥ 500 ms | 3–8 per video |

**Voice choice (Kokoro, from research/audio-tools.md §3):**
- **House voice: `am_fenrir`.** It keeps the most pitch movement when sped up (5.1 semitone SD at 1.35×). Start at **speed 1.25** for about 262 wpm (it measured 278 wpm at 1.35).
- **Alternates:** `am_michael` at about 1.37 (flattens to 3.0 semitones). For girl narrators or a warmer third-person storyteller, `af_heart` at about 1.37 (measured 237 wpm at 1.3 and 308 at 1.5; its 197 Hz median is closest to the target pitch).
- **Worth an A/B test:** the blend `am_fenrir+af_heart` at about 1.3, a younger, ambiguous timbre close to the samples' 180–190 Hz "adult female or youthful male".
- Lock **one** voice for channel identity; match its gender to a first-person narrator.
- Don't pitch-shift. Don't time-stretch after synthesis. Keep speed within 1.2–1.45. If the duration is still off, cut world-building lines (never the hook, plants or button).
- **Calibrate:** render, measure wpm from the native timestamps, set `speed *= 262 / measured`, re-render once. Pace isn't linear in speed.
- **Chatterbox** (with `exaggeration` around 0.9) only for at most 2 lines (a shout or the twist), cloned from the house voice, and only if A/B shows the timbre matches. Default: off.

**Delivery through writing** (Kokoro has no emphasis control):
- Put the key word last in a short sentence ("It was a clerk's ticket.").
- Isolate it with a period ("A rock.") or repeat it ("nobody, nobody").
- `?` and `!` change prosody; use them sparingly (0–4 per video).
- Write numbers as digits so captions match; add `say` overrides when misread ("1952" → "nineteen fifty-two"). Spoken numbers take 2–4 times as long as a normal word; most "pauses" in the ASR around 300, 60,000 or 1851 are actually that.

**How narration drives shot timing** (this is the contract with production.js):
- Cuts land on word starts: 89–98% of sample cuts fall within 0.15 s of a word onset (median 33 ms). 71–90% fall on phrase boundaries; the rest fall on nouns inside list runs.
- **Rule: cut at the `start` of the first token of each clause, minus 1 frame (33 ms).** Every new noun gets a new shot.
- Shot length: mean 1.0–1.75 s (S3 1.01, S1 1.69). List items get 0.3–0.6 s each (S5's "Pianos, / cars, / the church bell"; S1's "6, 7, 8"). Pace tightens toward the payoff (S7 medians go 0.92 → 0.76 s).
- Long holds of 2.5–5 s are reserved for: the opening aerial, the emotional low (S7, Moss on the tracks, 3.1 s), the reveal card or number (S10 4.05 s), and the final image.
- Face swaps, punch-ins and SFX land on `emphasis` tokens.
- Captions switch on each token's `start`: 1 word, at most 3 short words.
- The last shot holds through the last word; the video ends 0.3–0.5 s after it.

---

## 4. Music

**What works:**
- **Act 1:** a quiet, sustained, whimsical storybook bed. Pads, plucks or music box in 300–1000 Hz, almost no sub-bass, no percussion (S1, S2, S8, S5, S10).
- **The turn:** a bass/drone layer enters at the inciting line and stays to the end. Its 30–120 Hz floor rises +13 to +27 dB (measured), with a fade-in of about 0.7 s (S8).
  - On the exact word: S1 (51.0 "Then one morning, Grandpa sat down"), S2 (71.3 "Then this Finding Day"), S8 (49.75 "Then came the fall fair"), S10 (61.7, after a 0.15 s dropout, a new darker track), S6 (41.4 "Then one morning he fell"), S3 (44.5, tiny black fish).
  - S5 turns at 49.1 on the crisis lead-in ("Pianos, cars…").
  - S7 holds its turn back until the payoff (139.4 s, 89%).
  - S4 has no sustained turn, only swells.
  - S9 (the flop) turns too early, at about 30 s.
- **Level under the voice** (reports): S1 about 18 dB; S2 about 30 dB before the turn and 18–20 after; S10 20–25. My between-word floor measurement rises 1.6–6.7 dB after the turn in every video.
- **Optional lifts:** a swell at the reveal (S10 84–105, music floor −47 → −40 dB), a bright layer on the false climax (S8 60–65), a warm chime epilogue (S5 108–111).
- **The end:** music stops with the last word, with no outro or stinger in 10/10.
- Tempo estimates (111–143 BPM) are driven by the speech and are meaningless. No video cuts on the beat.

**Our recipe:**
1. **M1 bed** from 0.0 s, **22 ± 3 dB under the voice** (short-term LUFS of the music stem against the voice stem). Mood: whimsical/curious. No drums, no lead melody fighting the voice.
2. **M2 turn** on token 0 of the inciting line (±0.2 s), fade-in 300–700 ms. Either **add** a bass/drone layer over M1 (the S1/S2 method), or **replace** M1 after a 150 ms dropout (S10). After the turn the bed sits **16 ± 3 dB under the voice**.
   - License-free fallback if no track has the right low end: synthesize a sustained 40–80 Hz drone on the bed's root, low-passed at 150 Hz.
3. **Optional lift** of +2–3 dB at the twist or payoff, at most once.
4. **Stop** at the last word's end + up to 300 ms with a 30–80 ms fade. No tail.

**Mood mapping:**

| Story section | Incompetech `feel` tags to search |
|---|---|
| gag-heavy world (S8-like) | Humorous or Bright, no percussion |
| wonder / mystery world | Mysterious, Calming |
| act 2 threat or grief (default) | Dark, Somber, Suspenseful |
| action plot (S3-like) | Suspenseful into Epic-ish, then release at about 80% |
| warm epilogue | Uplifting or Calming, as a lift only |

Filter by the `instruments` field for no drums. BPM doesn't matter.

**Sources and licensing** (from research/audio-tools.md):
- **Incompetech** (Kevin MacLeod, CC-BY 4.0): about 1,443 tracks, scriptable through `pieces.json`. Credit line in the description is mandatory: `"Title" Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0`. Occasional false Content ID claims; dispute them with the license.
- Kenney Music Jingles (CC0) for stingers, which we mostly won't need.
- YouTube Audio Library: safest against Content ID, but manual.
- **Avoid:** FreePD (closed; the archive.org mirror needs vetting), MusicGen (non-commercial weights). Stable Audio 3 Small is a later option (gated; free under $1M revenue).

---

## 5. SFX

**What sample Shorts use (sparse):**
- **None detectable in the top video:** S1 (even the bell slaps at 95.97 and 108.13 are silent), S10, and essentially S8. In S8 the spoken "Boom!" carries the beat with no sound under it.
- **Diegetic, plot-critical sounds:**
  - S2: baby crying under the narration (78.1–80.5, 84.4–88.5, 107.3–109.7) and a chime on the cut to the second town (144.6)
  - S4: the horn blast (114.9–116.1, high confidence) and running feet
  - S6: probable whistle blasts at the glow moments
  - S7: stamp thuds on the map X's (24.0–25.0) and door slams on the rejection montage (70.6–71.6)
- **Frame-0 whoosh or impact** on the zoom-blur intro: S6, S5, S9.
- **One soft swish on most cuts:** only S5 (65% of cuts, subtle).
- **Big-reveal booms and risers:** S9 (sub boom at 86.05 when the mountain stands), S3 (riser at 97.2, crackles, splashes; 17 cues in all).
- **Density does not track performance.** S9 has 10 cues and the flop's numbers; S3 has 17 cues and less reach than the top videos.

**Our conservative default: 3–6 cues, never more than 10:**
1. Whoosh at 0.0 with the zoom-blur intro (−12 dB under voice peak). Always.
2. 1–3 **diegetic** cues for sounds the script names that matter to the plot (bell, horn, cry, door, stamp), on the exact token. Repeated hits are synced to montage cuts, S7-style.
3. At most 1 impact or sub boom on the single biggest physical beat (climax or reveal), −10 dB.
4. Ambient beds (crying, rain, crowd) only under the lines that mention them, 15–20 dB under the voice.

**Never:**
- A transient on top of a stressed syllable at full level.
- Whooshes on every cut (if used, quieter than −24 dB).
- A riser that telegraphs the twist.
- Meme or Roblox sounds ("oof", vine boom).
- Silence drops.

**Sources:** procedural `research/audio/scripts/sfx_synth.py` (whoosh, swoosh, riser, impact_boom, sub_drop, hit, pop, ui_click, ding, heartbeat, clock_tick, footsteps, glitch); Kenney CC0 packs for real footsteps, impacts and coins; Freesound filtered to CC0.

---

## 6. Mixing and mastering

**What the samples show:**
- **Loudness:** integrated −10.0 to −17.2 LUFS (median about −13). S5 and S4 sit at −17.2 and still reached 2.2–2.4M, so loudness is not a performance lever.
- **LRA:** 1.6–3.5 LU.
- **True peak:** −2.9 to +0.2 dBTP. The +0.1/+0.2 in S1, S2, S7 and S10 are inter-sample overs (flaws, not style).
- **Stereo:** effectively mono (S2 side/mid −27.7 dB).
- **Spectrum:** low-mid heavy (250–1000 Hz dominant).

**Targets:**

| Parameter | Target | Why |
|---|---|---|
| Integrated | **−14 LUFS ±0.5** (allowed: −13) | YouTube is widely measured to turn playback down to about −14 LUFS and not to boost quieter videos. Hotter masters only buy limiter distortion; quieter ones (−17) play about 3 dB softer than their feed neighbours. |
| True peak | **≤ −1.0 dBTP** | Headroom for the AAC/Opus re-encode; avoids the samples' overs. |
| LRA | 2–4 LU | Matches the 1.6–3.5 range: a dense, voice-forward sound. |
| Voice bus | −16 LUFS before master | research mix.py |
| Music | 22 dB under voice before the turn, 16 dB after (±3) | §4 |
| SFX | transients 8–14 dB under voice peak; beds 15–20 dB under | §5 |
| Stereo | voice mono, centred; music narrowed (side about −12 dB); master side/mid ≤ −20 dB | Samples are mono-ish |
| Format | 48 kHz; AAC 192k or more | |

**Voice chain** (`research/audio/scripts/mix.py`, proven: test master −13.8 LUFS, −1.4 dBTP, LRA 2.6):
1. `aresample=48000` (Kokoro outputs 24 kHz)
2. `highpass=f=80`
3. `equalizer=f=250:t=q:w=1.2:g=-2` (mud)
4. `equalizer=f=3500:t=q:w=1:g=3` (presence)
5. `deesser=i=0.4`
6. `acompressor=threshold=-21dB:ratio=3:attack=5:release=80:knee=4:makeup=3dB`
7. `pan` to centred stereo

**Music chain:**
- `highpass=f=35`, then narrow the stereo image.
- Set gain per section with **volume automation** (M1 / M2 levels), not by relying on ducking.
- Keep the sidechain gentle (3–4 dB of gain reduction, release about 300 ms). Speech is continuous, so heavy ducking just pumps.

**Master:**
- Measure with 2-pass `loudnorm`.
- Oversampled `alimiter` (4×, `level=disabled`).
- `loudnorm=I=-14:TP=-1:...:linear=true`.
- Verify with `ebur128=peak=true` on both the WAV and the AAC.
- Assert the music stops 300 ms or less after the last word.

---

## 7. Script file schema (`productions/<slug>/script.json`)

The formal JSON Schema (draft 2020-12) is in `analysis/story_audio.json` → `script_schema`. `engine/audio/tts.py` consumes it and writes `voice/*.wav` and `timing.json`; production.js reads `timing.words[i].start/end`.

**Token rule:** `tokens = text.split()` on whitespace, punctuation stays attached, digits count as 1, indexes are 0-based per line. All `w` anchors refer to these. The TTS stage maps Kokoro MTokens back to script tokens with a difflib alignment, as `align_whisper.py` does. A token spoken as several words (numbers, `say` overrides) spans from the first of them to the last.

Example:
```json
{
  "version": 1,
  "slug": "everyone-gets-one-hour",
  "title": "Everyone Gets ONE Hour... #shorts #roblox #viral",
  "premise": "In this world, the sea goes out one hour a year, and whatever you carry back is yours.",
  "pov": "first",
  "narrator": {"name": "Fen", "age": 12, "gender": "m"},
  "target_duration_s": 135,
  "voice": {"engine": "kokoro", "voice": "am_fenrir", "speed": 1.25, "target_wpm": 262, "line_gap_ms": 150},
  "plants": [
    {"id": "P1", "what": "Mr. Dunn's piano, 40 feet", "set_up": "L10", "paid_off": "L33"},
    {"id": "P2", "what": "bell never early, never late", "set_up": "L16", "paid_off": "L25"},
    {"id": "P3", "what": "Fen has never been out ('Dry')", "set_up": "L12", "paid_off": "L35"}
  ],
  "music": [
    {"id": "M1", "role": "bed", "at": {"line": "L01", "w": 0}, "mood": "whimsical-curious",
     "feel": ["Mysterious", "Calming"], "must_have": "no drums", "level_db_under_voice": 22},
    {"id": "M2", "role": "turn", "at": {"line": "L17", "w": 0, "word": "Then"}, "mode": "add",
     "mood": "dark-emotional", "feel": ["Dark", "Somber"], "must_have": "sustained bass/drone 40-120 Hz",
     "level_db_under_voice": 16, "fade_in_ms": 500},
    {"id": "END", "role": "stop", "at": "last_word_end", "tail_ms": 200}
  ],
  "lines": [
    {"id": "L01", "beat": "hook",
     "text": "In this world, the sea goes out one hour a year, and whatever you carry back is yours.",
     "emphasis": [8, 17], "pause_after_ms": 550,
     "shots": [
       {"w": 0, "hint": "zoom-blur in: kid sprinting on wet seabed hugging a gold anchor", "framing": "MS", "move": "lead", "fx": ["zoom_blur_in"]},
       {"w": 4, "hint": "aerial: drained bay, hundreds running, sea a wall on the horizon", "framing": "aerial", "move": "crane_up"},
       {"w": 12, "hint": "CU wheelbarrow of coins hauled up the beach", "framing": "CU"}],
     "sfx": [{"id": "whoosh", "w": 0, "gain_db": -12}]},
    {"id": "L04", "beat": "world",
     "text": "The Abbotts found a chest of silver in 1952, and they've owned the harbor ever since.",
     "say": {"1952,": "nineteen fifty-two,"},
     "shots": [{"w": 0, "hint": "family hauling a silver chest"}, {"w": 10, "hint": "ABBOTT sign over the harbor office"}]},
    {"id": "L17", "beat": "inciting",
     "text": "Then this Low Day, at minute 41, Grandpa sat down on the tower stairs and didn't get up.",
     "shots": [{"w": 0, "hint": "hourglass half-run, low angle"}, {"w": 7, "hint": "grandpa slides down the wall; face -> worried"}]},
    {"id": "L22", "beat": "rising", "hero_action": true,
     "text": "The sand ran out. 60 minutes. I grabbed the rope, and I didn't pull it.",
     "emphasis": [12], "shots": [{"w": 0, "hint": "ECU last grain of sand"}, {"w": 6, "hint": "hand on rope, frozen", "framing": "insert"}]},
    {"id": "L30", "beat": "climax", "dialogue": true, "delivery": "shout",
     "text": "\"Make it wait!\" he yelled.", "pause_after_ms": 650}
  ]
}
```

**Line fields:**

| Field | Type | Meaning |
|---|---|---|
| `id` | `L01`… | Stable id; plants and music refer to it. |
| `beat` | enum | hook, world, mystery, hero, wound, rival, plant, inciting, rising, low_point, false_climax, twist, climax, comeuppance, payoff, ending |
| `text` | string | Exactly what the captions show (digits for numbers). |
| `say` | {token: spoken} | Pronunciation override; the caption keeps the token. |
| `emphasis` | [w] | Beat-carrying tokens. Drive punch-ins, face swaps and SFX. Not caption styling (the samples use none) and not TTS stress. |
| `pause_after_ms` | int | Default 150, maximum 1600. Rules in §3. |
| `speed` | number | Rare per-line override (±0.05). |
| `delivery` | enum | even, wonder, dread, shout, whisper, deadpan, warm. A hint; used only by expressive engines. |
| `dialogue`, `hero_action` | bool | Lint uses these (at least one climax line needs `hero_action`). |
| `shots[]` | {w, hint, framing?, move?, set?, fx?, grade?} | The cut lands at token w's start minus 1 frame. The hint is a literal picture of the words. |
| `sfx[]` | {id, w, offset_ms?, gain_db ≤ −6, dur_ms?} | At most 10 per script. |

**`timing.json` (output):**
- `duration`, `wpm`
- `words[{i, line, w, text, start, end}]`
- `lines[{id, beat, start, end, pause_after_ms}]`
- `beats{beat: [start, end]}`
- `cues{music[], sfx[], shots[]}` with every anchor resolved to seconds
- `lint[{rule, ok, detail}]`

**Lint rules** (the TTS stage warns or fails):
- Tokens 520–650 and duration 120–150 s warn outside; 450–720 tokens and 105–165 s are hard limits.
- L01 starts "In this world," (or "In this town,") and ends by 4.5 s. L02 starts "You see,".
- Exactly one `inciting` line, starting at 38–47%, with the `turn` music cue on its token 0.
- First `twist` at 66–78%, `payoff` at 85% or later, `ending` at 94% or later. The last line is 8 tokens or fewer.
- At least 3 plants, each set up before its payoff. At least one `hero_action` climax line.
- At least 8 numbers. No line over 32 tokens.
- Measured 255–270 wpm, with one automatic speed re-render allowed.
- 3–8 pauses of 500 ms or more.
- At most 10 SFX. The music stop resolves to 300 ms or less after the last word.
- No CTA words (subscribe, like, comment, follow, part 2).

---

I could not listen to any audio, so voice, mood and SFX calls are inferred from spectrograms and the reports. The −14 LUFS figure for YouTube normalization is a widely reported measurement, not an official spec. The Kokoro speeds for 262 wpm are extrapolated from a 34-word benchmark and must be calibrated per production. The view-count conclusions (the passive hero, the title format, the number density) are correlations across 10 videos, not controlled tests.