import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../store/gameStore";
import { NUMBER_PATHS } from "../utils/paths";
import * as THREE from "three";

export function MiniMap() {
	const { levels, currentLevelIndex } = useGameStore();
	const currentNumber = levels[currentLevelIndex];
	const path = NUMBER_PATHS[currentNumber];

	// Subscribe to car position without triggering a React re-render of the whole component
	const dotRef = useRef<SVGCircleElement>(null);

	useEffect(() => {
		return useGameStore.subscribe((state) => {
			if (dotRef.current) {
				// Map the 3D position to SVG space directly using the viewBox
				dotRef.current.setAttribute("cx", String(state.carPosition.x));
				// Invert Z so +Z (top of track) is at the top of the SVG (-Y)
				dotRef.current.setAttribute("cy", String(-state.carPosition.z));
			}
		});
	}, []);

	// Get 2D points from the CatmullRomCurve3
	const [pathData, setPathData] = useState("");
	useEffect(() => {
		if (!path) return;
		const pts = path.getPoints(100);
		const data = pts
			.map((pt: THREE.Vector3, i: number) => {
				return `${i === 0 ? "M" : "L"} ${pt.x} ${-pt.z}`;
			})
			.join(" ");
		setPathData(data);
	}, [path]);

	return (
		<div className="absolute top-36 right-6 w-32 h-32 bg-black/40 border border-cyan-500/30 rounded-xl backdrop-blur-sm overflow-hidden p-2 pointer-events-auto">
			<svg
				viewBox="-150 -150 300 300"
				className="w-full h-full drop-shadow-[0_0_5px_rgba(0,255,255,0.5)] overflow-visible"
			>
				{/* Track Background */}
				<path
					d={pathData}
					stroke="rgba(255,255,255,0.2)"
					strokeWidth="15"
					fill="none"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				{/* Track Line */}
				<path
					d={pathData}
					stroke="cyan"
					strokeWidth="5"
					fill="none"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>

				{/* Car Dot */}
				<circle
					ref={dotRef}
					cx="0"
					cy="0"
					r="12"
					fill="red"
					className="drop-shadow-[0_0_15px_red]"
				/>
			</svg>
		</div>
	);
}
