# Imagegen asset record

All raster game art was created with the built-in `imagegen` mode. Character
sources use a flat chroma-key background and were converted to alpha PNGs with
the imagegen skill's `remove_chroma_key.py` helper.

## Shared art direction

```text
Use case: stylized-concept
Asset type: children's mobile portrait shooter art
Style/medium: polished soft 3D toy animation, rounded clay and soft-plastic
materials, premium children's mobile game art
Lighting/mood: bright, warm, magical, safe and cheerful
Constraints: strong readable silhouettes; fictional characters only; no text;
no logos; no weapons; no gore; no frightening anatomy; no watermark
```

## Final prompts

### Micro-world background

```text
A whimsical microscopic immune-system world viewed from above while flying
forward through a friendly glowing body pathway. Layered soft coral tissue
forms around the edges, with translucent bubble-like cells and tiny drifting
light particles. Keep a clear, uncluttered flight lane through the center.
9:16 portrait composition designed for vertical scrolling. Coral pink, peach,
lavender, cyan and soft golden highlights. No characters or UI.
```

### Immune guardian

```text
A single adorable white-blood-cell guardian piloting a tiny rounded cyan
antibody craft, facing straight upward. Big kind eyes, small smile, rounded
white cell body, cyan bubble canopy and two glowing antibody emitters. Exactly
one full character, centered with generous padding, on a perfectly flat solid
#ff00ff chroma-key background. Do not use the key color in the subject. No
shadow, floor, reflection, text or extra characters.
```

The final guardian uses a precise-object edit that removed only a small
scratch-like blemish from the canopy while preserving the character and flat
key background.

### Blue and fast viruses

```text
One harmless, playful fictional virus toy facing downward. For the basic
variant: a blue-purple round squishy puff with short rounded nubs. For the fast
variant: a small tangerine-orange teardrop shape with swept-back rounded nubs.
Expressive eyes and a tiny smile; no teeth. Centered with generous padding on a
perfectly flat solid #ff00ff chroma-key background. No shadows, text, realistic
pathogen details or extra characters.
```

### Virus bubble king

```text
A single large lavender fictional virus king facing downward, with short
rounded nubs, a soft jelly crown, confident playful eyes, a silly determined
smile and three cyan glowing weak points. Impressive but never frightening.
Centered with generous padding on a perfectly flat solid #00ff00 chroma-key
background. No green in the character; no shadows, text, teeth, gore, realistic
pathogen details or extra characters.
```
