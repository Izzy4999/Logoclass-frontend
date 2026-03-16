import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { LogoFull } from "@/components/Logo";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-4">
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <LogoFull size={40} />
      </motion.div>

      <motion.div
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <Outlet />
      </motion.div>
    </div>
  );
}
