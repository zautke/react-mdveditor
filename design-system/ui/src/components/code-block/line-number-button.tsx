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
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className={cn(
        "rounded-md p-2 transition-colors",
        "bg-muted hover:bg-muted/80",
        showLineNumbers ? "text-primary" : "text-muted-foreground hover:text-foreground",
        className
      )}
      aria-label={`${showLineNumbers ? "Hide" : "Show"} line numbers`}
    >
      <Hash size={16} />
    </motion.button>
  );
});

LineNumberButton.displayName = 'LineNumberButton';
