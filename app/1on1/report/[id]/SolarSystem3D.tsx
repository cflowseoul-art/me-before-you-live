"use client";

import { useRef, useMemo, useState, Component, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Html, Line } from "@react-three/drei";
import * as THREE from "three";

// ─── Types ───
interface SolarPartner {
  id: string;
  nickname: string;
  score: number;
  isMutual: boolean;
  feedScore: number;
}

interface OuterPlanet {
  id: string;
  nickname: string;
}

interface Props {
  solarPartners: SolarPartner[];
  outerPlanets: OuterPlanet[];
  selectedPlanet: { index: number; isMatch: boolean } | null;
  setSelectedPlanet: (v: { index: number; isMatch: boolean } | null) => void;
  nickname?: string;
}

// ─── Error Boundary ───
class CanvasErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// ─── Sun ───
function Sun() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const s = 1 + Math.sin(clock.getElapsedTime() * 1.5) * 0.05;
    if (meshRef.current) meshRef.current.scale.setScalar(s);
    if (glowRef.current) {
      glowRef.current.scale.setScalar(s * 1.8);
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.12 + Math.sin(clock.getElapsedTime() * 1.5) * 0.05;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial
          emissive="#f59e0b"
          emissiveIntensity={2}
          color="#fbbf24"
          toneMapped={false}
        />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.15} />
      </mesh>
      <Html position={[0, -0.9, 0]} center zIndexRange={[1, 0]} style={{ pointerEvents: "none" }}>
        <span className="text-[10px] text-amber-300 font-bold whitespace-nowrap select-none">
          나 (The Sun)
        </span>
      </Html>
    </group>
  );
}

// ─── Orbit Ring ───
function OrbitRing({ radius }: { radius: number }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push([Math.cos(a) * radius, 0, Math.sin(a) * radius]);
    }
    return pts;
  }, [radius]);

  return <Line points={points} color="#4338ca" opacity={0.25} lineWidth={1} />;
}

// ─── Inner Planet ───
function InnerPlanet({
  index,
  total,
  partner,
  isSelected,
  onClick,
}: {
  index: number;
  total: number;
  partner: SolarPartner;
  isSelected: boolean;
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const rank = index + 1;
  const orbitRadius = 1.5 + rank * 1.2;
  const planetSize = 0.45 / Math.sqrt(rank);
  const speed = 0.15 / rank;
  const startAngle = (index / Math.max(total, 1)) * Math.PI * 2;

  const colors = ["#38bdf8", "#fb7185", "#a78bfa"];
  const color = colors[index % colors.length];

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const angle = startAngle + t * speed;
    groupRef.current.position.x = Math.cos(angle) * orbitRadius;
    groupRef.current.position.z = Math.sin(angle) * orbitRadius;

    if (isSelected && meshRef.current) {
      const pulse = 1 + Math.sin(t * 3) * 0.12;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <>
      <OrbitRing radius={orbitRadius} />
      <group ref={groupRef}>
        <mesh
          ref={meshRef}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          <sphereGeometry args={[planetSize, 24, 24]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isSelected ? 1.2 : 0.3}
            toneMapped={false}
          />
        </mesh>

        {isSelected && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[planetSize + 0.12, planetSize + 0.18, 32]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.5} side={2} />
          </mesh>
        )}

        {partner.isMutual && (
          <Html position={[planetSize + 0.1, planetSize + 0.1, 0]} center zIndexRange={[1, 0]} style={{ pointerEvents: "none" }}>
            <span className="text-[10px] drop-shadow-lg select-none">💗</span>
          </Html>
        )}

        <Html position={[0, -(planetSize + 0.4), 0]} center zIndexRange={[1, 0]} style={{ pointerEvents: "none" }}>
          <div className="text-center whitespace-nowrap select-none">
            <p className="text-[10px] text-white font-bold">{partner.nickname}</p>
            {partner.feedScore > 0 ? (
              <p className="text-[9px] text-indigo-300">{partner.score}%</p>
            ) : (
              <span className="text-[8px] px-1.5 py-0.5 bg-amber-500/80 text-white rounded-full">
                가치관 매칭
              </span>
            )}
          </div>
        </Html>
      </group>
    </>
  );
}

// ─── Outer Planet ───
function OuterPlanetDot({
  index,
  total,
  planet,
  onClick,
}: {
  index: number;
  total: number;
  planet: OuterPlanet;
  isSelected: boolean;
  onClick: () => void;
}) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 + Math.PI / 4;
  const radius = 7.5;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  return (
    <group position={[x, 0, z]}>
      <mesh onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.4} />
      </mesh>
      <Html position={[0, -0.25, 0]} center zIndexRange={[1, 0]} style={{ pointerEvents: "none" }}>
        <span className="text-[7px] text-indigo-500/50 whitespace-nowrap select-none">
          {planet.nickname}
        </span>
      </Html>
    </group>
  );
}

// ─── Scene ───
function Scene({ solarPartners, outerPlanets, selectedPlanet, setSelectedPlanet }: Props) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={50} color="#fbbf24" distance={20} decay={2} />

      <Sun />

      {solarPartners.map((partner, idx) => (
        <InnerPlanet
          key={partner.id}
          index={idx}
          total={solarPartners.length}
          partner={partner}
          isSelected={selectedPlanet?.index === idx && selectedPlanet?.isMatch === true}
          onClick={() => {
            const isSel = selectedPlanet?.index === idx && selectedPlanet?.isMatch;
            setSelectedPlanet(isSel ? null : { index: idx, isMatch: true });
          }}
        />
      ))}

      {outerPlanets.map((planet, idx) => (
        <OuterPlanetDot
          key={planet.id}
          index={idx}
          total={outerPlanets.length}
          planet={planet}
          isSelected={selectedPlanet?.index === idx && !selectedPlanet?.isMatch}
          onClick={() => {
            const isSel = selectedPlanet?.index === idx && !selectedPlanet?.isMatch;
            setSelectedPlanet(isSel ? null : { index: idx, isMatch: false });
          }}
        />
      ))}

      <OrbitRing radius={7.5} />

      <Stars radius={60} depth={50} count={2000} factor={3} saturation={0} fade speed={0.5} />

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={4}
        maxDistance={16}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.85}
      />
    </>
  );
}

// ─── Fallback (WebGL 실패 시) ───
function Fallback() {
  return (
    <div className="w-full h-[420px] bg-[#070714] rounded-[2rem] flex items-center justify-center">
      <p className="text-indigo-400 text-sm">3D를 지원하지 않는 환경입니다.</p>
    </div>
  );
}

// ─── Export ───
export default function SolarSystem3D(props: Props) {
  const [webglFailed, setWebglFailed] = useState(false);

  if (webglFailed) return <Fallback />;

  return (
    <CanvasErrorBoundary fallback={<Fallback />}>
      <div className="w-full h-[420px] overflow-hidden">
        <Canvas
          camera={{ position: [0, 6, 10], fov: 50 }}
          gl={{ antialias: true }}
          style={{ background: "#070714" }}
          onCreated={({ gl }) => {
            gl.setClearColor("#070714");
          }}
          onError={() => setWebglFailed(true)}
        >
          <Scene {...props} />
        </Canvas>
      </div>
    </CanvasErrorBoundary>
  );
}
