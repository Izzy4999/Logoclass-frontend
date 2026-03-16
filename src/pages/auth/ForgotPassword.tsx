import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { authApi } from "@/api/auth";
import { cn } from "@/lib/utils";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    await authApi.forgotPassword(data);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 className="h-12 w-12 text-cta mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Check your email</h2>
        <p className="text-sm text-muted-foreground mb-6">
          If this email is registered, you'll receive a password reset link shortly.
        </p>
        <Link to="/login" className="text-primary font-medium hover:underline text-sm">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-1">Forgot password</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Enter your email and we'll send a reset link.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
          <input
            {...register("email")}
            type="email"
            placeholder="admin@school.edu.ng"
            className={cn(
              "w-full px-3 py-2 text-sm border rounded-lg outline-none transition focus:ring-2 focus:ring-primary/30 focus:border-primary",
              errors.email ? "border-destructive" : "border-input"
            )}
          />
          {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-brand-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="text-sm text-center text-muted-foreground mt-6">
        <Link to="/login" className="text-primary font-medium hover:underline">Back to login</Link>
      </p>
    </div>
  );
}
