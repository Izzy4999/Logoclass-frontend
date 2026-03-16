import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Eye, EyeOff, Loader2, Mail, Lock,
  ShieldCheck, BookOpen, GraduationCap, Users, ArrowRight,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

const schema = z.object({
  email:    z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

const ROLES = [
  { label: "Admin",   Icon: ShieldCheck,    cls: "bg-blue-50 text-blue-700 border-blue-200"     },
  { label: "Teacher", Icon: BookOpen,        cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { label: "Student", Icon: GraduationCap,   cls: "bg-violet-50 text-violet-700 border-violet-200"   },
  { label: "Parent",  Icon: Users,           cls: "bg-orange-50 text-orange-700 border-orange-200"   },
];

export default function Login() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { setAuth, setMustChangePassword } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError,  setServerError]  = useState("");
  const successMessage = (location.state as { message?: string } | null)?.message;

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

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
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-[1.6rem] font-extrabold text-[#1E3A8A] tracking-tight leading-tight">
          Welcome back 👋
        </h2>
        <p className="text-[13px] text-slate-500 mt-1">Sign in to your school portal</p>
      </div>

      {/* Role pills */}
      <motion.div
        className="flex flex-wrap gap-1.5 mb-7"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      >
        {ROLES.map(({ label, Icon, cls }) => (
          <motion.span
            key={label}
            variants={{
              hidden:  { opacity: 0, scale: 0.8, y: 5 },
              visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
            }}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border",
              cls
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </motion.span>
        ))}
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Success alert */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm border border-emerald-200"
          >
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            {successMessage}
          </motion.div>
        )}

        {/* Error alert */}
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

        {/* Email */}
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
              placeholder="you@school.edu.ng"
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

        {/* Password */}
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className={cn(
                "w-full pl-9 pr-10 py-2.5 text-sm rounded-xl outline-none transition-all",
                "border bg-slate-50 placeholder:text-slate-400",
                "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white",
                errors.password
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
          {errors.password && (
            <p className="text-[12px] text-red-500 mt-1.5 flex items-center gap-1">
              <span className="font-bold">!</span> {errors.password.message}
            </p>
          )}
        </div>

        {/* Forgot password */}
        <div className="flex justify-end -mt-1">
          <Link
            to="/forgot-password"
            className="text-[13px] text-blue-600 hover:text-blue-700 font-medium hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm",
            "bg-gradient-to-r from-[#1E40AF] to-[#2563EB] hover:from-[#1E3A8A] hover:to-[#1E40AF]",
            "text-white shadow-sm hover:shadow-md",
            "transition-all active:scale-[0.99]",
            "disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
          )}
        >
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
          ) : (
            <>Sign in <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </form>

      {/* Register link */}
      <div className="mt-6 pt-5 border-t border-slate-100 text-center">
        <p className="text-[13px] text-slate-500">
          New school?{" "}
          <Link to="/register" className="text-blue-600 font-semibold hover:underline">
            Register your school →
          </Link>
        </p>
      </div>
    </div>
  );
}
