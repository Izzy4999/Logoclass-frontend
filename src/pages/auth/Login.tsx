import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, ShieldCheck, BookOpen, GraduationCap, Users } from "lucide-react";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

const ROLES = [
  { label: "Admin",   icon: ShieldCheck,    color: "bg-blue-50 text-blue-700 border-blue-100" },
  { label: "Teacher", icon: BookOpen,        color: "bg-green-50 text-green-700 border-green-100" },
  { label: "Student", icon: GraduationCap,   color: "bg-purple-50 text-purple-700 border-purple-100" },
  { label: "Parent",  icon: Users,           color: "bg-orange-50 text-orange-700 border-orange-100" },
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth, setMustChangePassword } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const successMessage = (location.state as { message?: string } | null)?.message;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setServerError("");
    try {
      const res = await authApi.login(data);
      const { accessToken, refreshToken, mustChangePassword, user } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      if (mustChangePassword) {
        setMustChangePassword(true);
        navigate("/change-password", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setServerError(e?.response?.data?.message ?? "Login failed. Please try again.");
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-1">Welcome back</h2>
      <p className="text-sm text-muted-foreground mb-4">Sign in to your portal</p>

      {/* Role pills */}
      <motion.div
        className="flex flex-wrap gap-2 mb-6"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
      >
        {ROLES.map(({ label, icon: Icon, color }) => (
          <motion.span
            key={label}
            variants={{
              hidden: { opacity: 0, scale: 0.8, y: 6 },
              visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
            }}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
              color
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </motion.span>
        ))}
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200"
          >
            {successMessage}
          </motion.div>
        )}
        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
          >
            {serverError}
          </motion.div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder="you@school.edu.ng"
            className={cn(
              "w-full px-3 py-2 text-sm border rounded-lg outline-none transition",
              "focus:ring-2 focus:ring-primary/30 focus:border-primary",
              errors.email ? "border-destructive" : "border-input"
            )}
          />
          {errors.email && (
            <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
          <div className="relative">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className={cn(
                "w-full px-3 py-2 pr-10 text-sm border rounded-lg outline-none transition",
                "focus:ring-2 focus:ring-primary/30 focus:border-primary",
                errors.password ? "border-destructive" : "border-input"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-brand-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-sm text-center text-muted-foreground mt-6">
        New school?{" "}
        <Link to="/register" className="text-primary font-medium hover:underline">
          Register here
        </Link>
      </p>
    </div>
  );
}
