'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Hash } from 'lucide-react';
import { cn } from '../../utils';

interface LineNumberButtonProps {
  showLineNumbers: boolean;
  onToggle: () => void;
  className?: string;
}

export const LineNumberButton = React.memo(({ showLineNumbers, onToggle, className }: LineNumberButtonProps) => {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className={cn(
        "app-icon-button app-icon-button-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0",
        className
      )}
      data-active={showLineNumbers ? "true" : "false"}
      aria-label={`${showLineNumbers ? "Hide" : "Show"} line numbers`}
    >
      <Hash />
    </motion.button>
  );
});

LineNumberButton.displayName = 'LineNumberButton';
