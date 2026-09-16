import { useState } from "react";
import { BottomSheet, Button, Card, Icon, TextField } from "@/ds";
import { useT } from "@/ui/i18n";
import { submitFeedback, type FeedbackType } from "@/ui/feedback.ts";

export type FeedbackSheetProps = {
  open: boolean;
  onClose: () => void;
  type?: FeedbackType | undefined;
  className?: string | undefined;
  onSubmitted?: (() => void) | undefined;
  title?: string | undefined;
  messageLabel?: string | undefined;
  messagePlaceholder?: string | undefined;
  submitLabel?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
};

export const FeedbackSheet = ({
  open,
  onClose,
  type = "suggestion",
  className,
  onSubmitted,
  title,
  messageLabel,
  messagePlaceholder,
  submitLabel,
  metadata,
}: FeedbackSheetProps) => {
  const t = useT();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBug = type === "bug";
  const sheetTitle =
    title ??
    (isSuccess
      ? isBug
        ? t("feedback.sheet.bugSuccessTitle")
        : t("feedback.sheet.successTitle")
      : isBug
        ? t("feedback.sheet.bugTitle")
        : t("feedback.sheet.title"));
  const resolvedMessageLabel =
    messageLabel ??
    (isBug ? t("feedback.sheet.bugMessageLabel") : t("feedback.sheet.messageLabel"));
  const resolvedPlaceholder =
    messagePlaceholder ??
    (isBug ? t("feedback.sheet.bugMessagePlaceholder") : t("feedback.sheet.messagePlaceholder"));
  const resolvedSubmitLabel =
    submitLabel ?? (isBug ? t("feedback.sheet.bugSubmit") : t("feedback.sheet.submit"));
  const submittingLabel = isBug
    ? t("feedback.sheet.bugSubmitting")
    : t("feedback.sheet.submitting");
  const successBody = isBug ? t("feedback.sheet.bugSuccessBody") : t("feedback.sheet.successBody");

  const resetForm = () => {
    setMessage("");
    setEmail("");
    setIsSubmitting(false);
    setIsSuccess(false);
    setErrorMessage(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
    setTimeout(() => {
      resetForm();
    }, 250);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await submitFeedback({
        type,
        message: message.trim(),
        email: email.trim() || undefined,
        className,
        metadata,
      });
      setIsSuccess(true);
      onSubmitted?.();
    } catch {
      setErrorMessage(t("feedback.sheet.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title={sheetTitle}
      footer={
        isSuccess ? (
          <Button block size="lg" onClick={handleClose}>
            {t("feedback.sheet.close")}
          </Button>
        ) : (
          <Button
            block
            size="lg"
            icon="send"
            onClick={() => void handleSubmit()}
            disabled={!message.trim() || isSubmitting}
          >
            {isSubmitting ? submittingLabel : resolvedSubmitLabel}
          </Button>
        )
      }
    >
      {isSuccess ? (
        <div className="flex flex-col items-center py-4 text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-pill bg-brand/15 text-brand-strong">
            <Icon name="check" size={28} />
          </div>
          <p className="font-text text-body text-muted">{successBody}</p>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="u-eyebrow">{resolvedMessageLabel}</span>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder={resolvedPlaceholder}
              rows={4}
              disabled={isSubmitting}
              className="w-full resize-none rounded-2xl bg-card p-4 font-text text-body text-strong placeholder:text-muted shadow-hairline outline-none transition-shadow focus:inset-ring-2 focus:inset-ring-brand-strong"
            />
          </label>

          <TextField
            label={t("feedback.sheet.emailLabel")}
            placeholder={t("feedback.sheet.emailPlaceholder")}
            value={email}
            onChange={(val) => setEmail(val)}
            type="email"
            disabled={isSubmitting}
          />

          {errorMessage && (
            <Card
              tone="sunken"
              radius="md"
              className="border-danger/30 bg-danger/10 p-3 font-text text-caption text-danger"
            >
              {errorMessage}
            </Card>
          )}
        </form>
      )}
    </BottomSheet>
  );
};
