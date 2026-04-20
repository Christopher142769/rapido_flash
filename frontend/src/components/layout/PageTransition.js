import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const pageVariantsFull = {
  initial: { opacity: 0, y: 16, filter: 'blur(4px)' },
  enter: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: 'blur(2px)',
    transition: { duration: 0.2 },
  },
};

const pageVariantsReduced = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export default function PageTransition() {
  const location = useLocation();
  const prefersReduced = useReducedMotion();
  const variants = prefersReduced ? pageVariantsReduced : pageVariantsFull;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={variants}
        className="min-h-0 flex-1"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}
