import { forwardRef, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore } from "../store/gameStore";
import { NUMBER_PATHS } from "../utils/paths";
import { soundManager } from "../utils/audio";
import gsap from "gsap";

interface CarProps {
	trackRef: React.RefObject<THREE.Group>;
}

export const Car = forwardRef<THREE.Group, CarProps>(({ trackRef }, ref) => {
	const [, get] = useKeyboardControls();
	const carRef = useRef<THREE.Group>(null);
	const { camera } = useThree();
	const speedRef = useRef(0);
	const angleRef = useRef(0); // Y rotation
	const raycaster = useRef(new THREE.Raycaster());
	const fallTimer = useRef(0);

	const status = useGameStore((s) => s.status);
	const setSpeedUI = useGameStore((s) => s.setSpeed);
	const currentLevelIndex = useGameStore((s) => s.currentLevelIndex);
	const levels = useGameStore((s) => s.levels);
	const setCheckpointsFound = useGameStore((s) => s.setCheckpointsFound);

	// Expose carRef if parent provided one
	useEffect(() => {
		if (ref) {
			if (typeof ref === "function") ref(carRef.current);
			else (ref as any).current = carRef.current;
		}
	}, [ref]);

	const introPhase = useRef(0); // 0: overhead, 1: tween, 2: playing

	// Handle start spawn reset
	useEffect(() => {
		if (status === "intro") {
			speedRef.current = 0;
			introPhase.current = 0;

			const path = NUMBER_PATHS[levels[currentLevelIndex]];
			const startPt = path.getPointAt(0);
			const startTan = path.getTangentAt(0);

			angleRef.current = Math.atan2(startTan.x, startTan.z);
			if (carRef.current) {
				carRef.current.position.set(startPt.x, startPt.y + 0.5, startPt.z);
				carRef.current.rotation.y = angleRef.current;
			}

			// Bird's eye camera view
			// Adjust overview so the track fills the screen nicely and is oriented correctly
			// We know most tracks span approx x: -3 to +3, z: -5 to +5 (*S)
			// Set camera high up and tell it UP is +Z so the tops of the numbers point to the top of screen
			camera.position.set(0, 250, 0); // go higher so the full number fits easily
			camera.up.set(0, 0, 1); // +Z is UP on the screen
			camera.lookAt(0, 0, 0);

			// GSAP Zoom to start
			setTimeout(() => {
				if (useGameStore.getState().status === "intro" && carRef.current) {
					introPhase.current = 1;

					const carPos = carRef.current.position;
					const targetPos = new THREE.Vector3(
						carPos.x - 10,
						carPos.y + 4,
						carPos.z,
					);

					gsap.to(camera.up, {
						x: 0,
						y: 1,
						z: 0,
						duration: 1.8,
						ease: "power2.inOut",
					});

					gsap.to(camera.position, {
						x: targetPos.x,
						y: targetPos.y,
						z: targetPos.z,
						duration: 1.8,
						ease: "power2.inOut",
						onUpdate: () => {
							camera.lookAt(carPos);
						},
					});
				}
			}, 2500); // Wait 2.5s overhead
		}
	}, [status, currentLevelIndex, camera, levels]);

	useFrame((state, delta) => {
		const store = useGameStore.getState();
		// Prevent huge delta spikes on tab switch
		let dt = Math.min(delta, 0.1);
		const isPlaying = store.status === "playing" || store.status === "finish";

		if (store.status === "finish") {
			dt *= 0.3; // Slow motion on finish
		}

		if (carRef.current) {
			if (isPlaying) {
				const { forward, backward, left, right, boost, drift } = get();

				let maxSpeed = 40;
				let accel = 25;
				if (boost) {
					maxSpeed = 55;
					accel = 35;
				}

				if (forward) speedRef.current += accel * dt;
				if (backward) speedRef.current -= 50 * dt;

				// Linear Damping
				speedRef.current *= Math.exp(-0.5 * dt);

				// Cap speed
				speedRef.current = Math.max(
					Math.min(speedRef.current, maxSpeed),
					-maxSpeed / 2,
				);

				// Steering
				if (Math.abs(speedRef.current) > 1) {
					const steerSpeed =
						2.8 * (drift ? 1.8 : 1.0) * Math.sign(speedRef.current);
					const speedFactor = Math.abs(speedRef.current) > 20 ? 0.7 : 1.0;
					if (left) angleRef.current += steerSpeed * speedFactor * dt;
					if (right) angleRef.current -= steerSpeed * speedFactor * dt;
				}

				carRef.current.rotation.y = angleRef.current;

				const nextX =
					carRef.current.position.x +
					Math.sin(angleRef.current) * speedRef.current * dt;
				const nextZ =
					carRef.current.position.z +
					Math.cos(angleRef.current) * speedRef.current * dt;

				setSpeedUI(Math.abs(speedRef.current));
				soundManager.setEngineSpeed(Math.abs(speedRef.current) / maxSpeed);

				useGameStore.setState({
					carPosition: {
						x: carRef.current.position.x,
						z: carRef.current.position.z,
					},
				});

				// Raycast logic to stick to path and bounds
				if (trackRef.current) {
					// Cast from slightly above current Y down to find the very track we are on
					// Bridge vertical separation is 4 units (H=4).
					raycaster.current.set(
						new THREE.Vector3(nextX, carRef.current.position.y + 1.5, nextZ),
						new THREE.Vector3(0, -1, 0),
					);
					raycaster.current.far = 4; // Look 4 units down: enough for steep downhills, short enough to miss bridges

					const trackMeshes = trackRef.current.children.filter(
						(c) => c.type === "Mesh" && c.name === "road-mesh",
					);
					const hits = raycaster.current.intersectObjects(trackMeshes, true);

					if (hits.length > 0) {
						fallTimer.current = 0;
						carRef.current.position.x = nextX;
						carRef.current.position.z = nextZ;
						carRef.current.position.y = hits[0].point.y + 0.1; // sit on top
					} else {
						// Invisible wall: bounce back and prevent getting stuck
						if (Math.abs(speedRef.current) > 10) {
							soundManager.playCrashSound();
						}
						speedRef.current = 0;
					}
				}

				// Checkpoint logic
				const currentPath = NUMBER_PATHS[levels[currentLevelIndex]];
				const carPos = carRef.current.position;

				const dist = 25; // Check trigger radius for checkpoints
				const finishDist = 25;

				const c0 = currentPath.getPointAt(0);
				const store = useGameStore.getState();

				if (!store.hasStarted && carPos.distanceTo(c0) < dist) {
					store.setHasStarted(true);
					store.setMessage("START!");
					soundManager.playCountdownBlip(true);
					setTimeout(() => useGameStore.getState().setMessage(""), 1000);
				}

				if (store.hasStarted) {
					const requiredCheckpoints = 8;

					// If we still have checkpoints to find (0 through 7)
					if (store.checkpointsFound < requiredCheckpoints) {
						// The next checkpoint target is proportional to how many we've found
						// Checkpoints are at t = 0.1, 0.2, ... 0.8
						const nextT = (store.checkpointsFound + 1) / 10;
						const cp = currentPath.getPointAt(nextT);

						// Use 2D distance for leniency on bridges/ramps
						const dist2D = Math.hypot(carPos.x - cp.x, carPos.z - cp.z);
						if (dist2D < dist) {
							setCheckpointsFound(store.checkpointsFound + 1);
						}
					}

					if (
						store.checkpointsFound >= requiredCheckpoints &&
						store.status !== "finish"
					) {
						const finishNode = currentPath.getPointAt(0.99);
						const dist2D = Math.hypot(
							carPos.x - finishNode.x,
							carPos.z - finishNode.z,
						);

						if (dist2D < finishDist) {
							useGameStore.getState().setStatus("finish");
							soundManager.playWinSound();
							soundManager.muteEngine();
							useGameStore.getState().setMessage("TRACK COMPLETE!");
							setTimeout(() => useGameStore.getState().setMessage(""), 1500);
							setTimeout(() => {
								useGameStore.getState().nextLevel();
							}, 1500);
						}
					}
				}
			}

			// Camera System Update
			if (status === "countdown" || status === "playing") {
				const isBoosting = speedRef.current > 40;

				// Chase Cam
				const idealOffset = new THREE.Vector3(0, 1.8, -6);
				idealOffset.applyQuaternion(carRef.current.quaternion);
				idealOffset.add(carRef.current.position);

				let shakeOffset = new THREE.Vector3();
				if (isBoosting) {
					shakeOffset.set(
						(Math.random() - 0.5) * 0.1,
						(Math.random() - 0.5) * 0.1,
						0,
					);
				}
				idealOffset.add(shakeOffset);

				camera.position.lerp(idealOffset, dt * 5);

				const idealLookAt = new THREE.Vector3(0, 0.2, 10);
				idealLookAt.applyQuaternion(carRef.current.quaternion);
				idealLookAt.add(carRef.current.position);

				const currentLookAt = new THREE.Vector3();
				camera.getWorldDirection(currentLookAt);
				currentLookAt.add(camera.position);
				currentLookAt.lerp(idealLookAt, dt * 5);

				camera.lookAt(currentLookAt);
			}
		}
	});

	return (
		<group ref={carRef}>
			{/* Chassis Body */}
			<mesh position={[0, 0.3, 0]} castShadow receiveShadow>
				<boxGeometry args={[1.6, 0.4, 3.2]} />
				<meshStandardMaterial color="#ee2222" roughness={0.3} metalness={0.7} />
			</mesh>

			{/* Cabin Roof */}
			<mesh position={[0, 0.6, -0.3]} castShadow receiveShadow>
				<boxGeometry args={[1.2, 0.35, 1.4]} />
				<meshStandardMaterial color="#aa1111" roughness={0.3} metalness={0.8} />
			</mesh>

			{/* Windshield */}
			<mesh position={[0, 0.6, 0.4]} rotation={[-0.3, 0, 0]} castShadow>
				<planeGeometry args={[1.1, 0.5]} />
				<meshStandardMaterial color="#111111" roughness={0.1} metalness={0.9} />
			</mesh>
			{/* Rear Window */}
			<mesh position={[0, 0.6, -1.0]} rotation={[0.3, Math.PI, 0]} castShadow>
				<planeGeometry args={[1.1, 0.5]} />
				<meshStandardMaterial color="#111111" roughness={0.1} metalness={0.9} />
			</mesh>

			{/* Spoiler */}
			<mesh position={[0, 0.75, -1.5]} castShadow receiveShadow>
				<boxGeometry args={[1.4, 0.05, 0.4]} />
				<meshStandardMaterial color="#222222" />
			</mesh>
			<mesh position={[-0.5, 0.55, -1.4]} castShadow receiveShadow>
				<boxGeometry args={[0.08, 0.4, 0.2]} />
				<meshStandardMaterial color="#222222" />
			</mesh>
			<mesh position={[0.5, 0.55, -1.4]} castShadow receiveShadow>
				<boxGeometry args={[0.08, 0.4, 0.2]} />
				<meshStandardMaterial color="#222222" />
			</mesh>

			{/* Front lights (Spotlights) */}
			<spotLight
				position={[0.6, 0.4, 1.6]}
				angle={Math.PI / 4}
				penumbra={0.5}
				intensity={1.5}
				distance={60}
				color="#ffffff"
				castShadow
				target-position={[0, -1, 10]}
			/>
			<spotLight
				position={[-0.6, 0.4, 1.6]}
				angle={Math.PI / 4}
				penumbra={0.5}
				intensity={1.5}
				distance={60}
				color="#ffffff"
				castShadow
				target-position={[0, -1, 10]}
			/>

			{/* Headlights meshes */}
			<mesh position={[0.6, 0.3, 1.61]}>
				<planeGeometry args={[0.3, 0.15]} />
				<meshStandardMaterial
					emissive="#fff"
					emissiveIntensity={3}
					color="#fff"
				/>
			</mesh>
			<mesh position={[-0.6, 0.3, 1.61]}>
				<planeGeometry args={[0.3, 0.15]} />
				<meshStandardMaterial
					emissive="#fff"
					emissiveIntensity={3}
					color="#fff"
				/>
			</mesh>

			{/* Taillights */}
			<mesh position={[0.5, 0.4, -1.61]} rotation={[0, Math.PI, 0]}>
				<planeGeometry args={[0.5, 0.15]} />
				<meshStandardMaterial
					emissive="#ff0000"
					emissiveIntensity={4}
					color="#ff0000"
				/>
			</mesh>
			<mesh position={[-0.5, 0.4, -1.61]} rotation={[0, Math.PI, 0]}>
				<planeGeometry args={[0.5, 0.15]} />
				<meshStandardMaterial
					emissive="#ff0000"
					emissiveIntensity={4}
					color="#ff0000"
				/>
			</mesh>

			{/* Wheels */}
			{/* Front Left */}
			<mesh
				position={[-0.9, 0.25, 1.0]}
				rotation={[0, 0, Math.PI / 2]}
				castShadow
			>
				<cylinderGeometry args={[0.35, 0.35, 0.25, 24]} />
				<meshStandardMaterial color="#111" roughness={0.9} />
			</mesh>
			{/* Front Right */}
			<mesh
				position={[0.9, 0.25, 1.0]}
				rotation={[0, 0, Math.PI / 2]}
				castShadow
			>
				<cylinderGeometry args={[0.35, 0.35, 0.25, 24]} />
				<meshStandardMaterial color="#111" roughness={0.9} />
			</mesh>
			{/* Rear Left */}
			<mesh
				position={[-0.9, 0.25, -1.0]}
				rotation={[0, 0, Math.PI / 2]}
				castShadow
			>
				<cylinderGeometry args={[0.35, 0.35, 0.25, 24]} />
				<meshStandardMaterial color="#111" roughness={0.9} />
			</mesh>
			{/* Rear Right */}
			<mesh
				position={[0.9, 0.25, -1.0]}
				rotation={[0, 0, Math.PI / 2]}
				castShadow
			>
				<cylinderGeometry args={[0.35, 0.35, 0.25, 24]} />
				<meshStandardMaterial color="#111" roughness={0.9} />
			</mesh>
		</group>
	);
});

Car.displayName = "Car";
