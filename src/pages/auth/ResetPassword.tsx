import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { authApi } from "@/api/auth";
import { cn } from "@/lib/utils";

const schema = z.object({
  newPassword: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Needs uppercase letter")
    .regex(/[0-9]/, "Needs a number"),
});
type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError("");
    try {
      await authApi.resetPassword({ token, newPassword: data.newPassword });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setServerError(e?.response?.data?.message ?? "Reset failed. The link may have expired.");
    }
  };

  if (!token) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">Invalid reset link.</p>
        <Link to="/forgot-password" className="text-primary font-medium hover:underline text-sm mt-2 block">
          Request a new one
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 className="h-12 w-12 text-cta mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Password reset!</h2>
        <p className="text-sm text-muted-foreground">Redirecting to login…</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-1">Reset password</h2>
      <p className="text-sm text-muted-foreground mb-6">Enter your new password below.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{serverError}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">New password</label>
          <input
            {...register("newPassword")}
            type="password"
            placeholder="••••••••"
            className={cn(
              "w-full px-3 py-2 text-sm border rounded-lg outline-none transition focus:ring-2 focus:ring-primary/30 focus:border-primary",
              errors.newPassword ? "border-destructive" : "border-input"
            )}
          />
          {errors.newPassword && (
            <p className="text-xs text-destructive mt-1">{errors.newPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-brand-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Resetting…" : "Reset password"}
        </button>
      </form>
    </div>
  );
}
