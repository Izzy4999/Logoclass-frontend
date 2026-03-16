import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, CheckCircle2, KeyRound } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { usersApi } from "@/api/users";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { formatDate, cn } from "@/lib/utils";

const pwSchema = z
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

type PwForm = z.infer<typeof pwSchema>;

export default function Profile() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => usersApi.getMe(),
  });

  const user = data?.data?.data;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PwForm>({ resolver: zodResolver(pwSchema) });

  const onSubmit = async (form: PwForm) => {
    setServerError("");
    setSuccess(false);
    try {
      await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      // Server revokes all tokens on password change — log out and redirect
      setSuccess(true);
      reset();
      setTimeout(() => {
        logout();
        navigate("/login", {
          replace: true,
          state: { message: "Password changed successfully. Please sign in with your new password." },
        });
      }, 1800);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setServerError(e?.response?.data?.message ?? "Failed to change password. Try again.");
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl">
      <PageHeader title="My Profile" description="Manage your account and password" />

      {user && (
        <>
          {/* ── Profile info ───────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">{user.firstName} {user.lastName}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {user.role && (
                  <span className="mt-1 inline-block text-xs bg-brand-50 text-primary px-2 py-0.5 rounded-full font-medium">
                    {user.role.name}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                { label: "First Name",    value: user.firstName },
                { label: "Last Name",     value: user.lastName },
                { label: "Email",         value: user.email },
                { label: "Phone",         value: user.phone ?? "—" },
                { label: "Member Since",  value: formatDate(user.createdAt) },
                { label: "School",        value: user.tenant?.name ?? "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-muted-foreground font-medium mb-1">{label}</p>
                  <p className="font-medium text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Change password ────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <KeyRound className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-foreground">Change Password</h3>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <AnimatePresence mode="wait">
                {serverError && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                  >
                    {serverError}
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-3 rounded-lg bg-green-50 text-green-700 text-sm flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    Password updated! Signing you out…
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Current password */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Current password
                </label>
                <div className="relative">
                  <input
                    {...register("currentPassword")}
                    type={showCurrent ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your current password"
                    className={cn(
                      "w-full px-3 py-2 pr-10 text-sm border rounded-lg outline-none transition",
                      "focus:ring-2 focus:ring-primary/30 focus:border-primary",
                      errors.currentPassword ? "border-destructive" : "border-input"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-xs text-destructive mt-1">{errors.currentPassword.message}</p>
                )}
              </div>

              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <input
                    {...register("newPassword")}
                    type={showNew ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    className={cn(
                      "w-full px-3 py-2 pr-10 text-sm border rounded-lg outline-none transition",
                      "focus:ring-2 focus:ring-primary/30 focus:border-primary",
                      errors.newPassword ? "border-destructive" : "border-input"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-xs text-destructive mt-1">{errors.newPassword.message}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Min 8 chars · 1 uppercase · 1 number · 1 special character
                </p>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Confirm new password
                </label>
                <input
                  {...register("confirmPassword")}
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
                  className={cn(
                    "w-full px-3 py-2 text-sm border rounded-lg outline-none transition",
                    "focus:ring-2 focus:ring-primary/30 focus:border-primary",
                    errors.confirmPassword ? "border-destructive" : "border-input"
                  )}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || success}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-brand-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? "Updating password…" : "Update Password"}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
