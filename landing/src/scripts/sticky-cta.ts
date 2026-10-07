/*
 * The sticky install bar. Shown on phones once the hero's CTA has scrolled away, hidden again
 * while the real install section, the final CTA or the footer is on screen (so it never doubles
 * a real button or covers the warning). It jumps to #install — it does not download. One
 * IntersectionObserver watches all four targets; the bar is `inert` while hidden so it cannot
 * take focus or be read.
 */
export const initStickyCta = (): void => {
  const bar = document.querySelector<HTMLElement>("[data-sticky]");
  const heroCta = document.querySelector<HTMLElement>('[data-device-cta][data-place="hero"]');
  if (!bar || !heroCta || !("IntersectionObserver" in window)) return;

  const others = ["#install", "[data-final]", ".l-footer"]
    .map((selector) => document.querySelector<HTMLElement>(selector))
    .filter((el): el is HTMLElement => el !== null);
  const visible = new Set<Element>();
  let heroGone = false;

  const apply = (): void => {
    const show = heroGone && visible.size === 0;
    bar.dataset["shown"] = show ? "true" : "false";
    bar.inert = !show;
    bar.setAttribute("aria-hidden", show ? "false" : "true");
  };

  bar.hidden = false;
  apply();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === heroCta) {
        // Gone only if it left upward — still-below-the-fold means the hero is on screen.
        heroGone = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      } else if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    apply();
  });
  [heroCta, ...others].forEach((el) => observer.observe(el));
};
