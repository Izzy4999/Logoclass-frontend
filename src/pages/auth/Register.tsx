import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { authApi } from "@/api/auth";
import { cn } from "@/lib/utils";

const schema = z.object({
  schoolName: z.string().min(2, "School name must be at least 2 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
});

type FormData = z.infer<typeof schema>;

export default function Register() {
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

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

  if (success) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 className="h-12 w-12 text-cta mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Application Submitted!</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your school registration is pending approval. We'll email your credentials once
          your account is activated.
        </p>
        <Link to="/login" className="text-primary font-medium hover:underline text-sm">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-1">Register your school</h2>
      <p className="text-sm text-muted-foreground mb-6">Get started with LogosClass</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {serverError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">School name</label>
          <input
            {...register("schoolName")}
            placeholder="Greenfield Academy"
            className={cn(
              "w-full px-3 py-2 text-sm border rounded-lg outline-none transition focus:ring-2 focus:ring-primary/30 focus:border-primary",
              errors.schoolName ? "border-destructive" : "border-input"
            )}
          />
          {errors.schoolName && <p className="text-xs text-destructive mt-1">{errors.schoolName.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">First name</label>
            <input
              {...register("firstName")}
              placeholder="Favour"
              className={cn(
                "w-full px-3 py-2 text-sm border rounded-lg outline-none transition focus:ring-2 focus:ring-primary/30 focus:border-primary",
                errors.firstName ? "border-destructive" : "border-input"
              )}
            />
            {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Last name</label>
            <input
              {...register("lastName")}
              placeholder="Taiwo"
              className={cn(
                "w-full px-3 py-2 text-sm border rounded-lg outline-none transition focus:ring-2 focus:ring-primary/30 focus:border-primary",
                errors.lastName ? "border-destructive" : "border-input"
              )}
            />
            {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName.message}</p>}
          </div>
        </div>

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
          {isSubmitting ? "Submitting…" : "Register school"}
        </button>
      </form>

      <p className="text-sm text-center text-muted-foreground mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
