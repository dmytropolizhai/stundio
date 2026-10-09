import { Icon } from "@/ds/components/ui/icon";
import type { IconName } from "@/ds/components/ui/icon";
import { IconButton, Popover, PopoverContent, PopoverTrigger, cn } from "@/ds";
import { useT } from "@/ui/i18n";

export type ViewOption = {
  key: string;
  icon: IconName;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/**
 * The screen-header shortcut to a view's display toggles — a plain list of icon + text rows in an
 * anchored popover, so the switches no longer live at the very bottom of Home / Week.
 */
export const ViewOptionsMenu = ({ options }: { options: ViewOption[] }) => {
  const t = useT();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton
          icon="sliders-horizontal"
          label={t("view.options")}
          variant="bare"
          size="sm"
          data-testid="view-options"
        />
      </PopoverTrigger>

      <PopoverContent align="end" className="p-1.5" aria-label={t("view.options")}>
        <div role="group" className="flex flex-col">
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              role="switch"
              aria-checked={option.checked}
              onClick={() => {
                option.onChange(!option.checked);
              }}
              className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl border-0 bg-transparent px-3 text-left hover:bg-sunken"
            >
              <Icon
                name={option.icon}
                size={18}
                className={option.checked ? "text-strong" : "text-muted"}
              />
              <span className="flex-1 font-text text-body font-bold text-strong">
                {option.label}
              </span>
              <Icon
                name="check"
                size={18}
                className={cn("text-strong", !option.checked && "invisible")}
              />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
