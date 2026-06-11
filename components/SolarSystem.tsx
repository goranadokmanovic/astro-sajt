"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sparkles, Stars, useTexture } from "@react-three/drei";
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { scrollState, planetPositions } from "@/lib/scrollState";

const BACKGROUND = "#0a0612";
const BASE_TILT = (25 * Math.PI) / 180;
const MAX_PARALLAX = 0.05;
const PARALLAX_GAIN = MAX_PARALLAX * 2;
const DAMPING = 0.06;
const PULSE_OMEGA = (Math.PI * 2) / 4;

const TEXTURE_PATHS = {
  sun: "/textures/planets/sun.jpg",
  moon: "/textures/planets/moon.jpg",
  mercury: "/textures/planets/mercury.jpg",
  venus: "/textures/planets/venus_surface.jpg",
  earth: "/textures/planets/earth_daymap.jpg",
  mars: "/textures/planets/mars.jpg",
  jupiter: "/textures/planets/jupiter.jpg",
  saturn: "/textures/planets/saturn.jpg",
  uranus: "/textures/planets/uranus.jpg",
  neptune: "/textures/planets/neptune.jpg",
} as const;

const AMBIENT_INTENSITY = 0.55; // Purple fill only; keep bloom reserved for the sun.

type TextureKey = keyof typeof TEXTURE_PATHS;
type LoadedTextures = Record<TextureKey, THREE.Texture>;

type TiltRefs = {
  targetX: number;
  targetZ: number;
  currentX: number;
  currentZ: number;
  enabled: boolean;
};

type PlanetConfig = {
  radius: number;
  texture: TextureKey;
  orbitA: number;
  orbitB: number;
  orbitSpeed: number;
  spinSpeed: number;
  phase: number;
  yOffset: number;
  inclination: number;
};

const SUN_RADIUS = 1.6;
// Outer 3 orbits scaled in by ~12-15% so full orbits stay inside the wide-view frustum.
const ORBIT_SEMI_MAJOR = [3.2, 4.6, 6.0, 7.4, 8.0, 10.0, 13.4, 13.0] as const;

const PLANETS: PlanetConfig[] = [
  {
    radius: 0.35,
    texture: "mercury",
    orbitA: ORBIT_SEMI_MAJOR[0],
    orbitB: ORBIT_SEMI_MAJOR[0] * 0.8,
    orbitSpeed: 0.85,
    spinSpeed: 1.2,
    phase: 0 * 2.4,
    yOffset: -0.5,
    inclination: 0.02,
  },
  {
    radius: 0.42,
    texture: "venus",
    orbitA: ORBIT_SEMI_MAJOR[1],
    orbitB: ORBIT_SEMI_MAJOR[1] * 0.8,
    orbitSpeed: 0.62,
    spinSpeed: 0.9,
    phase: 1 * 2.4,
    yOffset: 0.4,
    inclination: -0.04,
  },
  {
    radius: 0.48,
    texture: "earth",
    orbitA: ORBIT_SEMI_MAJOR[2],
    orbitB: ORBIT_SEMI_MAJOR[2] * 0.8,
    orbitSpeed: 0.5,
    spinSpeed: 1.0,
    phase: 2 * 2.4,
    yOffset: -0.6,
    inclination: 0.05,
  },
  {
    radius: 0.4,
    texture: "mars",
    orbitA: ORBIT_SEMI_MAJOR[3],
    orbitB: ORBIT_SEMI_MAJOR[3] * 0.8,
    orbitSpeed: 0.4,
    spinSpeed: 1.1,
    phase: 3 * 2.4,
    yOffset: 0.5,
    inclination: -0.03,
  },
  {
    radius: 1.1,
    texture: "jupiter",
    orbitA: ORBIT_SEMI_MAJOR[4],
    orbitB: ORBIT_SEMI_MAJOR[4] * 0.8,
    orbitSpeed: 0.22,
    spinSpeed: 1.8,
    phase: 4 * 2.4,
    yOffset: -1.2,
    inclination: -0.07,
  },
  {
    radius: 0.85,
    texture: "saturn",
    orbitA: ORBIT_SEMI_MAJOR[5],
    orbitB: ORBIT_SEMI_MAJOR[5] * 0.8,
    orbitSpeed: 0.17,
    spinSpeed: 1.4,
    phase: 5 * 2.4,
    yOffset: 1.2,
    inclination: 0.07,
  },
  {
    radius: 0.51,
    texture: "uranus",
    orbitA: 12.5,
    orbitB: 12.5 * 0.8,
    orbitSpeed: 0.12,
    spinSpeed: 0.8,
    phase: 6 * 2.4,
    yOffset: -0.6,
    inclination: 0.04,
  },
  {
    radius: 0.62,
    texture: "neptune",
    orbitA: ORBIT_SEMI_MAJOR[7],
    orbitB: ORBIT_SEMI_MAJOR[7] * 0.8,
    orbitSpeed: 0.09,
    spinSpeed: 0.7,
    phase: 7 * 2.4,
    yOffset: 0.9,
    inclination: -0.06,
  },
];

// ─── Moon ────────────────────────────────────────────────────────────────────
const MOON_RADIUS = 0.48 * 0.20; // ~0.096 — ~20 % of Earth radius (clear companion, not twin)
const MOON_ORBIT_RADIUS = 0.48 * 2.2; // 1.056 — 2.2× Earth radius; Earth prominent behind Moon
const MOON_ORBIT_SPEED = 1.8;

// ─── Camera journey ───────────────────────────────────────────────────────────
// Pre-allocated vectors to avoid per-frame GC pressure.
const _camDesiredPos = new THREE.Vector3();
const _camDesiredLook = new THREE.Vector3();
const _planetWorldPos = new THREE.Vector3();

// Camera offsets: small bodies (Moon, Mercury) ×0.65; mid ×0.70; Saturn ×0.78 (ring clearance).
const SUN_CAM_OFF     = new THREE.Vector3( 2.45, 1.4,  4.2 );
const MOON_CAM_OFF    = new THREE.Vector3( 0.58, 0.26, 1.8 );
const MERCURY_CAM_OFF = new THREE.Vector3(-1.6,  0.32, 2.25);
const VENUS_CAM_OFF   = new THREE.Vector3( 1.75, 0.42, 2.65);
const MARS_CAM_OFF    = new THREE.Vector3(-1.75, 0.56, 2.9 );
const SATURN_CAM_OFF  = new THREE.Vector3( 2.5,  1.4,  5.1 );
const PULLBACK_POS    = new THREE.Vector3( 0,    4.0,  22.0); // matches opening — journey is a circle

function computeDesiredCamera(p: number) {
  const pp = planetPositions;
  if (p < 0.125) {
    _camDesiredPos.set(0, 4, 22);
    _camDesiredLook.set(0, 0, 0);
  } else if (p < 0.25) {
    _camDesiredPos.set(pp.sun.x + SUN_CAM_OFF.x, pp.sun.y + SUN_CAM_OFF.y, pp.sun.z + SUN_CAM_OFF.z);
    _camDesiredLook.set(pp.sun.x, pp.sun.y, pp.sun.z);
  } else if (p < 0.375) {
    _camDesiredPos.set(pp.moon.x + MOON_CAM_OFF.x, pp.moon.y + MOON_CAM_OFF.y, pp.moon.z + MOON_CAM_OFF.z);
    _camDesiredLook.set(pp.moon.x, pp.moon.y, pp.moon.z);
  } else if (p < 0.5) {
    _camDesiredPos.set(pp.mercury.x + MERCURY_CAM_OFF.x, pp.mercury.y + MERCURY_CAM_OFF.y, pp.mercury.z + MERCURY_CAM_OFF.z);
    _camDesiredLook.set(pp.mercury.x, pp.mercury.y, pp.mercury.z);
  } else if (p < 0.625) {
    _camDesiredPos.set(pp.venus.x + VENUS_CAM_OFF.x, pp.venus.y + VENUS_CAM_OFF.y, pp.venus.z + VENUS_CAM_OFF.z);
    _camDesiredLook.set(pp.venus.x, pp.venus.y, pp.venus.z);
  } else if (p < 0.75) {
    _camDesiredPos.set(pp.mars.x + MARS_CAM_OFF.x, pp.mars.y + MARS_CAM_OFF.y, pp.mars.z + MARS_CAM_OFF.z);
    _camDesiredLook.set(pp.mars.x, pp.mars.y, pp.mars.z);
  } else if (p < 0.875) {
    _camDesiredPos.set(pp.saturn.x + SATURN_CAM_OFF.x, pp.saturn.y + SATURN_CAM_OFF.y, pp.saturn.z + SATURN_CAM_OFF.z);
    _camDesiredLook.set(pp.saturn.x, pp.saturn.y, pp.saturn.z);
  } else {
    _camDesiredPos.copy(PULLBACK_POS);
    _camDesiredLook.set(0, 0, 0);
  }
}

// Planets slow to 15 % speed during the journey so the camera can frame them.
// Exit ramp begins when the camera pulls back (p=0.875) — full speed returns at p=1.0
// so the final wide view is identical in motion to the opening shot.
function getOrbitalSpeedFactor(p: number): number {
  if (p < 0.05)   return 1;
  if (p < 0.12)   return 1 - ((p - 0.05)  / 0.07)  * 0.85;
  if (p > 0.875)  return 0.15 + ((p - 0.875) / 0.125) * 0.85;
  return 0.15;
}

// Moon needs a much steeper slowdown — a moving Moon makes the camera station shimmer.
function getMoonSpeedFactor(p: number): number {
  if (p < 0.05)   return 1;
  if (p < 0.12)   return 1 - ((p - 0.05)  / 0.07)  * 0.95;
  if (p > 0.875)  return 0.05 + ((p - 0.875) / 0.125) * 0.95;
  return 0.05;
}

// During a station hold, the target body (and its parent) ease to a full stop.
// Returns a [0, 1] multiplier — 0 = frozen, 1 = free.
const STATION_FREEZE_FADE = 0.02; // ease band in scroll units

function getStationFreeze(stationStart: number, stationEnd: number, p: number): number {
  if (p >= stationStart - STATION_FREEZE_FADE && p < stationStart) {
    return 1 - (p - (stationStart - STATION_FREEZE_FADE)) / STATION_FREEZE_FADE;
  }
  if (p >= stationStart && p <= stationEnd) return 0;
  if (p > stationEnd && p <= stationEnd + STATION_FREEZE_FADE) {
    return (p - stationEnd) / STATION_FREEZE_FADE;
  }
  return 1;
}

// Textures whose world positions are tracked for the camera journey.
const TEXTURE_TO_POS: Partial<Record<TextureKey, keyof typeof planetPositions>> = {
  mercury: "mercury",
  venus:   "venus",
  earth:   "earth",
  mars:    "mars",
  saturn:  "saturn",
};

// Module-level constants (no per-render allocation).
const CHROMA_OFFSET = new THREE.Vector2(0.0003, 0.0003);
const CLOSEUP_SEG_TEXTURES = new Set<TextureKey>(["mercury", "venus", "earth", "mars"]);

// Station fill-light: one reusable PointLight that follows the camera at each scroll stop.
// maxI is per-station — Mercury gets a 50 % boost because its surface is near-charcoal dark.
const FILL_STATION_RANGES = [
  { start: 0.125, end: 0.25,  maxI: 3.0 }, // Sun
  { start: 0.25,  end: 0.375, maxI: 3.0 }, // Moon
  { start: 0.375, end: 0.5,   maxI: 4.5 }, // Mercury — dark albedo needs extra lift
  { start: 0.5,   end: 0.625, maxI: 3.0 }, // Venus
  { start: 0.625, end: 0.75,  maxI: 3.0 }, // Mars
  { start: 0.75,  end: 0.875, maxI: 3.0 }, // Saturn
] as const;
const FILL_LIGHT_FADE = 0.022; // scroll units over which intensity ramps up/down

// When ANY station is active, ALL orbital motion eases to zero — the whole cosmos holds its
// breath while the camera observes one body. Self-rotation continues; only orbits stop.
function getGlobalStationFreeze(p: number): number {
  let minFreeze = 1;
  for (const { start, end } of FILL_STATION_RANGES) {
    const f = getStationFreeze(start, end, p);
    if (f < minFreeze) minFreeze = f;
  }
  return minFreeze;
}

// Pre-allocated for fill-light position lerp — no GC per frame.
const _keyLightPos = new THREE.Vector3();

// ─── Ring / Saturn constants ──────────────────────────────────────────────────
const SATURN_GROUP_TILT = 0.45;

const RING_INNER_FACTOR = 1.4;  // × planet radius
const RING_OUTER_FACTOR = 2.3;  // × planet radius

const PLANET_TEXTURE_KEYS = [
  "moon",
  "mercury",
  "venus",
  "earth",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
] as const;

type NebulaConfig = {
  position: [number, number, number];
  scale: number;
  rotation: number;
  inner: string;
  mid: string;
  outer: string;
  opacity: number;
  driftPhase: number;
  driftSpeed: number;
};

const NEBULAE: NebulaConfig[] = [
  {
    position: [-18, 6, -22],
    scale: 82,
    rotation: 0.4,
    inner: "#5c2888",
    mid: "#2d1550",
    outer: "#0d0620",
    opacity: 0.12,
    driftPhase: 0,
    driftSpeed: 0.12,
  },
  {
    position: [22, -4, -18],
    scale: 70,
    rotation: -0.6,
    inner: "#4a2070",
    mid: "#221040",
    outer: "#090412",
    opacity: 0.09,
    driftPhase: 1.8,
    driftSpeed: 0.09,
  },
  {
    position: [8, 12, -30],
    scale: 96,
    rotation: 0.2,
    inner: "#6b3fa0",
    mid: "#3d2060",
    outer: "#0f0624",
    opacity: 0.14,
    driftPhase: 3.2,
    driftSpeed: 0.07,
  },
  {
    position: [-10, -8, -26],
    scale: 62,
    rotation: 1.1,
    inner: "#3d1f5c",
    mid: "#1f1040",
    outer: "#0a0518",
    opacity: 0.08,
    driftPhase: 4.5,
    driftSpeed: 0.1,
  },
];

type VeilConfig = {
  position: [number, number, number];
  scale: number;
  rotation: number;
  inner: string;
  mid: string;
  outer: string;
  maxOpacity: number;
  nearFade: number;
  driftPhase: number;
  driftSpeed: number;
};

// Fly-through wisps along the camera path (z ≈ 9–14 from origin).
// Opacity is distance-driven so they swell as the camera approaches and dissolve on clip.
const VEILS: VeilConfig[] = [
  {
    position: [4, 2, 9],
    scale: 60,
    rotation: 0.15,
    inner: "#4a2070",
    mid: "#221040",
    outer: "#0d0620",
    maxOpacity: 0.13,
    nearFade: 2.5,
    driftPhase: 0.8,
    driftSpeed: 0.05,
  },
  {
    position: [-5, -2, 13],
    scale: 72,
    rotation: -0.2,
    inner: "#3d1f5c",
    mid: "#1f1040",
    outer: "#0a0518",
    maxOpacity: 0.11,
    nearFade: 2.5,
    driftPhase: 3.5,
    driftSpeed: 0.04,
  },
  {
    position: [8, -5, 11],
    scale: 50,
    rotation: 0.9,
    inner: "#5c2888",
    mid: "#2d1550",
    outer: "#0d0620",
    maxOpacity: 0.10,
    nearFade: 2.0,
    driftPhase: 6.1,
    driftSpeed: 0.06,
  },
];

// ─── Texture helpers ──────────────────────────────────────────────────────────
function configureTexture(texture: THREE.Texture, maxAnisotropy: number) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
}

function isTextureLoaded(texture: THREE.Texture | undefined) {
  const image = texture?.image as HTMLImageElement | undefined;
  return Boolean(texture?.uuid && image && image.width > 0 && image.height > 0);
}

function logTextureAudit(textures: LoadedTextures) {
  console.group("[SolarSystem] Planet texture audit");
  for (const key of PLANET_TEXTURE_KEYS) {
    const loaded = isTextureLoaded(textures[key]);
    console.log(
      `${key}: ${loaded ? "map loaded" : "FLAT (no map)"} → ${TEXTURE_PATHS[key]}`,
    );
  }
  console.groupEnd();
}

function usePlanetTextures(): LoadedTextures {
  const textures = useTexture(TEXTURE_PATHS);
  const { gl } = useThree();

  useEffect(() => {
    const maxAniso = gl.capabilities.getMaxAnisotropy();
    Object.values(textures).forEach((tex) => configureTexture(tex, maxAniso));
    logTextureAudit(textures);
  }, [textures, gl]);

  return textures;
}

// ─── Canvas texture generators ────────────────────────────────────────────────
function createNebulaTexture(inner: string, mid: string, outer: string) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  );
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.35, mid);
  gradient.addColorStop(0.7, outer);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createUranusBodyTexture() {
  const width = 4;
  const height = 512;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#0f2035");
  gradient.addColorStop(0.5, "#2d5a7a");
  gradient.addColorStop(1, "#0f2035");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  // 4-px-wide canvas collapses to a 1×1 average mip almost immediately;
  // disable mipmaps so the full gradient is always sampled.
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}


function createSunGlowTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2,
  );
  gradient.addColorStop(0, "rgba(255, 223, 138, 0.9)");
  gradient.addColorStop(0.28, "rgba(255, 176, 64, 0.45)");
  gradient.addColorStop(0.55, "rgba(255, 140, 40, 0.12)");
  gradient.addColorStop(0.78, "rgba(255, 120, 30, 0.04)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createSaturnRingGeometry(innerR: number, outerR: number) {
  const geo = new THREE.RingGeometry(innerR, outerR, 256);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const r = Math.sqrt(x * x + y * y);
    uv.setXY(i, (r - innerR) / (outerR - innerR), 0.5);
  }

  uv.needsUpdate = true;
  geo.computeBoundingSphere();
  if (geo.boundingSphere) {
    geo.boundingSphere.center.set(0, 0, 0);
    geo.boundingSphere.radius = outerR;
  }
  return geo;
}

// Deterministic PRNG (Mulberry32) — no Math.random(), identical result every mount.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 1024×4 canvas — fine ringlets with real Saturn macro structure.
// u=0 inner edge, u=1 outer edge; v is unused (always 0.5 from UV remap).
function createSaturnRingTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 4;
  const canvas = document.createElement("canvas");
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const rng = mulberry32(0xbee5cafe); // fixed seed

  // Sandy-gold palette
  const COLORS: [number, number, number][] = [
    [232, 217, 176], // #e8d9b0
    [212, 188, 146], // #d4bc92
    [196, 173, 126], // #c4ad7e
    [184, 153, 104], // #b89968
  ];

  // Macro zone envelope — based on real ring proportions.
  // C ring 0–0.28, B ring 0.28–0.69, Cassini 0.69–0.77, A ring 0.77–1.0
  function zoneAlpha(u: number): number {
    if (u < 0.28) return 0.38 + (u / 0.28) * 0.12;            // 0.38 → 0.50
    if (u < 0.69) {
      const t = (u - 0.28) / 0.41;
      return 0.55 + Math.sin(t * Math.PI) * 0.25;              // peaks 0.80 mid-B
    }
    if (u < 0.77) return 0.03;                                  // Cassini gap
    if (u < 0.87) return 0.22 + ((u - 0.77) / 0.10) * 0.26;   // 0.22 → 0.48
    if (u < 0.95) return 0.48 - ((u - 0.87) / 0.08) * 0.10;   // slight drop
    return Math.max(0, 0.38 * (1 - (u - 0.95) / 0.05));        // outer fade
  }

  // Soft edge fade at inner/outer rim
  function edgeFade(u: number): number {
    return Math.min(1, u / 0.03) * Math.min(1, (1 - u) / 0.025);
  }

  const pixAlpha = new Float32Array(W);
  const pixR     = new Uint8Array(W);
  const pixG     = new Uint8Array(W);
  const pixB     = new Uint8Array(W);

  // Lay down fine ringlet strips
  let x = 0;
  while (x < W) {
    const u = x / (W - 1);
    const inBring = u >= 0.28 && u < 0.69;
    const stripW  = inBring
      ? 2 + Math.round(rng() * 6)  // 2–8 px — finest detail in B ring
      : 2 + Math.round(rng() * 10); // 2–12 px elsewhere
    const ci        = Math.floor(rng() * COLORS.length);
    const stripBase = 0.15 + rng() * 0.70; // 0.15–0.85

    for (let i = 0; i < stripW && x + i < W; i++) {
      const px = x + i;
      const pu = px / (W - 1);
      pixAlpha[px] = Math.min(0.92, Math.max(0, stripBase * zoneAlpha(pu) * edgeFade(pu) * 1.4));
      pixR[px]     = COLORS[ci][0];
      pixG[px]     = COLORS[ci][1];
      pixB[px]     = COLORS[ci][2];
    }
    x += stripW;
  }

  // Write pixels (same data for every row — texture is 1D)
  const imgData = ctx.createImageData(W, H);
  const d = imgData.data;
  for (let px = 0; px < W; px++) {
    for (let py = 0; py < H; py++) {
      const idx  = (py * W + px) * 4;
      d[idx]     = pixR[px];
      d[idx + 1] = pixG[px];
      d[idx + 2] = pixB[px];
      d[idx + 3] = Math.round(pixAlpha[px] * 255);
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace      = THREE.SRGBColorSpace;
  tex.wrapS           = THREE.ClampToEdgeWrapping;
  tex.wrapT           = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter       = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate     = true;
  return tex;
}

// ─── 3D Components ────────────────────────────────────────────────────────────
function NebulaCloud({ config }: { config: NebulaConfig }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const basePosition = useMemo(
    () => new THREE.Vector3(...config.position),
    [config.position],
  );

  const texture = useMemo(
    () => createNebulaTexture(config.inner, config.mid, config.outer),
    [config.inner, config.mid, config.outer],
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.position.x =
      basePosition.x + Math.sin(t * config.driftSpeed + config.driftPhase) * 2.2;
    meshRef.current.position.y =
      basePosition.y + Math.cos(t * config.driftSpeed * 0.75 + config.driftPhase) * 1.4;
    meshRef.current.position.z = basePosition.z;
    meshRef.current.rotation.z =
      config.rotation + Math.sin(t * 0.04 + config.driftPhase) * 0.08;
  });

  if (!texture) return null;

  return (
    <mesh
      ref={meshRef}
      position={config.position}
      rotation={[0, 0, config.rotation]}
      renderOrder={-2}
    >
      <planeGeometry args={[config.scale, config.scale]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={config.opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function VeilCloud({ config }: { config: VeilConfig }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const basePos = useMemo(() => new THREE.Vector3(...config.position), [config.position]);

  const texture = useMemo(
    () => createNebulaTexture(config.inner, config.mid, config.outer),
    [config.inner, config.mid, config.outer],
  );

  useFrame(({ camera, clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;
    meshRef.current.position.x = basePos.x + Math.sin(t * config.driftSpeed + config.driftPhase) * 1.8;
    meshRef.current.position.y = basePos.y + Math.cos(t * config.driftSpeed * 0.7 + config.driftPhase) * 1.2;

    const dist = camera.position.distanceTo(meshRef.current.position);
    const { nearFade, maxOpacity } = config;
    const peakDist = nearFade * 3;
    const farDist = 28;
    let o: number;
    if (dist < nearFade) {
      o = (dist / nearFade) ** 2 * maxOpacity * 0.15;
    } else if (dist <= peakDist) {
      o = ((dist - nearFade) / (peakDist - nearFade)) * maxOpacity;
    } else {
      o = Math.max(0, 1 - (dist - peakDist) / (farDist - peakDist)) * maxOpacity;
    }
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = o;
  });

  if (!texture) return null;

  return (
    <mesh ref={meshRef} position={config.position} rotation={[0, 0, config.rotation]} renderOrder={-2}>
      <planeGeometry args={[config.scale, config.scale]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function CosmicBackdrop() {
  return (
    <group renderOrder={-1}>
      {NEBULAE.map((nebula, index) => (
        <NebulaCloud key={`nebula-${index}`} config={nebula} />
      ))}
      {VEILS.map((veil, index) => (
        <VeilCloud key={`veil-${index}`} config={veil} />
      ))}

      <Stars
        radius={120}
        depth={60}
        count={4500}
        factor={5}
        saturation={0.35}
        fade
        speed={0.25}
      />
      <Stars
        radius={90}
        depth={40}
        count={2000}
        factor={7}
        saturation={0.55}
        fade
        speed={0.15}
      />

      <Sparkles
        count={90}
        scale={38}
        size={2.2}
        speed={0.12}
        color="#6b3fa0"
        opacity={0.22}
        position={[0, 0, -8]}
      />
      <Sparkles
        count={55}
        scale={22}
        size={1.6}
        speed={0.08}
        color="#d4a843"
        opacity={0.18}
        position={[4, 2, 2]}
      />
      <Sparkles
        count={70}
        scale={50}
        size={1.2}
        speed={0.06}
        color="#8b4fc0"
        opacity={0.14}
        position={[-6, -3, -14]}
      />
    </group>
  );
}

function SunGlowSprite({
  texture,
  scale,
  opacity,
}: {
  texture: THREE.Texture;
  scale: number;
  opacity: number;
}) {
  return (
    <sprite scale={[scale, scale, 1]} renderOrder={0}>
      <spriteMaterial
        map={texture}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}

function Sun({ sunTexture }: { sunTexture: THREE.Texture }) {
  const bodyGroupRef  = useRef<THREE.Group>(null);   // pulse scale — body only
  const bodyMeshRef   = useRef<THREE.Mesh>(null);    // primary surface: slow forward rotation
  const boilMeshRef   = useRef<THREE.Mesh>(null);    // boil layer: faster counter-rotation
  const coronaGroupRef = useRef<THREE.Group>(null);  // corona breathing — independent of body
  const glowTexture = useMemo(() => createSunGlowTexture(), []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // Body pulse — gentle scale throb on the two mesh layers only
    if (bodyGroupRef.current) {
      const pulse = 1 + Math.sin(t * PULSE_OMEGA) * 0.04;
      bodyGroupRef.current.scale.setScalar(pulse);
    }

    // Surface churn — two texture layers slide against each other
    if (bodyMeshRef.current) bodyMeshRef.current.rotation.y += delta * 0.04;  // slow, majestic
    if (boilMeshRef.current) boilMeshRef.current.rotation.y -= delta * 0.07;  // faster, opposite

    // Corona breathes with larger amplitude, out of phase with the body pulse
    if (coronaGroupRef.current) {
      const coronaPulse = 1 + Math.sin(t * PULSE_OMEGA + Math.PI * 0.65) * 0.08;
      coronaGroupRef.current.scale.setScalar(coronaPulse);
    }
  });

  if (!glowTexture) return null;

  return (
    <>
      {/* Two mesh layers — pulsed together, each with independent rotation */}
      <group ref={bodyGroupRef}>
        {/* Primary surface */}
        <mesh ref={bodyMeshRef}>
          <sphereGeometry args={[SUN_RADIUS, 96, 96]} />
          <meshStandardMaterial
            map={sunTexture}
            emissiveMap={sunTexture}
            color="#ffffff"
            emissive="#ffdf8a"
            emissiveIntensity={2}
            roughness={0.35}
            metalness={0.02}
            toneMapped={false}
          />
        </mesh>

        {/* Boiling surface layer — same texture, additive, starts offset by ~108° */}
        <mesh ref={boilMeshRef} rotation={[0, Math.PI * 0.6, 0]}>
          <sphereGeometry args={[SUN_RADIUS * 1.015, 96, 96]} />
          <meshStandardMaterial
            map={sunTexture}
            emissiveMap={sunTexture}
            color="#ffffff"
            emissive="#ff9040"
            emissiveIntensity={1.1}
            transparent
            opacity={0.22}
            roughness={0.4}
            metalness={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Corona — breathes out of phase with body pulse */}
      <group ref={coronaGroupRef}>
        <SunGlowSprite texture={glowTexture} scale={SUN_RADIUS * 2.6} opacity={0.22} />
        <SunGlowSprite texture={glowTexture} scale={SUN_RADIUS * 3.4} opacity={0.1} />
        <SunGlowSprite texture={glowTexture} scale={SUN_RADIUS * 4.2} opacity={0.045} />
      </group>

      <pointLight color="#ffd090" intensity={22} decay={2} distance={0} />
      <pointLight color="#f0d8b8" intensity={5} decay={0} distance={0} />
    </>
  );
}

function Moon({ moonTexture }: { moonTexture: THREE.Texture }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const moonAngle = useRef(1.2);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const p = scrollState.progress;
    const base   = getMoonSpeedFactor(p);
    const freeze = getGlobalStationFreeze(p);
    moonAngle.current += MOON_ORBIT_SPEED * delta * base * freeze;

    const earth = planetPositions.earth;
    const x = earth.x + MOON_ORBIT_RADIUS * Math.cos(moonAngle.current);
    const z = earth.z + MOON_ORBIT_RADIUS * Math.sin(moonAngle.current);
    const y = earth.y;

    meshRef.current.position.set(x, y, z);
    meshRef.current.rotation.y += 0.15 * delta;

    // Store world position for camera journey
    meshRef.current.getWorldPosition(_planetWorldPos);
    planetPositions.moon.x = _planetWorldPos.x;
    planetPositions.moon.y = _planetWorldPos.y;
    planetPositions.moon.z = _planetWorldPos.z;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[MOON_RADIUS, 96, 96]} />
      <meshStandardMaterial
        map={moonTexture}
        color="#ffffff"
        roughness={0.9}
        metalness={0}
        emissive="#000000"
        emissiveIntensity={0}
      />
    </mesh>
  );
}

function SaturnRing({ planetRadius }: { planetRadius: number }) {
  const { geometry, material } = useMemo(() => {
    const inner = planetRadius * RING_INNER_FACTOR;
    const outer = planetRadius * RING_OUTER_FACTOR;
    const geo   = createSaturnRingGeometry(inner, outer);
    const tex   = createSaturnRingTexture();
    const mat   = new THREE.MeshBasicMaterial({
      map:         tex,
      transparent: true,
      side:        THREE.DoubleSide,
      depthWrite:  true,
      depthTest:   true,
      alphaTest:   0.02,
    });
    return { geometry: geo, material: mat };
  }, [planetRadius]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      (material as THREE.MeshBasicMaterial).map?.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <mesh
      name="saturn-ring"
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      frustumCulled={false}
    />
  );
}

function SaturnMesh({ radius, bodyMap }: { radius: number; bodyMap: THREE.Texture }) {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    console.log("[Saturn] group children count:", groupRef.current.children.length);
  }, []);

  return (
    <group ref={groupRef} rotation={[SATURN_GROUP_TILT, 0, 0]}>
      <mesh name="saturn-body">
        <sphereGeometry args={[radius, 96, 96]} />
        <meshStandardMaterial
          map={bodyMap}
          color="#ffffff"
          emissive="#000000"
          emissiveIntensity={0}
          roughness={0.88}
          metalness={0.02}
        />
      </mesh>
      <SaturnRing planetRadius={radius} />
    </group>
  );
}

function UranusMesh({ radius }: { radius: number }) {
  const bodyMap = useMemo(() => createUranusBodyTexture(), []);

  if (!bodyMap) return null;

  return (
    <mesh name="uranus-body">
      <sphereGeometry args={[radius, 36, 36]} />
      <meshStandardMaterial
        map={bodyMap}
        color="#a8bdd0"
        emissive="#08141f"
        emissiveIntensity={0.2}
        roughness={0.65}
        metalness={0.05}
      />
    </mesh>
  );
}

function PlanetMesh({ config, textures }: { config: PlanetConfig; textures: LoadedTextures }) {
  const map = textures[config.texture];

  if (config.texture === "saturn") {
    return <SaturnMesh radius={config.radius} bodyMap={textures.saturn} />;
  }

  if (config.texture === "uranus") {
    return <UranusMesh radius={config.radius} />;
  }

  const segs = CLOSEUP_SEG_TEXTURES.has(config.texture) ? 96 : 36;
  return (
    <mesh>
      <sphereGeometry args={[config.radius, segs, segs]} />
      <meshStandardMaterial
        map={map}
        color="#ffffff"
        emissive="#000000"
        emissiveIntensity={0}
        roughness={0.88}
        metalness={0.02}
      />
    </mesh>
  );
}

function Planet({ config, textures }: { config: PlanetConfig; textures: LoadedTextures }) {
  const groupRef = useRef<THREE.Group>(null);
  const orbitAngle = useRef(config.phase);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const p = scrollState.progress;
    const base  = getOrbitalSpeedFactor(p);
    const freeze = getGlobalStationFreeze(p);
    orbitAngle.current += config.orbitSpeed * delta * base * freeze;
    const x = config.orbitA * Math.cos(orbitAngle.current);
    const zFlat = config.orbitB * Math.sin(orbitAngle.current);
    const y = config.yOffset + zFlat * Math.sin(config.inclination);
    const z = zFlat * Math.cos(config.inclination);
    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.y += config.spinSpeed * delta;

    // Track world positions for camera journey stops
    const posName = TEXTURE_TO_POS[config.texture];
    if (posName) {
      groupRef.current.getWorldPosition(_planetWorldPos);
      planetPositions[posName].x = _planetWorldPos.x;
      planetPositions[posName].y = _planetWorldPos.y;
      planetPositions[posName].z = _planetWorldPos.z;
    }
  });

  return (
    <group ref={groupRef}>
      <PlanetMesh config={config} textures={textures} />
    </group>
  );
}

function SceneContent({ tiltRefs }: { tiltRefs: React.RefObject<TiltRefs> }) {
  const systemRef   = useRef<THREE.Group>(null);
  const textures    = usePlanetTextures();
  const camPos      = useRef(new THREE.Vector3(0, 4, 22));
  const camLook     = useRef(new THREE.Vector3(0, 0, 0));
  const keyLightRef = useRef<THREE.PointLight>(null);

  useFrame((state, delta) => {
    const progress = scrollState.progress;
    const tilt = tiltRefs.current;

    // System tilt / parallax — only while at rest (progress near 0)
    if (systemRef.current) {
      if (progress < 0.05 && tilt) {
        tilt.currentX += (tilt.targetX - tilt.currentX) * DAMPING;
        tilt.currentZ += (tilt.targetZ - tilt.currentZ) * DAMPING;
        systemRef.current.rotation.x = BASE_TILT + tilt.currentX;
        systemRef.current.rotation.z = tilt.currentZ;
      } else {
        systemRef.current.rotation.x = THREE.MathUtils.damp(
          systemRef.current.rotation.x, BASE_TILT, 4, delta,
        );
        systemRef.current.rotation.z = THREE.MathUtils.damp(
          systemRef.current.rotation.z, 0, 4, delta,
        );
      }
    }

    // Camera journey — drives camera position for scroll > 1 %
    if (progress > 0.01) {
      computeDesiredCamera(progress);
      const lambda = 1.5;
      camPos.current.x  = THREE.MathUtils.damp(camPos.current.x,  _camDesiredPos.x,  lambda, delta);
      camPos.current.y  = THREE.MathUtils.damp(camPos.current.y,  _camDesiredPos.y,  lambda, delta);
      camPos.current.z  = THREE.MathUtils.damp(camPos.current.z,  _camDesiredPos.z,  lambda, delta);
      camLook.current.x = THREE.MathUtils.damp(camLook.current.x, _camDesiredLook.x, lambda, delta);
      camLook.current.y = THREE.MathUtils.damp(camLook.current.y, _camDesiredLook.y, lambda, delta);
      camLook.current.z = THREE.MathUtils.damp(camLook.current.z, _camDesiredLook.z, lambda, delta);

      state.camera.position.copy(camPos.current);
      state.camera.lookAt(camLook.current);
    }

    // Station fill light — fades in/out per station, position between camera and planet
    if (keyLightRef.current) {
      let targetI = 0;
      for (const { start, end, maxI } of FILL_STATION_RANGES) {
        if (progress >= start && progress < end) {
          const fadeIn  = Math.min((progress - start) / FILL_LIGHT_FADE, 1);
          const fadeOut = Math.min((end - progress)   / FILL_LIGHT_FADE, 1);
          targetI = Math.min(fadeIn, fadeOut) * maxI;
          break;
        }
      }
      // Place light 30 % of the way from camera toward the look-at point —
      // this is slightly more on-axis than the camera itself, giving the
      // camera-facing hemisphere maximum frontal illumination.
      _keyLightPos.lerpVectors(camPos.current, camLook.current, 0.3);
      keyLightRef.current.position.copy(_keyLightPos);
      keyLightRef.current.intensity = THREE.MathUtils.damp(
        keyLightRef.current.intensity, targetI, 4, delta,
      );
    }
  });

  return (
    <>
      <color attach="background" args={[BACKGROUND]} />
      <ambientLight color="#6b3fa0" intensity={AMBIENT_INTENSITY} />
      {/* Station fill — soft warm key that reveals texture on the shadow side */}
      <pointLight ref={keyLightRef} color="#fff2dd" intensity={0} distance={14} decay={2} />

      <group ref={systemRef}>
        <CosmicBackdrop />
        <Sun sunTexture={textures.sun} />
        <Moon moonTexture={textures.moon} />
        {PLANETS.map((planet, index) => (
          <Planet key={`planet-${index}`} config={planet} textures={textures} />
        ))}
      </group>

      <EffectComposer multisampling={0}>
        <Bloom intensity={0.7} luminanceThreshold={0.85} mipmapBlur />
        <Noise opacity={0.025} blendFunction={BlendFunction.OVERLAY} />
        <ChromaticAberration offset={CHROMA_OFFSET} />
        <Vignette darkness={0.45} offset={0.3} />
      </EffectComposer>
    </>
  );
}

export default function SolarSystem() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tiltRefs = useRef<TiltRefs>({
    targetX: 0,
    targetZ: 0,
    currentX: 0,
    currentZ: 0,
    enabled: false,
  });

  useEffect(() => {
    const hoverQuery = window.matchMedia("(hover: hover)");
    const fineQuery  = window.matchMedia("(pointer: fine)");

    const update = () => {
      tiltRefs.current.enabled = hoverQuery.matches && fineQuery.matches;
      if (!tiltRefs.current.enabled) {
        tiltRefs.current.targetX = 0;
        tiltRefs.current.targetZ = 0;
      }
    };

    update();
    hoverQuery.addEventListener("change", update);
    fineQuery.addEventListener("change", update);

    return () => {
      hoverQuery.removeEventListener("change", update);
      fineQuery.removeEventListener("change", update);
    };
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!tiltRefs.current.enabled || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    tiltRefs.current.targetZ = x * PARALLAX_GAIN;
    tiltRefs.current.targetX = -y * PARALLAX_GAIN;
  };

  const handlePointerLeave = () => {
    tiltRefs.current.targetX = 0;
    tiltRefs.current.targetZ = 0;
  };

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <Canvas
        camera={{ position: [0, 4, 22], fov: 50, near: 0.1, far: 500 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        style={{ background: BACKGROUND }}
      >
        <Suspense fallback={null}>
          <SceneContent tiltRefs={tiltRefs} />
        </Suspense>
      </Canvas>
    </div>
  );
}
