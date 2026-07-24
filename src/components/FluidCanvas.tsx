import React, { useEffect, useRef, useState } from 'react';
import { FluidEngine } from '../gl/FluidEngine';
import { FluidConfig, EngineStats } from '../types';

interface FluidCanvasProps {
  config: FluidConfig;
  onStatsUpdate: (stats: EngineStats) => void;
  onEngineReady?: (engine: FluidEngine) => void;
  onStartedChange?: (started: boolean) => void;
}

export const FluidCanvas: React.FC<FluidCanvasProps> = ({
  config,
  onStatsUpdate,
  onEngineReady,
  onStartedChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<FluidEngine | null>(null);
  const [isEngineInit, setIsEngineInit] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const engine = new FluidEngine(canvasRef.current, config);
      engineRef.current = engine;

      engine.on('stats', (stats: EngineStats) => {
        onStatsUpdate(stats);
        if (onStartedChange) onStartedChange(stats.isStarted);
      });

      engine.start();
      setIsEngineInit(true);

      if (onEngineReady) {
        onEngineReady(engine);
      }
    } catch (err) {
      console.error('Failed to initialize WebGL FluidEngine:', err);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  // Sync config updates
  useEffect(() => {
    if (engineRef.current && isEngineInit) {
      engineRef.current.setConfig(config);
    }
  }, [config, isEngineInit]);

  // Spacebar global keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input or text fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (engineRef.current) {
          engineRef.current.multipleSplats(10);
        }
      } else if (e.key === 'c' || e.key === 'C') {
        if (engineRef.current) {
          engineRef.current.clearCanvas();
        }
      } else if (e.key === 'p' || e.key === 'P') {
        if (engineRef.current) {
          const cur = engineRef.current.getConfig();
          engineRef.current.setConfig({ PAUSED: !cur.PAUSED });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full bg-black block touch-none cursor-crosshair select-none"
    />
  );
};
