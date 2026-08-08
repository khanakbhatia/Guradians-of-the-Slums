import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";

/**
 * Wraps <Outlet /> in both layouts. Keyed by pathname so each route
 * change gets a short, restrained fade + 6px slide — enough to feel
 * intentional, not enough to slow anyone down or read as "flashy".
 */
function PageTransition({ children }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default PageTransition;
