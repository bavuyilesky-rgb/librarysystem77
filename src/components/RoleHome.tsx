import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/** Routes the user to the correct home based on their role. */
export const RoleHome = () => {
  const { loading, user, isLibrarian, isStudent } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (isLibrarian) return <Navigate to="/admin" replace />;
  if (isStudent) return <Navigate to="/student" replace />;
  return <Navigate to="/auth" replace />;
};
