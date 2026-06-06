import { motion, useReducedMotion } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const reducedVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const pageTransition = { duration: 0.22, ease: "easeOut" as const };
const reducedTransition = { duration: 0.1, ease: "easeOut" as const };

export default function AnimatedPage({ children }: { children: React.ReactNode }) {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      variants={prefersReduced ? reducedVariants : pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={prefersReduced ? reducedTransition : pageTransition}
    >
      {children}
    </motion.div>
  );
}
