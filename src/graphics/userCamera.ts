import { Input, Keybind } from "../engine/input";
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

	// Track user move direction
	private readonly input = Vector3.unmapped();

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

		// Mouse pitch/yaw
		this.pitchVelocity = Input.readY * UserCamera.ORBIT_VELOCITY;
		this.yawVelocity = Input.readX * -UserCamera.ORBIT_VELOCITY;

		// Keyboard velocity
		this.input.set(
			Input.key(Keybind.UP) - Input.key(Keybind.DOWN),
			// y-axis should not normally require direct user input
			Input.key(Keybind.FACE_DOWN) - Input.key(Keybind.FACE_RIGHT),
			Input.key(Keybind.RIGHT) - Input.key(Keybind.LEFT)
		);

		this.velocity.set(0, 0, 0);
		if (!this.input.isZero) {
			this.input.normalize();
			const user = this.input._;
			// Restrict "forward" movement to x/z plane
			const dir = this.camera.direction;
			const dirMag = Math.sqrt(dir[0] * dir[0] + dir[2] * dir[2]);
			// Assume right already has a zero y component
			const rgt = this.camera.right;
			this.direction.set(
				dir[0] / dirMag * user[0] + rgt[0] * user[2],
				user[1],
				dir[2] / dirMag * user[0] + rgt[2] * user[2]
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
		// Use new positions for frame
		this.camera.updateViewOrbital(
			this.frameFocus, this.distance,
			UserCamera.clampPitch(this.pitch, this.pitchVelocity * Time.frameScale),
			wrapRadians(this.yaw, this.yawVelocity * Time.frameScale));
		this.camera.writeBuffer();
	}
}
