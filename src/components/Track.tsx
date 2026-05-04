import { forwardRef, useEffect, useMemo } from "react";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore } from "../store/gameStore";
import { NUMBER_PATHS } from "../utils/paths";

interface TrackProps {
	levelNumber: number;
}

function createRoadTexture() {
	const canvas = document.createElement("canvas");
	canvas.width = 512;
	canvas.height = 512;
	const ctx = canvas.getContext("2d");
	if (ctx) {
		ctx.fillStyle = "#222222";
		ctx.fillRect(0, 0, 512, 512);

		// Edge lines
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(20, 0, 20, 512);
		ctx.fillRect(472, 0, 20, 512);

		// Center dashes
		ctx.fillStyle = "#dddddd";
		ctx.fillRect(246, 0, 20, 150);
		ctx.fillRect(246, 250, 20, 150);
	}
	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	tex.anisotropy = 16;
	return tex;
}

export const Track = forwardRef<THREE.Group, TrackProps>(
	({ levelNumber }, ref) => {
		const setTrackBounds = useGameStore((s) => s.setTrackBounds);
		// Default to path for 0 if not found for some reason
		const currentPath = NUMBER_PATHS[levelNumber] || NUMBER_PATHS[0];

		const { trackGeometry, roadTexture, box } = useMemo(() => {
			const width = 5.5;
			const segments = 400;
			const pts = currentPath.getSpacedPoints(segments);
			const { tangents, normals, binormals } = currentPath.computeFrenetFrames(
				segments,
				false,
			);

			const vertices = [];
			const uvs = [];
			const indices = [];

			for (let i = 0; i <= segments; i++) {
				const pt = pts[i];

				// Use simple UP x tangent to ensure the road is completely level side-to-side and never shrinks
				let lateral = new THREE.Vector3(0, 1, 0).cross(tangents[i]);
				if (lateral.lengthSq() < 0.001) {
					lateral.set(1, 0, 0);
				}
				lateral.normalize();

				const p1 = pt.clone().add(lateral.clone().multiplyScalar(width));
				const p2 = pt.clone().add(lateral.clone().multiplyScalar(-width));

				vertices.push(p1.x, p1.y, p1.z);
				vertices.push(p2.x, p2.y, p2.z);

				const v = (i / segments) * 150;
				uvs.push(1, v);
				uvs.push(0, v);
			}

			for (let i = 0; i < segments; i++) {
				const a = i * 2;
				const b = i * 2 + 1;
				const c = (i + 1) * 2;
				const d = (i + 1) * 2 + 1;

				indices.push(a, d, b);
				indices.push(a, c, d);
			}

			const geo = new THREE.BufferGeometry();
			geo.setAttribute(
				"position",
				new THREE.Float32BufferAttribute(vertices, 3),
			);
			geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
			geo.setIndex(indices);
			geo.computeVertexNormals();
			geo.computeBoundingBox();

			return {
				trackGeometry: geo,
				roadTexture: createRoadTexture(),
				box: geo.boundingBox,
			};
		}, [currentPath]);

		useEffect(() => {
			if (box) {
				setTrackBounds({
					minX: box.min.x,
					maxX: box.max.x,
					minZ: box.min.z,
					maxZ: box.max.z,
				});
			}
		}, [box, setTrackBounds]);

		const startPoint = currentPath.getPointAt(0);
		const finishPoint = currentPath.getPointAt(1);
		const cp1 = currentPath.getPointAt(0.25);
		const cp2 = currentPath.getPointAt(0.5);
		const cp3 = currentPath.getPointAt(0.75);

		const startTangent = currentPath.getTangentAt(0);
		const finishTangent = currentPath.getTangentAt(1);

		return (
			<group ref={ref} name="track-group">
				<mesh
					name="road-mesh"
					geometry={trackGeometry}
					receiveShadow
					castShadow
				>
					<meshStandardMaterial
						map={roadTexture}
						roughness={0.9}
						color="#888888"
						side={THREE.DoubleSide}
					/>
				</mesh>

				{/* Start Line */}
				<group
					position={[startPoint.x, 0.1, startPoint.z]}
					rotation={[0, Math.atan2(startTangent.x, startTangent.z), 0]}
				>
					<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
						<planeGeometry args={[8, 3]} />
						<meshStandardMaterial
							color="#ffffff"
							map={createCheckeredTexture()}
							transparent
							opacity={0.8}
						/>
					</mesh>
					<pointLight
						position={[0, 2, 0]}
						color="#ffffff"
						intensity={2}
						distance={10}
					/>
				</group>

				{/* Checkpoints */}
				{[cp1, cp2, cp3].map((pos, idx) => {
					const tangent = currentPath.getTangentAt(0.25 * (idx + 1));
					return (
						<mesh
							key={idx}
							position={[pos.x, 0.1, pos.z]}
							rotation={[-Math.PI / 2, 0, Math.atan2(tangent.x, tangent.z)]}
						>
							<planeGeometry args={[8, 1]} />
							<meshBasicMaterial color="#ffff00" transparent opacity={0.6} />
						</mesh>
					);
				})}

				{/* Finish Line */}
				<group
					position={[finishPoint.x, 0.1, finishPoint.z]}
					rotation={[0, Math.atan2(finishTangent.x, finishTangent.z), 0]}
				>
					<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
						<planeGeometry args={[8, 3]} />
						<meshStandardMaterial
							color="#000000"
							emissive="#00ff00"
							emissiveIntensity={2}
							transparent
							opacity={0.8}
						/>
					</mesh>
				</group>
			</group>
		);
	},
);

// Helper to create a quick checkered material mapped procedural-like
function createCheckeredTexture() {
	const canvas = document.createElement("canvas");
	canvas.width = 128; // Increased for crispness
	canvas.height = 128;
	const ctx = canvas.getContext("2d");
	if (ctx) {
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, 128, 128);
		ctx.fillStyle = "#ff0000";
		ctx.fillRect(0, 0, 64, 64);
		ctx.fillRect(64, 64, 64, 64);
	}
	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.RepeatWrapping;
	tex.repeat.set(2, 4);
	return tex;
}

Track.displayName = "Track";
