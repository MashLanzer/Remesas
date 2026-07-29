import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { Phone } from "./Phone";
import { Particles } from "./Particles";
import { sample, scroll } from "../scroll/store";

// Mueve la cámara y las luces cada frame según el scroll + parallax de ratón.
function Rig({
  keyLight,
  fillLight,
}: {
  keyLight: React.RefObject<THREE.PointLight>;
  fillLight: React.RefObject<THREE.PointLight>;
}) {
  const { camera } = useThree();
  const cur = useRef({ x: 0, y: 0, z: 6.2, light: 1 });

  useFrame((_, delta) => {
    const s = sample(scroll.progress);
    const k = 1 - Math.pow(0.0015, delta); // lerp estable por FPS
    const c = cur.current;

    // objetivo = keyframe + parallax de ratón
    const tx = s.cam[0] + scroll.pointerX * 0.35;
    const ty = s.cam[1] - scroll.pointerY * 0.25;
    const tz = s.cam[2];

    c.x += (tx - c.x) * k;
    c.y += (ty - c.y) * k;
    c.z += (tz - c.z) * k;
    c.light += (s.light - c.light) * k;

    camera.position.set(c.x, c.y, c.z);
    camera.lookAt(0, 0, 0);

    if (keyLight.current) keyLight.current.intensity = c.light * 22;
    if (fillLight.current) fillLight.current.intensity = c.light * 10;
  });

  return null;
}

export function Experience({ quality }: { quality: "high" | "low" }) {
  const keyLight = useRef<THREE.PointLight>(null);
  const fillLight = useRef<THREE.PointLight>(null);
  const high = quality === "high";

  return (
    <Canvas
      className="webgl"
      dpr={high ? [1, 2] : [1, 1.4]}
      gl={{
        antialias: high,
        powerPreference: "high-performance",
        alpha: false,
      }}
      camera={{ fov: 38, position: [0, 0, 6.2], near: 0.1, far: 100 }}
    >
      <color attach="background" args={["#050a08"]} />
      <fog attach="fog" args={["#050a08", 8, 22]} />

      {/* Luz ambiente tenue + luces dinámicas de marca */}
      <ambientLight intensity={0.6} />
      <pointLight
        ref={keyLight}
        position={[3, 4, 5]}
        color="#2fe08a"
        intensity={22}
        distance={30}
      />
      <pointLight
        ref={fillLight}
        position={[-4, -2, 3]}
        color="#12b866"
        intensity={10}
        distance={30}
      />
      <directionalLight position={[0, 5, 2]} intensity={0.5} color="#ffffff" />

      <Rig keyLight={keyLight} fillLight={fillLight} />

      <Phone />
      <Particles count={high ? 1100 : 450} />

      {/* Bloom/vignette solo en gama alta (coste en móvil). */}
      {high && (
        <EffectComposer>
          <Bloom
            intensity={0.9}
            luminanceThreshold={0.55}
            luminanceSmoothing={0.25}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.25} darkness={0.85} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
