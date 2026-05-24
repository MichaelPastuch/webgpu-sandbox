
type TQuat = [number, number, number, number];

export class Quaternion {

	static readonly length = 4;
	/** Length of the Quaternion (in bytes) */
	static readonly byteLength = this.length * Float32Array.BYTES_PER_ELEMENT;

	/** Construct a Quaternion that is not mapped to an underlying ArrayBuffer */
	static unmapped() {
		return new Quaternion(new ArrayBuffer(Quaternion.byteLength), 0);
	}

	readonly #data: TQuat;

	constructor(buffer: ArrayBuffer, byteOffset: number) {
		// Guarantee #data contains 16 Float32
		this.#data = new Float32Array(buffer, byteOffset, Quaternion.length) as unknown as TQuat;
	}

	/** Access raw data */
	get _() {
		return this.#data;
	}

	inverse(quat: Quaternion) {
		this.#data[0] = -quat.#data[0];
		this.#data[1] = -quat.#data[1];
		this.#data[2] = -quat.#data[2];
		this.#data[3] = -quat.#data[3];
	}

	fromRotation(pitch: number, yaw: number, roll: number = 0) {
		// Consider profiling: cos(x)^2 = 1 - sin(x)^2
		// Ideally the js optimiser uses the FSINCOS instruction here
		const halfPitch = pitch * 0.5;
		const halfRoll = roll * 0.5;
		const halfYaw = yaw * 0.5;
		const cU = Math.cos(halfPitch);
		const sU = Math.sin(halfPitch);
		const cV = Math.cos(halfYaw);
		const sV = Math.sin(halfYaw);
		const cW = Math.cos(halfRoll);
		const sW = Math.sin(halfRoll);
		this.#data[0] = cU * cV * cW + sU * sV * sW;
		this.#data[1] = sU * cV * cW - cU * sV * sW;
		this.#data[2] = cU * sV * cW + sU * cV * sW;
		this.#data[3] = cU * cV * sW - sU * sV * cW;
	}
}
