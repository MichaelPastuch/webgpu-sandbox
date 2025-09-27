import type { IGpu } from "../interface";
import { Graphics } from "../graphics/wrapper";
import { Input } from "./input";
import { DEG_TO_RAD, HALF_PI, TWO_PI } from "../constants";
import { add, clamp, mul, normalize, RollingAverage, wrap, type TVec3 } from "../utils";
import { Time, TimeManager } from "../time";
import { monitor, widget, widgetBox } from "./debug";

export class Engine {

	public static async create(canvas: HTMLCanvasElement, gpu: IGpu) {
		return new Engine(canvas, await Graphics.create(canvas, gpu));
	}

	// Record average engine time delta
	private readonly engineDeltaAvg = new RollingAverage(50);

	private constructor(
		private readonly canvas: HTMLCanvasElement,
		private readonly graphics: Graphics
	) {
		// Track mouse/keyboard on focus
		document.addEventListener("pointerlockchange", function () {
			if (document.pointerLockElement === canvas) {
				Input.enable();
			} else {
				Input.disable()
			}
		}, false);

		// Canvas pointer lock request
		canvas.addEventListener("click", async function () {
			if (document.pointerLockElement == null) {
				await canvas.requestPointerLock({
					unadjustedMovement: true
				});
			}
		});

		const initialWidth = canvas.width;
		const initialHeight = canvas.height;
		// Handle fullscreen toggle
		document.addEventListener("fullscreenchange", function () {
			if (document.fullscreenElement != null) {
				const { width, height } = window.screen;
				graphics.resize(width, height);
			} else {
				graphics.resize(initialWidth, initialHeight);
			}
		});

		// Initialise graphics

		this.graphics.setAmbientColor(0.5, 0.5, 0.5);

		// TODO Move into light class and control animation
		// Animate light
		this.graphics.light
			.position(-1, 1, 2)
			.color(0.9, 0.9, 0.8)
			.writeBuffer();
	}

	// TODO Support "halting" render & sim via key press or page event
	public run() {
		// TODO Move into light class and control animation
		// Orbit light around scene
		const lightOriginX = 0;
		const lightOriginY = 1;
		const lightOriginZ = 3;
		let lightVelocity = 2
		let lightAngle = 0;
		const lightDistance = 2;

		// TODO Move into player controlled camera class
		// Track camera focus
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

		const frame = (time: number) => {

			const simDeltaTime = time - lastSimTime;
			// A "tick" has passed, update simulation
			if (simDeltaTime >= SIM_DURATION) {
				lastSimTime = time - (simDeltaTime % SIM_DURATION);

				TimeManager.engineUpdate = time;
				this.engineDeltaAvg.update(TimeManager.engineDelta);

				// const btns = Input.buttons;

				// TODO Sync now? Or "roll" change during render only
				// Apply velocity from previous "tick"
				position = add(position, mul(velocity, Time.engineScale));
				yaw = wrapRadians(yaw, vYaw * Time.engineScale);
				pitch = clampRadians(pitch, vPitch * Time.engineScale);

				// Mouse pitch/yaw control
				vYaw = Input.readX * -ORBIT_VELOCITY;
				vPitch = Input.readY * ORBIT_VELOCITY;

				// Handle input
				let tForward = 0;
				let tRight = 0;
				let tUp = 0;
				const keys = Input.keys;
				if (keys.has("w")) {
					tForward += 1;
				}
				if (keys.has("s")) {
					tForward -= 1;
				}
				if (keys.has("d")) {
					tRight += 1;
				}
				if (keys.has("a")) {
					tRight -= 1;
				}
				if (keys.has(" ")) {
					tUp += 1;
				}
				if (keys.has("Control")) {
					tUp -= 1;
				}

				// Assemble velocity from user input directions
				if (tForward !== 0 || tRight !== 0 || tUp !== 0) {
					const fwd = this.graphics.camera.forward;
					const rgt = this.graphics.camera.right;
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
				if (keys.has("Enter") && document.fullscreenElement == null) {
					this.canvas.requestFullscreen();
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
				this.graphics.camera.updateViewOrbital(fFocus, distance, fPitch, fYaw);
				this.graphics.camera.writeBuffer();

				// Orbit light
				const fLightAngle = wrapRadians(lightAngle, lightVelocity * Time.frameScale);
				const fLightX = lightOriginX + lightDistance * Math.cos(fLightAngle);
				const fLightZ = lightOriginZ + lightDistance * Math.sin(fLightAngle);
				this.graphics.light.position(fLightX, lightOriginY, fLightZ)
					.writeBuffer();

				// Draw results
				this.graphics.render();
			}

			// Await next browser frame
			requestAnimationFrame(frame);
		}

		// Start sim/render loop
		TimeManager.engineUpdate = performance.now();
		requestAnimationFrame(frame);
	}

	/** 1 frame render, useful for debugging shaders */
	public render() {
		this.graphics.camera.updateViewOrbital([0, 0, 0], 5, HALF_PI, -HALF_PI);
		this.graphics.camera.writeBuffer();
		this.graphics.render();
	}

	public debugOverlay(container: HTMLElement) {
		const monitorBox = widgetBox();
		const [engineDelta, logEngineDelta] = monitor("Engine Delta Avg.");
		monitorBox.append(engineDelta);
		setInterval(() => {
			logEngineDelta(this.engineDeltaAvg.average);
		}, 1000);
		container.append(monitorBox);
	}

	public debugControls(mount: HTMLElement) {
		const camBox = widgetBox();

		// Enable FoV control
		camBox.append(widget({
			label: "Y Field of View",
			initialValue: 45, min: 1, max: 180,
			onChange: (newFov) => this.graphics.camera.updateFov(newFov * DEG_TO_RAD)
		}));

		// Enable ambient light control
		let brightness = 50;
		let redMul = 100;
		let greenMul = 100;
		let blueMul = 100;
		// 1 / 100 * 100
		const scalar = 0.0001;
		const updateAmbient = () => {
			this.graphics.setAmbientColor(
				redMul * brightness * scalar,
				greenMul * brightness * scalar,
				blueMul * brightness * scalar
			);
		}
		updateAmbient();
		camBox.append(widget({
			label: "Brightness",
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
		mount.append(camBox);

		// Enable light colour control
		const lightBox = widgetBox();

		let lightR = 90;
		let lightG = 90;
		let lightB = 80;
		const lightScalar = 0.01;
		const updateLight = () => {
			this.graphics.light.color(
				lightR * lightScalar,
				lightG * lightScalar,
				lightB * lightScalar
			);
		}
		updateLight();

		// TODO support updating light velocity
		// lightBox.append(widget({
		// 	label: "Light velocity",
		// 	initialValue: 2, min: 0, max: 10,
		// 	onChange: (newVelocity) => lightVelocity = newVelocity
		// }));
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

		mount.append(lightBox);
	}

}
