import React, { useState } from 'react';
import { FluidConfig, EngineStats } from '../types';
import { presets } from '../data/presets';
import { Sliders, Eye, Flame, Camera, RotateCcw, Zap, Sparkles, ChevronDown, ChevronUp, Cpu } from 'lucide-react';

interface ControlPanelProps {
  config: FluidConfig;
  stats: EngineStats;
  onUpdateConfig: (newConfig: Partial<FluidConfig>) => void;
  onTriggerSpaceBurst: () => void;
  onClearCanvas: () => void;
  onTakeScreenshot: () => void;
  onClose: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  stats,
  onUpdateConfig,
  onTriggerSpaceBurst,
  onClearCanvas,
  onTakeScreenshot,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'sim' | 'graphics' | 'presets'>('sim');
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <div className="fixed top-20 right-4 z-40 w-80 md:w-88 bg-neutral-950/90 border border-neutral-800/80 rounded-2xl shadow-2xl backdrop-blur-xl text-neutral-200 overflow-hidden font-sans transition-all duration-300 select-none">
      {/* Panel Top Bar (Dat.GUI Style Header) */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-900/90 border-b border-neutral-800/80 cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-300">Fluid Control Matrix</span>
        </div>
        <div className="flex items-center gap-2 text-neutral-400">
          <span className="text-[10px] font-mono bg-neutral-800 px-2 py-0.5 rounded text-cyan-400 border border-neutral-700">{stats.fps} FPS</span>
          <button className="hover:text-white p-1 rounded">
            {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-4 space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar">
          {/* Quick Spacebar Action Badge */}
          <button
            onClick={onTriggerSpaceBurst}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 hover:brightness-110 active:scale-98 transition-all cursor-pointer border border-white/20"
          >
            <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
            <span>Trigger Multi-Color Burst</span>
            <kbd className="px-1.5 py-0.5 text-[9px] bg-black/40 rounded border border-white/30 font-mono">Space</kbd>
          </button>

          {/* Tab Selection */}
          <div className="flex p-1 bg-neutral-900/80 rounded-xl border border-neutral-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab('sim')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'sim' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Physics</span>
            </button>
            <button
              onClick={() => setActiveTab('graphics')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'graphics' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bloom</span>
            </button>
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'presets' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Presets</span>
            </button>
          </div>

          {/* TAB 1: Physics & Fluid Dynamics */}
          {activeTab === 'sim' && (
            <div className="space-y-3 text-xs">
              {/* Vorticity / Curl */}
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300 font-mono">
                  <span>Curl (Vorticity)</span>
                  <span className="text-cyan-400">{config.CURL}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={config.CURL}
                  onChange={(e) => onUpdateConfig({ CURL: Number(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Density Dissipation */}
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300 font-mono">
                  <span>Density Dissipation</span>
                  <span className="text-cyan-400">{config.DENSITY_DISSIPATION.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4.0"
                  step="0.05"
                  value={config.DENSITY_DISSIPATION}
                  onChange={(e) => onUpdateConfig({ DENSITY_DISSIPATION: Number(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Velocity Dissipation */}
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300 font-mono">
                  <span>Velocity Dissipation</span>
                  <span className="text-cyan-400">{config.VELOCITY_DISSIPATION.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2.0"
                  step="0.05"
                  value={config.VELOCITY_DISSIPATION}
                  onChange={(e) => onUpdateConfig({ VELOCITY_DISSIPATION: Number(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Pressure Iterations */}
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300 font-mono">
                  <span>Pressure Iterations</span>
                  <span className="text-cyan-400">{config.PRESSURE_ITERATIONS}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="1"
                  value={config.PRESSURE_ITERATIONS}
                  onChange={(e) => onUpdateConfig({ PRESSURE_ITERATIONS: Number(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Splat Radius */}
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300 font-mono">
                  <span>Splat Radius</span>
                  <span className="text-cyan-400">{config.SPLAT_RADIUS.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.8"
                  step="0.01"
                  value={config.SPLAT_RADIUS}
                  onChange={(e) => onUpdateConfig({ SPLAT_RADIUS: Number(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Color Palette Selector */}
              <div className="space-y-1.5 pt-2 border-t border-neutral-800">
                <label className="text-neutral-300 font-mono text-[11px] block">Color Palette</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'rainbow', label: 'Rainbow' },
                    { id: 'cyberpunk', label: 'Cyberpunk' },
                    { id: 'fire_ice', label: 'Fire & Ice' },
                    { id: 'neon', label: 'Neon Party' },
                    { id: 'gold', label: 'Liquid Gold' },
                    { id: 'sunset', label: 'Sunset' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onUpdateConfig({ COLOR_PALETTE: p.id as any })}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-mono border transition-all cursor-pointer ${
                        config.COLOR_PALETTE === p.id
                          ? 'bg-cyan-500/30 border-cyan-400 text-white font-bold shadow'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Splats Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                <span className="text-neutral-300 font-mono text-[11px]">Continuous Auto-Splats</span>
                <button
                  onClick={() => onUpdateConfig({ AUTO_SPLATS: !config.AUTO_SPLATS })}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    config.AUTO_SPLATS ? 'bg-cyan-500 justify-end' : 'bg-neutral-800 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Bloom & Visual Shading */}
          {activeTab === 'graphics' && (
            <div className="space-y-3 text-xs">
              {/* Bloom Enable */}
              <div className="flex items-center justify-between">
                <span className="text-neutral-300 font-mono">Enable HDR Bloom</span>
                <button
                  onClick={() => onUpdateConfig({ BLOOM: !config.BLOOM })}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    config.BLOOM ? 'bg-purple-500 justify-end' : 'bg-neutral-800 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Bloom Intensity */}
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300 font-mono">
                  <span>Bloom Glow Intensity</span>
                  <span className="text-purple-400">{config.BLOOM_INTENSITY.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.5"
                  step="0.05"
                  value={config.BLOOM_INTENSITY}
                  disabled={!config.BLOOM}
                  onChange={(e) => onUpdateConfig({ BLOOM_INTENSITY: Number(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-400 disabled:opacity-40"
                />
              </div>

              {/* Bloom Threshold */}
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300 font-mono">
                  <span>Bloom Threshold</span>
                  <span className="text-purple-400">{config.BLOOM_THRESHOLD.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.8"
                  step="0.02"
                  value={config.BLOOM_THRESHOLD}
                  disabled={!config.BLOOM}
                  onChange={(e) => onUpdateConfig({ BLOOM_THRESHOLD: Number(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-400 disabled:opacity-40"
                />
              </div>

              {/* Bloom Iterations */}
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300 font-mono">
                  <span>Bloom Blur Passes</span>
                  <span className="text-purple-400">{config.BLOOM_ITERATIONS}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={config.BLOOM_ITERATIONS}
                  disabled={!config.BLOOM}
                  onChange={(e) => onUpdateConfig({ BLOOM_ITERATIONS: Number(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-400 disabled:opacity-40"
                />
              </div>

              {/* Light Shading Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                <span className="text-neutral-300 font-mono text-[11px]">Volumetric Surface Shading</span>
                <button
                  onClick={() => onUpdateConfig({ SHADING: !config.SHADING })}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    config.SHADING ? 'bg-purple-500 justify-end' : 'bg-neutral-800 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Resolution Selectors */}
              <div className="space-y-2 pt-2 border-t border-neutral-800 font-mono text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Grid Resolution</span>
                  <select
                    value={config.SIM_RESOLUTION}
                    onChange={(e) => onUpdateConfig({ SIM_RESOLUTION: Number(e.target.value) })}
                    className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-cyan-300"
                  >
                    <option value={128}>128 (Ultra Performance)</option>
                    <option value={256}>256 (Balanced Desktop)</option>
                    <option value={512}>512 (High Detail)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-2">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onUpdateConfig(p.config)}
                  className="w-full p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-pink-500/50 hover:bg-neutral-800/80 text-left flex items-center justify-between transition-all cursor-pointer group"
                >
                  <div>
                    <div className="font-mono text-xs font-bold text-white group-hover:text-pink-300 transition-colors">{p.name}</div>
                    <div className="text-[10px] text-neutral-400">Palette: {p.config.COLOR_PALETTE || 'custom'}</div>
                  </div>
                  <Sparkles className="w-4 h-4 text-neutral-500 group-hover:text-pink-400" />
                </button>
              ))}
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-neutral-800 grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={onClearCanvas}
              className="py-2 px-3 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Canvas</span>
            </button>
            <button
              onClick={onTakeScreenshot}
              className="py-2 px-3 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Snapshot</span>
            </button>
          </div>

          {/* System Hardware Info */}
          <div className="pt-2 text-[10px] font-mono text-neutral-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span>WebGL2 Framebuffer: {stats.resolution}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
