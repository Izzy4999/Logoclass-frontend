import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  className?: string;
  iconColor?: string;
  index?: number;
}

export default function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  className,
  iconColor = "text-primary",
  index = 0,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: "easeOut" }}
      whileHover={{ y: -3, boxShadow: "0 8px 24px -4px rgba(30,64,175,0.12)" }}
      className={cn(
        "bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start gap-4 cursor-default",
        className
      )}
    >
      {Icon && (
        <div className="rounded-lg bg-brand-50 p-2.5 flex-shrink-0">
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground font-medium truncate">{title}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </motion.div>
  );
}
