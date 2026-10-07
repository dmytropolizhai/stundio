/*
 * The "cancelled lesson" story: when the scene scrolls into view the strike-through is drawn and
 * the badge fades in, once. The scene's default HTML/CSS is already the finished state, so if
 * this script never runs, reduced motion is on, or the scene is on screen at load, nothing is
 * ever hidden or waiting. Armed state is only set for a scene that starts out of view.
 */
export const initChangesAnim = (): void => {
  const scene = document.querySelector<HTMLElement>("[data-changes-anim]");
  if (!scene || !("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const rect = scene.getBoundingClientRect();
  if (rect.top < window.innerHeight && rect.bottom > 0) return;

  scene.dataset["anim"] = "armed";
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      // Two frames, so the armed state is painted before the transition to the final one.
      requestAnimationFrame(() => requestAnimationFrame(() => (scene.dataset["anim"] = "run")));
    },
    { threshold: 0.6 },
  );
  observer.observe(scene);
};
