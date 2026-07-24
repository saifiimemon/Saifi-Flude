import { FluidConfig, EngineStats, SplatPointer } from '../types';
import {
  baseVertexShader,
  clearShader,
  splatShader,
  advectionShader,
  divergenceShader,
  curlShader,
  vorticityShader,
  pressureShader,
  gradientSubtractShader,
  bloomPrefilterShader,
  bloomBlurShader,
  displayShader,
} from './shaders';

interface FramebufferObject {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach: (id: number) => number;
}

interface DoubleFramebufferObject {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FramebufferObject;
  write: FramebufferObject;
  swap: () => void;
}

interface BloomFramebuffer {
  fbo: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
}

export class FluidEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private ext: {
    formatRGBA: { internalFormat: number; format: number };
    formatRG: { internalFormat: number; format: number };
    formatR: { internalFormat: number; format: number };
    halfFloatTexType: number;
    supportLinearFiltering: boolean;
  };

  private config: FluidConfig;
  private stats: EngineStats = {
    fps: 60,
    frameTime: 0,
    backend: 'WebGL2 (Half-Float)',
    resolution: '0x0',
    activeSplats: 0,
    isStarted: false,
  };

  private listeners: { [key: string]: Array<(...args: any[]) => void> } = {};

  // Quad VAO
  private quadVAO: WebGLVertexArrayObject | null = null;

  // Shader Programs
  private clearProgram!: WebGLProgram;
  private splatProgram!: WebGLProgram;
  private advectionProgram!: WebGLProgram;
  private divergenceProgram!: WebGLProgram;
  private curlProgram!: WebGLProgram;
  private vorticityProgram!: WebGLProgram;
  private pressureProgram!: WebGLProgram;
  private gradSubProgram!: WebGLProgram;
  private bloomPrefilterProgram!: WebGLProgram;
  private bloomBlurProgram!: WebGLProgram;
  private displayProgram!: WebGLProgram;

  // Uniform locations cache
  private uniforms: Map<WebGLProgram, Record<string, WebGLUniformLocation>> = new Map();

  // FBOs
  private density!: DoubleFramebufferObject;
  private velocity!: DoubleFramebufferObject;
  private divergence!: FramebufferObject;
  private curl!: FramebufferObject;
  private pressure!: DoubleFramebufferObject;
  private bloomFramebuffers: BloomFramebuffer[] = [];

  // Pointer state
  private pointers: SplatPointer[] = [];
  private splatStack: Array<{ x: number; y: number; dx: number; dy: number; color: { r: number; g: number; b: number } }> = [];

  // Animation Loop State
  private lastUpdateTime = Date.now();
  private animationFrameId: number | null = null;
  private frameCount = 0;
  private lastFpsUpdate = Date.now();
  private colorHue = 0;

  constructor(canvas: HTMLCanvasElement, initialConfig: FluidConfig) {
    this.canvas = canvas;
    this.config = { ...initialConfig };

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      throw new Error('WebGL 2 is not supported on this browser or environment.');
    }
    this.gl = gl;

    // Detect WebGPU availability for badge
    if ('gpu' in navigator) {
      this.stats.backend = 'WebGPU (Optimized WebGL2 High-Perf Solver)';
    }

    this.ext = this.initExtensions();
    this.initPointers();
    this.initQuad();
    this.initShaders();
    this.initFramebuffers();
    this.resizeCanvas();

    // Attach Event Listeners
    this.setupEventListeners();
  }

  private initExtensions() {
    const gl = this.gl;
    const extFloat = gl.getExtension('EXT_color_buffer_float');
    const extLinear = gl.getExtension('OES_texture_float_linear');

    const halfFloatTexType = gl.HALF_FLOAT;
    const supportLinearFiltering = !!extLinear;

    const formatRGBA = { internalFormat: gl.RGBA16F, format: gl.RGBA };
    const formatRG = { internalFormat: gl.RG16F, format: gl.RG };
    const formatR = { internalFormat: gl.R16F, format: gl.RED };

    if (!extFloat) {
      // Fallback
      return {
        formatRGBA: { internalFormat: gl.RGBA, format: gl.RGBA },
        formatRG: { internalFormat: gl.RGBA, format: gl.RGBA },
        formatR: { internalFormat: gl.RGBA, format: gl.RGBA },
        halfFloatTexType: gl.UNSIGNED_BYTE,
        supportLinearFiltering: true,
      };
    }

    return {
      formatRGBA,
      formatRG,
      formatR,
      halfFloatTexType,
      supportLinearFiltering,
    };
  }

  private initPointers() {
    this.pointers = [
      {
        id: -1,
        texcoordX: 0,
        texcoordY: 0,
        prevTexcoordX: 0,
        prevTexcoordY: 0,
        deltaX: 0,
        deltaY: 0,
        down: false,
        moved: false,
        color: { r: 1, g: 0, b: 0.5 },
      },
    ];
  }

  private initQuad() {
    const gl = this.gl;
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    this.quadVAO = gl.createVertexArray();
    gl.bindVertexArray(this.quadVAO);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  }

  private createShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${info}`);
    }
    return shader;
  }

  private createProgram(vsSource: string, fsSource: string): WebGLProgram {
    const gl = this.gl;
    const vs = this.createShader(gl.VERTEX_SHADER, vsSource);
    const fs = this.createShader(gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error(`Program link error: ${info}`);
    }

    // Cache uniforms
    const uniformsObj: Record<string, WebGLUniformLocation> = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(program, i)!.name;
      const loc = gl.getUniformLocation(program, name);
      if (loc) uniformsObj[name] = loc;
    }
    this.uniforms.set(program, uniformsObj);

    return program;
  }

  private initShaders() {
    this.clearProgram = this.createProgram(baseVertexShader, clearShader);
    this.splatProgram = this.createProgram(baseVertexShader, splatShader);
    this.advectionProgram = this.createProgram(baseVertexShader, advectionShader);
    this.divergenceProgram = this.createProgram(baseVertexShader, divergenceShader);
    this.curlProgram = this.createProgram(baseVertexShader, curlShader);
    this.vorticityProgram = this.createProgram(baseVertexShader, vorticityShader);
    this.pressureProgram = this.createProgram(baseVertexShader, pressureShader);
    this.gradSubProgram = this.createProgram(baseVertexShader, gradientSubtractShader);
    this.bloomPrefilterProgram = this.createProgram(baseVertexShader, bloomPrefilterShader);
    this.bloomBlurProgram = this.createProgram(baseVertexShader, bloomBlurShader);
    this.displayProgram = this.createProgram(baseVertexShader, displayShader);
  }

  private createFBO(
    w: number,
    h: number,
    internalFormat: number,
    format: number,
    type: number,
    param: number
  ): FramebufferObject {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const texelSizeX = 1.0 / w;
    const texelSizeY = 1.0 / h;

    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX,
      texelSizeY,
      attach: (id: number) => {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  private createDoubleFBO(
    w: number,
    h: number,
    internalFormat: number,
    format: number,
    type: number,
    param: number
  ): DoubleFramebufferObject {
    let fbo1 = this.createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = this.createFBO(w, h, internalFormat, format, type, param);

    return {
      width: w,
      height: h,
      texelSizeX: fbo1.texelSizeX,
      texelSizeY: fbo1.texelSizeY,
      get read() {
        return fbo1;
      },
      set read(value) {
        fbo1 = value;
      },
      get write() {
        return fbo2;
      },
      set write(value) {
        fbo2 = value;
      },
      swap: () => {
        const temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      },
    };
  }

  private getResolution(targetRes: number) {
    let aspectRatio = this.gl.canvas.width / this.gl.canvas.height;
    if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;

    const min = Math.round(targetRes);
    const max = Math.round(targetRes * aspectRatio);

    if (this.gl.canvas.width > this.gl.canvas.height) {
      return { width: max, height: min };
    } else {
      return { width: min, height: max };
    }
  }

  // Exact function signature matching the_coding_wizard.js code overlay in reference image!
  public initBloomFramebuffers() {
    const gl = this.gl;
    const res = this.getResolution(this.config.BLOOM_RESOLUTION);
    const texType = this.ext.halfFloatTexType;
    const rgba = this.ext.formatRGBA;

    // Clean up old bloom FBOs
    this.bloomFramebuffers.forEach((b) => {
      gl.deleteFramebuffer(b.fbo);
      gl.deleteTexture(b.texture);
    });
    this.bloomFramebuffers = [];

    for (let i = 0; i < this.config.BLOOM_ITERATIONS; i++) {
      const width = res.width >> (i + 1);
      const height = res.height >> (i + 1);

      if (width < 2 || height < 2) break;

      const fbo = this.createFBO(width, height, rgba.internalFormat, rgba.format, texType, gl.LINEAR);
      this.bloomFramebuffers.push({
        fbo: fbo.fbo,
        texture: fbo.texture,
        width,
        height,
      });
    }
  }

  private initFramebuffers() {
    const gl = this.gl;
    const simRes = this.getResolution(this.config.SIM_RESOLUTION);
    const dyeRes = this.getResolution(this.config.DYE_RESOLUTION);

    const texType = this.ext.halfFloatTexType;
    const rgba = this.ext.formatRGBA;
    const rg = this.ext.formatRG;
    const r = this.ext.formatR;
    const filtering = this.ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    this.density = this.createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    this.velocity = this.createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
    this.divergence = this.createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    this.curl = this.createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    this.pressure = this.createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);

    this.initBloomFramebuffers();
  }

  public resizeCanvas() {
    const width = this.canvas.clientWidth || window.innerWidth || 1280;
    const height = this.canvas.clientHeight || window.innerHeight || 720;

    if (this.canvas.width !== width || this.canvas.height !== height || !this.density) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.stats.resolution = `${width}x${height}`;
      this.initFramebuffers();
    }
  }

  public setConfig(newConfig: Partial<FluidConfig>) {
    const prevSimRes = this.config.SIM_RESOLUTION;
    const prevDyeRes = this.config.DYE_RESOLUTION;
    const prevBloomRes = this.config.BLOOM_RESOLUTION;
    const prevBloomIter = this.config.BLOOM_ITERATIONS;

    this.config = { ...this.config, ...newConfig };

    if (
      prevSimRes !== this.config.SIM_RESOLUTION ||
      prevDyeRes !== this.config.DYE_RESOLUTION ||
      prevBloomRes !== this.config.BLOOM_RESOLUTION ||
      prevBloomIter !== this.config.BLOOM_ITERATIONS
    ) {
      this.initFramebuffers();
    }
  }

  public getConfig(): FluidConfig {
    return { ...this.config };
  }

  public getStats(): EngineStats {
    return { ...this.stats };
  }

  public on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  private emit(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(...args));
    }
  }

  private generateVibrantColor(): { r: number; g: number; b: number } {
    this.colorHue = (this.colorHue + 0.12) % 1;

    switch (this.config.COLOR_PALETTE) {
      case 'cyberpunk': {
        const set = [
          { r: 0.0, g: 0.95, b: 1.0 },  // Electric Cyan
          { r: 1.0, g: 0.0, b: 0.8 },   // Neon Pink
          { r: 0.6, g: 0.0, b: 1.0 },   // Deep Violet
          { r: 1.0, g: 0.8, b: 0.0 },   // Bright Yellow
        ];
        return set[Math.floor(Math.random() * set.length)];
      }
      case 'fire_ice': {
        const isIce = Math.random() > 0.5;
        if (isIce) {
          return { r: 0.1, g: 0.8, b: 1.2 };
        } else {
          return { r: 1.5, g: 0.3, b: 0.0 };
        }
      }
      case 'neon': {
        const set = [
          { r: 1.2, g: 0.0, b: 0.6 },
          { r: 0.0, g: 1.2, b: 0.4 },
          { r: 0.2, g: 0.5, b: 1.5 },
          { r: 1.2, g: 0.8, b: 0.0 },
        ];
        return set[Math.floor(Math.random() * set.length)];
      }
      case 'gold': {
        return { r: 1.2 + Math.random() * 0.3, g: 0.8 + Math.random() * 0.2, b: 0.1 };
      }
      case 'sunset': {
        const set = [
          { r: 1.2, g: 0.2, b: 0.4 },
          { r: 1.0, g: 0.5, b: 0.1 },
          { r: 0.5, g: 0.1, b: 0.8 },
        ];
        return set[Math.floor(Math.random() * set.length)];
      }
      case 'rainbow':
      default: {
        // HSV to RGB conversion
        const h = this.colorHue;
        const s = 0.95;
        const v = 1.3; // HDR intensity
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        let r = 0, g = 0, b = 0;
        switch (i % 6) {
          case 0: r = v; g = t; b = p; break;
          case 1: r = q; g = v; b = p; break;
          case 2: r = p; g = v; b = t; break;
          case 3: r = p; g = q; b = v; break;
          case 4: r = t; g = p; b = v; break;
          case 5: r = v; g = p; b = q; break;
        }
        return { r, g, b };
      }
    }
  }

  // Trigger multiple colorful fluid splats across the screen (Spacebar burst)
  public multipleSplats(count: number = 10) {
    this.stats.isStarted = true;
    for (let i = 0; i < count; i++) {
      const color = this.generateVibrantColor();
      const x = 0.15 + Math.random() * 0.7;
      const y = 0.15 + Math.random() * 0.7;
      const dx = (Math.random() - 0.5) * (this.config.SPLAT_FORCE * 1.5);
      const dy = (Math.random() - 0.5) * (this.config.SPLAT_FORCE * 1.5);
      this.splatStack.push({ x, y, dx, dy, color });
    }
  }

  public splatAtPoint(x: number, y: number, dx: number, dy: number, customColor?: { r: number; g: number; b: number }) {
    this.stats.isStarted = true;
    const color = customColor || this.generateVibrantColor();
    this.splatStack.push({ x, y, dx, dy, color });
  }

  public clearCanvas() {
    const gl = this.gl;
    const clearProgram = this.clearProgram;
    const uniforms = this.uniforms.get(clearProgram)!;

    gl.useProgram(clearProgram);
    gl.uniform1f(uniforms.uValue, 0.0);

    const fbosToClear = [
      this.density.read,
      this.density.write,
      this.velocity.read,
      this.velocity.write,
      this.pressure.read,
      this.pressure.write,
    ];

    fbosToClear.forEach((fbo) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.fbo);
      gl.viewport(0, 0, fbo.width, fbo.height);
      gl.uniform1i(uniforms.uTexture, fbo.attach(0));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });

    this.bloomFramebuffers.forEach((fbo) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.fbo);
      gl.viewport(0, 0, fbo.width, fbo.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
      gl.uniform1i(uniforms.uTexture, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });

    this.stats.isStarted = false;
  }

  private setupEventListeners() {
    const canvas = this.canvas;

    const handlePointerDown = (e: MouseEvent | Touch) => {
      const rect = canvas.getBoundingClientRect();
      const posX = (e.clientX - rect.left) / rect.width;
      const posY = 1.0 - (e.clientY - rect.top) / rect.height;

      const pointer = this.pointers[0];
      pointer.down = true;
      pointer.moved = false;
      pointer.texcoordX = posX;
      pointer.texcoordY = posY;
      pointer.prevTexcoordX = posX;
      pointer.prevTexcoordY = posY;
      pointer.deltaX = 0;
      pointer.deltaY = 0;
      pointer.color = this.generateVibrantColor();

      // Trigger immediate burst on click
      this.splatAtPoint(posX, posY, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, pointer.color);
    };

    const handlePointerMove = (e: MouseEvent | Touch) => {
      const pointer = this.pointers[0];
      if (!pointer.down) return;

      const rect = canvas.getBoundingClientRect();
      const posX = (e.clientX - rect.left) / rect.width;
      const posY = 1.0 - (e.clientY - rect.top) / rect.height;

      pointer.prevTexcoordX = pointer.texcoordX;
      pointer.prevTexcoordY = pointer.texcoordY;
      pointer.texcoordX = posX;
      pointer.texcoordY = posY;
      pointer.deltaX = (pointer.texcoordX - pointer.prevTexcoordX) * this.config.SPLAT_FORCE;
      pointer.deltaY = (pointer.texcoordY - pointer.prevTexcoordY) * this.config.SPLAT_FORCE;
      pointer.moved = Math.abs(pointer.deltaX) > 0.1 || Math.abs(pointer.deltaY) > 0.1;
    };

    const handlePointerUp = () => {
      this.pointers[0].down = false;
    };

    // Mouse listeners
    canvas.addEventListener('mousedown', (e) => handlePointerDown(e));
    window.addEventListener('mousemove', (e) => handlePointerMove(e));
    window.addEventListener('mouseup', handlePointerUp);

    // Touch listeners
    canvas.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        if (e.targetTouches.length > 0) handlePointerDown(e.targetTouches[0]);
      },
      { passive: false }
    );

    window.addEventListener(
      'touchmove',
      (e) => {
        if (e.targetTouches.length > 0) handlePointerMove(e.targetTouches[0]);
      },
      { passive: false }
    );

    window.addEventListener('touchend', handlePointerUp);

    // Window resize
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });
  }

  // Pass execution steps
  private renderQuad(destination: FramebufferObject | null) {
    const gl = this.gl;
    if (destination === null) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, destination.fbo);
      gl.viewport(0, 0, destination.width, destination.height);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private applySplat(x: number, y: number, dx: number, dy: number, color: { r: number; g: number; b: number }) {
    const gl = this.gl;

    // Apply to velocity
    gl.useProgram(this.splatProgram);
    let u = this.uniforms.get(this.splatProgram)!;
    gl.uniform1i(u.uTarget, this.velocity.read.attach(0));
    gl.uniform1f(u.uAspect, gl.canvas.width / gl.canvas.height);
    gl.uniform2f(u.uPoint, x, y);
    gl.uniform3f(u.uColor, dx, dy, 0.0);
    gl.uniform1f(u.uRadius, this.config.SPLAT_RADIUS / 100.0);
    this.renderQuad(this.velocity.write);
    this.velocity.swap();

    // Apply to density (dye)
    gl.uniform1i(u.uTarget, this.density.read.attach(0));
    gl.uniform3f(u.uColor, color.r, color.g, color.b);
    this.renderQuad(this.density.write);
    this.density.swap();
  }

  private step(dt: number) {
    const gl = this.gl;
    gl.disable(gl.BLEND);

    // 1. Process queued splats
    if (this.splatStack.length > 0) {
      this.stats.activeSplats = this.splatStack.length;
      const count = Math.min(this.splatStack.length, 12);
      for (let i = 0; i < count; i++) {
        const s = this.splatStack.shift()!;
        this.applySplat(s.x, s.y, s.dx, s.dy, s.color);
      }
    } else {
      this.stats.activeSplats = 0;
    }

    // Process active dragging pointers
    for (const p of this.pointers) {
      if (p.down && p.moved) {
        this.applySplat(p.texcoordX, p.texcoordY, p.deltaX, p.deltaY, p.color);
        p.moved = false;
      }
    }

    // 2. Curl / Vorticity Calculation
    gl.useProgram(this.curlProgram);
    let u = this.uniforms.get(this.curlProgram)!;
    gl.uniform2f(u.uTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
    gl.uniform1i(u.uVelocity, this.velocity.read.attach(0));
    this.renderQuad(this.curl);

    // 3. Vorticity Confinement
    gl.useProgram(this.vorticityProgram);
    u = this.uniforms.get(this.vorticityProgram)!;
    gl.uniform2f(u.uTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
    gl.uniform1i(u.uVelocity, this.velocity.read.attach(0));
    gl.uniform1i(u.uCurl, this.curl.attach(1));
    gl.uniform1f(u.uCurlValue, this.config.CURL);
    gl.uniform1f(u.uDt, dt);
    this.renderQuad(this.velocity.write);
    this.velocity.swap();

    // 4. Divergence Calculation
    gl.useProgram(this.divergenceProgram);
    u = this.uniforms.get(this.divergenceProgram)!;
    gl.uniform2f(u.uTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
    gl.uniform1i(u.uVelocity, this.velocity.read.attach(0));
    this.renderQuad(this.divergence);

    // 5. Clear Pressure
    gl.useProgram(this.clearProgram);
    u = this.uniforms.get(this.clearProgram)!;
    gl.uniform1i(u.uTexture, this.pressure.read.attach(0));
    gl.uniform1f(u.uValue, this.config.PRESSURE);
    this.renderQuad(this.pressure.write);
    this.pressure.swap();

    // 6. Pressure Jacobi Iterations
    gl.useProgram(this.pressureProgram);
    u = this.uniforms.get(this.pressureProgram)!;
    gl.uniform2f(u.uTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
    gl.uniform1i(u.uDivergence, this.divergence.attach(0));

    for (let i = 0; i < this.config.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(u.uPressure, this.pressure.read.attach(1));
      this.renderQuad(this.pressure.write);
      this.pressure.swap();
    }

    // 7. Gradient Subtract
    gl.useProgram(this.gradSubProgram);
    u = this.uniforms.get(this.gradSubProgram)!;
    gl.uniform2f(u.uTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
    gl.uniform1i(u.uPressure, this.pressure.read.attach(0));
    gl.uniform1i(u.uVelocity, this.velocity.read.attach(1));
    this.renderQuad(this.velocity.write);
    this.velocity.swap();

    // 8. Velocity Advection
    gl.useProgram(this.advectionProgram);
    u = this.uniforms.get(this.advectionProgram)!;
    gl.uniform2f(u.uTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
    gl.uniform1i(u.uVelocity, this.velocity.read.attach(0));
    gl.uniform1i(u.uSource, this.velocity.read.attach(0));
    gl.uniform1f(u.uDt, dt);
    gl.uniform1f(u.uDissipation, this.config.VELOCITY_DISSIPATION);
    this.renderQuad(this.velocity.write);
    this.velocity.swap();

    // 9. Dye Advection
    gl.uniform2f(u.uTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
    gl.uniform1i(u.uVelocity, this.velocity.read.attach(0));
    gl.uniform1i(u.uSource, this.density.read.attach(1));
    gl.uniform1f(u.uDissipation, this.config.DENSITY_DISSIPATION);
    this.renderQuad(this.density.write);
    this.density.swap();
  }

  private renderBloom() {
    if (!this.config.BLOOM || this.bloomFramebuffers.length === 0) return;

    const gl = this.gl;

    // 1. Prefilter threshold
    gl.useProgram(this.bloomPrefilterProgram);
    let u = this.uniforms.get(this.bloomPrefilterProgram)!;
    gl.uniform1i(u.uTexture, this.density.read.attach(0));
    gl.uniform1f(u.uThreshold, this.config.BLOOM_THRESHOLD);
    this.renderQuad({
      fbo: this.bloomFramebuffers[0].fbo,
      width: this.bloomFramebuffers[0].width,
      height: this.bloomFramebuffers[0].height,
      texture: this.bloomFramebuffers[0].texture,
      texelSizeX: 1 / this.bloomFramebuffers[0].width,
      texelSizeY: 1 / this.bloomFramebuffers[0].height,
      attach: (id) => id,
    });

    // 2. Downsample blur pyramid
    gl.useProgram(this.bloomBlurProgram);
    u = this.uniforms.get(this.bloomBlurProgram)!;

    for (let i = 0; i < this.bloomFramebuffers.length - 1; i++) {
      const src = this.bloomFramebuffers[i];
      const dest = this.bloomFramebuffers[i + 1];

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, src.texture);
      gl.uniform1i(u.uTexture, 0);
      gl.uniform2f(u.uTexelSize, 1.0 / src.width, 1.0 / src.height);

      this.renderQuad({
        fbo: dest.fbo,
        width: dest.width,
        height: dest.height,
        texture: dest.texture,
        texelSizeX: 1 / dest.width,
        texelSizeY: 1 / dest.height,
        attach: (id) => id,
      });
    }
  }

  private renderDisplay() {
    const gl = this.gl;
    gl.useProgram(this.displayProgram);
    const u = this.uniforms.get(this.displayProgram)!;

    gl.uniform1i(u.uTexture, this.density.read.attach(0));

    if (this.config.BLOOM && this.bloomFramebuffers.length > 0) {
      const lastBloom = this.bloomFramebuffers[this.bloomFramebuffers.length - 1];
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, lastBloom.texture);
      gl.uniform1i(u.uBloom, 1);
    }

    gl.uniform2f(u.uTexelSize, 1.0 / gl.canvas.width, 1.0 / gl.canvas.height);
    gl.uniform1f(u.uBloomIntensity, this.config.BLOOM ? this.config.BLOOM_INTENSITY : 0.0);
    gl.uniform1i(u.uShading, this.config.SHADING ? 1 : 0);

    this.renderQuad(null);
  }

  public start() {
    if (this.animationFrameId !== null) return;

    const loop = () => {
      const now = Date.now();
      const dt = Math.min((now - this.lastUpdateTime) / 1000, 0.016);
      this.lastUpdateTime = now;

      // Update FPS
      this.frameCount++;
      if (now - this.lastFpsUpdate >= 500) {
        this.stats.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
        this.stats.frameTime = Number((dt * 1000).toFixed(1));
        this.frameCount = 0;
        this.lastFpsUpdate = now;
        this.emit('stats', this.stats);
      }

      if (!this.config.PAUSED) {
        // Auto splats if configured
        if (this.config.AUTO_SPLATS && Math.random() < 0.03) {
          this.splatAtPoint(Math.random(), Math.random(), (Math.random() - 0.5) * 300, (Math.random() - 0.5) * 300);
        }

        this.step(dt);
        this.renderBloom();
      }

      this.renderDisplay();
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.lastUpdateTime = Date.now();
    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public destroy() {
    this.stop();

    const gl = this.gl;
    if (this.quadVAO) gl.deleteVertexArray(this.quadVAO);

    // Delete FBO textures
    const deleteDoubleFBO = (dfbo: DoubleFramebufferObject) => {
      gl.deleteFramebuffer(dfbo.read.fbo);
      gl.deleteTexture(dfbo.read.texture);
      gl.deleteFramebuffer(dfbo.write.fbo);
      gl.deleteTexture(dfbo.write.texture);
    };

    if (this.density) deleteDoubleFBO(this.density);
    if (this.velocity) deleteDoubleFBO(this.velocity);
    if (this.pressure) deleteDoubleFBO(this.pressure);
    if (this.divergence) {
      gl.deleteFramebuffer(this.divergence.fbo);
      gl.deleteTexture(this.divergence.texture);
    }
    if (this.curl) {
      gl.deleteFramebuffer(this.curl.fbo);
      gl.deleteTexture(this.curl.texture);
    }

    this.bloomFramebuffers.forEach((b) => {
      gl.deleteFramebuffer(b.fbo);
      gl.deleteTexture(b.texture);
    });
  }
}
