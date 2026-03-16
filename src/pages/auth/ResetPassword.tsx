import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ShieldAlert } from "lucide-react";
import { authApi } from "@/api/auth";
import { cn } from "@/lib/utils";

const schema = z.object({
  newPassword: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Needs an uppercase letter")
    .regex(/[0-9]/, "Needs a number"),
});
type FormData = z.infer<typeof schema>;

const REQUIREMENTS = [
  { label: "At least 8 characters",  test: (v: string) => v.length >= 8 },
  { label: "One uppercase letter",   test: (v: string) => /[A-Z]/.test(v) },
  { label: "One number",             test: (v: string) => /[0-9]/.test(v) },
];

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError("");
    try {
      await authApi.resetPassword({ token, newPassword: data.newPassword });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setServerError(e?.response?.data?.message ?? "Reset failed. The link may have expired.");
    }
  };

  // ── Invalid token ──────────────────────────────────────────────
  if (!token) {
    return (
      <div className="text-center py-6">
        <div className="flex items-center justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-red-50 border-4 border-red-100 flex items-center justify-center">
            <ShieldAlert className="h-7 w-7 text-red-500" />
          </div>
        </div>
        <h2 className="text-[1.3rem] font-extrabold text-[#1E3A8A] mb-2">Invalid reset link</h2>
        <p className="text-[13px] text-slate-500 mb-5">
          This link is missing a token and cannot be used.
        </p>
        <Link
          to="/forgot-password"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:underline"
        >
          Request a new reset link →
        </Link>
      </div>
    );
  }

  // ── Success screen ─────────────────────────────────────────────
  if (success) {
    return (
      <motion.div
        className="text-center py-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="flex items-center justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
        </div>
        <h2 className="text-[1.4rem] font-extrabold text-[#1E3A8A] mb-2">Password reset!</h2>
        <p className="text-[13px] text-slate-500">Redirecting you to login…</p>
        <div className="mt-4 flex justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
        </div>
      </motion.div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[1.6rem] font-extrabold text-[#1E3A8A] tracking-tight leading-tight">
          Reset password 🔐
        </h2>
        <p className="text-[13px] text-slate-500 mt-1">
          Create a strong new password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {serverError}
          </motion.div>
        )}

        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            New password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              {...register("newPassword")}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Create a strong password"
              onChange={(e) => setPasswordValue(e.target.value)}
              className={cn(
                "w-full pl-9 pr-10 py-2.5 text-sm rounded-xl outline-none transition-all",
                "border bg-slate-50 placeholder:text-slate-400",
                "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white",
                errors.newPassword
                  ? "border-red-400 bg-red-50/40 focus:ring-red-400/20 focus:border-red-400"
                  : "border-slate-200 hover:border-slate-300"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Password requirements */}
          {passwordValue.length > 0 && (
            <div className="mt-2 space-y-1">
              {REQUIREMENTS.map(({ label, test }) => {
                const met = test(passwordValue);
                return (
                  <p key={label} className={cn(
                    "text-[11px] flex items-center gap-1.5 transition-colors",
                    met ? "text-emerald-600" : "text-slate-400"
                  )}>
                    <span className={cn(
                      "h-3.5 w-3.5 rounded-full border flex items-center justify-center flex-shrink-0 text-[8px] font-bold",
                      met ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-slate-300"
                    )}>
                      {met ? "✓" : ""}
                    </span>
                    {label}
                  </p>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm",
            "bg-gradient-to-r from-[#1E40AF] to-[#2563EB] hover:from-[#1E3A8A] hover:to-[#1E40AF]",
            "text-white shadow-sm hover:shadow-md transition-all active:scale-[0.99]",
            "disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
          )}
        >
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Resetting…</>
          ) : (
            <>Reset password <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </form>
    </div>
  );
}
