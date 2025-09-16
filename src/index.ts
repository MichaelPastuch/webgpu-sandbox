import { DEG_TO_RAD, HALF_PI } from "./constants";
import { type IGpu } from "./interface";
import { clampRadians, wrapRadians } from "./utils";
import { Wrapper } from "./wrapper";

const main = document.getElementById("main");
if (main == null) {
	throw Error("Unable to mount application to #main");
}

document.addEventListener("DOMContentLoaded", () => {

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

interface IWidgetConfig {
	readonly label: string;
	readonly initialValue: number;
	readonly type?: "number" | "range";
	readonly min?: number;
	readonly max?: number;
	onChange(value: number): void;
}
function widget({
	label, initialValue,
	type = "range", min, max,
	onChange
}: IWidgetConfig) {
	const container = document.createElement("div");
	const lbl = document.createElement("pre");
	lbl.innerText = label;
	container.append(lbl);
	const input = document.createElement("input");
	input.type = type;
	input.value = String(initialValue);
	if (min != null) {
		input.min = String(min);
	}
	if (max != null) {
		input.max = String(max);
	}
	input.addEventListener("input", function () {
		const num = Number.parseInt(this.value);
		if (Number.isFinite(num)) {
			onChange(num);
		}
	});
	container.append(input);
	main?.append(container);
}

// TODO Support "halting" render & sim with "Escape" key
async function initWebGpu(canvas: HTMLCanvasElement, gpu: IGpu) {
	const wrapper = await Wrapper.create(canvas, gpu);

	// Track keys as they are pressed and released
	// TODO is there a way to get the "raw" keyboard key pressed?
	// Pressing "w", is different to pressing "w" with shift held ("W")
	const keyTracker = new Set<string>();
	document.addEventListener("keydown", function (event) {
		keyTracker.add(event.key);
	});
	document.addEventListener("keyup", function (event) {
		keyTracker.delete(event.key);
	});

	let movementX = 0;
	let movementY = 0;
	canvas.addEventListener("mousemove", function (event) {
		movementX += event.movementX;
		movementY += event.movementY;
	});
	const clickTracker = new Set<number>();
	const LEFT_CLICK = 0;
	// const RIGHT_CLICK = 2;
	canvas.addEventListener("mousedown", function (event) {
		clickTracker.add(event.button);
	});
	canvas.addEventListener("mouseup", function (event) {
		clickTracker.delete(event.button);
	});
	canvas.addEventListener("mouseleave", function () {
		clickTracker.clear();
	});

	widget({
		label: "Y Field of View",
		initialValue: 45, min: 1, max: 180,
		onChange: (newFov) => wrapper.updateFov(newFov * DEG_TO_RAD)
	});

	let brightness = 80;
	let redMul = 100;
	let greenMul = 100;
	let blueMul = 100;
	// 1 / 100 * 100
	const scalar = 0.0001;
	function updateAmbient() {
		wrapper.setAmbientColour(
			redMul * brightness * scalar,
			greenMul * brightness * scalar,
			blueMul * brightness * scalar
		);
	}

	widget({
		label: "Brightness %",
		initialValue: brightness, min: 0, max: 200,
		onChange: (newValue) => {
			brightness = newValue;
			updateAmbient();
		}
	});
	widget({
		label: "Red %",
		initialValue: redMul, min: 0, max: 200,
		onChange: (newValue) => {
			redMul = newValue;
			updateAmbient();
		}
	});
	widget({
		label: "Green %",
		initialValue: greenMul, min: 0, max: 200,
		onChange: (newValue) => {
			greenMul = newValue;
			updateAmbient();
		}
	});
	widget({
		label: "Blue %",
		initialValue: blueMul, min: 0, max: 200,
		onChange: (newValue) => {
			blueMul = newValue;
			updateAmbient();
		}
	});

	// Track orbit camera angles
	const ORBIT_SCALE = Math.PI * 0.001;
	let pitch = HALF_PI - 50 * ORBIT_SCALE;
	let yaw = -HALF_PI + 50 * ORBIT_SCALE;
	const zoom = 5;

	// Position camera focus
	const MOVE_SCALE = 0.025;
	let xPos = 0;
	let yPos = 0;
	let zPos = 2;

	// Establish render loop
	// Simulation and frame rate must be less than or equal to device refresh rate
	const SIM_RATE = 60;
	const SIM_DURATION = 1000 / SIM_RATE;
	let lastSimTime = 0;

	const FRAME_RATE = 60;
	const FRAME_DURATION = 1000 / FRAME_RATE;
	let lastFrameTime = 0;

	function frame() {

		requestAnimationFrame(function (timestamp) {

			const simDeltaTime = timestamp - lastSimTime;
			// A "tick" has passed, update simulation
			if (simDeltaTime >= SIM_DURATION) {
				lastSimTime = timestamp - (simDeltaTime % SIM_DURATION);

				// Record total mouse movement and reset
				if (clickTracker.has(LEFT_CLICK)) {
					yaw = wrapRadians(yaw, movementX * ORBIT_SCALE);
					pitch = clampRadians(pitch, movementY * ORBIT_SCALE);
				}
				// Reset tracked mouse movement
				movementX = 0;
				movementY = 0;

				// Handle input
				if (keyTracker.has("w")) {
					zPos += MOVE_SCALE;
				}
				if (keyTracker.has("s")) {
					zPos -= MOVE_SCALE;
				}
				if (keyTracker.has("d")) {
					xPos += MOVE_SCALE;
				}
				if (keyTracker.has("a")) {
					xPos -= MOVE_SCALE;
				}
				if (keyTracker.has("[")) {
					yPos += MOVE_SCALE;
				}
				if (keyTracker.has("]")) {
					yPos -= MOVE_SCALE;
				}
				wrapper.orbitCamera([xPos, yPos, zPos], zoom, pitch, yaw);
			}

			const frameDeltaTime = timestamp - lastFrameTime;
			// A "frame" has passed, draw simulation state
			if (frameDeltaTime >= FRAME_DURATION) {
				lastFrameTime = timestamp - (frameDeltaTime % FRAME_DURATION);
				// Draw results
				wrapper.render();
			}

			// Await next browser frame
			frame();
		});
	}
	frame();

	// Debug 1 frame draw
	// wrapper.render();

}
