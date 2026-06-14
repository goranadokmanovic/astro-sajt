"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Sparkles, Stars, useTexture } from "@react-three/drei";
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { scrollState, planetPositions } from "@/lib/scrollState";
import { CONSTELLATIONS, ELEMENT_GROUPS } from "@/lib/zodiac";

const BACKGROUND = "#0a0a14";
const BASE_TILT = (25 * Math.PI) / 180;

// Custom cursor for Celina finale drag — cosmic gold glow arrow, 64×32px, hotspot 32 16
const DRAG_CURSOR =
  "url(\"data:image/svg+xml," +
  "%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='32' viewBox='0 0 64 32'%3E" +
  "%3Cdefs%3E" +
  "%3Cfilter id='glow' filterUnits='userSpaceOnUse' x='-8' y='-8' width='80' height='48'%3E" +
  "%3CfeGaussianBlur stdDeviation='1.5' result='blur'/%3E" +
  "%3CfeMerge%3E%3CfeMergeNode in='blur'/%3E%3CfeMergeNode in='SourceGraphic'/%3E%3C/feMerge%3E" +
  "%3C/filter%3E" +
  "%3C/defs%3E" +
  "%3Cg filter='url(%23glow)' fill='none' stroke='%23d4a843' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E" +
  "%3Cline x1='17' y1='16' x2='47' y2='16'/%3E" +
  "%3Cpolyline points='17,11 8,16 17,21'/%3E" +
  "%3Cpolyline points='47,11 56,16 47,21'/%3E" +
  "%3C/g%3E" +
  "%3Cg filter='url(%23glow)' fill='%23d4a843'%3E" +
  "%3Cpath d='M12,3 L12.5,4.5 L14,5 L12.5,5.5 L12,7 L11.5,5.5 L10,5 L11.5,4.5 Z'/%3E" +
  "%3Cpath d='M53,6 L53.5,7.5 L55,8 L53.5,8.5 L53,10 L52.5,8.5 L51,8 L52.5,7.5 Z'/%3E" +
  "%3Cpath d='M20,25.5 L20.4,26.6 L21.5,27 L20.4,27.4 L20,28.5 L19.6,27.4 L18.5,27 L19.6,26.6 Z'/%3E" +
  "%3Cpath d='M46,23 L46.5,24.5 L48,25 L46.5,25.5 L46,27 L45.5,25.5 L44,25 L45.5,24.5 Z'/%3E" +
  "%3C/g%3E" +
  "%3C/svg%3E" +
  "\") 32 16, ew-resize";
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

type DragRefs = {
  isDragging: boolean;
  lastX:      number;
  deltaX:     number; // px accumulated since last frame
  velocity:   number; // smoothed rad/frame for inertia
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
const ORBIT_SEMI_MAJOR = [3.2, 4.6, 6.0, 7.4, 9.2, 11.4, 13.4, 15.2] as const;

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
    orbitA: 14.8,
    orbitB: 14.8 * 0.8,
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

// Camera offsets — ~30° above the orbital plane so frozen planets on the orbital plane
// drop below the view axis and leave dark sky as the dominant background (hero portrait).
const SUN_CAM_OFF     = new THREE.Vector3( 2.45, 1.4,  4.2 );
const MOON_CAM_OFF    = new THREE.Vector3( 0.5,  0.9,  1.6 ); // Earth prominent behind Moon
const MERCURY_CAM_OFF = new THREE.Vector3(-1.3,  1.6,  1.8 ); // elevation ~36° — Venus exits FOV
const VENUS_CAM_OFF   = new THREE.Vector3( 1.5,  1.8,  2.2 ); // elevation ~36°
const MARS_CAM_OFF    = new THREE.Vector3(-1.5,  1.8,  2.8 ); // elevation ~31°
const SATURN_CAM_OFF  = new THREE.Vector3( 2.2,  2.2,  5.2 ); // elevation ~22°; rings fill frame
const PULLBACK_POS    = new THREE.Vector3( 0,    4.0,  22.0); // matches opening — journey is a circle

// ─── Act 2 — Astrological Chart in 3D ────────────────────────────────────────
// 12 zodiac constellations encircle the solar system on the ecliptic ring.
// One elevated three-quarter camera view for all stations and finale.

const CHART_RING_R  = 35;  // outside Neptune (15.2) — zodiac ring radius
const CHART_RING_Y  = 2;   // near ecliptic plane, slight elevation

const CHART_CAM_POS  = new THREE.Vector3(0, 55, 88); // elevated three-quarter view — pulled back to keep full ring in frame
const CHART_CAM_LOOK = new THREE.Vector3(0,  2,  0); // look near-ecliptic origin

// 12 world positions for constellations on the chart ring (Aries offset, clockwise)
const CHART_POSITIONS: THREE.Vector3[] = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  return new THREE.Vector3(CHART_RING_R * Math.cos(a), CHART_RING_Y, CHART_RING_R * Math.sin(a));
});

// Station cameras — low orbital, positioned OPPOSITE the "far" vertex of each trine.
// Camera sits outside the ring at distance D, just above ring plane (Y=12),
// looking at the ring centre (0, CHART_RING_Y, 0). The far constellation appears
// centred in frame; the other two frame the shot left/right.
const STATION_CAM_D = 85;
const STATION_CAM_Y = 12;
// Azimuths: far vertex angle + π  (VATRA i=0 at 0° → cam at 180°, etc.)
const STATION_CAM_AZIMUTHS = [
  Math.PI,            // VATRA  (i=0 at   0° → cam at 180°)
  (7 * Math.PI) / 6, // ZEMLJA (i=1 at  30° → cam at 210°)
  (4 * Math.PI) / 3, // VAZDUH (i=2 at  60° → cam at 240°)
  (3 * Math.PI) / 2, // VODA   (i=3 at  90° → cam at 270°)
] as const;
const STATION_CAM_POSITIONS: THREE.Vector3[] = STATION_CAM_AZIMUTHS.map(a =>
  new THREE.Vector3(Math.cos(a) * STATION_CAM_D, STATION_CAM_Y, Math.sin(a) * STATION_CAM_D),
);

// Act 2 scroll ranges — act2Progress 0→1 over last 400vh of 1000vh.
// Phase 0: INTRO BEAT — all 12 at full brightness (grand reveal), no labels, no mist.
// Phases 1–4: element stations — active trio full, others dimmed to 30%.
// Phase 5: FINALE — all 12 lit, all labels, ring visible; then gentle hold on ring view.
const ACT2_INTRO_END      = 0.1875;   // intro beat ends; first element station begins
const ACT2_ELEMENT_STARTS = [0.1875, 0.325, 0.4625, 0.60] as const;
const ACT2_ELEMENT_ENDS   = [0.325, 0.4625, 0.60, 0.7375] as const;
const ACT2_FINALE_START   = 0.7375;
const ACT2_FINALE_END     = 0.8875;
const ACT2_ELEMENTS       = ['VATRA', 'ZEMLJA', 'VAZDUH', 'VODA'] as const;
const _ORIGIN             = new THREE.Vector3(0, 0, 0);

// Torus ring at chart level for finale — hairline, very subtle
const _chartRingGeo = new THREE.TorusGeometry(CHART_RING_R, 0.035, 8, 128);

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

// Star sprite: intense cool-white core, warm gold halo, 4 diffraction spikes.
function createStarTexture(): THREE.CanvasTexture {
  const S = 256, cx = 128, cy = 128;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  // Wide, very faint warm halo — max 0.18 opacity; supports, does not swallow the core
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.50);
  halo.addColorStop(0,    'rgba(255, 240, 200, 0.18)');
  halo.addColorStop(0.28, 'rgba(255, 220, 140, 0.07)');
  halo.addColorStop(0.65, 'rgba(200, 160,  60, 0.02)');
  halo.addColorStop(1,    'rgba(0,   0,    0,  0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, S, S);

  // Diffraction spikes — 4 thin arms, length ~80 % of texture, tapering 1.5 → 0.5 px
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const spikeLen = Math.round(S * 0.40); // 102 px from centre
  for (let d = 1; d <= spikeLen; d++) {
    const f    = Math.pow(1 - d / spikeLen, 1.8);
    const a    = f * 0.90;
    const w    = 0.5 + 1.0 * (1 - d / spikeLen); // 1.5 at base → 0.5 at tip
    const half = w / 2;
    ctx.fillStyle = `rgba(255, 252, 235, ${a.toFixed(3)})`;
    ctx.fillRect(cx + d - half, cy - half, w, w);
    ctx.fillRect(cx - d - half, cy - half, w, w);
    ctx.fillRect(cx - half, cy + d - half, w, w);
    ctx.fillRect(cx - half, cy - d - half, w, w);
  }
  ctx.restore();

  // Tight, intense core — radius ~6 % of texture (S*0.07 ≈ 18 px), steep falloff.
  // At 80 px rendered size: core ~5.6 px radius, spikes ~32 px arm — pure astrophoto point.
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.07);
  core.addColorStop(0,    'rgba(255, 255, 255, 1.0)');
  core.addColorStop(0.38, 'rgba(255, 255, 255, 1.0)'); // flat solid disk to ~7 px
  core.addColorStop(0.72, 'rgba(230, 245, 255, 0.55)');
  core.addColorStop(1,    'rgba(0,   0,   0,   0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, S, S);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace      = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter       = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate     = true;
  return tex;
}

// Lazy singleton — all 12 constellations share the same texture.
let _starTex: THREE.CanvasTexture | null = null;
function getStarTexture(): THREE.CanvasTexture {
  if (!_starTex) _starTex = createStarTexture();
  return _starTex;
}

// Soft radial mist texture for elemental trine nebula, tinted by element color.
function createMistTexture(hex: string): THREE.CanvasTexture {
  const S = 256;
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Multiple overlapping blobs give an organic cloud look
  const blobs = [
    { x: 0.50, y: 0.50, rad: 0.44, a: 0.55 },
    { x: 0.43, y: 0.54, rad: 0.29, a: 0.28 },
    { x: 0.58, y: 0.42, rad: 0.27, a: 0.22 },
    { x: 0.48, y: 0.38, rad: 0.19, a: 0.18 },
  ];
  for (const bl of blobs) {
    const grd = ctx.createRadialGradient(
      bl.x * S, bl.y * S, 0, bl.x * S, bl.y * S, bl.rad * S
    );
    grd.addColorStop(0,    `rgba(${r},${g},${b},${bl.a})`);
    grd.addColorStop(0.40, `rgba(${r},${g},${b},${(bl.a * 0.38).toFixed(3)})`);
    grd.addColorStop(0.75, `rgba(${r},${g},${b},${(bl.a * 0.07).toFixed(3)})`);
    grd.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, S, S);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace      = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter       = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate     = true;
  return tex;
}

const _mistTexCache: Map<string, THREE.CanvasTexture> = new Map();
function getMistTexture(color: string): THREE.CanvasTexture {
  if (!_mistTexCache.has(color)) _mistTexCache.set(color, createMistTexture(color));
  return _mistTexCache.get(color)!;
}

// Returns 1.0 when camera is close (stations), fades toward MIN at wide-view distance.
// Ensures overlapping mist planes don't accumulate into a "purple wall" at the opening shot.
function getDistanceFade(distFromOrigin: number): number {
  const CLOSE = 14; // Saturn station camera is ~13.5 units from origin — stays at 1.0
  const FAR = 20;   // transition completes before reaching wide-view distance (~22.4)
  const MIN = 0.38;
  if (distFromOrigin <= CLOSE) return 1.0;
  if (distFromOrigin >= FAR) return MIN;
  return 1.0 - ((distFromOrigin - CLOSE) / (FAR - CLOSE)) * (1.0 - MIN);
}

// Opacity for constellation ci at a given act2 scroll position.
// INTRO: all 12 at 1.0. STATIONS: active trio → 1.0, others → 0.30.
// FINALE: all 1.0. POST-FINALE: gentle hold on full ring view.
function getZodiacOpacity(ci: number, act2p: number): number {
  if (act2p <= 0) return 0;

  // INTRO BEAT — all 12 rise to full brightness simultaneously
  if (act2p < ACT2_INTRO_END) {
    return Math.min(act2p / (ACT2_INTRO_END * 0.35), 1);
  }

  // POST-FINALE HOLD — all 12 stay lit on the ring view
  if (act2p >= ACT2_FINALE_END) return 0.75;

  // FINALE — fade in to 75 %
  if (act2p >= ACT2_FINALE_START) {
    const t = (act2p - ACT2_FINALE_START) / (ACT2_FINALE_END - ACT2_FINALE_START);
    return Math.min(t * 2, 1) * 0.75;
  }

  // ELEMENT STATIONS — active trio surges to 1.0, other 9 hold at 0.30
  for (let ei = 0; ei < 4; ei++) {
    const start = ACT2_ELEMENT_STARTS[ei];
    const end   = ACT2_ELEMENT_ENDS[ei];
    if (act2p < start || act2p >= end) continue;
    const isActive = ELEMENT_GROUPS[ACT2_ELEMENTS[ei]].includes(ci);
    if (!isActive) return 0.30;
    const sub = (act2p - start) / (end - start);
    return 0.30 + Math.min(sub / 0.30, 1.0) * 0.70;
  }

  return 1.0;
}

function NebulaCloud({ config }: { config: NebulaConfig }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const basePosition = useMemo(
    () => new THREE.Vector3(...config.position),
    [config.position],
  );
  // Pre-initialise at wide-view value so there is no flash on first render.
  const currentOpacity = useRef(config.opacity * 0.38);

  const texture = useMemo(
    () => createNebulaTexture(config.inner, config.mid, config.outer),
    [config.inner, config.mid, config.outer],
  );

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.position.x =
      basePosition.x + Math.sin(t * config.driftSpeed + config.driftPhase) * 2.2;
    meshRef.current.position.y =
      basePosition.y + Math.cos(t * config.driftSpeed * 0.75 + config.driftPhase) * 1.4;
    meshRef.current.position.z = basePosition.z;
    meshRef.current.rotation.z =
      config.rotation + Math.sin(t * 0.04 + config.driftPhase) * 0.08;

    const target = config.opacity * getDistanceFade(state.camera.position.length());
    currentOpacity.current = THREE.MathUtils.damp(currentOpacity.current, target, 3, delta);
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = currentOpacity.current;
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
        opacity={config.opacity * 0.38}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function VeilCloud({ config }: { config: VeilConfig }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const basePos = useMemo(() => new THREE.Vector3(...config.position), [config.position]);
  const currentOpacity = useRef(0);

  const texture = useMemo(
    () => createNebulaTexture(config.inner, config.mid, config.outer),
    [config.inner, config.mid, config.outer],
  );

  useFrame(({ camera, clock }, delta) => {
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
    const target = o * getDistanceFade(camera.position.length());
    currentOpacity.current = THREE.MathUtils.damp(currentOpacity.current, target, 3, delta);
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = currentOpacity.current;
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
  const stars1Ref = useRef<THREE.Points>(null);
  const stars2Ref = useRef<THREE.Points>(null);
  const bgCapDone = useRef(false);

  // Cap background star brightness once refs resolve.
  // Background stars are dust — constellation stars must always outshine them.
  useFrame(() => {
    if (bgCapDone.current) return;
    const r1 = stars1Ref.current;
    const r2 = stars2Ref.current;
    if (!r1 || !r2) return;
    for (const r of [r1, r2]) {
      const mat = r.material as THREE.PointsMaterial;
      mat.transparent = true;
      mat.opacity = 0.45;
    }
    bgCapDone.current = true;
  });

  return (
    <group renderOrder={-1}>
      {NEBULAE.map((nebula, index) => (
        <NebulaCloud key={`nebula-${index}`} config={nebula} />
      ))}
      {VEILS.map((veil, index) => (
        <VeilCloud key={`veil-${index}`} config={veil} />
      ))}

      <Stars
        ref={stars1Ref}
        radius={120}
        depth={60}
        count={4500}
        factor={3}
        saturation={0.35}
        fade
        speed={0.25}
      />
      <Stars
        ref={stars2Ref}
        radius={90}
        depth={40}
        count={2000}
        factor={4}
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

// ─── Act 2 — Astrological Chart Scene ────────────────────────────────────────

function ZodiacConstellation({ ci }: { ci: number }) {
  const def        = CONSTELLATIONS[ci];
  const groupRef   = useRef<THREE.Group>(null);
  const anchorRef  = useRef<THREE.Points>(null);   // 1 brightest anchor star
  const normalRef  = useRef<THREE.Points>(null);   // remaining stars
  const linesRef   = useRef<THREE.LineSegments>(null);
  const labelOpacity = useRef(0);
  const labelEl    = useRef<HTMLDivElement>(null);

  const { anchorGeo, normalGeo, lineGeo } = useMemo(() => {
    const SPREAD = 4.0;
    // First star = anchor (principal); rest = normal
    const ap = new Float32Array(3);
    const np = new Float32Array((def.stars.length - 1) * 3);
    for (let i = 0; i < def.stars.length; i++) {
      const x = def.stars[i][0] * SPREAD;
      const y = def.stars[i][1] * SPREAD;
      if (i === 0) {
        ap[0] = x; ap[1] = y; ap[2] = 0;
      } else {
        const ni = i - 1;
        np[ni * 3] = x; np[ni * 3 + 1] = y; np[ni * 3 + 2] = 0;
      }
    }
    const ag = new THREE.BufferGeometry();
    ag.setAttribute('position', new THREE.BufferAttribute(ap, 3));
    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.BufferAttribute(np, 3));

    const lp = new Float32Array(def.lines.length * 6);
    for (let i = 0; i < def.lines.length; i++) {
      const [a, b] = def.lines[i];
      const s = def.stars;
      lp[i*6]   = s[a][0]*SPREAD; lp[i*6+1] = s[a][1]*SPREAD; lp[i*6+2] = 0;
      lp[i*6+3] = s[b][0]*SPREAD; lp[i*6+4] = s[b][1]*SPREAD; lp[i*6+5] = 0;
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));

    return { anchorGeo: ag, normalGeo: ng, lineGeo: lg };
  }, [ci, def]);

  useEffect(() => () => {
    anchorGeo.dispose(); normalGeo.dispose(); lineGeo.dispose();
  }, [anchorGeo, normalGeo, lineGeo]);

  const twinklePhase = (ci * 2.71828) % (Math.PI * 2);

  useFrame((state, delta) => {
    const act2p = scrollState.act2Progress;
    const base  = getZodiacOpacity(ci, act2p);
    const twinkle = 0.88 + 0.12 * Math.sin(state.clock.elapsedTime * 1.4 + twinklePhase);

    // featured = active trio at a station, or all 12 during finale/post-finale
    let featured = false;
    if (act2p >= ACT2_FINALE_START) {
      featured = true;
    } else if (act2p >= ACT2_INTRO_END) {
      for (let ei = 0; ei < 4; ei++) {
        if (act2p >= ACT2_ELEMENT_STARTS[ei] && act2p < ACT2_ELEMENT_ENDS[ei]) {
          if (ELEMENT_GROUPS[ACT2_ELEMENTS[ei]].includes(ci)) featured = true;
          break;
        }
      }
    }

    // Pattern scale: intro = all large; featured trio = biggest; rest = medium.
    let targetScale: number;
    if (act2p <= 0) {
      targetScale = 1.0;
    } else if (act2p < ACT2_INTRO_END) {
      targetScale = 5.5;
    } else if (featured) {
      targetScale = 8.5;
    } else {
      targetScale = 4.5;
    }

    // Finale halo tone-down: smaller sprites + lower glow multiplier so the soft halo
    // disc retreats. Cores and spikes are unchanged (they dominate at any size).
    // Halo energy at finale ≈ 54 % of active station ≈ roughly half as requested.
    const isFinaleAll    = act2p >= ACT2_FINALE_START;
    const isActiveTriple = featured && !isFinaleAll; // active trio at a station only
    const finaleGlowMult = isFinaleAll ? 0.85 : 1.0;
    let targetAnchorPx = isFinaleAll ? 68 : (isActiveTriple ? 80 : 50);
    let targetNormalPx = isFinaleAll ? 34 : (isActiveTriple ? 40 : 25);

    // Line opacity: focus-only logic.
    // Intro: all lines fade in with their constellation.
    // Active trio at stations: lines on at subtle opacity.
    // Finale: ghost lines only (0.06) so patterns hint without competing.
    // All other states (inactive at stations, Act 1, exit): fully off.
    const isIntroPhase  = act2p > 0 && act2p < ACT2_INTRO_END;
    const isFinaleLines = isFinaleAll;
    let lineTargetOpacity: number;
    if      (isActiveTriple) lineTargetOpacity = 0.10;
    else if (isFinaleLines)  lineTargetOpacity = 0.02;
    else                     lineTargetOpacity = 0;

    if (anchorRef.current) {
      const mat = anchorRef.current.material as THREE.PointsMaterial;
      mat.opacity = THREE.MathUtils.damp(mat.opacity, base * twinkle * finaleGlowMult, 5, delta);
      mat.size    = THREE.MathUtils.damp(mat.size, targetAnchorPx, 4, delta);
    }
    if (normalRef.current) {
      const mat = normalRef.current.material as THREE.PointsMaterial;
      mat.opacity = THREE.MathUtils.damp(mat.opacity, base * twinkle * 0.85 * finaleGlowMult, 5, delta);
      mat.size    = THREE.MathUtils.damp(mat.size, targetNormalPx, 4, delta);
    }
    if (linesRef.current) {
      const mat = linesRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = THREE.MathUtils.damp(mat.opacity, lineTargetOpacity, 5, delta);
    }
    if (groupRef.current) {
      groupRef.current.scale.setScalar(
        THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 3, delta)
      );
    }

    // Labels: intro, active stations, finale — not inactive constellations at stations.
    const labelTarget = ((isIntroPhase || featured) && base > 0.4) ? 0.9 : 0;
    labelOpacity.current = THREE.MathUtils.damp(labelOpacity.current, labelTarget, 4, delta);
    if (labelEl.current) labelEl.current.style.opacity = String(labelOpacity.current);
  });

  const pos = CHART_POSITIONS[ci];
  const angleAroundRing = (ci / 12) * Math.PI * 2;

  return (
    <group
      ref={groupRef}
      position={[pos.x, pos.y, pos.z]}
      rotation={[-Math.PI / 2, angleAroundRing, 0]}
    >
      {/* Anchor star — sizeAttenuation OFF: fixed screen-space pixels so they always dominate background */}
      <points ref={anchorRef} geometry={anchorGeo}>
        <pointsMaterial size={50} sizeAttenuation={false} map={getStarTexture()}
          color="#ffffff" transparent opacity={0}
          depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </points>
      {/* Normal stars */}
      <points ref={normalRef} geometry={normalGeo}>
        <pointsMaterial size={32} sizeAttenuation={false} map={getStarTexture()}
          color="#ffffff" transparent opacity={0}
          depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </points>
      {def.lines.length > 0 && (
        <lineSegments ref={linesRef} geometry={lineGeo}>
          <lineBasicMaterial color="#c8a060" transparent opacity={0}
            depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </lineSegments>
      )}
      <Html center zIndexRange={[0, 0]} position={[0, Math.min(...def.stars.map(s => s[1])) * 4.0 - 0.6, 0]} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <div
          ref={labelEl}
          style={{
            opacity: 0,
            color: '#d4a843',
            fontFamily: 'monospace',
            fontSize: '18px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {def.name.toUpperCase()}
        </div>
      </Html>
    </group>
  );
}

// ─── Elemental Trine Nebula ───────────────────────────────────────────────────
// Cosmic mist hinting at the triangle between active element constellations.
// Uses layered additive sprite planes — never drawn geometry.

const MIST_COLORS = {
  VATRA:  '#c04820',  // warm amber
  ZEMLJA: '#607030',  // soft green-gold
  VAZDUH: '#3868c0',  // pale blue
  VODA:   '#2040a0',  // deep blue
} as const;

function ElementMist({ ei }: { ei: number }) {
  const elem = ACT2_ELEMENTS[ei];
  const grp  = ELEMENT_GROUPS[elem];
  // Halos centered directly at constellation ring positions (radius 35).
  // Centroid of equilateral triangle inscribed in any circle = circle center = solar system.
  // Never use centroids or edge midpoints — always the 3 constellation positions themselves.
  const p0 = CHART_POSITIONS[grp[0]];
  const p1 = CHART_POSITIONS[grp[1]];
  const p2 = CHART_POSITIONS[grp[2]];

  const HALO_SCALE = 14;
  const BASE_ALPHA = 0.07;

  const ref0  = useRef<THREE.Sprite>(null);
  const ref1  = useRef<THREE.Sprite>(null);
  const ref2  = useRef<THREE.Sprite>(null);
  const opRef = useRef(0);

  const tex = useMemo(() => getMistTexture(MIST_COLORS[elem]), []);

  useFrame((state, delta) => {
    const act2p    = scrollState.act2Progress;
    const isActive = act2p > 0 && act2p >= ACT2_ELEMENT_STARTS[ei] && act2p < ACT2_ELEMENT_ENDS[ei];
    opRef.current  = THREE.MathUtils.damp(opRef.current, isActive ? 1.0 : 0, 2, delta);

    const t = state.clock.elapsedTime;
    const halos = [ref0.current, ref1.current, ref2.current];
    halos.forEach((sprite, mi) => {
      if (!sprite) return;
      (sprite.material as THREE.SpriteMaterial).opacity = opRef.current * BASE_ALPHA;
      const breathe = 1 + Math.sin(t * 0.10 + mi * 2.1) * 0.05;
      sprite.scale.setScalar(HALO_SCALE * breathe);
    });
  });

  return (
    <group>
      <sprite ref={ref0} position={[p0.x, p0.y, p0.z]} scale={[HALO_SCALE, HALO_SCALE, 1]}>
        <spriteMaterial map={tex} transparent opacity={0}
          depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <sprite ref={ref1} position={[p1.x, p1.y, p1.z]} scale={[HALO_SCALE, HALO_SCALE, 1]}>
        <spriteMaterial map={tex} transparent opacity={0}
          depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <sprite ref={ref2} position={[p2.x, p2.y, p2.z]} scale={[HALO_SCALE, HALO_SCALE, 1]}>
        <spriteMaterial map={tex} transparent opacity={0}
          depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  );
}

function TrineNebula() {
  return (
    <group>
      {ACT2_ELEMENTS.map((_, ei) => (
        <ElementMist key={ei} ei={ei} />
      ))}
    </group>
  );
}

function ZodiacCircle() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const act2p = scrollState.act2Progress;
    const mat   = meshRef.current.material as THREE.MeshBasicMaterial;
    if (act2p >= ACT2_FINALE_START) {
      const t = (act2p - ACT2_FINALE_START) / (ACT2_FINALE_END - ACT2_FINALE_START);
      const ss = t * t * (3 - 2 * t);
      const target = act2p < ACT2_FINALE_END ? ss * 0.15 : 0.15;
      mat.opacity = THREE.MathUtils.damp(mat.opacity, target, 3, delta);
    } else {
      mat.opacity = THREE.MathUtils.damp(mat.opacity, 0, 3, delta);
    }
  });

  return (
    <mesh ref={meshRef} geometry={_chartRingGeo} position={[0, CHART_RING_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <meshBasicMaterial color="#d4a843" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  );
}

function ZodiacChart() {
  return (
    <group>
      {CONSTELLATIONS.map((_, ci) => (
        <ZodiacConstellation key={`z-${ci}`} ci={ci} />
      ))}
      <TrineNebula />
      <ZodiacCircle />
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

function SceneContent({
  tiltRefs,
  dragRefs,
}: {
  tiltRefs: React.RefObject<TiltRefs>;
  dragRefs: React.RefObject<DragRefs>;
}) {
  const systemRef       = useRef<THREE.Group>(null);
  const ringRotRef      = useRef<THREE.Group>(null);
  const yRotRef         = useRef(0);
  const textures        = usePlanetTextures();
  const camPos          = useRef(new THREE.Vector3(0, 4, 22));
  const camLook         = useRef(new THREE.Vector3(0, 0, 0));
  const keyLightRef     = useRef<THREE.PointLight>(null);
  const zodiacLightRef  = useRef<THREE.PointLight>(null);

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
    const act2p = scrollState.act2Progress;
    if (progress > 0.01 || act2p > 0) {
      computeDesiredCamera(progress);

      // Act 2 camera.
      if (act2p > 0) {
        if (act2p < 0.08) {
          // Rise from pullback to overview.
          const ss = (t => t * t * (3 - 2 * t))(act2p / 0.08);
          _camDesiredPos.lerpVectors(PULLBACK_POS, CHART_CAM_POS, ss);
          _camDesiredLook.lerpVectors(_ORIGIN, CHART_CAM_LOOK, ss);
        } else if (act2p < ACT2_INTRO_END) {
          // Intro hold — all 12 lit, overview camera.
          _camDesiredPos.copy(CHART_CAM_POS);
          _camDesiredLook.copy(CHART_CAM_LOOK);
        } else if (act2p >= ACT2_FINALE_START) {
          // Rise from last station back to overview for finale.
          const RISE = 0.06;
          const ss = Math.min((act2p - ACT2_FINALE_START) / RISE, 1);
          const sm = ss * ss * (3 - 2 * ss);
          _camDesiredPos.lerpVectors(STATION_CAM_POSITIONS[3], CHART_CAM_POS, sm);
          const sway = Math.sin(state.clock.elapsedTime * 0.06) * 2.5 * sm;
          _camDesiredLook.set(sway, -3, 0); // tilt down to give labels room at bottom of frame
        } else {
          // Element station orbital camera.
          // stationPhase: 0 at start of VATRA, 4 at end of VODA.
          const stationWidth = ACT2_ELEMENT_ENDS[0] - ACT2_ELEMENT_STARTS[0]; // 0.1375
          const stationPhase = (act2p - ACT2_INTRO_END) / stationWidth;
          const ei  = Math.min(Math.floor(stationPhase), 3);
          const sub = stationPhase - ei; // 0–1 within current station window

          if (ei === 0 && sub < 0.20) {
            // Descend from overview to first station (first 20 % of VATRA window).
            const ss = (t => t * t * (3 - 2 * t))(sub / 0.20);
            _camDesiredPos.lerpVectors(CHART_CAM_POS, STATION_CAM_POSITIONS[0], ss);
          } else if (sub > 0.75 && ei < 3) {
            // Orbit to next station (last 25 % of each station window).
            const ss = (t => t * t * (3 - 2 * t))((sub - 0.75) / 0.25);
            _camDesiredPos.lerpVectors(STATION_CAM_POSITIONS[ei], STATION_CAM_POSITIONS[ei + 1], ss);
          } else {
            _camDesiredPos.copy(STATION_CAM_POSITIONS[Math.min(ei, 3)]);
          }
          _camDesiredLook.copy(CHART_CAM_LOOK);
        }
      }

      const lambda = 1.5;
      camPos.current.x  = THREE.MathUtils.damp(camPos.current.x,  _camDesiredPos.x,  lambda, delta);
      camPos.current.y  = THREE.MathUtils.damp(camPos.current.y,  _camDesiredPos.y,  lambda, delta);
      camPos.current.z  = THREE.MathUtils.damp(camPos.current.z,  _camDesiredPos.z,  lambda, delta);
      camLook.current.x = THREE.MathUtils.damp(camLook.current.x, _camDesiredLook.x, lambda, delta);
      camLook.current.y = THREE.MathUtils.damp(camLook.current.y, _camDesiredLook.y, lambda, delta);
      camLook.current.z = THREE.MathUtils.damp(camLook.current.z, _camDesiredLook.z, lambda, delta);

      state.camera.position.copy(camPos.current);
      state.camera.lookAt(camLook.current);

      // FOV: Act 1 = 50°, Act 2 = 58° (wider — keeps full ring in frame at all stations)
      const cam = state.camera as THREE.PerspectiveCamera;
      if ('fov' in cam) {
        const targetFov = act2p > 0.04 ? 58 : 50;
        if (Math.abs(cam.fov - targetFov) > 0.05) {
          cam.fov = THREE.MathUtils.damp(cam.fov, targetFov, 1.5, delta);
          cam.updateProjectionMatrix();
        }
      }
    }

    // Act 2 chart glow — warm gold ambient fill when chart is visible
    if (zodiacLightRef.current) {
      const targetI = act2p > 0.08 ? 1.2 : 0;
      zodiacLightRef.current.intensity = THREE.MathUtils.damp(
        zodiacLightRef.current.intensity, targetI, 2, delta,
      );
      zodiacLightRef.current.position.set(0, CHART_RING_Y + 20, 0);
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

    // Celina finale — drag rotation + inertia
    if (ringRotRef.current) {
      const drag = dragRefs.current;
      const inFinale = act2p >= ACT2_FINALE_START && act2p <= ACT2_FINALE_END;
      if (inFinale && drag) {
        if (drag.isDragging) {
          const radDelta = drag.deltaX * 0.005;
          drag.velocity  = drag.velocity * 0.7 + radDelta * 0.3;
          yRotRef.current += radDelta;
          drag.deltaX = 0;
        } else {
          drag.velocity  *= 0.95;
          yRotRef.current += drag.velocity;
        }
      } else if (!inFinale) {
        yRotRef.current = THREE.MathUtils.damp(yRotRef.current, 0, 2, delta);
        if (drag) drag.velocity *= 0.6;
      }
      ringRotRef.current.rotation.y = yRotRef.current;
    }
  });

  return (
    <>
      <color attach="background" args={[BACKGROUND]} />
      <ambientLight color="#6b3fa0" intensity={AMBIENT_INTENSITY} />
      {/* Station fill — soft warm key that reveals texture on the shadow side */}
      <pointLight ref={keyLightRef} color="#fff2dd" intensity={0} distance={14} decay={2} />
      {/* Act 2 chart glow — warm gold wash over the zodiac ring */}
      <pointLight ref={zodiacLightRef} color="#d4a843" intensity={0} distance={80} decay={1.2} />

      <group ref={ringRotRef}>
        <group ref={systemRef}>
          <CosmicBackdrop />
          <Sun sunTexture={textures.sun} />
          <Moon moonTexture={textures.moon} />
          {PLANETS.map((planet, index) => (
            <Planet key={`planet-${index}`} config={planet} textures={textures} />
          ))}
        </group>
        <ZodiacChart />
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
    targetX: 0, targetZ: 0, currentX: 0, currentZ: 0, enabled: false,
  });
  const dragRefs  = useRef<DragRefs>({ isDragging: false, lastX: 0, deltaX: 0, velocity: 0 });
  const [cursor,   setCursor]   = useState("auto");
  // isFinale drives overlay pointer-events reactively as the user scrolls
  const [isFinale, setIsFinale] = useState(false);

  // Hover/fine pointer detection for tilt parallax
  useEffect(() => {
    const hoverQuery = window.matchMedia("(hover: hover)");
    const fineQuery  = window.matchMedia("(pointer: fine)");
    const update = () => {
      tiltRefs.current.enabled = hoverQuery.matches && fineQuery.matches;
      if (!tiltRefs.current.enabled) { tiltRefs.current.targetX = 0; tiltRefs.current.targetZ = 0; }
    };
    update();
    hoverQuery.addEventListener("change", update);
    fineQuery.addEventListener("change", update);
    return () => {
      hoverQuery.removeEventListener("change", update);
      fineQuery.removeEventListener("change", update);
    };
  }, []);

  // ── Overlay handlers (sit above Canvas — guaranteed first event priority) ────
  const handleOverlayPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    console.log("drag started", { act2p: scrollState.act2Progress, isFinale });
    dragRefs.current.isDragging = true;
    dragRefs.current.lastX      = e.clientX;
    dragRefs.current.deltaX     = 0;
    dragRefs.current.velocity   = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
    setCursor(DRAG_CURSOR);
  };

  const handleOverlayPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRefs.current.isDragging) return;
    e.preventDefault(); // prevent any browser drag-default behaviour
    dragRefs.current.deltaX += e.clientX - dragRefs.current.lastX;
    dragRefs.current.lastX   = e.clientX;
  };

  const handleOverlayPointerUp = () => {
    dragRefs.current.isDragging = false;
    setCursor(DRAG_CURSOR);
  };

  const handleOverlayPointerLeave = () => {
    // Only end drag if pointer actually leaves the overlay
    if (dragRefs.current.isDragging) {
      dragRefs.current.isDragging = false;
      setCursor(DRAG_CURSOR);
    }
  };

  // ── Container handlers (tilt parallax — only when overlay is pass-through) ──
  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRefs.current.isDragging || !tiltRefs.current.enabled || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    tiltRefs.current.targetZ = ((e.clientX - rect.left) / rect.width  - 0.5) * PARALLAX_GAIN;
    tiltRefs.current.targetX = -((e.clientY - rect.top)  / rect.height - 0.5) * PARALLAX_GAIN;
  };

  const handleContainerPointerLeave = () => {
    tiltRefs.current.targetX = 0;
    tiltRefs.current.targetZ = 0;
    dragRefs.current.isDragging = false;
    setCursor(isFinale ? DRAG_CURSOR : "auto");
  };

  // Pause GPU when scrolled past; drive isFinale + grab cursor from scroll position
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const act2p    = scrollState.act2Progress;
        const inFinale = act2p >= ACT2_FINALE_START && act2p <= ACT2_FINALE_END;
        setFrameloop(prev => {
          const next: "always" | "never" = act2p >= 0.99 ? "never" : "always";
          return prev === next ? prev : next;
        });
        setIsFinale(inFinale);
        if (!dragRefs.current.isDragging) setCursor(inFinale ? DRAG_CURSOR : "auto");
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full relative"
      style={{ background: BACKGROUND }}
      onPointerMove={handleContainerPointerMove}
      onPointerLeave={handleContainerPointerLeave}
    >
      <Canvas
        frameloop={frameloop}
        camera={{ position: [0, 4, 22], fov: 50, near: 0.1, far: 500 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        style={{ background: BACKGROUND }}
      >
        <Suspense fallback={null}>
          <SceneContent tiltRefs={tiltRefs} dragRefs={dragRefs} />
        </Suspense>
      </Canvas>

      {/* Drag overlay — sits above Canvas, only active during Celina finale.
          touch-action:none prevents browser scroll during touch drag. */}
      <div
        className="absolute inset-0"
        style={{
          pointerEvents: isFinale ? "auto" : "none",
          touchAction:   isFinale ? "none" : "auto",
          cursor,
        }}
        onPointerDown={handleOverlayPointerDown}
        onPointerMove={handleOverlayPointerMove}
        onPointerUp={handleOverlayPointerUp}
        onPointerLeave={handleOverlayPointerLeave}
      />
    </div>
  );
}
