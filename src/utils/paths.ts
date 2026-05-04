import * as THREE from "three";

const S = 20; // Scale
const H = 4; // Height scale for bridges

// All paths in 3D: [x, y, z]. y is elevation. Drawn as if writing with a pen.
const paths3D: Record<number, number[][]> = {
	// 10: Smooth transition from 1 to 0 to prevent pinching
	10: [
		[-3.0, 0, 4.0], // top of 1
		[-3.0, 0, -3.0], // bottom of 1
		// Smooth U-turn transition
		[-2.5, 0, -4.5],
		[-1.5, 0, -5.5],
		[0.0, 0, -5.5],
		[1.0, 0, -4.5],
		[1.5, 0, -3.0], // enter 0 at bottom left

		[1.5, 0, 2.0], // left side up
		[2.5, 0, 4.0], // top left
		[4.5, 0, 4.0], // top right
		[5.5, 0, 2.0], // right side down
		[5.5, 0, -3.0], // right side down
		[4.5, 0, -5.0], // bottom right curve
		[3.0, 0, -5.5], // finish at bottom middle
		[2.0, 0, -4.5], // close the 0 gap
		[1.5, 0, -3.0], // loop completed
	],

	// 9: Start bottom tail, up, clockwise loop, end under overpass
	9: [
		[-1.0, 0.0, -4.5], // bottom tail start (hook)
		[1.0, 0.0, -4.5], // bottom right
		[1.5, 0.0, -2.0], // straight up
		[1.5, 1.0, 1.0], // overpass rising (right side)
		[0.5, 1.0, 4.0], // top curve
		[-1.5, 0.5, 4.0], // top left
		[-2.0, 0.0, 1.5], // mid left
		[-0.5, 0.0, 0.0], // bottom left of loop
		[1.5, 0.0, 1.5], // close loop under the overpass
	],

	// 8: Figure 8 with center overpass
	8: [
		[0.0, 0.0, 0.0], // center (underpass)
		[2.0, 0.5, 2.0],
		[0.0, 1.0, 4.0],
		[-2.0, 0.5, 2.0], // top loop
		[0.0, 1.0, 0.0], // cross center (overpass)
		[2.0, 0.5, -2.0],
		[0.0, 0.0, -4.0],
		[-2.0, 0.0, -2.0], // bottom loop
		[0.0, 0.0, 0.0], // close loop (underpass)
	],

	// 7: Continuous, no crossing
	7: [
		[-2.5, 0, 3.5], // top left
		[2.5, 0, 3.5], // top right
		[0.0, 0, -3.5], // bottom left (diagonal)
	],

	// 6: Loop at bottom, overpass
	6: [
		[1.5, 1.5, 4.0], // top right
		[-1.5, 1.0, 2.0], // diagonal left
		[-2.0, 0.5, -1.0], // down
		[0.0, 0.0, -3.5],
		[2.0, 0.5, -2.0], // bottom curve
		[1.5, 1.0, 0.5], // curve up and left
		[-1.0, 1.5, 0.5], // cross over the downward stroke
		[-1.5, 1.0, -1.0], // terminate inside
	],

	// 5: Continuous, no crossing
	5: [
		[2.5, 0, 4.0], // start top right
		[-1.5, 0, 4.0], // left
		[-1.5, 0, 1.0], // down
		[1.5, 0, 1.5],
		[2.5, 0, 0.0],
		[2.5, 0, -1.5], // curve right and down
		[1.0, 0, -3.5],
		[-1.5, 0, -3.5],
		[-2.5, 0, -2.0], // curve left and up
	],

	// 4: Start from bottom, straight to top, create triangle, finish before connecting main line
	4: [
		[1.5, 0, -4.5], // start at bottom
		[1.5, 0, 4.0], // straight to top
		[-2.5, 0, -0.5], // diagonal down-left (triangle tip)
		[0.5, 0, -0.5], // horizontal finish before connecting to main line
	],

	// 3: Continuous, no crossing
	3: [
		[-2.5, 0, 4.0], // start top left
		[0.0, 0, 4.0],
		[2.5, 0, 2.5],
		[1.5, 0, 0.5],
		[0.0, 0, 0.5], // top curve
		[2.0, 0, -0.5],
		[2.5, 0, -2.5],
		[0.0, 0, -4.0],
		[-2.5, 0, -3.0], // bottom curve, end
	],

	// 2: Continuous, no crossing
	2: [
		[-3.0, 0, 2.0],
		[-1.0, 0, 4.0],
		[1.5, 0, 4.0],
		[3.0, 0, 2.0], // top curve
		[1.5, 0, 0.0],
		[-2.5, 0, -3.5], // diagonal
		[3.0, 0, -3.5], // bottom base
	],

	// 1: Straight lines
	1: [
		[-1.0, 0, 3.0], // top serif
		[0.0, 0, 4.0], // top point
		[0.0, 0, -4.0], // bottom point
		[-1.5, 0, -5.0],
		[1.5, 0, -5.0], // bottom serif for extra length
	],

	// 0: Simple loop with a small gap
	0: [
		[-0.2, 0, 4.0],
		[-2.0, 0, 2.0],
		[-2.0, 0, -2.0],
		[0.0, 0, -4.0],
		[2.0, 0, -2.0],
		[2.0, 0, 2.0],
		[0.2, 0, 4.0],
	],
};

export const NUMBER_PATHS: Record<number, THREE.Curve<THREE.Vector3>> = {};

for (const [key, points] of Object.entries(paths3D)) {
	const vec3Points = points.map(
		(p) => new THREE.Vector3(p[0] * S, p[1] * H, p[2] * S),
	);
	// tension 0.1 gives a very tight, well behaved curve without loops
	NUMBER_PATHS[parseInt(key)] = new THREE.CatmullRomCurve3(
		vec3Points,
		false,
		"catmullrom",
		0.15,
	);
}

// Helper: Get total length to verify scale
export const getPathLength = (level: number) => {
	return NUMBER_PATHS[level]?.getLength() || 0;
};
