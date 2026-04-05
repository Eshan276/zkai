"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/** Thin top bar that tracks scroll depth (Framer `useScroll`). */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className="pointer-events-none fixed top-0 right-0 left-0 z-[100] h-[2px] origin-left bg-gradient-to-r from-[#FF9E8D]/90 via-[#B39DDB]/80 to-[#A5F3D0]/70"
      style={{ scaleX }}
      aria-hidden
    />
  );
}
