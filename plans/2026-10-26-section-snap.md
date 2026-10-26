# Journey section snapping implementation plan

**Goal:** One deliberate vertical wheel gesture or mobile swipe animates to the next readable Journey slide; an upward gesture goes back.

**Architecture:** Reuse the existing real document scroll and deterministic visual timeline. Extend the existing scroll driver rather than register competing wheel handlers. A small pure module owns semantic stops, gesture grouping and finite transition easing. Keep the existing page outside the animated story readable with normal scrolling.

**Constraints:** No dependency, artwork, app, backend, policy, QA or automation changes. Keep reduced-motion, short-screen and failed-art static alternatives. Never intercept zoom, horizontal gestures, forms, dialogs or nested scrollers. Keep anchors, focus and scrollbar navigation usable. Retain the supplied logo and approved art.

**Motion:** Stops preserve hero, follow/egg catch, hatch, movement, Health, Map, Battle, Result, Equipment and Shop. A final exit lands at the FAQ. Use the existing visual transitions over approximately 1.1 seconds; later gestures do not accidentally chain through slides from momentum. Deliberate reversal can interrupt.

- [x] Add and test pure semantic-stop selection, gesture grouping, reverse intent and finite easing. Verify stops against actual timeline visibility.
- [x] Add failing driver tests for wheel burst, next gesture, reversal, native boundary/controls, interruption and swipe; extend the current installer and pass those tests.
- [x] Integrate dynamic viewport/FAQ offsets in Journey, scope touch handling to the animated story and refresh module URLs. Synchronize source mirror and publisher.
- [x] Verify all existing website tests and focused new tests. Review the complete diff independently.
- [x] Browser-check forward/backward slides, momentum, mobile/touch where supported, keyboard/anchors, dialog scrolling, reduced-motion/static fallback and small/large layouts.
- [ ] Publish and verify exact HTTPS files and visible behavior.

Working in the existing clean, isolated website checkout. The source mirror retains its unrelated accepted changes; only this feature's files are synchronized.

Completed-pose refinement: both viewports stop at intro × .66 (complete egg/UI handoff) and × .78 (complete hatch). Copy visibility windows follow those poses; mobile phone growth begins at .82 so the hatch remains framed before gameplay. Fresh checks: 159 source tests, 34 publisher tests, five runtime syntax checks, whitespace diff check and independent 120-viewport/120,120-frame review passed. Browser mobile swipe hardware is unavailable; native-phone feel is explicitly pending owner acceptance.
