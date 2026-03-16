import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Building2, User, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { authApi } from "@/api/auth";
import { cn } from "@/lib/utils";

const schema = z.object({
  schoolName: z.string().min(2, "School name must be at least 2 characters"),
  firstName:  z.string().min(1, "First name is required"),
  lastName:   z.string().min(1, "Last name is required"),
  email:      z.string().email("Enter a valid email"),
});
type FormData = z.infer<typeof schema>;

function Field({
  label, icon: Icon, error, children,
}: {
  label: string;
  icon: React.ElementType;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
        {children}
      </div>
      {error && (
        <p className="text-[12px] text-red-500 mt-1.5 flex items-center gap-1">
          <span className="font-bold">!</span> {error}
        </p>
      )}
    </div>
  );
}

const inputCls = (hasError?: boolean) =>
  cn(
    "w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all",
    "border bg-slate-50 placeholder:text-slate-400",
    "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white",
    hasError
      ? "border-red-400 bg-red-50/40 focus:ring-red-400/20 focus:border-red-400"
      : "border-slate-200 hover:border-slate-300"
  );

export default function Register() {
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError("");
    try {
      await authApi.register(data);
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setServerError(e?.response?.data?.message ?? "Registration failed.");
    }
  };

  // ── Success screen ────────────────────────────────────────────
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
        <h2 className="text-[1.4rem] font-extrabold text-[#1E3A8A] mb-2">Application Submitted!</h2>
        <p className="text-[13px] text-slate-500 mb-6 max-w-xs mx-auto leading-relaxed">
          Your school registration is pending approval. You'll receive login credentials
          by email once your account is activated.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:underline"
        >
          ← Back to login
        </Link>
      </motion.div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[1.6rem] font-extrabold text-[#1E3A8A] tracking-tight leading-tight">
          Register your school 🏫
        </h2>
        <p className="text-[13px] text-slate-500 mt-1">
          Get started on LogosClass — it's free to apply
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

        {/* School name */}
        <Field label="School name" icon={Building2} error={errors.schoolName?.message}>
          <input
            {...register("schoolName")}
            placeholder="e.g. Greenfield Academy"
            className={inputCls(!!errors.schoolName)}
          />
        </Field>

        {/* First + Last name */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" icon={User} error={errors.firstName?.message}>
            <input
              {...register("firstName")}
              placeholder="Favour"
              className={inputCls(!!errors.firstName)}
            />
          </Field>
          <Field label="Last name" icon={User} error={errors.lastName?.message}>
            <input
              {...register("lastName")}
              placeholder="Taiwo"
              className={inputCls(!!errors.lastName)}
            />
          </Field>
        </div>

        {/* Email */}
        <Field label="Email address" icon={Mail} error={errors.email?.message}>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder="admin@school.edu.ng"
            className={inputCls(!!errors.email)}
          />
        </Field>

        {/* Submit */}
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
            <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
          ) : (
            <>Register school <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 text-center">
        <p className="text-[13px] text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 font-semibold hover:underline">
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}
