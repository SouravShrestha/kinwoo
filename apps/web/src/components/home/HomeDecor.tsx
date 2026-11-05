import { HOME_DECOR_OPACITY, HOME_DECOR_VIEWBOX, homeDecorPieces } from "@kinwoo/icons/decor";

// Each piece sits in its own <g> so it falls in on its own delay (.decor-fall in globals.css).
const ART = homeDecorPieces
  .map((p) => `<g class="decor-fall" style="animation-delay:${p.delay}ms">${p.svg}</g>`)
  .join("");
const STILL_ART = homeDecorPieces.map((p) => `<g>${p.svg}</g>`).join("");

export function HomeDecor({ animate = true }: { animate?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox={HOME_DECOR_VIEWBOX}
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      style={{ opacity: HOME_DECOR_OPACITY }}
      className="pointer-events-none absolute inset-x-0 top-0 h-[290px] w-full text-primary"
      dangerouslySetInnerHTML={{ __html: animate ? ART : STILL_ART }}
    />
  );
}
