import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

type Role = "librarian" | "student";

export const ProtectedRoute = ({
  children,
  role,
}: {
  children: React.ReactNode;
  role: Role;
}) => {
  const { user, loading, isLibrarian, isStudent } = useAuth();

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

  if (role === "librarian" && !isLibrarian) {
    // Librarian area, but user is a student → send to student portal
    if (isStudent) return <Navigate to="/student" replace />;
    return <AccessDenied label="Librarian role required." />;
  }

  if (role === "student" && !isStudent && !isLibrarian) {
    return <AccessDenied label="Student role required." />;
  }

  return <>{children}</>;
};

const AccessDenied = ({ label }: { label: string }) => (
  <div className="h-dvh flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="font-mono text-xs text-destructive uppercase tracking-widest mb-2">
        Access Denied
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  </div>
);
