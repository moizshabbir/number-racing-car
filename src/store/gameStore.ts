import { create } from "zustand";

type GameStatus =
	| "loading"
	| "intro"
	| "countdown"
	| "playing"
	| "finish"
	| "champion"
	| "outOfTrack";

interface GameState {
	levels: number[];
	currentLevelIndex: number;
	status: GameStatus;
	time: number;
	speed: number;
	checkpointsFound: number;
	hasStarted: boolean;
	message: string;
	trackBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
	carPosition: { x: number; z: number };

	setStatus: (status: GameStatus) => void;
	setMessage: (msg: string) => void;
	nextLevel: () => void;
	setTime: (time: number) => void;
	setSpeed: (speed: number) => void;
	setCheckpointsFound: (num: number) => void;
	setHasStarted: (started: boolean) => void;
	setTrackBounds: (bounds: {
		minX: number;
		maxX: number;
		minZ: number;
		maxZ: number;
	}) => void;
	setCarPosition: (pos: { x: number; z: number }) => void;
	resetRun: () => void;
	restartLevel: () => void;
	jumpToLevel: (index: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
	levels: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
	currentLevelIndex: 0,
	status: "intro",
	time: 0,
	speed: 0,
	checkpointsFound: 0,
	hasStarted: false,
	message: "",
	trackBounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
	carPosition: { x: 0, z: 0 },

	setStatus: (status) => set({ status }),
	setMessage: (message) => set({ message }),
	nextLevel: () => {
		const { currentLevelIndex, levels } = get();
		if (currentLevelIndex < levels.length - 1) {
			set({
				currentLevelIndex: currentLevelIndex + 1,
				status: "intro",
				time: 0,
				speed: 0,
				checkpointsFound: 0,
				hasStarted: false,
			});
		} else {
			set({ status: "champion" });
		}
	},
	setTime: (time) => set({ time }),
	setSpeed: (speed) => set({ speed }),
	setCheckpointsFound: (num) => set({ checkpointsFound: num }),
	setHasStarted: (started) => set({ hasStarted: started }),
	setTrackBounds: (bounds) => set({ trackBounds: bounds }),
	setCarPosition: (pos) => set({ carPosition: pos }),
	resetRun: () =>
		set({
			status: "intro",
			currentLevelIndex: 0,
			time: 0,
			speed: 0,
			checkpointsFound: 0,
			hasStarted: false,
			message: "",
		}),
	restartLevel: () =>
		set({
			status: "intro",
			time: 0,
			speed: 0,
			checkpointsFound: 0,
			hasStarted: false,
			message: "",
		}),
	jumpToLevel: (index: number) =>
		set({
			status: "intro",
			currentLevelIndex: index,
			time: 0,
			speed: 0,
			checkpointsFound: 0,
			hasStarted: false,
			message: "",
		}),
}));
