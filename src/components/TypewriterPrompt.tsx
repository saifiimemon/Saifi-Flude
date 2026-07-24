import React, { useState, useEffect } from 'react';

export const TypewriterPrompt: React.FC = () => {
  const fullText = "click mouse and experience";
  const [displayedText, setDisplayedText] = useState("");
  const [isFading, setIsFading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Typewriter Effect
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayedText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 80);

    return () => clearInterval(interval);
  }, []);

  // Dismiss on first click anywhere
  useEffect(() => {
    const handlePointerDown = () => {
      setIsFading(true);
      setTimeout(() => {
        setIsDismissed(true);
      }, 700);
    };

    window.addEventListener('pointerdown', handlePointerDown, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  if (isDismissed) return null;

  return (
    <div
      className={`fixed inset-0 z-30 flex items-center justify-center pointer-events-none transition-opacity duration-700 ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="text-center px-6 py-4 rounded-2xl bg-black/40 backdrop-blur-xs border border-white/10 shadow-2xl">
        <p className="text-lg md:text-xl font-mono text-neutral-300 tracking-widest lowercase select-none">
          {displayedText}
          <span className="inline-block w-2 h-5 ml-1.5 bg-neutral-400 animate-pulse align-middle" />
        </p>
      </div>
    </div>
  );
};
