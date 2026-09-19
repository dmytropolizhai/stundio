import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store";
import { listSubgroups } from "@/lib/edupage";
import { useClasses, type ClassOption } from "@/ui/hooks/useClasses.ts";
import { StateMessage } from "@/ui/components/StateMessage.tsx";
import { ClassSearch } from "./class-search.tsx";
import { ClassList } from "./class-list.tsx";
import { SubgroupPicker } from "@/ui/screens/SubgroupPicker.tsx";
import { useBackButton } from "@/ui/hooks/useBackButton.ts";

type ClassSelectorProps = {
  onPicked?: () => void;
};

export const ClassSelector = ({ onPicked }: ClassSelectorProps) => {
  const classes = useClasses();
  const timetables = useAppStore((s) => s.timetables);
  const selected = useAppStore((s) => s.settings.selectedClassId);
  const favorites = useAppStore((s) => s.settings.favorites);
  const setClass = useAppStore((s) => s.setClass);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const refresh = useAppStore((s) => s.refresh);

  const [query, setQuery] = useState("");
  const [askSubgroupFor, setAskSubgroupFor] = useState<ClassOption | null>(null);

  useBackButton(
    () => {
      setAskSubgroupFor(null);
    },
    { enabled: askSubgroupFor !== null, priority: 20 },
  );

  useEffect(() => {
    if (classes.length === 0) {
      void refresh();
    }
  }, [classes.length, refresh]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (needle === "") {
      return classes;
    }

    return classes.filter(
      (cls) => cls.short.toLowerCase().includes(needle) || cls.name.toLowerCase().includes(needle),
    );
  }, [classes, query]);

  const pick = (cls: ClassOption) => {
    const subgroups = listSubgroups(Object.values(timetables), cls.id);

    if (subgroups.length > 1) {
      setAskSubgroupFor(cls);
      return;
    }

    void setClass(cls.id);
    onPicked?.();
  };

  if (askSubgroupFor !== null) {
    return (
      <SubgroupPicker
        cls={askSubgroupFor}
        onDone={() => {
          setAskSubgroupFor(null);
          onPicked?.();
        }}
      />
    );
  }

  if (classes.length === 0) {
    return <StateMessage icon="cloud" title="Loading" hint="Please wait..." />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ClassSearch value={query} onChange={setQuery} />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-gutter pb-26">
        <ClassList
          classes={matches}
          favorites={favorites}
          selected={selected}
          onSelect={pick}
          onToggleFavorite={(id) => {
            void toggleFavorite(id);
          }}
        />
      </div>
    </div>
  );
};
