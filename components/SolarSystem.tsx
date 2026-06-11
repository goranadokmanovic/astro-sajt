"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, Stars, useTexture } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const BACKGROUND = "#150a26";
const BASE_TILT = (25 * Math.PI) / 180;
const MAX_PARALLAX = 0.05;
const PARALLAX_GAIN = MAX_PARALLAX * 2;
const DAMPING = 0.06;
const PULSE_OMEGA = (Math.PI * 2) / 4;

const TEXTURE_PATHS = {
  sun: "/textures/planets/sun.jpg",
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

const SATURN_GROUP_TILT = 0.45;

const PROCEDURAL_RING_BANDS = [
  { inner: 1.4, outer: 1.55, color: "#d9c49a", opacity: 0.5 },
  { inner: 1.58, outer: 1.78, color: "#cdb285", opacity: 0.4 },
  { inner: 1.82, outer: 2.0, color: "#d4bc92", opacity: 0.45 },
  { inner: 2.03, outer: 2.15, color: "#c4ad7e", opacity: 0.3 },
  { inner: 2.18, outer: 2.26, color: "#bfa878", opacity: 0.18 },
] as const;

const PLANET_TEXTURE_KEYS = [
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
    scale: 48,
    rotation: 0.4,
    inner: "#8b4fc0",
    mid: "#6b3fa0",
    outer: "#41215f",
    opacity: 0.18,
    driftPhase: 0,
    driftSpeed: 0.12,
  },
  {
    position: [22, -4, -18],
    scale: 42,
    rotation: -0.6,
    inner: "#6b3fa0",
    mid: "#41215f",
    outer: "#2a1040",
    opacity: 0.14,
    driftPhase: 1.8,
    driftSpeed: 0.09,
  },
  {
    position: [8, 12, -30],
    scale: 55,
    rotation: 0.2,
    inner: "#9b5fd0",
    mid: "#8b4fc0",
    outer: "#6b3fa0",
    opacity: 0.12,
    driftPhase: 3.2,
    driftSpeed: 0.07,
  },
  {
    position: [-10, -8, -26],
    scale: 38,
    rotation: 1.1,
    inner: "#7b48b8",
    mid: "#5a2f88",
    outer: "#41215f",
    opacity: 0.16,
    driftPhase: 4.5,
    driftSpeed: 0.1,
  },
];

function configureTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
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

  useEffect(() => {
    Object.values(textures).forEach(configureTexture);
    logTextureAudit(textures);
  }, [textures]);

  return textures;
}

function createNebulaTexture(inner: string, mid: string, outer: string) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
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
  gradient.addColorStop(0, "#1a3535");
  gradient.addColorStop(0.5, "#2a5f5f");
  gradient.addColorStop(1, "#1a3535");
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
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
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
  const geo = new THREE.RingGeometry(innerR, outerR, 128);
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

function createSaturnRingBands(planetRadius: number) {
  return PROCEDURAL_RING_BANDS.map((band) => ({
    geometry: createSaturnRingGeometry(
      planetRadius * band.inner,
      planetRadius * band.outer,
    ),
    material: new THREE.MeshBasicMaterial({
      color: band.color,
      transparent: true,
      opacity: band.opacity,
      side: THREE.DoubleSide,
      depthWrite: true,
      depthTest: true,
    }),
  }));
}

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

function CosmicBackdrop() {
  return (
    <group renderOrder={-1}>
      {NEBULAE.map((nebula, index) => (
        <NebulaCloud key={`nebula-${index}`} config={nebula} />
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
  const sunRef = useRef<THREE.Group>(null);
  const glowTexture = useMemo(() => createSunGlowTexture(), []);

  useFrame((state, delta) => {
    if (!sunRef.current) return;
    sunRef.current.rotation.y += delta * 0.12;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * PULSE_OMEGA) * 0.04;
    sunRef.current.scale.setScalar(pulse);
  });

  if (!glowTexture) return null;

  return (
    <group ref={sunRef}>
      <mesh>
        <sphereGeometry args={[SUN_RADIUS, 48, 48]} />
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

      <SunGlowSprite
        texture={glowTexture}
        scale={SUN_RADIUS * 2.6}
        opacity={0.22}
      />
      <SunGlowSprite
        texture={glowTexture}
        scale={SUN_RADIUS * 3.4}
        opacity={0.1}
      />
      <SunGlowSprite
        texture={glowTexture}
        scale={SUN_RADIUS * 4.2}
        opacity={0.045}
      />

      <Sparkles
        count={65}
        scale={7}
        size={2.2}
        speed={0.15}
        color="#ffd878"
        opacity={0.5}
      />
      <Sparkles
        count={30}
        scale={9}
        size={1.4}
        speed={0.08}
        color="#ffdf8a"
        opacity={0.3}
      />

      <pointLight color="#ffd090" intensity={22} decay={2} distance={0} />
      <pointLight color="#f0d8b8" intensity={5} decay={0} distance={0} />
    </group>
  );
}

function SaturnRing({ planetRadius }: { planetRadius: number }) {
  const bands = useMemo(
    () => createSaturnRingBands(planetRadius),
    [planetRadius],
  );

  useEffect(() => {
    return () => {
      bands.forEach((band) => {
        band.geometry.dispose();
        band.material.dispose();
      });
    };
  }, [bands]);

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {bands.map((band, index) => (
        <mesh
          key={`saturn-ring-band-${index}`}
          name={index === 0 ? "saturn-ring" : undefined}
          geometry={band.geometry}
          material={band.material}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}

function SaturnMesh({
  radius,
  bodyMap,
}: {
  radius: number;
  bodyMap: THREE.Texture;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    console.log(
      "[Saturn] group children count:",
      groupRef.current.children.length,
    );
  }, []);

  return (
    <group ref={groupRef} rotation={[SATURN_GROUP_TILT, 0, 0]}>
      <mesh name="saturn-body">
        <sphereGeometry args={[radius, 36, 36]} />
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
        color="#cdd8d8"
        emissive="#091f1f"
        emissiveIntensity={0.2}
        roughness={0.65}
        metalness={0.05}
      />
    </mesh>
  );
}

function PlanetMesh({
  config,
  textures,
}: {
  config: PlanetConfig;
  textures: LoadedTextures;
}) {
  const map = textures[config.texture];

  if (config.texture === "saturn") {
    return (
      <SaturnMesh radius={config.radius} bodyMap={textures.saturn} />
    );
  }

  if (config.texture === "uranus") {
    return (
      <UranusMesh radius={config.radius} />
    );
  }

  return (
    <mesh>
      <sphereGeometry args={[config.radius, 36, 36]} />
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

function Planet({
  config,
  textures,
}: {
  config: PlanetConfig;
  textures: LoadedTextures;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const orbitAngle = useRef(config.phase);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    orbitAngle.current += config.orbitSpeed * delta;
    const x = config.orbitA * Math.cos(orbitAngle.current);
    const zFlat = config.orbitB * Math.sin(orbitAngle.current);
    const y = config.yOffset + zFlat * Math.sin(config.inclination);
    const z = zFlat * Math.cos(config.inclination);
    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.y += config.spinSpeed * delta;
  });

  return (
    <group ref={groupRef}>
      <PlanetMesh config={config} textures={textures} />
    </group>
  );
}

function SceneContent({ tiltRefs }: { tiltRefs: React.RefObject<TiltRefs> }) {
  const systemRef = useRef<THREE.Group>(null);
  const textures = usePlanetTextures();

  useFrame(() => {
    const tilt = tiltRefs.current;
    if (!tilt || !systemRef.current) return;

    tilt.currentX += (tilt.targetX - tilt.currentX) * DAMPING;
    tilt.currentZ += (tilt.targetZ - tilt.currentZ) * DAMPING;

    systemRef.current.rotation.x = BASE_TILT + tilt.currentX;
    systemRef.current.rotation.z = tilt.currentZ;
  });

  return (
    <>
      <color attach="background" args={[BACKGROUND]} />
      <ambientLight color="#6b3fa0" intensity={AMBIENT_INTENSITY} />

      <group ref={systemRef}>
        <CosmicBackdrop />
        <Sun sunTexture={textures.sun} />
        {PLANETS.map((planet, index) => (
          <Planet key={`planet-${index}`} config={planet} textures={textures} />
        ))}
      </group>

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.7}
          luminanceThreshold={0.85}
          mipmapBlur
        />
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
    const fineQuery = window.matchMedia("(pointer: fine)");

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
