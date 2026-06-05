import { Time } from "../time";
import { wrapRadians } from "../utils";
import { Light } from "./light";

export class OrbitLight {

	constructor(
		private readonly light: Light,
		private originX: number,
		private originY: number,
		private originZ: number,
		private velocity: number,
		private distance: number,
		private angle: number
	) { }

	public updateVelocity(newValue: number) {
		this.velocity = newValue;
	}

	public updateDistance(newValue: number) {
		this.distance = newValue;
	}

	/** Update on each engine tick */
	update() {
		this.angle = wrapRadians(this.angle, this.velocity * Time.engineScale)
	}

	/** Extrapolate per frame tick */
	writeFrame() {
		const angle = wrapRadians(this.angle, this.velocity * Time.frameScale);
		this.light.position(
			this.originX + this.distance * Math.cos(angle),
			this.originY,
			this.originZ + this.distance * Math.sin(angle)
		).writeBuffer();
	}
}
