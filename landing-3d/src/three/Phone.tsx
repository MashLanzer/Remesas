import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { makeScreenTextures } from "./screens";
import { sample, scroll } from "../scroll/store";

// Teléfono construido con primitivas (ligero y sin assets). Para usar un modelo
// real: descomenta useGLTF abajo y reemplaza el cuerpo por <primitive>.
//
//   import { useGLTF } from "@react-three/drei";
//   const { scene } = useGLTF("/phone.glb");
//   return <primitive object={scene} ref={group} />;

// Chips de UI que flotan alrededor del teléfono en la sección 3 (40-60%).
function FloatingChip({
  position,
  color,
  visible,
}: {
  position: [number, number, number];
  color: string;
  visible: number; // 0..1
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrameFloat(ref, position);
  return (
    <mesh ref={ref} position={position} scale={visible}>
      <boxGeometry args={[0.5, 0.28, 0.04]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
        transparent
        opacity={0.9 * visible}
        roughness={0.3}
      />
    </mesh>
  );
}

// Pequeño flotar orgánico.
function useFrameFloat(
  ref: React.RefObject<THREE.Object3D>,
  base: [number, number, number]
) {
  const seed = useMemo(() => Math.random() * 10, []);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime + seed;
    ref.current.position.y = base[1] + Math.sin(t * 1.2) * 0.08;
    ref.current.rotation.z = Math.sin(t * 0.8) * 0.15;
  });
}

export function Phone() {
  const group = useRef<THREE.Group>(null);
  const screenMat = useRef<THREE.MeshStandardMaterial>(null);
  const textures = useMemo(() => makeScreenTextures(), []);
  const chips = useRef<THREE.Group>(null);

  // Estado lerpeado hacia el objetivo del scroll (da la sensación "scrub").
  const cur = useRef({ rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0, chip: 0 });

  useFrame((_, delta) => {
    const s = sample(scroll.progress);
    const k = 1 - Math.pow(0.001, delta); // lerp estable independiente de FPS
    const c = cur.current;

    c.rx += (s.phoneRot[0] - c.rx) * k;
    c.ry += (s.phoneRot[1] - c.ry) * k;
    c.rz += (s.phoneRot[2] - c.rz) * k;
    c.px += (s.phonePos[0] - c.px) * k;
    c.py += (s.phonePos[1] - c.py) * k;
    c.pz += (s.phonePos[2] - c.pz) * k;

    if (group.current) {
      // Rotación base del scroll + micro-giro continuo + parallax de ratón.
      group.current.rotation.set(
        c.rx + scroll.pointerY * 0.04,
        c.ry + scroll.pointerX * 0.12,
        c.rz
      );
      group.current.position.set(c.px, c.py, c.pz);
    }

    // Cambia la pantalla activa.
    if (screenMat.current) {
      const tex = textures[s.screen] ?? textures[0];
      if (screenMat.current.map !== tex) {
        screenMat.current.map = tex;
        screenMat.current.needsUpdate = true;
      }
    }

    // Chips flotantes solo visibles en el tramo 0.38–0.62.
    const p = scroll.progress;
    const target = p > 0.38 && p < 0.62 ? 1 : 0;
    c.chip += (target - c.chip) * k;
    if (chips.current) chips.current.visible = c.chip > 0.02;
  });

  return (
    <group ref={group} dispose={null}>
      {/* Cuerpo */}
      <RoundedBox args={[1.55, 3.2, 0.22]} radius={0.16} smoothness={6}>
        <meshStandardMaterial
          color="#0b0f0d"
          metalness={0.9}
          roughness={0.35}
        />
      </RoundedBox>

      {/* Marco/bisel emisivo sutil */}
      <RoundedBox args={[1.5, 3.14, 0.24]} radius={0.14} smoothness={6}>
        <meshStandardMaterial
          color="#12b866"
          emissive="#12b866"
          emissiveIntensity={0.25}
          metalness={0.5}
          roughness={0.4}
        />
      </RoundedBox>

      {/* Pantalla */}
      <mesh position={[0, 0, 0.13]}>
        <planeGeometry args={[1.36, 2.96]} />
        <meshStandardMaterial
          ref={screenMat}
          map={textures[0]}
          emissiveMap={textures[0]}
          emissive="#ffffff"
          emissiveIntensity={0.55}
          roughness={0.25}
          metalness={0}
          toneMapped={false}
        />
      </mesh>

      {/* Notch */}
      <mesh position={[0, 1.34, 0.14]}>
        <planeGeometry args={[0.44, 0.12]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* UI flotante alrededor (sección 3) */}
      <group ref={chips}>
        <FloatingChip position={[-1.35, 0.7, 0.6]} color="#2fe08a" visible={1} />
        <FloatingChip position={[1.4, 0.1, 0.5]} color="#12b866" visible={1} />
        <FloatingChip position={[-1.2, -0.9, 0.4]} color="#2fe08a" visible={1} />
      </group>
    </group>
  );
}
