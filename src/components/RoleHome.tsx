import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/** Routes the user to the correct home based on their role. */
export const RoleHome = () => {
  const { loading, user, isLibrarian, isStudent } = useAuth();

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
          Loading…
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (isLibrarian) return <Navigate to="/admin" replace />;
  if (isStudent) return <Navigate to="/student" replace />;

  // Logged in but role hasn't hydrated yet — brief wait.
  return (
    <div className="h-dvh flex items-center justify-center bg-background">
      <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
        Loading workspace…
      </div>
    </div>
  );
};
