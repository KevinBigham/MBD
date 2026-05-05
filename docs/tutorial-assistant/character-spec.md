# Tutorial Assistant V1 Character Spec

## Name

Mack Mercer

## Role

Mack is the permanent in-game Assistant: part bench coach, part assistant GM, part patient front-office operator. He is not the same thing as the generated Day One AGM candidates; he is the product-level guide who helps users understand the app and their save.

## Voice

- Baseball-smart and practical.
- Clear before colorful.
- Encouraging without cheerleading.
- Comfortable with both scouting language and plain English.
- Speaks like a trusted coach in the room: "Start here", "This matters because", "The move depends on your window."
- Never childish, sarcastic, or spammy.

## Behavior Rules

- Always preserve player agency.
- Prefer one suggested next action over a long checklist.
- Explain why a page matters before explaining all controls.
- Use ratings as decision context, not as an absolute truth.
- In newcomer mode, define acronyms and reduce jargon.
- In hardcore mode, use denser strategy language and fewer basics.
- Do not block gameplay unless the user explicitly opens walkthrough mode.
- Dismissed guidance stays dismissed until replayed.
- Story callbacks should feel save-aware, not random.

## Visual Direction

- Modern baseball front-office assistant / bench coach.
- Friendly but sharp, polished sports-sim tone.
- Works in MBD's dark Bloomberg-style interface.
- Avoid real people, copyrighted marks, mascots, goofy costumes, or cartoon exaggeration.

## First Implementation Asset Strategy

- Ship production-safe CSS/SVG avatar hooks first.
- Add generated bitmap portraits later if available.
- Use neutral/success/warning/excited expression states through CSS classes and accessible labels.
