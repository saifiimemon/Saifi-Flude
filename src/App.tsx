import React, { useState, useRef, useCallback } from 'react';
import { FluidCanvas } from './components/FluidCanvas';
import { ControlPanel } from './components/ControlPanel';
import { CodeOverlay } from './components/CodeOverlay';
import { TypewriterPrompt } from './components/TypewriterPrompt';
import { defaultConfig } from './data/presets';
import { FluidConfig, EngineStats } from './types';
import { FluidEngine } from './gl/FluidEngine';
import { Sliders, Code2 } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<FluidConfig>(defaultConfig);
  const [stats, setStats] = useState<EngineStats>({
    fps: 60,
    frameTime: 0,
    backend: 'WebGL2 (Half-Float)',
    resolution: '0x0',
    activeSplats: 0,
    isStarted: false,
  });

  const [showControlPanel, setShowControlPanel] = useState<boolean>(false);
  const [showCodeOverlay, setShowCodeOverlay] = useState<boolean>(false);

  const engineRef = useRef<FluidEngine | null>(null);

  const handleUpdateConfig = useCallback((newConfig: Partial<FluidConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  }, []);

  const handleTriggerSpaceBurst = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.multipleSplats(12);
    }
  }, []);

  const handleClearCanvas = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.clearCanvas();
    }
  }, []);

  const handleTakeScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `fluid_simulation_${Date.now()}.png`;
      link.href = image;
      link.click();
    }
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black font-sans select-none">
      {/* Pitch Black Canvas */}
      <FluidCanvas
        config={config}
        onStatsUpdate={setStats}
        onEngineReady={(engine) => {
          engineRef.current = engine;
        }}
      />

      {/* Subtle Corner Menu Toggles (Only visible on hover in corner) */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={() => setShowCodeOverlay(!showCodeOverlay)}
          className="p-2 rounded-lg bg-neutral-900/80 border border-neutral-800 text-neutral-400 hover:text-white backdrop-blur-md cursor-pointer text-xs flex items-center gap-1.5"
          title="Toggle Code Overlay"
        >
          <Code2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowControlPanel(!showControlPanel)}
          className="p-2 rounded-lg bg-neutral-900/80 border border-neutral-800 text-neutral-400 hover:text-white backdrop-blur-md cursor-pointer text-xs flex items-center gap-1.5"
          title="Toggle Fluid Settings"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>

      {/* Control Panel (Hidden by default) */}
      {showControlPanel && (
        <ControlPanel
          config={config}
          stats={stats}
          onUpdateConfig={handleUpdateConfig}
          onTriggerSpaceBurst={handleTriggerSpaceBurst}
          onClearCanvas={handleClearCanvas}
          onTakeScreenshot={handleTakeScreenshot}
          onClose={() => setShowControlPanel(false)}
        />
      )}

      {/* Code Window Overlay (Hidden by default) */}
      {showCodeOverlay && (
        <CodeOverlay onClose={() => setShowCodeOverlay(false)} />
      )}

      {/* Typewriter Prompt */}
      <TypewriterPrompt />
    </div>
  );
}

