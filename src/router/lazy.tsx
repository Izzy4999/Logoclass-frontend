import { lazy, Suspense, type ComponentType } from "react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

export function L(factory: () => Promise<{ default: ComponentType }>) {
  const Comp = lazy(factory);
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Comp />
    </Suspense>
  );
}
