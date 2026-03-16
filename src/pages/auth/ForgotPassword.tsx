import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { authApi } from "@/api/auth";
import { cn } from "@/lib/utils";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    await authApi.forgotPassword(data);
    setSubmittedEmail(data.email);
    setSent(true);
  };

  // ── Success screen ────────────────────────────────────────────
  if (sent) {
    return (
      <motion.div
        className="text-center py-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="flex items-center justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-blue-50 border-4 border-blue-100 flex items-center justify-center">
            <Mail className="h-7 w-7 text-blue-500" />
          </div>
        </div>
        <h2 className="text-[1.4rem] font-extrabold text-[#1E3A8A] mb-2">Check your inbox</h2>
        <p className="text-[13px] text-slate-500 mb-1 max-w-xs mx-auto leading-relaxed">
          We sent a password reset link to
        </p>
        <p className="text-sm font-semibold text-[#1E3A8A] mb-6">{submittedEmail}</p>
        <p className="text-[12px] text-slate-400 mb-6">
          Didn't receive it? Check your spam folder or try again.
        </p>
        <button
          onClick={() => setSent(false)}
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:underline"
        >
          ← Try a different email
        </button>
      </motion.div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[1.6rem] font-extrabold text-[#1E3A8A] tracking-tight leading-tight">
          Forgot password?
        </h2>
        <p className="text-[13px] text-slate-500 mt-1">
          No worries — enter your email and we'll send a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="admin@school.edu.ng"
              className={cn(
                "w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all",
                "border bg-slate-50 placeholder:text-slate-400",
                "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white",
                errors.email
                  ? "border-red-400 bg-red-50/40 focus:ring-red-400/20 focus:border-red-400"
                  : "border-slate-200 hover:border-slate-300"
              )}
            />
          </div>
          {errors.email && (
            <p className="text-[12px] text-red-500 mt-1.5 flex items-center gap-1">
              <span className="font-bold">!</span> {errors.email.message}
            </p>
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
            <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
          ) : (
            <>Send reset link <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-[13px] text-blue-600 font-semibold hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to login
        </Link>
      </div>
    </div>
  );
}
