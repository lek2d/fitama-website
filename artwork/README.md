# Approved forest background — October 18, 2026

These sources belong to the private website-only repository. GitHub Pages publishes only `docs/`; do not expose this directory or change the publication root.

The owner approved desktop smooth-shading version 2 in chat ("ayan tol apply mo"). The portrait asset adapts that finish to the existing mobile composition. The original logo, layout, text, policy and hosting settings are not modified.

## Sources and shipping files

| Role | Source PNG | Native size | Shipping WebP | Bytes |
| --- | --- | --- | --- | --- |
| Desktop | forest-desktop-smooth-v2.png | 1787×880 | ../docs/assets/ending-forest-dungeon.webp | 225864 |
| Mobile | forest-mobile-smooth-v1.png | 941×1672 | ../docs/assets/ending-forest-dungeon-mobile.webp | 146560 |

The built-in image generation/editing tool produced the PNGs. No CLI/API generation or artificial upscaling was used. Requested high-resolution output did not produce native 4K: actual native dimensions above are authoritative. Smoothness was improved through image editing rather than a CSS/global blur filter.

WebPs are format-only delivery conversions using Sharp `webp({quality:90, effort:6})`, without resizing, filtering or composition changes. The combined delivery weight (372424 bytes) is slightly below the original pair (372546 bytes). Both HTML image references carry `?v=smooth-20261018` to refresh cached art.

SHA-256:

- Desktop PNG: `8db4da48a9893f4d3fa303b37695af138f235b2d8d76dae5d09d6ad858119904`
- Mobile PNG: `0b28825708cd6a8af703e94297175a9ba3a9ab72c8d70d739b03d06902ea5538`
- Desktop WebP: `505f7d24666489aecd8db9af70e53780c1983a528a9920209eb896ccca47c69d`
- Mobile WebP: `07a6efacf92bf3c37e61370de14df4f6bafe6864196bdad5597f1fe25915dd20`

## Inputs

- Original website footer art: `lek2d/Fitama`, branch `codex/onboarding-ui-improvements`, source commit `c56c8fa7bc5ac6dda565968ba9cf814e9c9313b7`.
- First desktop refinement used the original landscape and the app's `assets/figma/handoff/bandit-battle-background.png` as a style-only reference.
- Approved desktop refinement used that first draft and the app's `assets/concepts/story-intro/companion-clearing-background-v1.png` as a style-only reference. No source scene's additional props were added.
- Mobile adaptation used the original portrait as composition authority and the approved desktop as rendering authority.

## Final desktop edit prompt — built-in tool

Edit Image 1 only. Image 2 is a FiTama style reference, not a scene to copy. User feedback: make the SHADING noticeably smoother than Image 1. Keep Image 1's exact wide landscape composition, framing, mossy stone arch, pillar shapes, lantern positions, vines, white flowers, steps, foliage arrangement, existing deep teal/green palette and large dark uncluttered center unchanged. Replace the angular polygonal light/dark patches on leaves, stone, moss and tree bark with continuous silky soft gradients and smooth rounded volumetric shading. Gently airbrushed polished 2D mobile-game illustration, clean confident silhouettes and crisp edges, soft highlights smoothly rolling into shadows; each leaf should feel rounded and softly shaded, not cut into triangular color facets. Stone blocks should have gently modeled smooth lighting, not patchy hard-brush daubs. Use Image 2 only for its friendly clean FiTama shapes; make the actual shading even softer and more blended. This must be an evident smooth-shading refinement, NOT a blur filter: keep edges and small flowers sharply legible. Preserve atmospheric dark teal negative space for website logo and copy, don't add anything into the center. Do NOT bring over Image 2's blue sky, waterfall, mountains, bridge or path, and do not brighten or redesign the composition. No characters, extra props, text, logo, UI, watermark or border. No heavy black ink, rough painterly brushwork, geometric facets, texture noise or photorealism. Highest available native resolution, retaining approximately 2.04:1 aspect ratio. Opaque background. Return only the refined background.

## Final mobile edit prompt — built-in tool

Use case: style-transfer. Image 1 is the exact existing PORTRAIT mobile website background to edit. Image 2 is the owner-approved smooth-shaded DESKTOP version of the same scene and is the shading/color authority. Make Image 1 match Image 2's clean soft blended dimensional shading on leaves, moss, stone, lanterns and tree bark. Preserve Image 1's portrait aspect ratio approximately 9:16, entire framing, mossy arch curving across top, narrow side pillars, two amber lanterns, vines and white flowers, stone steps positioned around the lower middle, broad dark teal central opening and quiet green lower field. This is the matching mobile asset, not a crop of the landscape image. Use smooth continuous highlights into shadows and rounded softly shaded leaves/stones, not rough paint daubs, geometric color facets or blur filters. Keep sharp clean silhouettes. Preserve the dark uncluttered center for separately overlaid logo and text, same subdued teal forest depth and warm amber accents as approved Image 2. No characters, new props, weapons, buildings, text, logo, UI, watermark or borders. No photographic or 3D render. Highest available native resolution, opaque background. Only change the shading/render finish to match the approved desktop; do not redesign or brighten the composition.

## Rollback

Revert the background publication commit to restore the old WebPs, references and source record. Existing original images remain recoverable in Git history at `6364720`. Do not change DNS, CNAME, hosting, Privacy or the app worktree as part of rollback.

