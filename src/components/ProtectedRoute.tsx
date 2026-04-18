import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isLibrarian } = useAuth();
  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
          Authenticating…
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isLibrarian) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="font-mono text-xs text-destructive uppercase tracking-widest mb-2">Access Denied</div>
          <div className="text-sm text-muted-foreground">Librarian role required.</div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};
