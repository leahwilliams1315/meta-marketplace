"use client";

import React, { ReactElement } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface AnimatedListProps {
  className?: string;
  children: React.ReactNode;
}

export const AnimatedList = React.memo(
  ({ className, children }: AnimatedListProps) => {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        <AnimatePresence initial={false}>
          {React.Children.map(children, (child) => (
            <AnimatedListItem key={(child as ReactElement).key}>
              {child}
            </AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>
    );
  }
);

AnimatedList.displayName = "AnimatedList";

export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  const animations = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, height: 0, marginBottom: 0 },
    transition: { duration: 0.2 },
  };

  return (
    <motion.div {...animations} layout className="mx-auto w-full">
      {children}
    </motion.div>
  );
}
