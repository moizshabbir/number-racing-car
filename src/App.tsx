import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { Game } from './components/Game';
import { UI } from './components/UI';
import { KeyboardControls } from '@react-three/drei';

const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
  { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
  { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
  { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
  { name: 'boost', keys: ['Space'] },
  { name: 'drift', keys: ['Shift'] },
];

export default function App() {
  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      <KeyboardControls map={keyboardMap}>
        <Canvas shadows camera={{ position: [0, 40, 0], fov: 75 }} style={{ borderColor: '#141515', borderStyle: 'solid', borderWidth: '1px' }}>
          <Suspense fallback={null}>
            <Game />
          </Suspense>
        </Canvas>
        <UI />
      </KeyboardControls>
    </div>
  );
}
