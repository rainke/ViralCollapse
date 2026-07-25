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

### Wobbly, splitting and shield viruses

```text
Use the existing blue virus as a style reference only. Match the polished soft
3D toy rendering, friendly face scale, lighting and top-down three-quarter game
view while changing the silhouette and palette.

Wobbly: one lime-green four-lobed jelly clover with two tiny antenna nubs on a
flat #ff00ff background.

Splitting: one coral-pink connected double-bubble character whose silhouette
clearly suggests division, on a flat #00ff00 background.

Shield: one golden-yellow round virus wearing a thick translucent cyan
bubble-ring shell, on a flat #ff00ff background.

Exactly one centered character per image with generous padding. No shadows,
text, teeth, gore, realistic pathogen details, watermarks or extra characters.
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

### Influenza virus

```text
Use case: stylized-concept
Asset type: children's mobile portrait shooter enemy sprite
Input images: Image 1 and Image 2 are subject-shape references from a children's virus book only; Image 3 is the game's soft 3D toy style anchor.
Primary request: create one unmistakable influenza virus enemy for the game, inspired by the round blue influenza character with many radiating short stalks in Image 1, but do not copy the book illustration style or pose.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for removal.
Subject: exactly one icy blue spherical influenza toy with a dense ring of evenly spaced short navy spike stalks, big expressive eyes, and a playful determined mouth with no teeth. Strong circular starburst silhouette readable at 70 pixels.
Style/medium: polished soft 3D toy animation, rounded clay and soft-plastic materials matching Image 3, top-down three-quarter game view, facing downward.
Composition/framing: full character centered with generous empty padding, portrait sprite canvas.
Lighting/mood: bright, warm, magical, safe and cheerful; lighting affects only the subject.
Constraints: one character only; perfectly uniform #00ff00 background; crisp clean edges; no green anywhere in the subject; no cast shadow, contact shadow, gradient, texture, floor, reflection, text, logo, watermark, realistic anatomy, gore, teeth, or extra objects.
```

### Adenovirus

```text
Use case: stylized-concept
Asset type: children's mobile portrait shooter enemy sprite
Input images: Image 1 and Image 2 are subject-shape references from a children's virus book only; Image 3 is the game's soft 3D toy style anchor.
Primary request: create one unmistakable adenovirus enemy for the game, inspired by the faceted green adenovirus shape in Image 1, but do not copy the book illustration style or pose.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for removal.
Subject: exactly one emerald and lime icosahedral virus toy, clearly faceted like a chunky gemstone, with eight sparse antenna-like fiber spikes ending in tiny round knobs, big expressive eyes embedded on the front facet, and a cheeky closed smile. Strong angular silhouette readable at 80 pixels.
Style/medium: polished soft 3D toy animation, rounded bevels and soft-plastic facets matching Image 3, top-down three-quarter game view, facing downward.
Composition/framing: full character centered with generous empty padding, portrait sprite canvas.
Lighting/mood: bright, warm, magical, safe and cheerful; lighting affects only the subject.
Constraints: one character only; perfectly uniform #ff00ff background; crisp clean edges; do not use magenta or pink anywhere in the subject; no cast shadow, contact shadow, gradient, texture, floor, reflection, text, logo, watermark, realistic anatomy, gore, teeth, or extra objects.
```

### Ebola boss

```text
Use case: stylized-concept
Asset type: children's mobile portrait shooter stage-three boss sprite
Input images: Image 1 and Image 2 are subject-shape references from a children's virus book only; Image 3 is the game's soft 3D toy style anchor.
Primary request: create one unmistakable Ebola-inspired boss for the game, inspired by the long purple winding virus inside the blue dish in Image 1, but do not copy the book illustration style, face, or pose.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for removal.
Subject: exactly one large purple and golden-yellow segmented worm-like virus toy forming a broad vertical S curve, with a blunt rounded head at the upper end, small expressive eyes, a silly determined closed mouth, subtle round spots, and a short ribbed tail. Thick body and exaggerated S silhouette readable at 200 pixels, impressive but never frightening.
Style/medium: polished soft 3D toy animation, rounded clay and soft-plastic materials matching Image 3, top-down three-quarter game view, facing downward.
Composition/framing: full character centered with generous empty padding, portrait sprite canvas; keep every part separated from the border.
Lighting/mood: bright, warm, magical, safe and cheerful; lighting affects only the subject.
Constraints: one character only; perfectly uniform #00ff00 background; crisp clean edges; no green anywhere in the subject; no cast shadow, contact shadow, gradient, texture, floor, reflection, dish, tongue, text, logo, watermark, realistic anatomy, gore, teeth, or extra objects.
```

### Rabies virus

```text
Use case: stylized-concept
Asset type: children's mobile portrait shooter enemy sprite
Input images: Image 1 is a children's-book subject-shape reference only; use the green rabies-virus character at the upper left. Image 2 is the game's soft 3D toy style anchor.
Primary request: create one unmistakable rabies-virus enemy based on Image 1's long green capsule body and sweeping feelers, without copying the book's illustration style or exact face.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for removal.
Subject: exactly one olive and emerald elongated bullet-shaped virus toy, tilted slightly diagonally, with two extremely long curved feeler spikes sweeping backward, a row of small dark-green rounded nubs, large playful determined eyes, and a tiny closed mouth. Strong long asymmetric silhouette readable at 70 pixels.
Style/medium: polished soft 3D toy animation, rounded clay and soft-plastic materials matching Image 2, top-down three-quarter game view, facing downward.
Composition/framing: full character centered with generous empty padding; all feelers fully inside the portrait sprite canvas.
Lighting/mood: bright, warm, magical, safe and cheerful; lighting affects only the subject.
Constraints: one character only; perfectly uniform #ff00ff background; crisp clean edges; no magenta or pink in the subject; no spiral motion trail, cast shadow, contact shadow, gradient, texture, floor, reflection, text, logo, watermark, realistic anatomy, gore, teeth, or extra objects.
```

### Pox virus

```text
Use case: stylized-concept
Asset type: children's mobile portrait shooter enemy sprite
Input images: Image 1 is a children's-book subject-shape reference only; use the brick-like pox-virus character near the upper center. Image 2 is the game's soft 3D toy style anchor.
Primary request: create one unmistakable pox-virus enemy based on Image 1's brick-wall body, without copying the book's illustration style, costume, or exact face.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for removal.
Subject: exactly one chunky rust-red rectangular virus toy constructed from six large rounded brick-like plates in staggered rows, with visible dark mortar grooves, two expressive eyes on the front center, a stubborn tiny closed mouth, and two very short blocky arm nubs. Bold square stepped silhouette readable at 80 pixels.
Style/medium: polished soft 3D toy animation, rounded clay and soft-plastic materials matching Image 2, top-down three-quarter game view, facing downward.
Composition/framing: full character centered with generous empty padding on a portrait sprite canvas.
Lighting/mood: bright, warm, magical, safe and cheerful; lighting affects only the subject.
Constraints: one character only; perfectly uniform #00ff00 background; crisp clean edges; no green in the subject; no hat, legs, separate wall, cast shadow, contact shadow, gradient, texture in the background, floor, reflection, text, logo, watermark, realistic anatomy, gore, teeth, or extra objects.
```

### Polyhedral virus

```text
Use case: stylized-concept
Asset type: children's mobile portrait shooter enemy sprite
Input images: Image 1 is a children's-book subject-shape reference only; use the blue crystal polyhedral-virus structures at the lower right. Image 2 is the game's soft 3D toy style anchor.
Primary request: create one unmistakable polyhedral-virus enemy based on Image 1's faceted crystal containing orange rod-like virus pieces, without copying the book's illustration style or exact characters.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for removal.
Subject: exactly one large icy-cyan faceted icosahedral crystal toy with a bold diamond-like silhouette. Three front triangular facets are open cutaway windows revealing three bright orange capsule-shaped rods inside; place two playful determined eyes and a tiny closed mouth on the lower central blue facet. The outer crystal must be opaque blue plastic with lighter beveled edges, not glass or transparent.
Style/medium: polished soft 3D toy animation, rounded bevels and soft-plastic materials matching Image 2, top-down three-quarter game view, facing downward.
Composition/framing: one complete virus structure centered with generous empty padding on a portrait sprite canvas.
Lighting/mood: bright, warm, magical, safe and cheerful; lighting affects only the subject.
Constraints: exactly one outer polyhedral structure; perfectly uniform #00ff00 background; crisp clean edges; no green in the subject; no transparency, glass, reflections, cast shadow, contact shadow, background gradient, floor, text, logo, watermark, realistic anatomy, gore, teeth, or loose extra objects outside the shell.
```

### Wide-mouth jar virus

```text
Use case: stylized-concept
Asset type: children's mobile portrait shooter enemy sprite
Input images: Image 1 is a children's-book subject-shape reference only; use the large yellow-orange wide-mouth jar virus near the upper center. Image 2 is the game's soft 3D toy style anchor.
Primary request: create one unmistakable wide-mouth-jar virus enemy based on Image 1's tall sack-like jar body and flared open mouth, without copying the book's illustration style or exact face.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for removal.
Subject: exactly one golden-yellow and tangerine pear-shaped sack-jar virus toy, tall and slightly bottom-heavy, with a dramatically flared open jar mouth at the top, a thick brick-red rim and dark opening, two tiny feet, two short arm nubs, big curious determined eyes, and a tiny closed smile. Strong bottle-and-sack silhouette readable at 80 pixels.
Style/medium: polished soft 3D toy animation, rounded clay and soft-plastic materials matching Image 2, top-down three-quarter game view, facing downward.
Composition/framing: full character centered with generous empty padding on a portrait sprite canvas; the open mouth is fully visible.
Lighting/mood: bright, warm, magical, safe and cheerful; lighting affects only the subject.
Constraints: one character only; perfectly uniform #ff00ff background; crisp clean edges; no magenta or pink in the subject; no contents emerging from the opening, cast shadow, contact shadow, background gradient, texture, floor, reflection, text, logo, watermark, realistic anatomy, gore, teeth, or extra characters.
```
