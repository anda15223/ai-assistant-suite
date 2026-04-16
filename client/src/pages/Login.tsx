import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useLocation } from "wouter";
import { LayoutDashboard, LogIn } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      navigate("/dashboard");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc] p-4">
      <Card className="w-full max-w-md border-[#e5e7eb] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-[#eef2ff] border border-[#e5e7eb] flex items-center justify-center">
            <LayoutDashboard className="w-6 h-6 text-[#6366f1]" />
          </div>
          <CardTitle className="text-2xl text-[#111827]">Sign In</CardTitle>
          <CardDescription className="text-[#6b7280]">Sign in to your AI Suite account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-[#ef4444] bg-[#fee2e2] border border-[#fecaca] rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#111827]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-[#e5e7eb] focus:border-[#6366f1] focus:ring-[#6366f1]/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#111827]">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-[#e5e7eb] focus:border-[#6366f1] focus:ring-[#6366f1]/20"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white"
              disabled={loginMutation.isPending}
            >
              <LogIn className="w-4 h-4 mr-2" />
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
            <p className="text-center text-sm text-[#6b7280]">
              Don't have an account?{" "}
              <a href="/register" className="text-[#6366f1] hover:underline font-medium">
                Create one
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
