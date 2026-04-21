import { Settings2, Sun, Moon } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ACCENT_HSL, ACCENT_NAMES, usePreferences, WidgetKey } from "@/hooks/usePreferences";

const WIDGETS: { key: WidgetKey; label: string }[] = [
  { key: "stats", label: "Stat cards" },
  { key: "recent", label: "Recent activity" },
  { key: "overdue", label: "Low stock / overdue" },
  { key: "quick", label: "Quick actions" },
];

export const PreferencesMenu = ({ showWidgets = false }: { showWidgets?: boolean }) => {
  const { prefs, update } = usePreferences();

  const toggleWidget = (k: WidgetKey) => {
    const has = prefs.dashboard_widgets.includes(k);
    const next = has
      ? prefs.dashboard_widgets.filter((w) => w !== k)
      : [...prefs.dashboard_widgets, k];
    update({ dashboard_widgets: next });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Preferences"
          className="p-1.5 border border-edge hover:bg-surface-raised hover:border-edge-lit transition-all rounded-sm"
        >
          <Settings2 className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-3 bg-surface border-edge">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Theme</div>
        <div className="grid grid-cols-2 gap-1 mb-4">
          {(["light", "dark"] as const).map((t) => (
            <button
              key={t}
              onClick={() => update({ theme: t })}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 border text-xs font-mono uppercase transition-all ${
                prefs.theme === t ? "border-edge-lit bg-surface-raised" : "border-edge hover:bg-surface-raised"
              }`}
            >
              {t === "light" ? <Sun className="size-3" /> : <Moon className="size-3" />} {t}
            </button>
          ))}
        </div>

        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Accent</div>
        <div className="flex gap-1.5 mb-4">
          {ACCENT_NAMES.map((a) => (
            <button
              key={a}
              onClick={() => update({ accent: a })}
              aria-label={a}
              className={`size-7 rounded-full border-2 transition-transform hover:scale-110 ${
                prefs.accent === a ? "border-foreground" : "border-edge"
              }`}
              style={{ background: `hsl(${ACCENT_HSL[a].primary})` }}
            />
          ))}
        </div>

        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Density</div>
        <div className="grid grid-cols-2 gap-1 mb-1">
          {(["comfortable", "compact"] as const).map((d) => (
            <button
              key={d}
              onClick={() => update({ density: d })}
              className={`px-2 py-1.5 border text-xs font-mono uppercase transition-all ${
                prefs.density === d ? "border-edge-lit bg-surface-raised" : "border-edge hover:bg-surface-raised"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {showWidgets && (
          <>
            <div className="h-px bg-edge my-3" />
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Dashboard widgets</div>
            <div className="flex flex-col gap-1">
              {WIDGETS.map((w) => {
                const on = prefs.dashboard_widgets.includes(w.key);
                return (
                  <label key={w.key} className="flex items-center justify-between text-xs px-2 py-1.5 border border-edge hover:bg-surface-raised cursor-pointer">
                    <span>{w.label}</span>
                    <input type="checkbox" checked={on} onChange={() => toggleWidget(w.key)} className="accent-foreground" />
                  </label>
                );
              })}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
