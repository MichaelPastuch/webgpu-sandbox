import { Input } from "../engine/input";
import { Time } from "../time";
import { clamp, wrapRadians } from "../utils";
import { Vector3 } from "../vector/vector3";
import type { Camera } from "./camera";

export class UserCamera {

	private static readonly clampPitch = clamp(Number.EPSILON, Math.PI - Number.EPSILON);

	private static readonly MOVE_VELOCITY = 3;
	private static readonly ORBIT_VELOCITY = Math.PI * 0.1;

	private readonly focus = Vector3.unmapped();
	private readonly frameFocus = Vector3.unmapped();

	// Track velocity
	private readonly velocity = Vector3.unmapped();
	private readonly direction = Vector3.unmapped();
	private pitchVelocity = 0;
	private yawVelocity = 0;

	constructor(
		private readonly camera: Camera,
		focusX: number, focusY: number, focusZ: number,
		private pitch: number, private yaw: number, private distance: number
	) {
		this.focus.set(focusX, focusY, focusZ);
	}

	/** Update on each engine tick */
	update() {
		this.focus.addScaled(this.velocity, Time.engineScale);
		this.pitch = UserCamera.clampPitch(this.pitch, this.pitchVelocity * Time.engineScale);
		this.yaw = wrapRadians(this.yaw, this.yawVelocity * Time.engineScale);

		// Mouse pitch/yaw control
		this.pitchVelocity = Input.readY * UserCamera.ORBIT_VELOCITY;
		this.yawVelocity = Input.readX * -UserCamera.ORBIT_VELOCITY;

		// TODO Move to UserInput class - Snapshot mapped keys as joysticks/buttons on a controller
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

		this.velocity.set(0, 0, 0);
		if (tForward | tRight | tUp) {
			// Restrict "forward" movement to x/z plane
			const dir = this.camera.direction;
			const mag = Math.sqrt(dir[0] * dir[0] + dir[2] * dir[2]);
			// Right already has a zero y component
			const rgt = this.camera.right;
			this.direction.set(
				dir[0] / mag * tForward + rgt[0] * tRight,
				tUp,
				dir[2] / mag * tForward + rgt[2] * tRight
			);
			this.direction.normalize();
			this.velocity.addScaled(this.direction, UserCamera.MOVE_VELOCITY);
		}
	}

	/** Extrapolate per frame tick */
	writeFrame() {
		const focus = this.focus._;
		this.frameFocus.set(focus[0], focus[1], focus[2]);
		this.frameFocus.addScaled(this.velocity, Time.frameScale);

		const framePitch = UserCamera.clampPitch(this.pitch, this.pitchVelocity * Time.frameScale);
		const frameYaw = wrapRadians(this.yaw, this.yawVelocity * Time.frameScale);

		// Use new positions for frame
		this.camera.updateViewOrbital(this.frameFocus, this.distance, framePitch, frameYaw);
		this.camera.writeBuffer();
	}
}