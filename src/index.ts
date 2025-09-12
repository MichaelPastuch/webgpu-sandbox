import { DEG_TO_RAD } from "./constants";
import { type IGpu } from "./interface";
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

function widget(label: string, innitialValue: string, onChange: (value: number) => void) {
	const container = document.createElement("div");
	const lbl = document.createElement("pre");
	lbl.innerText = label;
	container.append(lbl);
	const input = document.createElement("input");
	input.type = "number";
	input.value = innitialValue;
	input.addEventListener("input", function () {
		const num = Number.parseInt(this.value);
		if (Number.isFinite(num)) {
			onChange(num);
		}
	});
	container.append(input);
	main?.append(container);
}

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

	widget("Y Field of View", "30", (newValue) => {
		wrapper.updateFov(newValue * DEG_TO_RAD);
	});

	let brightness = 80;
	let redMul = 100;
	let greenMul = 100;
	let blueMul = 100;
	const scalar = 0.0001;
	function updateAmbient() {
		wrapper.setAmbientColour(
			redMul * brightness * scalar,
			greenMul * brightness * scalar,
			blueMul * brightness * scalar
		);
	}
	widget("Brightness %", String(brightness), (newValue) => {
		brightness = newValue;
		updateAmbient();
	});
	widget("Red %", String(redMul), (newValue) => {
		redMul = newValue;
		updateAmbient();
	});
	widget("Green %", String(greenMul), (newValue) => {
		greenMul = newValue;
		updateAmbient();
	});
	widget("Blue %", String(blueMul), (newValue) => {
		blueMul = newValue;
		updateAmbient();
	});

	// Track camera move velocity
	const MOVE_SCALE = 0.0125;
	let posX = 0;
	let posY = 0;
	let posZ = 1;

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
				if (keyTracker.has("a")) {
					posX -= MOVE_SCALE;
				}
				if (keyTracker.has("d")) {
					posX += MOVE_SCALE;
				}
				if (keyTracker.has("w")) {
					posY += MOVE_SCALE;
				}
				if (keyTracker.has("s")) {
					posY -= MOVE_SCALE;
				}
				if (keyTracker.has("[")) {
					posZ += MOVE_SCALE;
				}
				if (keyTracker.has("]")) {
					posZ -= MOVE_SCALE;
				}
				// Update sim
				wrapper.positionCamera(posX, posY, posZ);

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
