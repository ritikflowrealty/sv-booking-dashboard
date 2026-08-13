"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0fdfa] px-4">
      <div className="w-full max-w-sm mx-4">
        <div className="bg-white rounded-[18px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <Image
                src="/logo.png"
                alt="Flow Realty"
                width={64}
                height={64}
                className="rounded-[14px]"
              />
            </div>
            <h1 className="text-xl font-semibold text-[#1a1a2e] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Flow Realty
            </h1>
            <p className="text-[13px] text-[#64748b] mt-1">SV and Booking Dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] px-3.5 py-2.5 rounded-[10px] text-[13px]">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#e8eced] rounded-[10px] text-[14px] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30 focus:border-[#0d9488]"
                placeholder="you@flowrealty.in"
                required
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#e8eced] rounded-[10px] text-[14px] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#0d9488]/30 focus:border-[#0d9488]"
                placeholder="Enter password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#115e59] hover:bg-[#0c4a46] text-white font-medium py-2.5 px-4 rounded-[10px] text-[14px] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
