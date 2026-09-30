import { Button, Card, Icon } from "@/ds";
import { Sheet } from "../../components/Sheet.tsx";
import { useT } from "@/ui/i18n";
import { useAppStore } from "@/store";

export type TeacherAnnouncementSheetProps = {
  open: boolean;
  onClose: () => void;
};

export const TeacherAnnouncementSheet = ({ open, onClose }: TeacherAnnouncementSheetProps) => {
  const t = useT();
  const setPersona = useAppStore((s) => s.setPersona);
  const trackEvent = useAppStore((s) => s.trackEvent);

  const steps = [
    {
      num: "1",
      title: t("teacherAnnouncement.step1.title"),
      desc: t("teacherAnnouncement.step1.desc"),
    },
    {
      num: "2",
      title: t("teacherAnnouncement.step2.title"),
      desc: t("teacherAnnouncement.step2.desc"),
    },
    {
      num: "3",
      title: t("teacherAnnouncement.step3.title"),
      desc: t("teacherAnnouncement.step3.desc"),
    },
  ];

  return (
    <Sheet open={open} onClose={onClose} title={t("teacherAnnouncement.title")}>
      <div className="pb-2">
        <div className="flex flex-col items-center text-center pt-4 pb-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-sm mb-4">
            <Icon name="briefcase" size={24} />
          </div>
          <h2 className="font-display text-heading font-extrabold text-strong">
            {t("teacherAnnouncement.headline")}
          </h2>
          <p className="mt-1.5 font-text text-body text-muted max-w-70">
            {t("teacherAnnouncement.subtitle")}
          </p>
        </div>

        <div className="mt-2 space-y-2.5">
          {steps.map((step) => (
            <Card key={step.num} tone="custom" className="flex items-center gap-3.5 p-3.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full font-display text-caption font-bold text-strong shadow-sm bg-surface">
                {step.num}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-text text-body font-bold text-strong leading-snug">
                  {step.title}
                </p>
                <p className="font-text text-caption text-muted leading-tight mt-0.5">
                  {step.desc}
                </p>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-5 space-y-2">
          <Button
            variant="primary"
            block
            onClick={() => {
              trackEvent("teacher_announcement_try");
              void setPersona("teacher");
              onClose();
            }}
          >
            {t("teacherAnnouncement.tryIt")}
          </Button>
          <Button variant="inverse" block onClick={onClose}>
            {t("teacherAnnouncement.done")}
          </Button>
        </div>
      </div>
    </Sheet>
  );
};
