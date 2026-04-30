import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { PreferencesProvider } from "@/hooks/usePreferences";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { StudentLayout } from "@/components/StudentLayout";
import { RoleHome } from "@/components/RoleHome";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Books from "./pages/Books";
import Transactions from "./pages/Transactions";
import Members from "./pages/Members";
import Settings from "./pages/Settings";
import StudentBrowse from "./pages/student/Browse";
import MyBooks from "./pages/student/MyBooks";
import History from "./pages/student/History";
import Fines from "./pages/student/Fines";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PreferencesProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Role-based redirect from root */}
            <Route path="/" element={<RoleHome />} />

            {/* Librarian area */}
            <Route element={<ProtectedRoute role="librarian"><AppLayout /></ProtectedRoute>}>
              <Route path="/admin" element={<Dashboard />} />
              <Route path="/books" element={<Books />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/members" element={<Members />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Student area */}
            <Route element={<ProtectedRoute role="student"><StudentLayout /></ProtectedRoute>}>
              <Route path="/student" element={<StudentBrowse />} />
              <Route path="/student/my-books" element={<MyBooks />} />
              <Route path="/student/history" element={<History />} />
              <Route path="/student/fines" element={<Fines />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          </PreferencesProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
