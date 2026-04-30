import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Mode = "signin" | "signup" | "forgot";

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) throw new Error("Please enter your full name");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { name: name.trim(), phone: phone.trim() || null },
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your email for your member code.");
        navigate("/");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Reset link sent. Check your email.");
        setMode("signin");
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

  const title =
    mode === "signin" ? "Authenticate" : mode === "signup" ? "Register Operator" : "Recover Account";

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-6 bg-accent-gradient">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="font-mono text-xs font-bold tracking-widest uppercase mb-2 text-accent-gradient">Nexus.LMS</div>
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            Library Management System
          </div>
        </div>

        <form onSubmit={submit} className="bg-surface border border-edge p-6 flex flex-col gap-4 ring-accent-glow">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{title}</div>

          {mode === "signup" && (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Full name</span>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background border border-edge px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary transition-colors"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Phone number</span>
                <input
                  type="tel"
                  maxLength={32}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                  className="bg-background border border-edge px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary transition-colors"
                />
              </label>
            </>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background border border-edge px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary transition-colors"
            />
          </label>

          {mode !== "forgot" && (
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background border border-edge px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary transition-colors"
              />
            </label>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 px-4 py-2.5 bg-primary text-primary-foreground text-xs font-mono font-bold uppercase tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50 hover-lift"
          >
            {busy
              ? "Processing…"
              : mode === "signin"
                ? "Sign In"
                : mode === "signup"
                  ? "Create Account"
                  : "Send Reset Link"}
          </button>

          <div className="flex flex-col gap-1.5 items-center">
            {mode === "signin" && (
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-[11px] font-mono text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors"
              >
                Forgot password?
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-[11px] font-mono text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors"
            >
              {mode === "signup" ? "Have an account? Sign in" : mode === "forgot" ? "Back to sign in" : "Need an account? Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;
