export const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
export const mix = (a, b, t) => a + (b - a) * t;
export function phase(p, a, b) {
  const t = clamp((p - a) / (b - a));
  return t * t * (3 - 2 * t);
}

// All geometry is viewport-relative and deterministic, including reverse scroll.
export function journey(p, w, h) {
  p = clamp(p);
  const mobile = w < 700;
  // Grow with desktop width instead of keeping a164px cap on2K monitors.
  const startW = Math.min(mobile ? w * .215 : clamp(w * .095,164,224),h * .27);
  // Equal painted height; preserve each authored shell's natural aspect ratio.
  const companionH=startW*391/353;
  const clovieW=companionH*332/391,ignieW=companionH*300/391;
  const shellOverlap=startW*.05;
  // Bring the two side centers 30% closer, keeping all authored shell proportions.
  const clovieX=w/2-((startW+clovieW)/2-shellOverlap)*.7;
  const ignieX=w/2+((startW+ignieW)/2-shellOverlap)*.7;
  const nestW = startW * 3.6;
  const nestH = nestW / 3;
  // Ground the eggs on the bright clearing, above its shaded continuation.
  const nestBase = h * 0.91 - nestH * .21;
  const nestTop = nestBase - nestH * .90;
  // Separate woodland clusters leave irregular ground visible beside the cradle.
  const foliageOutset = w * (mobile ? .08 : .035);
  const foliageSize = mobile ? w * .48 : Math.min(540, w * .28);
  const foliageHeight = foliageSize * 2 / 3;
  const foliageRightDrop = foliageHeight * .14;
  const foliageTop = nestBase - foliageHeight * .63;
  // Respond to the first wheel/touch movement, then settle smoothly at release.
  const depthProgress = clamp(p / .24);
  const depth = depthProgress * (2 - depthProgress);
  // Tall viewports must not separate layers beyond their painted overlap.
  const canvasHeight = w * (mobile ? 1.2 : .5);
  const depthSpan = Math.min(h, canvasHeight * 1.5);
  // Painted ground continues into green; the entire hero exits by translation.
  const groundY = -depth * h * 0.48 - phase(p, 0.24, 0.30) * h * 0.70;
  // One registered U contour: high outer foliage, a low center over extended lawn.
  // Its tall transparent cap does not overlap the eggs in the middle columns.
  const grassHeight = w / 3;
  const grassTopOffset = -w * .21;
  // Extra lift on ultra-wide, short windows clears the deepest U before the catch.
  const grassLift = Math.max(Math.min(18, w * .024), w * .055 - h * .18 + 4);
  // Clip only beneath the actual bottom edge, never fade the illustration.
  const worldClipBottom = Math.ceil(clamp(-groundY + 2, 0, h));
  // Keep the catch and full hatch at rest before framing the gameplay chapters.
  const grow = phase(p, mobile ? 0.82 : 0.80, 0.94);
  const handoff = phase(p, 0.62, 0.66);
  const reveal = phase(p, 0.69, 0.77);
  const mobilePhoneTop = Math.max(144, h * .12);
  // Use the space above the actual mobile copy block, keeping a24px reading gap.
  const mobileCopyTop = h * (h <= 700 ? .60 : .62);
  const previewScale = .95;
  const mobilePhoneWidth = previewScale * Math.min(w * .48, Math.max(90, ((mobileCopyTop - 24 - mobilePhoneTop - 10) * 390 / 844 + 10) * .94));
  // Width grows with roomy monitors; height always wins in short browser windows.
  const desktopPhoneWidth = previewScale * Math.min(clamp(w * .1472 + 92, 276, 405), Math.max(90, (h - 136 - 10) * 390 / 844 + 10));
  // Reserve the finite contact displacement below the catch, not only its rest pose.
  const desktopCatchGap = Math.max(40, h * .04);
  const desktopCatchWidth = Math.max(90, (h - 112 - desktopCatchGap - 10) * 390 / 844 + 10);
  const introPhoneW = Math.min(276, h * .36, w * .60, mobile ? Math.max(90, (h - 312 - 10) * 390 / 844 + 10) : desktopCatchWidth);
  const phoneW = mix(introPhoneW, mobile ? mobilePhoneWidth : desktopPhoneWidth, grow);
  // Raw 390×844 app capture inside one shared 5px phone frame.
  const phoneContentW = phoneW - 10;
  const phoneContentH = phoneContentW * 844 / 390;
  const phoneH = phoneContentH + 10;
  // Hold the phone centrally while successive copy appears on either side.
  const pairGap = clamp(w * .045, 32, 72);
  const pairCopyW = Math.min(410, Math.max(0, (w - phoneW) / 2 - pairGap - 24));
  const followCopyX = (w + phoneW) / 2 + pairGap;
  const landingCopyX = (w - phoneW) / 2 - pairGap - pairCopyW;
  const phoneX = mix(w / 2, mobile ? w / 2 : w * 0.29, grow) - phoneW / 2;
  // Reserve the mobile header and two short story-copy blocks above the phone.
  const restingPhoneY = mobile ? Math.max(272, (h - phoneH) / 2) : Math.max(112, (h - phoneH) / 2);
  const catchPhoneY = mobile ? Math.min(h - phoneH - 40, Math.max(272, restingPhoneY + h * .13)) : Math.min(h - phoneH - desktopCatchGap, restingPhoneY + h * .13);
  const catchLift = catchPhoneY - restingPhoneY;
  const targetW = phoneContentW * 115.7 / 390;
  const dropW = Math.min(startW, targetW * 1.35);
  // Clear the mobile copy using the actual falling shell height. The hero's
  // larger eggs must not invalidate the clearance reserved by the phone layout.
  const releaseY = mobile ? Math.max(308, h * .24, 258 + dropW * 391 / 353 / 2) : h * .24;
  const catchEggY = catchPhoneY + 5 + phoneContentH * 330.3 / 844;
  const fallDistance = catchEggY - releaseY;
  const fall = clamp((p - 0.30) / 0.18);
  // A single soft compression. Initial velocity matches the incoming egg,
  // then returns to rest without an elastic bounce or a position snap.
  const settle = clamp((p - 0.48) / 0.06);
  const impactOffset = (2 * fallDistance / 0.18) * 0.06 * settle * (1 - settle) ** 2;
  const phoneY = mix(h * 1.12, catchPhoneY, phase(p, 0.22, 0.30))
    + impactOffset - catchLift * phase(p, 0.56, 0.62)
    - grow * (mobile ? restingPhoneY - mobilePhoneTop : 0);
  const startY = nestBase - startW * 391 / 353 / 2;
  const landX = phoneX + phoneW / 2;
  const landY = phoneY + 5 + phoneContentH * 330.3 / 844;
  const eggW = mix(mix(startW, dropW, phase(p, 0.24, 0.30)), targetW, phase(p, 0.30, 0.48));
  const eggX = mix(w / 2, landX, phase(p, 0.24, 0.48));
  // Do not chase a rising target: the phone is ready before gravity takes over.
  // The whole nest is attached to the meadow while it is visible. Only once
  // that scene has cleared can Blukie move independently into the green catch.
  const eggY = p <= 0.24 ? startY + groundY
    : p < 0.30 ? mix(startY - h * 0.48, releaseY, phase(p, 0.24, 0.30))
    : p < 0.48 ? releaseY + fallDistance * fall ** 2 : landY;
  return {
    p, mobile, companionH, clovieW, ignieW, clovieX, ignieX, followCopyX, landingCopyX, pairCopyW, pairGap, pairCopyY: phoneY + phoneH / 2, foliageSize, foliageHeight, foliageTop, foliageOutset, foliageRightDrop, nestW, nestTop, nestBase, startW, worldClipBottom, phoneX, phoneY, phoneW, phoneH, eggX, eggY, eggW,
    eggH: eggW * 391 / 353,
    eggOpacity: 1 - handoff, screenOpacity: handoff, reveal,
    skyOpacity: 1,
    landscapeOpacity: 1,
    nestOpacity: 1,
    grounding: 1 - phase(p, 0.22, 0.27),
    // Share the world exit, with bounded lag for distant planes. This keeps
    // their painted overlap intact while making the scroll depth visible.
    cloudBanksY: groundY + depth * depthSpan * 0.31,
    mountainsY: groundY + depth * depthSpan * 0.20,
    lakeFallsY: groundY + depth * depthSpan * 0.09, valleyY: groundY,
    nestY: groundY,
    // The near contour keeps leaving with the lawn after the distant clip reaches 0.
    grassHeight, grassTopOffset, grassEdge: h + groundY - 2, grassX: 0,
    grassLiftY: -depth * grassLift,
    leafY: groundY - phase(p, .30, .40) * h * .6,
    foregroundOpacity: 1,
    heroOpacity: 1 - phase(p, 0.02, 0.14),
    heroY: -phase(p, 0.02, 0.20) * h * 0.25,
    // Readable holds align with the completed UI handoff and full pet reveal.
    followOpacity: phase(p, .56, .61) * (1 - phase(p, .67, .70)),
    landingOpacity: phase(p, .70, .73) * (1 - phase(p, .80, .82)),
    tpOpacity: phase(p, 0.82, 0.93), creamOpacity: phase(p, 0.76, 0.92),
    scene: p < 0.22 ? 0 : p < 0.51 ? 1 : p < 0.78 ? 2 : 3,
  };
}
