class SoundManager {
	private ac: AudioContext | null = null;
	private engineOscillator: OscillatorNode | null = null;
	private engineGain: GainNode | null = null;

	init() {
		if (!this.ac) {
			try {
				this.ac = new (
					window.AudioContext || (window as any).webkitAudioContext
				)();
				this.startEngineSound();
			} catch (e) {
				console.warn("AudioContext not supported or couldn't be initialized");
			}
		}

		if (this.ac && this.ac.state === "suspended") {
			this.ac.resume();
		}
	}

	startEngineSound() {
		if (!this.ac) return;

		this.engineOscillator = this.ac.createOscillator();
		this.engineOscillator.type = "sawtooth";

		this.engineGain = this.ac.createGain();
		this.engineGain.gain.value = 0; // Start muted

		// Lowpass filter to make it sound more like an engine rumble
		const filter = this.ac.createBiquadFilter();
		filter.type = "lowpass";
		filter.frequency.value = 300; // Cut off high frequencies

		this.engineOscillator.connect(filter);
		filter.connect(this.engineGain);
		this.engineGain.connect(this.ac.destination);

		this.engineOscillator.start();
	}

	muteEngine() {
		if (!this.ac || !this.engineGain) return;
		this.engineGain.gain.setTargetAtTime(0, this.ac.currentTime, 0.1);
	}

	setEngineSpeed(speedRatio: number) {
		// 0.0 to 1.0 (or higher)
		if (
			!this.ac ||
			!this.engineOscillator ||
			!this.engineGain ||
			this.ac.state !== "running"
		)
			return;

		// Base frequency 40Hz (idle), up to 120Hz (max speed)
		const minFreq = 40;
		const maxFreq = 120;
		const freq = minFreq + Math.abs(speedRatio) * (maxFreq - minFreq);

		this.engineOscillator.frequency.setTargetAtTime(
			freq,
			this.ac.currentTime,
			0.1,
		);

		// Volume
		const minVol = 0.02;
		const maxVol = 0.1;
		const vol = minVol + Math.abs(speedRatio) * (maxVol - minVol);
		this.engineGain.gain.setTargetAtTime(vol, this.ac.currentTime, 0.1);
	}

	playCrashSound() {
		if (!this.ac || this.ac.state !== "running") return;

		const osc = this.ac.createOscillator();
		osc.type = "square";

		const filter = this.ac.createBiquadFilter();
		filter.type = "lowpass";
		filter.frequency.value = 800; // Muffled explosion

		const gain = this.ac.createGain();
		gain.gain.setValueAtTime(0.2, this.ac.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, this.ac.currentTime + 0.5);

		osc.frequency.setValueAtTime(100, this.ac.currentTime);
		osc.frequency.exponentialRampToValueAtTime(10, this.ac.currentTime + 0.5);

		osc.connect(filter);
		filter.connect(gain);
		gain.connect(this.ac.destination);

		osc.start();
		osc.stop(this.ac.currentTime + 0.5);
	}

	playWinSound() {
		if (!this.ac || this.ac.state !== "running") return;

		const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
		let startTime = this.ac.currentTime;

		notes.forEach((freq, index) => {
			const osc = this.ac.createOscillator();
			osc.type = "triangle";

			const gain = this.ac.createGain();
			gain.gain.setValueAtTime(0, startTime);
			gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
			gain.gain.linearRampToValueAtTime(0, startTime + 0.3);

			osc.frequency.value = freq;

			osc.connect(gain);
			gain.connect(this.ac.destination);

			osc.start(startTime);
			osc.stop(startTime + 0.3);

			startTime += 0.15; // Arpeggio
		});
	}

	playCountdownBlip(highPitch: boolean = false) {
		if (!this.ac || this.ac.state !== "running") return;

		const osc = this.ac.createOscillator();
		osc.type = "sine";

		const gain = this.ac.createGain();
		gain.gain.setValueAtTime(0.1, this.ac.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, this.ac.currentTime + 0.3);

		osc.frequency.value = highPitch ? 880 : 440;

		osc.connect(gain);
		gain.connect(this.ac.destination);

		osc.start();
		osc.stop(this.ac.currentTime + 0.3);
	}
}

export const soundManager = new SoundManager();
