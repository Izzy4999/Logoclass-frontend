import * as RadixToast from "@radix-ui/react-toast";
import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle2, AlertCircle, Info, Bell } from "lucide-react";
import { useToastStore, type ToastVariant } from "@/lib/toast";

const VARIANT_STYLES: Record<
  ToastVariant,
  { bar: string; icon: React.ElementType; iconColor: string; progressBar: string }
> = {
  success: {
    bar: "bg-green-500",
    icon: CheckCircle2,
    iconColor: "text-green-500",
    progressBar: "bg-green-500",
  },
  error: {
    bar: "bg-red-500",
    icon: AlertCircle,
    iconColor: "text-red-500",
    progressBar: "bg-red-500",
  },
  info: {
    bar: "bg-blue-500",
    icon: Info,
    iconColor: "text-blue-500",
    progressBar: "bg-blue-500",
  },
  default: {
    bar: "bg-primary",
    icon: Bell,
    iconColor: "text-primary",
    progressBar: "bg-primary",
  },
};

export default function Toaster() {
  const { toasts, remove } = useToastStore();

  return (
    <RadixToast.Provider swipeDirection="right">
      <AnimatePresence>
        {toasts.map((t) => {
          const v = VARIANT_STYLES[t.variant ?? "default"];
          const Icon = v.icon;
          const hasProgress = t.progress !== undefined;

          return (
            <RadixToast.Root
              key={t.id}
              open
              onOpenChange={(open) => { if (!open) remove(t.id); }}
              // Persistent toasts (e.g. upload in progress) never auto-dismiss
              duration={t.persistent ? Infinity : 4500}
              asChild
            >
              <motion.li
                initial={{ opacity: 0, x: 60, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl shadow-lg p-4 w-80 relative overflow-hidden"
              >
                {/* Left accent bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${v.bar} rounded-l-xl`} />

                <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ml-2 ${v.iconColor}`} />

                <div className="flex-1 min-w-0">
                  <RadixToast.Title className="text-sm font-semibold text-foreground">
                    {t.title}
                  </RadixToast.Title>

                  {t.description && (
                    <RadixToast.Description className="text-xs text-muted-foreground mt-0.5">
                      {t.description}
                    </RadixToast.Description>
                  )}

                  {/* Progress bar — shown when progress is set */}
                  {hasProgress && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${v.progressBar}`}
                          initial={{ width: "0%" }}
                          animate={{ width: `${t.progress}%` }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                        {t.progress}%
                      </span>
                    </div>
                  )}

                  {/* Action button — e.g. Retry */}
                  {t.action && (
                    <button
                      type="button"
                      onClick={t.action.onClick}
                      className="mt-2 inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded border border-current hover:opacity-80 transition-opacity"
                      style={{ color: "inherit" }}
                    >
                      {t.action.label}
                    </button>
                  )}
                </div>

                <RadixToast.Close asChild>
                  <button
                    onClick={() => remove(t.id)}
                    className="flex-shrink-0 p-1 rounded hover:bg-slate-100 text-muted-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </RadixToast.Close>
              </motion.li>
            </RadixToast.Root>
          );
        })}
      </AnimatePresence>

      {/* Top-right viewport for upload / action toasts */}
      <RadixToast.Viewport className="fixed top-4 right-4 flex flex-col gap-2 z-[100] outline-none list-none" />
    </RadixToast.Provider>
  );
}
