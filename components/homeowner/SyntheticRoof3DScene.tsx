"use client";

// Fully-offline, procedural 3D simulation of a commercial solar roof. No API
// key, no Google tiles, no network — it renders a flat commercial building with
// a ballasted, tilted panel array (rows at the engineering tilt + row spacing),
// which is exactly the geometry the commercial sizer computes. Used as the
// MOCK_MODE stand-in for the photoreal Cesium view so the "simulation" mode
// shows a real, orbitable 3D building instead of a disabled badge.

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface Props {
  /** Usable/roof area in m² — drives the footprint. */
  totalAreaM2?: number;
  /** Panel count to place; when absent the roof is filled to capacity. */
  panelCount?: number;
  /** Array tilt in degrees (commercial flat-roof default ~12°). */
  tiltDegrees?: number;
  /** Inter-row spacing in metres (from the ground-coverage-ratio calc). */
  rowSpacingMeters?: number;
}

// A single PV module, portrait, in metres.
const PANEL_W = 1.0;
const PANEL_L = 1.7;
const PANEL_T = 0.04;

export default function SyntheticRoof3DScene({
  totalAreaM2,
  panelCount,
  tiltDegrees,
  rowSpacingMeters,
}: Props) {
  // Shared geometry + material — one of each, reused across every panel mesh so
  // a few hundred modules stay cheap.
  const panelGeo = useMemo(() => new THREE.BoxGeometry(PANEL_W, PANEL_T, PANEL_L), []);
  const panelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1E5C9E",
        metalness: 0.45,
        roughness: 0.3,
        emissive: "#1a4f8a",
        emissiveIntensity: 0.7,
      }),
    [],
  );

  const layout = useMemo(() => {
    const area = Math.max(60, Math.min(totalAreaM2 ?? 400, 6000));
    const side = Math.sqrt(area); // square footprint, metres
    const buildingH = Math.max(4, Math.min(side * 0.35, 12));
    const tiltRad = THREE.MathUtils.degToRad(
      Math.max(3, Math.min(tiltDegrees ?? 12, 35)),
    );
    const margin = Math.max(1.2, side * 0.06);
    const colGap = 0.12;
    const rowPitch = Math.max(1.5, rowSpacingMeters ?? 2.3);
    const usable = Math.max(0, side - margin * 2);
    const cols = Math.max(1, Math.floor(usable / (PANEL_W + colGap)));
    const rows = Math.max(1, Math.floor(usable / rowPitch) + 1);
    const capacity = cols * rows;
    const target = panelCount && panelCount > 0 ? panelCount : capacity;
    const rendered = Math.min(target, capacity);

    const gridW = cols * (PANEL_W + colGap) - colGap;
    const gridD = (rows - 1) * rowPitch;
    const x0 = -gridW / 2 + PANEL_W / 2;
    const z0 = -gridD / 2;
    const roofY = buildingH + 0.25;

    const positions: [number, number, number][] = [];
    let placed = 0;
    for (let r = 0; r < rows && placed < rendered; r++) {
      for (let c = 0; c < cols && placed < rendered; c++) {
        positions.push([x0 + c * (PANEL_W + colGap), roofY, z0 + r * rowPitch]);
        placed++;
      }
    }
    return { side, buildingH, tiltRad, positions, rendered, capacity };
  }, [totalAreaM2, panelCount, tiltDegrees, rowSpacingMeters]);

  const d = layout.side;

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [d * 1.35, d * 1.15, d * 1.35], fov: 38, near: 0.1, far: d * 40 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ background: "#0A0E1A" }}
    >
      <ambientLight intensity={0.65} />
      {/* Sun from the south (−Z) and high, so the tilted array catches light. */}
      <directionalLight position={[d * 0.6, d * 1.6, -d * 0.8]} intensity={2.0} color="#FFE2B6" />
      <hemisphereLight args={["#FFE9C9", "#0A0E1A", 0.4]} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[d * 8, d * 8]} />
        <meshStandardMaterial color="#0B0F1A" roughness={1} />
      </mesh>

      {/* Building body */}
      <mesh position={[0, layout.buildingH / 2, 0]}>
        <boxGeometry args={[d, layout.buildingH, d]} />
        <meshStandardMaterial color="#1C222B" metalness={0.1} roughness={0.85} />
      </mesh>
      {/* Roof deck (slightly inset, darker) so panels read as sitting on a surface */}
      <mesh position={[0, layout.buildingH + 0.06, 0]}>
        <boxGeometry args={[d * 0.98, 0.12, d * 0.98]} />
        <meshStandardMaterial color="#20272F" roughness={0.9} />
      </mesh>

      {/* Tilted panel array */}
      {layout.positions.map((p, i) => (
        <mesh
          key={i}
          geometry={panelGeo}
          material={panelMat}
          position={p}
          rotation={[-layout.tiltRad, 0, 0]}
        />
      ))}

      <OrbitControls
        target={[0, layout.buildingH, 0]}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={Math.max(d * 0.6, 8)}
        maxDistance={d * 5}
        minPolarAngle={Math.PI * 0.05}
        maxPolarAngle={Math.PI * 0.48}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </Canvas>
  );
}
