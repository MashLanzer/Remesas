import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scroll } from "../scroll/store";

// Campo de partículas suave, reactivo al scroll: giran despacio y se "abren"
// (expanden) a medida que avanzas. Cantidad configurable para gama baja.
export function Particles({ count = 900 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const mat = useRef<THREE.PointsMaterial>(null);

  const { positions, radii } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const radii = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // distribución en cascarón esférico alrededor del centro
      const r = 6 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      radii[i] = r;
    }
    return { positions, radii };
  }, [count]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const p = scroll.progress;
    ref.current.rotation.y += delta * 0.03;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.1;
    // se abren con el scroll (parallax de profundidad)
    ref.current.scale.setScalar(1 + p * 0.6);
    if (mat.current) mat.current.opacity = 0.25 + p * 0.35;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-radius"
          count={count}
          array={radii}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={mat}
        size={0.035}
        color="#2fe08a"
        transparent
        opacity={0.3}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
