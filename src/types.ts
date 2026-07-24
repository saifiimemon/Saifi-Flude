export interface FluidConfig {
  SIM_RESOLUTION: number;
  DYE_RESOLUTION: number;
  DENSITY_DISSIPATION: number;
  VELOCITY_DISSIPATION: number;
  PRESSURE: number;
  PRESSURE_ITERATIONS: number;
  CURL: number;
  SPLAT_RADIUS: number;
  SPLAT_FORCE: number;
  SHADING: boolean;
  COLORFUL: boolean;
  COLOR_PALETTE: 'rainbow' | 'cyberpunk' | 'fire_ice' | 'neon' | 'sunset' | 'gold';
  BLOOM: boolean;
  BLOOM_ITERATIONS: number;
  BLOOM_RESOLUTION: number;
  BLOOM_INTENSITY: number;
  BLOOM_THRESHOLD: number;
  SUNRAYS: boolean;
  SUNRAYS_RESOLUTION: number;
  SUNRAYS_WEIGHT: number;
  PAUSED: boolean;
  AUTO_SPLATS: boolean;
}

export interface SplatPointer {
  id: number;
  texcoordX: number;
  texcoordY: number;
  prevTexcoordX: number;
  prevTexcoordY: number;
  deltaX: number;
  deltaY: number;
  down: boolean;
  moved: boolean;
  color: { r: number; g: number; b: number };
}

export interface EngineStats {
  fps: number;
  frameTime: number;
  backend: string;
  resolution: string;
  activeSplats: number;
  isStarted: boolean;
}

export interface Preset {
  id: string;
  name: string;
  config: Partial<FluidConfig>;
}
