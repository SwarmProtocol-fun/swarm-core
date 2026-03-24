/** MechaBackground — 3D Three.js hangar scene with procedural mech robots representing agents. */
"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useEffect, useState, useMemo } from "react";
import * as THREE from "three";
import { useOrg } from "@/contexts/OrgContext";

/* ═══════════════════════════════════════════════════════════════
   MechRobot — Procedural mech built from primitives
   ═══════════════════════════════════════════════════════════════ */

function MechRobot({
  position,
  status,
}: {
  position: [number, number, number];
  status: "online" | "busy" | "offline";
}) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const prevStatus = useRef(status);
  const [powering, setPowering] = useState(false);

  const emissiveColor = status === "online" ? "#3fb950"
    : status === "busy" ? "#d29922"
    : "#484f58";

  const emissiveIntensity = status === "online" ? 0.4
    : status === "busy" ? 0.3
    : 0.1;

  const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("#21262d"),
    metalness: 0.85,
    roughness: 0.25,
    emissive: new THREE.Color(emissiveColor),
    emissiveIntensity,
  }), [emissiveColor, emissiveIntensity]);

  const accentMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("#30363d"),
    metalness: 0.9,
    roughness: 0.2,
    emissive: new THREE.Color("#58a6ff"),
    emissiveIntensity: 0.15,
  }), []);

  // Power-up animation on status transition
  useEffect(() => {
    if (prevStatus.current !== "online" && status === "online") {
      setPowering(true);
      const t = setTimeout(() => setPowering(false), 2000);
      return () => clearTimeout(t);
    }
    prevStatus.current = status;
  }, [status]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Gentle hover bob
    groupRef.current.position.y = position[1] + Math.sin(t * 0.8 + position[0]) * 0.03;
    // Head slow tracking
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.3 + position[2]) * 0.15;
    }
    // Power-up brightness ramp
    if (powering && bodyMaterial.emissiveIntensity < 1.5) {
      bodyMaterial.emissiveIntensity = Math.min(bodyMaterial.emissiveIntensity + 0.02, 1.5);
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Torso */}
      <mesh material={bodyMaterial} position={[0, 0.8, 0]}>
        <boxGeometry args={[0.6, 0.8, 0.4]} />
      </mesh>

      {/* Head */}
      <group ref={headRef} position={[0, 1.4, 0]}>
        <mesh material={bodyMaterial}>
          <boxGeometry args={[0.35, 0.3, 0.3]} />
        </mesh>
        {/* Visor */}
        <mesh position={[0, 0, 0.16]}>
          <boxGeometry args={[0.28, 0.08, 0.02]} />
          <meshStandardMaterial
            color={emissiveColor}
            emissive={emissiveColor}
            emissiveIntensity={1.5}
            transparent
            opacity={0.9}
          />
        </mesh>
      </group>

      {/* Left Arm */}
      <mesh material={accentMaterial} position={[-0.45, 0.75, 0]} rotation={[0, 0, 0.1]}>
        <cylinderGeometry args={[0.06, 0.08, 0.7, 8]} />
      </mesh>

      {/* Right Arm */}
      <mesh material={accentMaterial} position={[0.45, 0.75, 0]} rotation={[0, 0, -0.1]}>
        <cylinderGeometry args={[0.06, 0.08, 0.7, 8]} />
      </mesh>

      {/* Left Leg */}
      <mesh material={accentMaterial} position={[-0.15, 0.2, 0]}>
        <boxGeometry args={[0.15, 0.5, 0.2]} />
      </mesh>

      {/* Right Leg */}
      <mesh material={accentMaterial} position={[0.15, 0.2, 0]}>
        <boxGeometry args={[0.15, 0.5, 0.2]} />
      </mesh>

      {/* Shoulder pauldrons */}
      <mesh material={bodyMaterial} position={[-0.38, 1.1, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
      </mesh>
      <mesh material={bodyMaterial} position={[0.38, 1.1, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
      </mesh>

      {/* Chest light */}
      <mesh position={[0, 0.9, 0.21]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial
          color={emissiveColor}
          emissive={emissiveColor}
          emissiveIntensity={2}
        />
      </mesh>

      {/* Landing pad */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.02, 16]} />
        <meshStandardMaterial
          color="#161b22"
          emissive="#58a6ff"
          emissiveIntensity={0.1}
          metalness={0.9}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GridFloor — Hangar floor with subtle grid
   ═══════════════════════════════════════════════════════════════ */

function GridFloor() {
  return (
    <group position={[0, -1.5, 0]}>
      <gridHelper args={[20, 40, "#1a2332", "#1a2332"]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color="#0d1117"
          metalness={0.8}
          roughness={0.5}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AutoOrbitCamera — Very slow auto-orbit for background effect
   ═══════════════════════════════════════════════════════════════ */

function AutoOrbitCamera() {
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    const radius = 8;
    const height = 2;
    camera.position.x = Math.sin(t * 0.02) * radius;
    camera.position.z = Math.cos(t * 0.02) * radius;
    camera.position.y = height + Math.sin(t * 0.01) * 0.3;
    camera.lookAt(0, 0.5, 0);
  });
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   MechaBackground — Main export
   ═══════════════════════════════════════════════════════════════ */

const MECH_POSITIONS: [number, number, number][] = [
  [-2, 0, 0], [0, 0, 0], [2, 0, 0],
  [-1, 0, -2], [1, 0, -2], [0, 0, -3.5],
];

export function MechaBackground() {
  const [mounted, setMounted] = useState(false);
  const { currentOrg } = useOrg();
  const [agents, setAgents] = useState<{ name: string; status: string }[]>([]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!currentOrg) return;
    const fetchAgents = async () => {
      try {
        const res = await fetch(`/api/agents?orgId=${currentOrg.id}`);
        if (res.ok) {
          const data = await res.json();
          setAgents((data.agents || data || []).slice(0, 6));
        }
      } catch { /* ignore */ }
    };
    fetchAgents();
    const interval = setInterval(fetchAgents, 30_000);
    return () => clearInterval(interval);
  }, [currentOrg]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" style={{ opacity: 0.35 }}>
      <Canvas
        camera={{ position: [0, 2, 8], fov: 45 }}
        style={{ width: "100%", height: "100%" }}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      >
        <fog attach="fog" args={["#0d1117", 8, 20]} />
        <ambientLight intensity={0.3} color="#58a6ff" />
        <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow />
        <directionalLight position={[-3, 4, -2]} intensity={0.3} color="#58a6ff" />
        <pointLight position={[0, 0.5, 2]} intensity={0.5} color="#3fb950" />

        <GridFloor />

        {MECH_POSITIONS.map((pos, i) => {
          const agent = agents[i];
          const status: "online" | "busy" | "offline" = agent
            ? (agent.status === "online" ? "online" : agent.status === "busy" ? "busy" : "offline")
            : "offline";
          return <MechRobot key={i} position={pos} status={status} />;
        })}

        <AutoOrbitCamera />
      </Canvas>

      {/* Vignette overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, rgba(13,17,23,0.6) 100%)",
        }}
      />
    </div>
  );
}
