import type { ComponentType } from "react";
import {
  AppScreensArt,
  ChangesArt,
  NotificationArt,
  OfflineArt,
} from "@/ui/components/OnboardingArt.tsx";
import type { MessageKey } from "@/ui/i18n";

/**
 * The unified welcome sequence: language selection first (so every slide after it renders in the
 * chosen locale), followed by four live Night / Day specimens of the app. Each step carries a DS
 * token in `glow` that tints the subtle ambient refraction behind the liquid-glass stage.
 */
export type Slide =
  | {
      kind: "language";
      title: MessageKey;
      glow: string;
    }
  | {
      kind: "feature";
      art: ComponentType;
      title: MessageKey;
      body: MessageKey;
      glow: string;
    };

export const SLIDES: Slide[] = [
  {
    kind: "language",
    title: "onboarding.language.title",
    glow: "var(--lamp)",
  },
  {
    kind: "feature",
    art: AppScreensArt,
    title: "onboarding.intro.step1.title",
    body: "onboarding.intro.step1.body",
    glow: "var(--lamp)",
  },
  {
    kind: "feature",
    art: ChangesArt,
    title: "onboarding.intro.step2.title",
    body: "onboarding.intro.step2.body",
    glow: "var(--accent-pink)",
  },
  {
    kind: "feature",
    art: OfflineArt,
    title: "onboarding.intro.step3.title",
    body: "onboarding.intro.step3.body",
    glow: "var(--accent-sky)",
  },
  {
    kind: "feature",
    art: NotificationArt,
    title: "onboarding.intro.step4.title",
    body: "onboarding.intro.step4.body",
    glow: "var(--accent-lilac)",
  },
];
