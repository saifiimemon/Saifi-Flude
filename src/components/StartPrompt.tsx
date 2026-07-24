import React from 'react';
import { Zap, Sparkles, MousePointerClick, Keyboard } from 'lucide-react';

interface StartPromptProps {
  onStart: () => void;
  isStarted: boolean;
}

export const StartPrompt: React.FC<StartPromptProps> = ({ onStart, isStarted }) => {
  if (isStarted) return null;

  return (
    <div
      onClick={onStart}
      className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-black/90 cursor-pointer select-none transition-opacity duration-700 p-6 text-center"
    >
      {/* Pitch Black Ambient Halo */}
      <div className="absolute w-96 h-96 bg-purple-900/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Main Interactive Card */}
      <div className="relative z-10 max-w-md w-full bg-neutral-950/90 border border-neutral-800 p-8 rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col items-center gap-6 group hover:border-purple-500/50 transition-all duration-300">
        {/* Pulsing Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-cyan-400 p-[1px] shadow-xl shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
          <div className="w-full h-full bg-black/90 rounded-[15px] flex items-center justify-center">
            <Zap className="w-8 h-8 text-yellow-300 fill-yellow-300 animate-bounce" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-mono text-white tracking-tight">
            WebGL Fluid Simulation
          </h2>
          <p className="text-xs text-neutral-400 max-w-xs mx-auto">
            Interactive multi-color GPU fluid dynamics solver with real-time bloom & vorticity.
          </p>
        </div>

        {/* Primary Spacebar Callout */}
        <div className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-pink-600/30 via-purple-600/30 to-cyan-600/30 border border-purple-400/40 flex items-center justify-between gap-3 text-white shadow-lg">
          <div className="flex items-center gap-2 text-left">
            <Keyboard className="w-5 h-5 text-pink-400 animate-pulse" />
            <div>
              <div className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-300">Press Spacebar</div>
              <div className="text-[10px] text-neutral-300">or click anywhere on screen</div>
            </div>
          </div>
          <kbd className="px-3 py-1.5 bg-black/80 rounded-xl border border-white/30 text-xs font-mono font-bold text-yellow-300 shadow-inner">
            SPACE
          </kbd>
        </div>

        {/* Sub-hint */}
        <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono">
          <MousePointerClick className="w-3.5 h-3.5 text-cyan-400" />
          <span>Click & drag to swirl multi-color dyes</span>
        </div>
      </div>
    </div>
  );
};
