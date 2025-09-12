import { type IGpu } from "./interface";
import { Wrapper } from "./wrapper";

document.addEventListener("DOMContentLoaded", () => {
	const main = document.getElementById("main");
	if (main == null) {
		throw Error("Unable to mount application to #main");
	}

	const WIDTH = 1024;
	const HEIGHT = 768;
	const canvas = document.createElement("canvas");
	canvas.width = WIDTH;
	canvas.height = HEIGHT;
	main.append(canvas);

	if ("gpu" in navigator) {
		initWebGpu(canvas, navigator.gpu as IGpu);
	} else {
		const context = canvas.getContext("2d");
		if (context == null) {
			throw Error("Unable to get 2d canvas context");
		}
		// Write text about half way down canvas and a quarter of the way in
		context.font = "24px serif";
		context.fillText("WebGPU is not supported", WIDTH >> 2, HEIGHT >> 1);
	}
});

async function initWebGpu(canvas: HTMLCanvasElement, gpu: IGpu) {
	const wrapper = await Wrapper.create(canvas, gpu);

	// Track keys as they are pressed and released
	// TODO is there a way to get the "raw" keyboard key pressed?
	// Pressing "w", is different to pressing "w" with shift held ("W")
	const keyTracker = new Set<string>();
	document.addEventListener("keydown", (event) => {
		keyTracker.add(event.key);
	});
	document.addEventListener("keyup", (event) => {
		keyTracker.delete(event.key);
	});

	let ambient = 8;
	// Colour presets
	const presetKeys = new Set([
		"-", "=", "_", "+", "[", "{", "]", "}", "'", "@", "#", "~", "/", "*"
	]);
	// Ambient brightness range from 1-10
	const brightnessKeys = new Set<string>([
		"1", "2", "3", "4", "5", "6", "7", "8", "9", "0"
	]);
	// Crudely change ambient colour with different background on key press
	document.addEventListener("keypress", (event) => {
		if (brightnessKeys.has(event.key)) {
			ambient = Number.parseInt(event.key);
			const newAmbient = ambient / 10.0;
			wrapper.setAmbientColour(newAmbient, newAmbient, newAmbient);
		}
		if (presetKeys.has(event.key)) {
			const code = event.key.charCodeAt(0);
			wrapper.setAmbientColour(
				(code % 83) / 83.0,
				(code % 19) / 19.0,
				(code % 43) / 43.0
			);
		}
	});

	// Track camera move velocity
	const MOVE_SCALE = 0.025;
	let moveX = 0;
	let moveY = 0;

	// Establish render loop
	// Frame rate and sumulation time are currently tied
	// Create sim cap/duration/delta and update simulation at different rate if needed
	const FRAME_CAP = 60;
	const FRAME_DURATION = 1000 / FRAME_CAP;

	let lastFrameTime = 0;
	function frame() {
		// Halt until next frame
		requestAnimationFrame((frameTime) => {
			const deltaTime = frameTime - lastFrameTime;

			// A "frame" has passed, update simulation
			if (deltaTime >= FRAME_DURATION) {

				// Handle input
				moveY = keyTracker.has("w")
					? MOVE_SCALE
					: keyTracker.has("s")
						? -MOVE_SCALE
						: 0;
				moveX = keyTracker.has("a")
					? MOVE_SCALE
					: keyTracker.has("d")
						? -MOVE_SCALE
						: 0;
				// Update sim
				wrapper.nudgeCamera(moveX, moveY);

				lastFrameTime = frameTime - (deltaTime % FRAME_DURATION);
				// Draw results
				wrapper.render();
			}

			// Draw at device refresh rate
			// wrapper.render();

			frame();
		});
	}
	frame();

	// Debug 1 frame draw
	// wrapper.render();

}
