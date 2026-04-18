import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, BookOpen, ArrowLeftRight, Users, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { to: "/", label: "Matrix Overview", icon: LayoutDashboard, code: "01" },
  { to: "/books", label: "Asset Registry", icon: BookOpen, code: "02" },
  { to: "/transactions", label: "Transit Logs", icon: ArrowLeftRight, code: "03" },
  { to: "/members", label: "Node Patrons", icon: Users, code: "04" },
  { to: "/settings", label: "System Config", icon: Settings, code: "05" },
];

export const AppLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="bg-background text-foreground h-dvh w-full flex overflow-hidden antialiased">
      <aside className="w-64 border-r border-edge flex flex-col justify-between shrink-0 bg-surface/50">
        <div>
          <div className="h-14 border-b border-edge px-5 flex items-center justify-between">
            <div className="font-mono text-xs font-bold tracking-widest uppercase">Nexus.LMS</div>
            <div className="size-1.5 bg-info rounded-none animate-pulse" />
          </div>
          <nav className="p-3 flex flex-col gap-0.5">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 border transition-colors ${
                    isActive
                      ? "bg-surface-raised border-edge-lit text-foreground"
                      : "border-transparent hover:border-edge text-muted-foreground hover:text-foreground hover:bg-surface-raised"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`font-mono text-[10px] ${isActive ? "text-info" : "text-muted-foreground/60"}`}>
                      {it.code}
                    </span>
                    <span className="text-sm font-medium">{it.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="p-5 border-t border-edge">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2 truncate">
            {user?.email}
          </div>
          <button
            onClick={async () => { await signOut(); navigate("/auth"); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-edge hover:bg-surface-raised text-xs font-mono uppercase tracking-wide transition-colors"
          >
            <LogOut className="size-3" /> Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};
