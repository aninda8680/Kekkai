"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const commands = [
  { text: "$ cloak-env run npm run dev", delay: 1000 },
  { text: "→ authenticating", delay: 800, type: "system" },
  { text: "→ loading environment", delay: 800, type: "system" },
  { text: "→ injecting secrets", delay: 800, type: "system" },
  { text: "→ starting process", delay: 800, type: "system" },
  { text: "✓ development server running", delay: 500, type: "success" },
];

export function HeroTerminal() {
  const [lines, setLines] = useState<number>(0);
  const [isTyping, setIsTyping] = useState(true);
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    const runSequence = async () => {
      // Type the first command
      const cmd = commands[0].text;
      for (let i = 0; i <= cmd.length; i++) {
        setTypedText(cmd.substring(0, i));
        await new Promise(r => setTimeout(r, 40));
      }
      
      setIsTyping(false);
      setLines(1);
      
      // Show subsequent lines
      for (let i = 1; i < commands.length; i++) {
        await new Promise(r => setTimeout(r, commands[i].delay));
        setLines(prev => prev + 1);
      }
      
      // Loop
      setTimeout(() => {
        setLines(0);
        setIsTyping(true);
        setTypedText("");
        runSequence();
      }, 5000);
    };

    runSequence();
    
    return () => {};
  }, []);

  return (
    <div className="w-full font-mono text-sm md:text-base text-left bg-text-primary text-bg-primary min-h-[320px] p-8 flex flex-col">
      {/* Terminal Body */}
      <div className="flex-1">
        <div className="text-text-primary">
          <span className="text-brand-primary mr-2">~</span>
          {isTyping ? (
            <>
              {typedText}
              <motion.span 
                animate={{ opacity: [1, 0] }} 
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="inline-block w-2 h-4 bg-brand-primary ml-1 align-middle"
              />
            </>
          ) : (
            commands[0].text
          )}
        </div>
        
        <AnimatePresence>
          {lines >= 1 && (
            <motion.div className="mt-4 space-y-2">
              {commands.slice(1, lines + 1).map((cmd, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cmd.type === "success" ? "text-brand-primary mt-4" : "text-text-secondary"}
                >
                  {cmd.text}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
