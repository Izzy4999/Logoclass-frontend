import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number")
      .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

const REQUIREMENTS = [
  { label: "At least 8 characters",    test: (v: string) => v.length >= 8 },
  { label: "One uppercase letter",     test: (v: string) => /[A-Z]/.test(v) },
  { label: "One number",               test: (v: string) => /[0-9]/.test(v) },
  { label: "One special character",    test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

function PasswordInput({
  label, placeholder, reg, error, show, onToggle, autoComplete,
}: {
  label: string;
  placeholder: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reg: any;
  error?: string;
  show: boolean;
  onToggle: () => void;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          {...reg}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={cn(
            "w-full pl-9 pr-10 py-2.5 text-sm rounded-xl outline-none transition-all",
            "border bg-slate-50 placeholder:text-slate-400",
            "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white",
            error
              ? "border-red-400 bg-red-50/40 focus:ring-red-400/20 focus:border-red-400"
              : "border-slate-200 hover:border-slate-300"
          )}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && (
        <p className="text-[12px] text-red-500 mt-1.5 flex items-center gap-1">
          <span className="font-bold">!</span> {error}
        </p>
      )}
    </div>
  );
}

export default function ForceChangePassword() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState("");
  const [newPasswordValue, setNewPasswordValue] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError("");
    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      logout();
      navigate("/login", {
        replace: true,
        state: { message: "Password changed successfully. Please sign in with your new password." },
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setServerError(e?.response?.data?.message ?? "Failed to change password. Please try again.");
    }
  };

  return (
    <div>
      {/* Header with warning banner */}
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lock className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-amber-800">Action required</p>
            <p className="text-[12px] text-amber-700 mt-0.5 leading-relaxed">
              Your account uses a temporary password. Set a new password to continue.
            </p>
          </div>
        </div>
        <h2 className="text-[1.6rem] font-extrabold text-[#1E3A8A] tracking-tight leading-tight">
          Set your password 🔑
        </h2>
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

        {/* Current password */}
        <PasswordInput
          label="Temporary / current password"
          placeholder="Enter your temporary password"
          reg={register("currentPassword")}
          error={errors.currentPassword?.message}
          show={showCurrent}
          onToggle={() => setShowCurrent((v) => !v)}
          autoComplete="current-password"
        />

        {/* New password */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            New password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              {...register("newPassword")}
              type={showNew ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Create a strong password"
              onChange={(e) => setNewPasswordValue(e.target.value)}
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
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-[12px] text-red-500 mt-1.5 flex items-center gap-1">
              <span className="font-bold">!</span> {errors.newPassword.message}
            </p>
          )}

          {/* Password strength checklist */}
          {newPasswordValue.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              {REQUIREMENTS.map(({ label, test }) => {
                const met = test(newPasswordValue);
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

        {/* Confirm password */}
        <PasswordInput
          label="Confirm new password"
          placeholder="Re-enter your new password"
          reg={register("confirmPassword")}
          error={errors.confirmPassword?.message}
          show={showConfirm}
          onToggle={() => setShowConfirm((v) => !v)}
          autoComplete="new-password"
        />

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
            <><Loader2 className="h-4 w-4 animate-spin" /> Updating password…</>
          ) : (
            <>Set new password <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </form>
    </div>
  );
}
