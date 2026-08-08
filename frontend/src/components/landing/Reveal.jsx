import { motion } from "framer-motion";

/**
 * Consistent scroll-triggered reveal used across every landing section.
 * `once` keeps it from re-triggering on scroll-back, matching the
 * restrained, non-gimmicky motion language of the rest of the system.
 */
function Reveal({ children, delay = 0, y = 16, className, as = "div" }) {
  const Comp = motion[as] ?? motion.div;
  return (
    <Comp
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </Comp>
  );
}

export default Reveal;
