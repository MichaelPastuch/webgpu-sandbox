import { DEG_TO_RAD, HALF_PI, TWO_PI } from "./constants";
import { Graphics } from "./graphics/wrapper";
import { type IGpu } from "./interface";
import { Time, TimeManager } from "./time";
import { add, clamp, mul, normalize, RollingAverage, wrap, type TVec3 } from "./utils";

const main = document.getElementById("main");
if (main == null) {
	throw Error("Unable to mount application to #main");
}

const WIDTH = 1024;
const HEIGHT = 768;

document.addEventListener("DOMContentLoaded", () => {

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

function widgetBox() {
	const container = document.createElement("div");
	container.style.display = "flex";
	container.style.gap = "0.5rem";
	main?.append(container);
	return container;
}

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
	return container;
}

function monitor<T>(label: string): (update: T) => void {
	const container = document.createElement("div");
	const lbl = document.createElement("pre");
	lbl.innerText = label;
	container.append(lbl);
	const value = document.createElement("pre");
	container.append(value);
	main?.append(container);
	let lastValue: T | null = null;
	return function (newValue) {
		if (newValue !== lastValue) {
			lastValue = newValue;
			value.innerText = String(newValue);
		}
	}
}

// TODO Support "halting" render & sim with "Escape" key
async function initWebGpu(canvas: HTMLCanvasElement, gpu: IGpu) {
	const wrapper = await Graphics.create(canvas, gpu);

	// Track keys as they are pressed and released
	// TODO is there a way to get the "raw" keyboard key pressed?
	// TODO Dont miss keys or clicks between engine "ticks", clear sets after handling?
	// Pressing "w", is different to pressing "w" with shift held ("W")
	const keyTracker = new Set<string>();
	function keyDown(event: KeyboardEvent) {
		keyTracker.add(event.key);
	}
	function keyUp(event: KeyboardEvent) {
		keyTracker.delete(event.key);
	}

	// Track mouse key usage
	const LEFT_CLICK = 0;
	const RIGHT_CLICK = 2;
	const buttonTracker = new Set<number>();
	function mouseDown(event: MouseEvent) {
		buttonTracker.add(event.button);
	}
	function mouseUp(event: MouseEvent) {
		buttonTracker.delete(event.button);
	}

	// Track mouse movement when locked
	let movementX = 0;
	let movementY = 0;
	function trackMovement(event: MouseEvent) {
		movementX += event.movementX;
		movementY += event.movementY;
	}
	document.addEventListener("pointerlockchange", function () {
		if (document.pointerLockElement === canvas) {
			document.addEventListener("keydown", keyDown, false);
			document.addEventListener("keyup", keyUp, false);
			document.addEventListener("mousemove", trackMovement, false);
			document.addEventListener("mousedown", mouseDown, false);
			document.addEventListener("mouseup", mouseUp, false);
		} else {
			document.removeEventListener("keydown", keyDown, false);
			document.removeEventListener("keyup", keyUp, false);
			document.removeEventListener("mousemove", trackMovement, false);
			document.removeEventListener("mousedown", mouseDown, false);
			document.removeEventListener("mouseup", mouseUp, false);
			// "Unset" all mouse/keyboard tracking
			keyTracker.clear();
			buttonTracker.clear();
		}
	}, false);

	// Get pointer lock for orbital camera
	canvas.addEventListener("click", async function () {
		if (document.pointerLockElement == null) {
			await canvas.requestPointerLock({
				unadjustedMovement: true,
			});
		}
	});

	// Capture fullscreen toggling
	document.addEventListener("fullscreenchange", function () {
		if (document.fullscreenElement != null) {
			const { width, height } = window.screen;
			wrapper.resize(width, height);
		} else {
			wrapper.resize(WIDTH, HEIGHT);
		}
	});

	const engineAvg = new RollingAverage(50);
	const engineTimeLog = monitor("Engine Interval");
	const leftClickLog = monitor("Left click");
	const rightClickLog = monitor("Right Click");

	const camBox = widgetBox();

	camBox.append(widget({
		label: "Y Field of View",
		initialValue: 45, min: 1, max: 180,
		onChange: (newFov) => wrapper.camera.updateFov(newFov * DEG_TO_RAD)
	}));

	let brightness = 50;
	let redMul = 100;
	let greenMul = 100;
	let blueMul = 100;
	// 1 / 100 * 100
	const scalar = 0.0001;
	function updateAmbient() {
		wrapper.setAmbientColor(
			redMul * brightness * scalar,
			greenMul * brightness * scalar,
			blueMul * brightness * scalar
		);
	}
	updateAmbient();

	camBox.append(widget({
		label: "Ambient",
		initialValue: brightness, min: 0, max: 100,
		onChange: (newValue) => {
			brightness = newValue;
			updateAmbient();
		}
	}));
	camBox.append(widget({
		label: "Red %",
		initialValue: redMul, min: 0, max: 100,
		onChange: (newValue) => {
			redMul = newValue;
			updateAmbient();
		}
	}));
	camBox.append(widget({
		label: "Green %",
		initialValue: greenMul, min: 0, max: 100,
		onChange: (newValue) => {
			greenMul = newValue;
			updateAmbient();
		}
	}));
	camBox.append(widget({
		label: "Blue %",
		initialValue: blueMul, min: 0, max: 100,
		onChange: (newValue) => {
			blueMul = newValue;
			updateAmbient();
		}
	}));

	// Track orbit camera angles
	// TODO Consider tracking pitch/yaw as integers, and convert to radians before render

	// Position camera focus
	let position: TVec3 = [0, 0, 0];
	let pitch = HALF_PI * 0.9;
	let yaw = -HALF_PI * 0.9;
	const distance = 5;

	// Track camera velocity
	const MOVE_VELOCITY = 3;
	const ORBIT_VELOCITY = Math.PI * 0.1;
	let vPitch = 0;
	let vYaw = 0;
	let velocity: TVec3 = [0, 0, 0];

	// Animate light
	wrapper.light
		.position(-1, 1, 2)
		.color(0.9, 0.9, 0.8)
		.writeBuffer();

	// Have light orbit around scene
	const lightOriginX = 0;
	const lightOriginY = 1;
	const lightOriginZ = 3;
	let lightVelocity = 2
	let lightAngle = 0;
	const lightDistance = 2;

	let lightR = 90;
	let lightG = 90;
	let lightB = 80;
	const lightScalar = 0.01;
	function updateLight() {
		wrapper.light.color(
			lightR * lightScalar,
			lightG * lightScalar,
			lightB * lightScalar
		);
	}
	updateAmbient();

	const lightBox = widgetBox();

	lightBox.append(widget({
		label: "Light velocity",
		initialValue: 2, min: 0, max: 10,
		onChange: (newVelocity) => lightVelocity = newVelocity
	}));
	lightBox.append(widget({
		label: "Light Red",
		initialValue: lightR, min: 0, max: 100,
		onChange: (red) => {
			lightR = red;
			updateLight();
		}
	}));
	lightBox.append(widget({
		label: "Light Green",
		initialValue: lightG, min: 0, max: 100,
		onChange: (green) => {
			lightG = green;
			updateLight();
		}
	}));
	lightBox.append(widget({
		label: "Light Blue",
		initialValue: lightB, min: 0, max: 100,
		onChange: (blue) => {
			lightB = blue;
			updateLight();
		}
	}));

	const wrapRadians = wrap(0, TWO_PI);
	const clampRadians = clamp(Number.EPSILON, Math.PI - Number.EPSILON);

	// Establish render loop
	// Simulation and frame rate must be less than or equal to device refresh rate
	const SIM_RATE = 50;
	const SIM_DURATION = 1000 / SIM_RATE;
	let lastSimTime = 0;

	// Target frame rate
	const FRAME_RATE = 100;
	const FRAME_DURATION = 1000 / FRAME_RATE;
	let lastFrameTime = 0;

	const LOG_RATE = 1;
	const LOG_DURATION = 1000 / LOG_RATE;
	let lastLogTime = 0;

	function frame(time: number) {

		const simDeltaTime = time - lastSimTime;
		// A "tick" has passed, update simulation
		if (simDeltaTime >= SIM_DURATION) {
			lastSimTime = time - (simDeltaTime % SIM_DURATION);

			TimeManager.engineUpdate = time;
			engineAvg.update(TimeManager.engineDelta);

			leftClickLog(buttonTracker.has(LEFT_CLICK));
			rightClickLog(buttonTracker.has(RIGHT_CLICK));

			// TODO Sync now? Or "roll" change during render only
			// Apply velocity from previous "tick"
			position = add(position, mul(velocity, Time.engineScale));
			yaw = wrapRadians(yaw, vYaw * Time.engineScale);
			pitch = clampRadians(pitch, vPitch * Time.engineScale);

			// Record total mouse movement and reset
			vYaw = -movementX * ORBIT_VELOCITY;
			movementX = 0;
			vPitch = movementY * ORBIT_VELOCITY;
			movementY = 0;

			// Handle input
			let tForward = 0;
			let tRight = 0;
			let tUp = 0;
			if (keyTracker.has("w")) {
				tForward += 1;
			}
			if (keyTracker.has("s")) {
				tForward -= 1;
			}
			if (keyTracker.has("d")) {
				tRight += 1;
			}
			if (keyTracker.has("a")) {
				tRight -= 1;
			}
			if (keyTracker.has(" ")) {
				tUp += 1;
			}
			if (keyTracker.has("Control")) {
				tUp -= 1;
			}

			// Assemble velocity from user input directions
			if (tForward !== 0 || tRight !== 0 || tUp !== 0) {
				const fwd = wrapper.camera.forward;
				const rgt = wrapper.camera.right;
				const direction = normalize([
					fwd[0] * tForward + rgt[0] * tRight,
					tUp,
					fwd[2] * tForward + rgt[2] * tRight
				]);
				velocity = mul(direction, MOVE_VELOCITY);
			} else {
				velocity = [0, 0, 0];
			}

			// Advance physics
			lightAngle = wrapRadians(lightAngle, lightVelocity * Time.engineScale);

			// Enter fullscreen
			if (keyTracker.has("Enter")) {
				canvas.requestFullscreen();
				keyTracker.delete("Enter");
			}
		}

		const frameTimestamp = performance.now();
		const frameDeltaTime = frameTimestamp - lastFrameTime;
		// A "frame" has passed, draw simulation state
		if (frameDeltaTime >= FRAME_DURATION) {
			lastFrameTime = frameTimestamp - (frameDeltaTime % FRAME_DURATION);

			TimeManager.frameUpdate = frameTimestamp;

			// Assume camera changes on every frame
			// Extrapolate camera movement
			const fFocus = add(position, mul(velocity, Time.frameScale));
			const fYaw = wrapRadians(yaw, vYaw * Time.frameScale);
			const fPitch = clampRadians(pitch, vPitch * Time.frameScale);

			// Use new positions for frame
			wrapper.camera.updateViewOrbital(fFocus, distance, fPitch, fYaw);
			wrapper.camera.writeBuffer();

			// Orbit light
			const fLightAngle = wrapRadians(lightAngle, lightVelocity * Time.frameScale);
			const fLightX = lightOriginX + lightDistance * Math.cos(fLightAngle);
			const fLightZ = lightOriginZ + lightDistance * Math.sin(fLightAngle);
			wrapper.light.position(fLightX, lightOriginY, fLightZ)
				.writeBuffer();

			// Draw results
			wrapper.render();
		}

		const logTImestamp = performance.now()
		const logDeltaTime = logTImestamp - lastLogTime;
		if (logDeltaTime >= LOG_DURATION) {
			lastLogTime = logTImestamp - (logDeltaTime % LOG_DURATION);
			// Update frame delta time average
			engineTimeLog(engineAvg.average);
		}

		// Await next browser frame
		requestAnimationFrame(frame);
	}

	// Start sim/render loop
	TimeManager.engineUpdate = performance.now();
	requestAnimationFrame(frame);

	// Debug 1 frame draw
	// wrapper.render();
}
