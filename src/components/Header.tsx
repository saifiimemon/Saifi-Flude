import React from 'react';
import { Sparkles, Code2, Sliders, Maximize2, RotateCcw, Play, Pause, Zap } from 'lucide-react';
import { EngineStats } from '../types';

interface HeaderProps {
  stats: EngineStats;
  isPaused: boolean;
  showCodeOverlay: boolean;
  showControlPanel: boolean;
  onToggleCodeOverlay: () => void;
  onToggleControlPanel: () => void;
  onTriggerSpaceBurst: () => void;
  onClearCanvas: () => void;
  onTogglePause: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  isPaused,
  showCodeOverlay,
  showControlPanel,
  onToggleCodeOverlay,
  onToggleControlPanel,
  onTriggerSpaceBurst,
  onClearCanvas,
  onTogglePause,
}) => {
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 pointer-events-none flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
      {/* Title */}
      <div className="pointer-events-auto flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-400 p-[1px] shadow-lg shadow-purple-500/20">
          <div className="h-full w-full bg-black/90 rounded-[11px] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
            WebGL Fluid Simulation
          </h1>
          <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{stats.backend}</span>
            <span className="text-neutral-600">•</span>
            <span>{stats.fps} FPS</span>
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="pointer-events-auto flex items-center gap-2">
        {/* Space Burst Button */}
        <button
          onClick={onTriggerSpaceBurst}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-500 text-white font-semibold text-xs tracking-wider uppercase shadow-lg shadow-pink-500/25 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-white/20"
          title="Press Spacebar on keyboard or click here for multi-color fluid bursts!"
        >
          <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300 animate-bounce" />
          <span className="hidden sm:inline">Space Burst</span>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-black/40 rounded border border-white/30 font-mono">Space</kbd>
        </button>

        {/* Code Toggle Button */}
        <button
          onClick={onToggleCodeOverlay}
          className={`p-2.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
            showCodeOverlay
              ? 'bg-purple-600/30 border-purple-400/50 text-purple-300 shadow-lg shadow-purple-500/20'
              : 'bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
          }`}
          title="Toggle Bloom Shader Code Overlay"
        >
          <Code2 className="w-4 h-4" />
        </button>

        {/* Control Panel Toggle */}
        <button
          onClick={onToggleControlPanel}
          className={`p-2.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
            showControlPanel
              ? 'bg-cyan-600/30 border-cyan-400/50 text-cyan-300 shadow-lg shadow-cyan-500/20'
              : 'bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
          }`}
          title="Toggle Dat.GUI Settings Panel"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Pause/Play Button */}
        <button
          onClick={onTogglePause}
          className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800 text-neutral-300 hover:bg-neutral-800/80 hover:text-white backdrop-blur-md transition-all cursor-pointer"
          title={isPaused ? 'Play Simulation' : 'Pause Simulation'}
        >
          {isPaused ? <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" /> : <Pause className="w-4 h-4" />}
        </button>

        {/* Clear Button */}
        <button
          onClick={onClearCanvas}
          className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800 text-neutral-300 hover:bg-neutral-800/80 hover:text-white backdrop-blur-md transition-all cursor-pointer"
          title="Clear Canvas"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800 text-neutral-300 hover:bg-neutral-800/80 hover:text-white backdrop-blur-md transition-all cursor-pointer hidden sm:flex"
          title="Toggle Fullscreen Mode"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
