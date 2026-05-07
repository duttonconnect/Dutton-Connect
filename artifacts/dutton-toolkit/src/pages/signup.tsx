import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { UserPlus, Eye, EyeOff, AlertCircle, Loader2, Hammer, User, Users } from "lucide-react";

import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { type Role } from "@/lib/role";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RoleOption = "customer" | "pro" | "both";

export default function Signup() {
  const { signup, isConfigured } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const preselectedRole = params.get("role") === "pro" ? "pro" : "customer";
  const referralCode = params.get("ref") ?? "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleOption, setRoleOption] = useState<RoleOption>(preselectedRole);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const roles: Role[] = roleOption === "both"
        ? ["customer", "pro"]
        : [roleOption];
      await signup(email.trim(), password, name.trim(), roles);
      toast.success("Account created");
      setLocation("/");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Could not create account.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const roleOptions: { value: RoleOption; icon: React.ReactNode; label: string; sub: string }[] = [
    {
      value: "customer",
      icon: <User className="h-4 w-4" />,
      label: "Customer",
      sub: "I need work done",
    },
    {
      value: "pro",
      icon: <Hammer className="h-4 w-4" />,
      label: "Pro",
      sub: "I provide services",
    },
    {
      value: "both",
      icon: <Users className="h-4 w-4" />,
      label: "Both",
      sub: "Customer & Pro",
    },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "#F8FAFC" }}>
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <Link href="/">
          <span className="text-lg font-bold tracking-tight text-gray-900 cursor-pointer">Dutton Connect</span>
        </Link>
        <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Back
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Create account
            </h1>
            <p className="text-sm text-gray-500">
              Join Dutton Connect — it's free
            </p>
          </div>

          {!isConfigured && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              Firebase is not configured — account creation is unavailable.{" "}
              <Link href="/" className="underline font-medium">
                Continue without an account
              </Link>
            </div>
          )}

          {referralCode && (
            <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
              You were referred with code <strong>{referralCode}</strong>. Welcome to Dutton Connect!
            </div>
          )}

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Get started</CardTitle>
              <CardDescription>
                Your data syncs across devices once you sign in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Jane Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Role picker — 3 options */}
                <div>
                  <Label>I am a</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {roleOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRoleOption(opt.value)}
                        className={[
                          "rounded-md border px-2 py-3 text-left transition-colors",
                          roleOption === opt.value
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-1.5 font-medium text-sm">
                          {opt.icon}
                          {opt.label}
                        </div>
                        <div className="text-xs mt-0.5 text-gray-500">{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                  {roleOption === "both" && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      You'll start in Customer Mode — switch to Pro Mode anytime from the menu.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPw((p) => !p)}
                      tabIndex={-1}
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !isConfigured}
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account…</>
                  ) : (
                    <><UserPlus className="mr-2 h-4 w-4" /> Create account</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
