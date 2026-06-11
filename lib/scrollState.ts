// Module-level mutable state shared between the DOM scroll layer
// and the Three.js canvas (read inside useFrame — no setState per frame).
// Plain object, no THREE imports, safe to import from any module boundary.

export const scrollState = { progress: 0, act2Progress: 0 }

export const planetPositions = {
  sun:     { x: 0, y: 0, z: 0 },
  moon:    { x: 0, y: 0, z: 0 },
  mercury: { x: 0, y: 0, z: 0 },
  venus:   { x: 0, y: 0, z: 0 },
  earth:   { x: 0, y: 0, z: 0 },
  mars:    { x: 0, y: 0, z: 0 },
  saturn:  { x: 0, y: 0, z: 0 },
}
