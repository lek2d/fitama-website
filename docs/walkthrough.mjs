import {clamp, phase, journey} from './journey-timeline.mjs?v=preloader-v1&release=20261026';

// Preserve the original egg-to-phone scroll distance as chapters are appended.
export const introDistance = (w, h) => h * (w < 700 ? 3.3 : 4.5);
export const chapterOffset = (index, w, h) => introDistance(w, h) + index * h;
export function walkthrough(offset, w, h) {
  const intro = introDistance(w, h);
  const progress = clamp(offset / intro);
  const chapter = clamp((offset - intro) / h, 0, 4.6);
  const weights = [1, 2, 3].map(n => phase(chapter, n - .23, n));
  const opacity = [1 - weights[0], weights[0] - weights[1], weights[1] - weights[2], weights[2]];
  const active = opacity.indexOf(Math.max(...opacity));
  return {
    scene: journey(progress, w, h), chapter, opacity, active,
    // Text exits completely before its replacement enters, even if scrolling stops.
    textOpacity: opacity.map(value => phase(value, .52, 1)),
    result: phase(chapter, 2.66, 2.74),
    // Give the loadout the longest hold; the shop closes the progression story.
    progressScreen: chapter < 4.18 ? 'equipment' : 'shop',
    battle: phase(chapter, 2.35, 2.62),
  };
}
