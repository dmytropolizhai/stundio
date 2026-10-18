import { Icon } from "@/ds";
import type { Persona } from "@/lib/persona";
import { useT } from "@/ui/i18n";
import { PERSONA_PROFILES } from "@/ui/persona";

type ProfileCardProps = {
  persona: Persona;
  /** The class / teacher label (`useIdentityLabel`); `undefined` while none is picked. */
  label: string | undefined;
  /** Short facts about the selection — subgroup, building — shown as chips under the name. */
  facts: string[];
  onChangeIdentity: () => void;
};

/**
 * The top of Settings: who this timetable is for. It is the largest anchor on the screen — the
 * role's glyph on a solid tile, the class or teacher name at title size — because "whose
 * schedule am I looking at" is the one setting that changes everything else.
 */
export const ProfileCard = ({ persona, label, facts, onChangeIdentity }: ProfileCardProps) => {
  const t = useT();
  const profile = PERSONA_PROFILES[persona];
  // aria-label replaces the button's text, so the chips have to be spoken here too.
  const spoken = [`${t(profile.roleLabel)}: ${label ?? t(profile.noneSelected)}`, ...facts];

  return (
    <button
      type="button"
      onClick={onChangeIdentity}
      aria-label={`${spoken.join(". ")}. ${t("settings.change")}`}
      className="mb-7 flex w-full cursor-pointer items-center gap-3.5 rounded-xl border-0 bg-card p-4 text-left shadow-card transition-transform duration-(--dur-instant) ease-(--ease-out) active:scale-(--press-scale)"
    >
      <span
        aria-hidden="true"
        className="flex size-14 shrink-0 items-center justify-center rounded-squircle bg-brand text-on-brand"
      >
        {label ?? t(profile.noneSelected)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="u-eyebrow">{t(profile.roleLabel)}</span>
        <span className="truncate font-display text-title font-extrabold text-strong"></span>
        {facts.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            {facts.map((fact) => (
              <span
                key={fact}
                className="inline-flex h-6 items-center rounded-pill bg-sunken px-2.5 font-text text-micro text-fg"
              >
                {fact}
              </span>
            ))}
          </span>
        )}
      </span>
      <Icon name="chevron-right" size={20} className="text-muted" />
    </button>
  );
};
