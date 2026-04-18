import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Account created. You're signed in.");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="font-mono text-xs font-bold tracking-widest uppercase mb-2">Nexus.LMS</div>
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            Library Management Terminal
          </div>
        </div>

        <form onSubmit={submit} className="bg-surface border border-edge p-6 flex flex-col gap-4">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            {mode === "signin" ? "Authenticate" : "Register Operator"}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background border border-edge px-3 py-2 text-sm font-mono focus:outline-none focus:border-info"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background border border-edge px-3 py-2 text-sm font-mono focus:outline-none focus:border-info"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="mt-2 px-4 py-2.5 bg-info text-background text-xs font-mono font-bold uppercase tracking-wide hover:bg-info/80 transition-colors disabled:opacity-50"
          >
            {busy ? "Processing…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground uppercase tracking-widest"
          >
            {mode === "signin" ? "Need an account? Register" : "Have an account? Sign in"}
          </button>
        </form>

        <p className="mt-6 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest text-center">
          First registered user becomes librarian
        </p>
      </div>
    </div>
  );
};

export default Auth;
