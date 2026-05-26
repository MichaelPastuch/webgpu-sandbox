import { DEG_TO_RAD, HALF_PI } from "../constants";
import { Graphics } from "../graphics/graphics";
import { UserCamera } from "../graphics/userCamera";
import type { IGpu } from "../interface";
import { OrbitLight } from "../lights/orbitLight";
import { Time, TimeManager } from "../time";
import { RollingAverage } from "../utils";
import { Vector3 } from "../vector/vector3";
import { widget, widgetBox } from "./debug";
import { Input, Keybind } from "./input";

export class Engine {

	public static async create(canvas: HTMLCanvasElement, gpu: IGpu) {
		return new Engine(canvas, await Graphics.create(canvas, gpu));
	}

	// Record average engine time delta
	private readonly engineDeltaAvg = new RollingAverage(50);
	public get averageDelta() {
		return this.engineDeltaAvg.average;
	}
	private readonly frameScaleAvg = new RollingAverage(50);
	public get averageFrameScale() {
		return this.frameScaleAvg.average;
	}

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
		this.graphics.light
			.position(-1, 1, 2)
			.color(0.9, 0.9, 0.8)
			.writeBuffer();
	}

	// TODO Support "halting" render & sim via key press or page event
	public run() {
		// Orbit light around scene
		const orbitLight = new OrbitLight(
			this.graphics.light,
			0, 1, 3,
			1, 2, 0
		);

		// Move camera with user input
		const userCamera = new UserCamera(
			this.graphics.camera,
			0, 0, 0,
			HALF_PI * 0.9, -HALF_PI * 0.9, 5
		);

		// Update sim
		const tick = () => {
			TimeManager.engineUpdate = performance.now();
			this.engineDeltaAvg.update(TimeManager.engineDelta);

			// Advance physics
			orbitLight.update();
			userCamera.update();

			// Enter fullscreen
			if (Input.key(Keybind.FULLSCREEN) && document.fullscreenElement == null) {
				this.canvas.requestFullscreen();
			}
		}

		// Render frame
		const frame = (time: number) => {
			TimeManager.frameUpdate = time;
			this.frameScaleAvg.update(Time.frameScale);

			// Extrapolate physics for frame
			orbitLight.writeFrame();
			userCamera.writeFrame();

			// Draw results
			this.graphics.render();

			// Await next browser frame
			requestAnimationFrame(frame);
		}

		// Start sim loop
		setInterval(tick, TimeManager.SIM_DURATION);
		TimeManager.engineUpdate = performance.now();
		// Start render loop
		requestAnimationFrame(frame);
	}

	/** 1 frame render, useful for debugging shaders */
	public render() {
		this.graphics.camera.updateViewOrbital(
			Vector3.unmapped(), 5, HALF_PI, -HALF_PI
		);
		this.graphics.camera.writeBuffer();
		this.graphics.render();
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
