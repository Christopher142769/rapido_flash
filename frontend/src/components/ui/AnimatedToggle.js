import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const sizes = {
  sm: { track: 'w-11 h-[22px]', knob: 18, pad: 2 },
  md: { track: 'w-14 h-7', knob: 24, pad: 2 },
  lg: { track: 'w-[56px] h-7', knob: 24, pad: 2 },
};

/**
 * @param {{ checked: boolean; onChange: (next: boolean) => void; disabled?: boolean; size?: 'sm'|'md'|'lg'; 'aria-label'?: string }} props
 */
export default function AnimatedToggle({ checked, onChange, disabled, size = 'md', 'aria-label': ariaLabel }) {
  const reduce = useReducedMotion();
  const s = sizes[size] || sizes.md;
  const knobTravel = size === 'lg' ? 28 : size === 'sm' ? 18 : 22;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex shrink-0 items-center rounded-full border-0 p-0 text-left outline-none transition-opacity ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${s.track}`}
      style={{
        background: checked ? 'var(--rf-danger)' : '#E5D5C0',
        boxShadow: checked && !reduce ? '0 0 20px rgba(232,64,64,0.3)' : undefined,
      }}
    >
      <motion.span
        className="absolute rounded-full bg-white shadow-sm"
        style={{ width: s.knob, height: s.knob, top: s.pad, left: s.pad }}
        initial={false}
        animate={{
          x: checked ? knobTravel : 0,
        }}
        transition={
          reduce
            ? { duration: 0.12 }
            : { type: 'spring', stiffness: 500, damping: 35 }
        }
      />
    </button>
  );
}
