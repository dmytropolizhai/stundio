import type { MessageKey } from "@/ui/i18n";

/** Riga minutes since midnight → which greeting fits. */
export const greetingKey = (minutes: number): MessageKey => {
  const hour = Math.floor(minutes / 60);
  if (hour >= 5 && hour < 12) return "home.greeting.morning";
  if (hour >= 12 && hour < 18) return "home.greeting.day";
  if (hour >= 18 && hour < 23) return "home.greeting.evening";
  return "home.greeting.night";
};
