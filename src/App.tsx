import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import { Game } from "./components/Game";
import { UI } from "./components/UI";
import { KeyboardControls } from "@react-three/drei";
import { soundManager } from "./utils/audio";

const keyboardMap = [
	{ name: "forward", keys: ["ArrowUp", "w", "W"] },
	{ name: "backward", keys: ["ArrowDown", "s", "S"] },
	{ name: "left", keys: ["ArrowLeft", "a", "A"] },
	{ name: "right", keys: ["ArrowRight", "d", "D"] },
	{ name: "boost", keys: ["Space"] },
	{ name: "drift", keys: ["Shift"] },
];

export default function App() {
	useEffect(() => {
		const handleInteraction = () => {
			soundManager.init();
		};

		window.addEventListener("keydown", handleInteraction, { once: true });
		window.addEventListener("click", handleInteraction, { once: true });
		window.addEventListener("touchstart", handleInteraction, { once: true });

		return () => {
			window.removeEventListener("keydown", handleInteraction);
			window.removeEventListener("click", handleInteraction);
			window.removeEventListener("touchstart", handleInteraction);
		};
	}, []);

	return (
		<div className="w-full h-screen bg-black overflow-hidden relative">
			<KeyboardControls map={keyboardMap}>
				<Canvas
					shadows
					camera={{ position: [0, 40, 0], fov: 75 }}
					style={{
						borderColor: "#141515",
						borderStyle: "solid",
						borderWidth: "1px",
					}}
				>
					<Suspense fallback={null}>
						<Game />
					</Suspense>
				</Canvas>
				<UI />
			</KeyboardControls>
		</div>
	);
}
