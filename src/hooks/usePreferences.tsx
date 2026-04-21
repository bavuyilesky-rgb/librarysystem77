import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AccentName = "sky" | "violet" | "emerald" | "amber" | "rose";
export type ThemeName = "light" | "dark";
export type Density = "comfortable" | "compact";
export type WidgetKey = "stats" | "recent" | "overdue" | "quick";

export interface Preferences {
  theme: ThemeName;
  accent: AccentName;
  density: Density;
  dashboard_widgets: WidgetKey[];
}

const DEFAULTS: Preferences = {
  theme: "light",
  accent: "sky",
  density: "comfortable",
  dashboard_widgets: ["stats", "recent", "overdue", "quick"],
};

// HSL color tokens per accent (h s% l%)
const ACCENTS: Record<AccentName, { primary: string; ring: string; info: string }> = {
  sky: { primary: "199 89% 45%", ring: "199 89% 45%", info: "199 89% 45%" },
  violet: { primary: "262 83% 58%", ring: "262 83% 58%", info: "262 83% 58%" },
  emerald: { primary: "160 84% 39%", ring: "160 84% 39%", info: "160 84% 39%" },
  amber: { primary: "32 95% 50%", ring: "32 95% 50%", info: "32 95% 50%" },
  rose: { primary: "346 77% 50%", ring: "346 77% 50%", info: "346 77% 50%" },
};

interface Ctx {
  prefs: Preferences;
  loading: boolean;
  update: (patch: Partial<Preferences>) => Promise<void>;
}
const PrefCtx = createContext<Ctx>({ prefs: DEFAULTS, loading: true, update: async () => {} });

const applyToDOM = (p: Preferences) => {
  const root = document.documentElement;
  root.classList.toggle("dark", p.theme === "dark");
  root.dataset.density = p.density;
  const a = ACCENTS[p.accent];
  root.style.setProperty("--primary", a.primary);
  root.style.setProperty("--ring", a.ring);
  root.style.setProperty("--info", a.info);
  root.style.setProperty("--sidebar-primary", a.primary);
  root.style.setProperty("--sidebar-ring", a.ring);
};

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>(() => {
    try {
      const cached = localStorage.getItem("ui-prefs");
      if (cached) return { ...DEFAULTS, ...JSON.parse(cached) };
    } catch { /* ignore */ }
    return DEFAULTS;
  });
  const [loading, setLoading] = useState(true);

  // Apply on mount + whenever prefs change
  useEffect(() => {
    applyToDOM(prefs);
    try { localStorage.setItem("ui-prefs", JSON.stringify(prefs)); } catch { /* ignore */ }
  }, [prefs]);

  // Load from server when user is known
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_preferences")
        .select("theme,accent,density,dashboard_widgets")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setPrefs({
          theme: (data.theme as ThemeName) || DEFAULTS.theme,
          accent: (data.accent as AccentName) || DEFAULTS.accent,
          density: (data.density as Density) || DEFAULTS.density,
          dashboard_widgets: Array.isArray(data.dashboard_widgets)
            ? (data.dashboard_widgets as WidgetKey[])
            : DEFAULTS.dashboard_widgets,
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const update = useCallback(async (patch: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      if (user) {
        supabase.from("user_preferences").upsert({
          user_id: user.id,
          ...next,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" }).then(() => {});
      }
      return next;
    });
  }, [user?.id]);

  return <PrefCtx.Provider value={{ prefs, loading, update }}>{children}</PrefCtx.Provider>;
};

export const usePreferences = () => useContext(PrefCtx);
export const ACCENT_NAMES: AccentName[] = ["sky", "violet", "emerald", "amber", "rose"];
export const ACCENT_HSL = ACCENTS;
