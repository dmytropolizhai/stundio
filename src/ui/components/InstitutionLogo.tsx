/**
 * The schools' own emblems: RVT's shield, RTU's "RTŪ" mark, LU's seal. Cropped from each
 * school's published logo (rvt.lv, rtu.lv, lu.lv) to the emblem alone, so they read at chip
 * size. Always on a white tile — they are drawn for a light background, and a brand mark must
 * not be recoloured for dark mode.
 */
import { cn } from "@/ds";
import type { UniversityId } from "@/lib/university";
import rvt from "../../assets/logos/rvt.png";
import rtu from "../../assets/logos/rtu.svg";
import lu from "../../assets/logos/lu.svg";

export type Institution = "rvt" | UniversityId;

const LOGOS: Record<Institution, { src: string; name: string }> = {
  rvt: { src: rvt, name: "RVT" },
  rtu: { src: rtu, name: "RTU" },
  lu: { src: lu, name: "LU" },
};

export const InstitutionLogo = ({
  institution,
  size = 44,
  className,
}: {
  institution: Institution;
  /** Tile edge in px; the emblem fills ~75% of it. */
  size?: number;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex shrink-0 items-center justify-center rounded-lg bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]",
      className,
    )}
    style={{ width: size, height: size }}
  >
    <img
      src={LOGOS[institution].src}
      alt={LOGOS[institution].name}
      width={Math.round(size * 0.75)}
      height={Math.round(size * 0.75)}
      className="object-contain"
      draggable={false}
    />
  </span>
);
