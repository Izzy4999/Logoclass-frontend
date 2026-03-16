import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
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

export default function ForceChangePassword() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError("");
    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      // Password changed — tokens were revoked server-side, so log out and redirect to login
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
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
          <KeyRound className="h-5 w-5" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Change your password</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Your account uses a temporary password. Please create a new password to continue.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
          >
            {serverError}
          </motion.div>
        )}

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
              placeholder="Enter your temporary password"
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
          <label className="block text-sm font-medium text-foreground mb-1.5">New password</label>
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
            Min 8 characters, 1 uppercase, 1 number, 1 special character
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
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-brand-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Updating password..." : "Set new password"}
        </button>
      </form>
    </div>
  );
}
