import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BookOpen, BookMarked, History, Receipt, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { to: "/student", label: "Browse Books", icon: BookOpen, end: true },
  { to: "/student/my-books", label: "My Books", icon: BookMarked },
  { to: "/student/history", label: "History", icon: History },
  { to: "/student/fines", label: "Fines", icon: Receipt },
];

export const StudentLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="bg-background text-foreground min-h-dvh w-full flex flex-col antialiased">
      <header className="h-14 border-b border-edge flex items-center justify-between px-4 sm:px-8 shrink-0 bg-surface/50">
        <div className="flex items-center gap-6 min-w-0">
          <div className="font-mono text-xs font-bold tracking-widest uppercase shrink-0">
            Nexus.LMS
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 text-xs font-medium border transition-colors ${
                    isActive
                      ? "bg-surface-raised border-edge-lit text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-raised"
                  }`
                }
              >
                <it.icon className="size-3.5" />
                {it.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block font-mono text-[10px] uppercase tracking-widest text-muted-foreground truncate max-w-[160px]">
            {user?.email}
          </span>
          <button
            onClick={async () => {
              await signOut();
              navigate("/auth");
            }}
            className="flex items-center gap-2 px-3 py-1.5 border border-edge hover:bg-surface-raised text-xs font-mono uppercase tracking-wide transition-colors"
          >
            <LogOut className="size-3" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="md:hidden flex items-center gap-1 border-b border-edge px-4 py-2 overflow-x-auto bg-surface/50">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border whitespace-nowrap ${
                isActive
                  ? "bg-surface-raised border-edge-lit text-foreground"
                  : "border-transparent text-muted-foreground"
              }`
            }
          >
            <it.icon className="size-3.5" />
            {it.label}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 flex flex-col min-w-0 bg-background">
        <Outlet />
      </main>
    </div>
  );
};
