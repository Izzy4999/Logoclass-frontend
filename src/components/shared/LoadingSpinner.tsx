import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  size?: number;
  className?: string;
}

export default function LoadingSpinner({ fullScreen, size = 32, className }: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 z-50">
        <Loader2 size={size} className="animate-spin text-primary" />
      </div>
    );
  }
  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <Loader2 size={size} className="animate-spin text-primary" />
    </div>
  );
}
