"use client";
import { motion } from "motion/react";

export default function BlurText({text, index}) {
  return (
    <motion.p
      initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: .2 * index }}
      
    >
      {text}
    </motion.p>
  );
}

