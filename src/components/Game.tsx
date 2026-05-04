import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Track } from './Track';
import { Car } from './Car';
import { useGameStore } from '../store/gameStore';

export function Game() {
  const status = useGameStore((s) => s.status);
  const setStatus = useGameStore((s) => s.setStatus);
  const currentLevelIndex = useGameStore((s) => s.currentLevelIndex);
  const levels = useGameStore((s) => s.levels);
  const currentNumber = levels[currentLevelIndex];
  
  const trackRef = useRef<THREE.Group>(null);
  const carRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (status === 'intro') {
      const timer1 = setTimeout(() => {
        setStatus('countdown');
      }, 4300); // Wait 2.5s overhead + 1.8s camera tween
      return () => clearTimeout(timer1);
    }
    
    if (status === 'countdown') {
       const timer2 = setTimeout(() => {
         setStatus('playing');
       }, 3000); // 3, 2, 1, GO
       return () => clearTimeout(timer2);
    }
  }, [status, setStatus]);

  return (
    <>
      <color attach="background" args={['#87CEEB']} />
      <fog attach="fog" args={['#87CEEB', 50, 400]} />
      
      <ambientLight intensity={0.6} color="#ffffff" />
      <directionalLight position={[100, 200, 50]} intensity={1.5} color="#FFFAEA" castShadow shadow-mapSize={[1024, 1024]}>
        <orthographicCamera attach="shadow-camera" args={[-150, 150, 150, -150, 0.1, 800]} />
      </directionalLight>
      
      {/* Ground Plane (Grass) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[3000, 3000]} />
        <meshStandardMaterial color="#4CAF50" roughness={1} metalness={0} />
      </mesh>
      
      {/* Distant Mountains (Simple Cones) */}
      {[...Array(15)].map((_, i) => {
        const angle = (i / 15) * Math.PI * 2;
        const radius = 400 + Math.random() * 100;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        return (
           <mesh key={`mtn-${i}`} position={[x, -2, z]} receiveShadow castShadow>
             <coneGeometry args={[40 + Math.random() * 40, 60 + Math.random() * 80, 8]} />
             <meshStandardMaterial color="#2E7D32" roughness={0.9} />
           </mesh>
        );
      })}

      <Track levelNumber={currentNumber} ref={trackRef} />
      <Car trackRef={trackRef} ref={carRef} />

      <EffectComposer>
        <Bloom luminanceThreshold={0.7} luminanceSmoothing={0.9} intensity={0.4} mipmapBlur />
      </EffectComposer>
    </>
  );
}
