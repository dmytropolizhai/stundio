/**
 * The React face of role resolution (`lib/persona`): screens and hooks ask *who* the user is
 * here, rather than each selecting `settings.persona` + the matching id and re-deriving it.
 *
 * `useIdentity` selects primitives and memoises the object — a selector returning a fresh
 * `Identity` would make `useSyncExternalStore` re-render forever.
 */
import { useMemo } from "react";
import { useAppStore } from "@/store";
import {
  identityKey,
  isIdentified,
  matchPersona,
  resolveIdentity,
  type Identity,
  type Persona,
} from "@/lib/persona";
import { useSelectedClass } from "@/ui/hooks/useClasses.ts";
import { useSelectedTeacher } from "@/ui/hooks/useTeachers.ts";
import type { FeedbackIdentity } from "@/ui/feedback.ts";
import { PERSONA_PROFILES, type PersonaProfile } from "./profiles.ts";

export const useIdentity = (): Identity => {
  const persona = useAppStore((s) => s.settings.persona);
  const selectedClassId = useAppStore((s) => s.settings.selectedClassId);
  const subgroup = useAppStore((s) => s.settings.subgroup);
  const selectedTeacherId = useAppStore((s) => s.settings.selectedTeacherId);
  const teacherView = useAppStore((s) => s.settings.teacherView);

  return useMemo(
    () => resolveIdentity({ persona, selectedClassId, subgroup, selectedTeacherId, teacherView }),
    [persona, selectedClassId, subgroup, selectedTeacherId, teacherView],
  );
};

export type PersonaContext = {
  persona: Persona;
  identity: Identity;
  profile: PersonaProfile;
  /** The role's selection is made — false routes to onboarding / the "pick one" empty state. */
  identified: boolean;
  /** Changes exactly when the role's resolved schedule would — use it as a memo dep. */
  key: string;
};

export const usePersona = (): PersonaContext => {
  const identity = useIdentity();
  return useMemo(
    () => ({
      persona: identity.persona,
      identity,
      profile: PERSONA_PROFILES[identity.persona],
      identified: isIdentified(identity),
      key: identityKey(identity),
    }),
    [identity],
  );
};

/** A teacher who is some class's audzinātājs — the only role that gets the own/form-class switch. */
export const useIsFormTeacher = (): boolean => {
  const { persona } = useIdentity();
  const selectedTeacher = useSelectedTeacher();
  return persona === "teacher" && (selectedTeacher?.formClassIds.length ?? 0) > 0;
};

/**
 * Whom the active role is looking at, as a display string: the class short for a student, the
 * teacher's short (or full name) for a teacher. `undefined` while nothing is picked or cached.
 */
export const useIdentityLabel = (): string | undefined => {
  const identity = useIdentity();
  const selectedClass = useSelectedClass();
  const selectedTeacher = useSelectedTeacher();
  return matchPersona(identity, {
    student: () => selectedClass?.short,
    teacher: () => selectedTeacher?.short || selectedTeacher?.name || undefined,
  });
};

/** The role context every feedback report carries (`ui/feedback.ts`). */
export const useFeedbackIdentity = (): FeedbackIdentity => {
  const { persona } = useIdentity();
  const label = useIdentityLabel();
  return useMemo(() => ({ persona, label }), [persona, label]);
};
