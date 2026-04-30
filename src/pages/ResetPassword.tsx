import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // When Supabase redirects from the reset email, it sets a recovery session.
    // Wait for it to land before showing the form.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords don't match");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-6 bg-accent-gradient">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="font-mono text-xs font-bold tracking-widest uppercase mb-2 text-accent-gradient">Nexus.LMS</div>
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Reset Password</div>
        </div>

        {!ready ? (
          <div className="bg-surface border border-edge p-6 text-center text-sm text-muted-foreground">
            Verifying recovery link…
          </div>
        ) : (
          <form onSubmit={submit} className="bg-surface border border-edge p-6 flex flex-col gap-4 ring-accent-glow">
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">New Password</span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background border border-edge px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Confirm Password</span>
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="bg-background border border-edge px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="mt-2 px-4 py-2.5 bg-primary text-primary-foreground text-xs font-mono font-bold uppercase tracking-wide hover:opacity-90 disabled:opacity-50 hover-lift"
            >
              {busy ? "Updating…" : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
