import { useRef } from "react";
import { hexToHsl, hslToHex, isHexColor } from "../../lib/color.ts";
import { cn } from "../../lib/utils.ts";
import { Slider } from "./slider.tsx";

export type ColorWheelProps = {
  /** `#rrggbb`. An invalid value is treated as black rather than thrown on. */
  value: string;
  onChange: (hex: `#${string}`) => void;
  /** Accessible name for the hue/saturation disc. */
  label: string;
  lightnessLabel: string;
  /** Disc diameter in px. */
  size?: number;
  className?: string;
};

/**
 * A free-colour picker: a hue/saturation disc (angle = hue, distance from centre = saturation)
 * plus a lightness `Slider`, together covering the same HSL space `hexToHsl`/`hslToHex` speak.
 *
 * Not in the published Studio DS — the DS ships six fixed, contrast-checked accents and no free
 * picker at all (`ui/theme/colors.ts`'s comment on `subjectTone`). This exists because product
 * feedback asked for "any colour" on a per-subject basis; it is built the way `Slider` was, from
 * pieces the DS already has (`shadow-hairline`, `focus-visible` ring), so it reads as part of the
 * same system even though it isn't a shipped component.
 */
export const ColorWheel = ({
  value,
  onChange,
  label,
  lightnessLabel,
  size = 176,
  className,
}: ColorWheelProps) => {
  const discRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const { h, s, l } = hexToHsl(isHexColor(value) ? value : "#3d7bf5");

  const radius = size / 2;

  const setFromClientPoint = (clientX: number, clientY: number): void => {
    const el = discRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const dist = Math.min(Math.hypot(dx, dy), radius);
    const hue = (Math.atan2(dy, dx) * 180) / Math.PI;
    const sat = (dist / radius) * 100;
    onChange(hslToHex(hue, sat, l));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setFromClientPoint(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current) return;
    setFromClientPoint(event.clientX, event.clientY);
  };

  const stopDragging = (): void => {
    draggingRef.current = false;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const step = event.shiftKey ? 10 : 2;
    switch (event.key) {
      case "ArrowLeft":
        onChange(hslToHex(h - step, s, l));
        break;
      case "ArrowRight":
        onChange(hslToHex(h + step, s, l));
        break;
      case "ArrowUp":
        onChange(hslToHex(h, Math.min(100, s + step), l));
        break;
      case "ArrowDown":
        onChange(hslToHex(h, Math.max(0, s - step), l));
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const angle = (h * Math.PI) / 180;
  const dist = (s / 100) * radius;
  const thumbX = radius + Math.cos(angle) * dist;
  const thumbY = radius + Math.sin(angle) * dist;

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div
        ref={discRef}
        role="slider"
        aria-label={label}
        aria-valuetext={value}
        tabIndex={0}
        className="relative shrink-0 touch-none rounded-full shadow-hairline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
        style={{
          width: size,
          height: size,
          background: [
            "radial-gradient(circle, #fff 0%, rgba(255,255,255,0) 70%)",
            "conic-gradient(from 90deg, red, yellow, lime, cyan, blue, magenta, red)",
          ].join(", "),
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onKeyDown={handleKeyDown}
      >
        <span
          aria-hidden="true"
          className="absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-hairline"
          style={{ left: thumbX, top: thumbY, backgroundColor: hslToHex(h, s, l) }}
        />
      </div>

      <Slider
        label={lightnessLabel}
        min={5}
        max={95}
        value={Math.round(l)}
        onChange={(next) => {
          onChange(hslToHex(h, s, next));
        }}
        className="w-full"
      />
    </div>
  );
};
