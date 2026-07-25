"use client";

// Fully-offline, procedural 3D simulation of a solar roof. No API key, no
// Google tiles, no network. Renders either:
//   • residential — a pitched-roof house with panels laid on the sunny (south)
//     face, following the roof slope; or
//   • commercial  — a flat-roof building with a ballasted, tilted panel array
//     in rows (the geometry the commercial sizer computes).
// The variant comes from the (mock) building classification, so the simulation
// matches the analysis. Google photoreal 3D replaces this automatically once
// billing is enabled.

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

type Variant = "residential" | "commercial";

interface Props {
  totalAreaM2?: number;
  panelCount?: number;
  tiltDegrees?: number;
  rowSpacingMeters?: number;
  variant?: Variant;
}

// One PV module, portrait, in metres.
const PANEL_W = 1.0;
const PANEL_L = 1.7;
const PANEL_T = 0.04;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function SyntheticRoof3DScene({
  totalAreaM2,
  panelCount,
  tiltDegrees,
  rowSpacingMeters,
  variant = "commercial",
}: Props) {
  const isResidential = variant === "residential";

  // One geometry + one material shared across every panel mesh.
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

  // Commercial: flat roof + tilted rows.
  const commercial = useMemo(() => {
    const area = clamp(totalAreaM2 ?? 400, 60, 6000);
    const side = Math.sqrt(area);
    const buildingH = clamp(side * 0.35, 4, 12);
    const tiltRad = THREE.MathUtils.degToRad(clamp(tiltDegrees ?? 12, 3, 35));
    const margin = Math.max(1.2, side * 0.06);
    const colGap = 0.12;
    const rowPitch = Math.max(1.5, rowSpacingMeters ?? 2.3);
    const usable = Math.max(0, side - margin * 2);
    const cols = Math.max(1, Math.floor(usable / (PANEL_W + colGap)));
    const rows = Math.max(1, Math.floor(usable / rowPitch) + 1);
    const capacity = cols * rows;
    const rendered = Math.min(panelCount && panelCount > 0 ? panelCount : capacity, capacity);
    const gridW = cols * (PANEL_W + colGap) - colGap;
    const gridD = (rows - 1) * rowPitch;
    const roofY = buildingH + 0.25;
    const positions: [number, number, number][] = [];
    let placed = 0;
    for (let r = 0; r < rows && placed < rendered; r++) {
      for (let c = 0; c < cols && placed < rendered; c++) {
        positions.push([-gridW / 2 + PANEL_W / 2 + c * (PANEL_W + colGap), roofY, -gridD / 2 + r * rowPitch]);
        placed++;
      }
    }
    return { side, buildingH, tiltRad, positions };
  }, [totalAreaM2, panelCount, tiltDegrees, rowSpacingMeters]);

  // Residential: gable roof; panels lie flat on the south face and follow its
  // pitch (so they inherit the roof slope, no separate tilt).
  const residential = useMemo(() => {
    const area = clamp(totalAreaM2 ?? 90, 40, 400);
    const pitchRad = THREE.MathUtils.degToRad(38);
    const foot = Math.sqrt(area * Math.cos(pitchRad)); // W*L = area*cos(pitch)
    const W = clamp(foot, 5, 22);
    const L = W;
    const Hw = 3.5;
    const rise = (L / 2) * Math.tan(pitchRad);
    const ridgeY = Hw + rise;
    const slopeLen = Math.hypot(L / 2, rise);
    const planeMidY = (Hw + ridgeY) / 2;

    // Panel grid in the south face's local frame (x across W, z along slope).
    const margin = 0.5;
    const gap = 0.08;
    const cols = Math.max(1, Math.floor((W - margin * 2) / (PANEL_W + gap)));
    const rowsFit = Math.max(1, Math.floor((slopeLen - margin * 2) / (PANEL_L + gap)));
    const capacity = cols * rowsFit;
    const rendered = Math.min(panelCount && panelCount > 0 ? panelCount : capacity, capacity);
    const gridW = cols * (PANEL_W + gap) - gap;
    const gridL = (rowsFit - 1) * (PANEL_L + gap);
    const local: [number, number, number][] = [];
    let placed = 0;
    for (let r = 0; r < rowsFit && placed < rendered; r++) {
      for (let c = 0; c < cols && placed < rendered; c++) {
        local.push([-gridW / 2 + PANEL_W / 2 + c * (PANEL_W + gap), 0.1, -gridL / 2 + r * (PANEL_L + gap)]);
        placed++;
      }
    }
    return { W, L, Hw, ridgeY, pitchRad, slopeLen, planeMidY, panelsLocal: local };
  }, [totalAreaM2, panelCount]);

  // Camera framing size + orbit target height per variant.
  const d = isResidential ? Math.max(residential.W, residential.ridgeY * 1.6) : commercial.side;
  const centerY = isResidential ? residential.ridgeY * 0.55 : commercial.buildingH;

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [d * 1.35, d * 1.15, d * 1.35], fov: 38, near: 0.1, far: d * 40 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ background: "#0A0E1A" }}
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[d * 0.6, d * 1.6, -d * 0.8]} intensity={2.0} color="#FFE2B6" />
      <hemisphereLight args={["#FFE9C9", "#0A0E1A", 0.4]} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[d * 8, d * 8]} />
        <meshStandardMaterial color="#0B0F1A" roughness={1} />
      </mesh>

      {isResidential ? (
        <>
          {/* House walls */}
          <mesh position={[0, residential.Hw / 2, 0]}>
            <boxGeometry args={[residential.W, residential.Hw, residential.L]} />
            <meshStandardMaterial color="#242A32" roughness={0.85} />
          </mesh>
          {/* South roof face (sunny) */}
          <mesh position={[0, residential.planeMidY, residential.L / 4]} rotation={[residential.pitchRad, 0, 0]}>
            <boxGeometry args={[residential.W, 0.15, residential.slopeLen]} />
            <meshStandardMaterial color="#3A4048" roughness={0.9} />
          </mesh>
          {/* North roof face */}
          <mesh position={[0, residential.planeMidY, -residential.L / 4]} rotation={[-residential.pitchRad, 0, 0]}>
            <boxGeometry args={[residential.W, 0.15, residential.slopeLen]} />
            <meshStandardMaterial color="#2E343B" roughness={0.9} />
          </mesh>
          {/* Panels on the south face (follow the slope via the group's rotation) */}
          <group position={[0, residential.planeMidY, residential.L / 4]} rotation={[residential.pitchRad, 0, 0]}>
            {residential.panelsLocal.map((p, i) => (
              <mesh key={i} geometry={panelGeo} material={panelMat} position={p} />
            ))}
          </group>
        </>
      ) : (
        <>
          {/* Commercial building body */}
          <mesh position={[0, commercial.buildingH / 2, 0]}>
            <boxGeometry args={[commercial.side, commercial.buildingH, commercial.side]} />
            <meshStandardMaterial color="#1C222B" metalness={0.1} roughness={0.85} />
          </mesh>
          {/* Roof deck */}
          <mesh position={[0, commercial.buildingH + 0.06, 0]}>
            <boxGeometry args={[commercial.side * 0.98, 0.12, commercial.side * 0.98]} />
            <meshStandardMaterial color="#20272F" roughness={0.9} />
          </mesh>
          {/* Tilted panel array */}
          {commercial.positions.map((p, i) => (
            <mesh key={i} geometry={panelGeo} material={panelMat} position={p} rotation={[-commercial.tiltRad, 0, 0]} />
          ))}
        </>
      )}

      <OrbitControls
        target={[0, centerY, 0]}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={Math.max(d * 0.6, 6)}
        maxDistance={d * 5}
        minPolarAngle={Math.PI * 0.05}
        maxPolarAngle={Math.PI * 0.48}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </Canvas>
  );
}
