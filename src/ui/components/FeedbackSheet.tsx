import { useEffect, useRef, useState } from "react";
import { BottomSheet, Button, Card, Icon, TextField } from "@/ds";
import { useT } from "@/ui/i18n";
import { submitFeedback, type FeedbackType } from "@/ui/feedback.ts";

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB (Web3Forms limit)

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

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
  const [attachment, setAttachment] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const cleanupPreview = (url: string | null) => {
    if (url && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    return () => {
      cleanupPreview(previewUrl);
    };
  }, [previewUrl]);

  const resetForm = () => {
    setMessage("");
    setEmail("");
    cleanupPreview(previewUrl);
    setAttachment(null);
    setPreviewUrl(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setErrorMessage(t("feedback.sheet.screenshotTooLarge"));
      return;
    }

    cleanupPreview(previewUrl);
    setErrorMessage(null);
    setAttachment(file);
    if (typeof URL.createObjectURL === "function") {
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveAttachment = () => {
    cleanupPreview(previewUrl);
    setAttachment(null);
    setPreviewUrl(null);
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
        attachment: attachment ?? undefined,
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

          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              data-testid="screenshot-input"
              onChange={handleFileChange}
              disabled={isSubmitting}
            />
            {attachment ? (
              <div className="relative flex items-center gap-3 rounded-2xl bg-card p-3 shadow-hairline">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={attachment.name}
                    className="size-14 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-card-subtle text-muted">
                    <Icon name="image" size={24} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-text text-body-sm font-medium text-strong">
                    {attachment.name}
                  </p>
                  <p className="font-text text-caption text-muted">
                    {formatFileSize(attachment.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveAttachment}
                  disabled={isSubmitting}
                  aria-label={t("feedback.sheet.removeScreenshot")}
                  className="flex size-8 shrink-0 items-center justify-center rounded-pill text-muted transition-colors hover:bg-muted/15 hover:text-strong disabled:opacity-50"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="flex items-center gap-2 self-start rounded-xl px-3 py-2 font-text text-body-sm font-medium text-brand-strong transition-colors hover:bg-brand/10 disabled:opacity-50"
              >
                <Icon name="image" size={18} />
                <span>{t("feedback.sheet.attachScreenshot")}</span>
              </button>
            )}
          </div>

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
