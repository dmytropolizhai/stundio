import type { ComponentType } from "react";
import {
  AppScreensArt,
  ChangesArt,
  NotificationArt,
  OfflineArt,
} from "@/ui/components/OnboardingArt.tsx";
import type { MessageKey } from "@/ui/i18n";

/**
 * Each slide leads with a working piece of the app rather than an icon standing in for one —
 * `art` is the component that demonstrates the promise the copy makes. See `OnboardingArt.tsx`.
 */
export type Slide = {
  art: ComponentType;
  title: MessageKey;
  body: MessageKey;
};

export const SLIDES: Slide[] = [
  {
    art: AppScreensArt,
    title: "onboarding.intro.step1.title",
    body: "onboarding.intro.step1.body",
  },
  {
    art: ChangesArt,
    title: "onboarding.intro.step2.title",
    body: "onboarding.intro.step2.body",
  },
  {
    art: OfflineArt,
    title: "onboarding.intro.step3.title",
    body: "onboarding.intro.step3.body",
  },
  {
    art: NotificationArt,
    title: "onboarding.intro.step4.title",
    body: "onboarding.intro.step4.body",
  },
];
