
type TVec3 = [number, number, number];

export class Vector3 {

	/** 3 components and one extra packing entry */
	static readonly length = 4;
	/** Length of the Vector3 (in bytes) */
	static readonly byteLength = this.length * Float32Array.BYTES_PER_ELEMENT;

	/** Construct a Vector3 that is not mapped to an underlying ArrayBuffer */
	static unmapped() {
		return new Vector3(new ArrayBuffer(Vector3.byteLength), 0);
	}

	readonly #data: TVec3;

	constructor(buffer: ArrayBuffer, byteOffset: number) {
		// Guarantee #data contains 16 Float32
		this.#data = new Float32Array(buffer, byteOffset, Vector3.length) as unknown as TVec3;
	}

	/** Access raw data - **NOTE** - typed as a TVec3 but returns Float32Array of length 4 */
	get _() {
		return this.#data;
	}

	get magnitude() {
		const d = this.#data;
		return Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
	}

	dot(vec: Vector3) {
		return this.#data[0] * vec.#data[0]
			+ this.#data[1] * vec.#data[1]
			+ this.#data[2] * vec.#data[2];
	}

	// Mutate Vector3

	set(x: number, y: number, z: number) {
		this.#data[0] = x;
		this.#data[1] = y;
		this.#data[2] = z;
	}

	normalize() {
		const mag = this.magnitude;
		this.#data[0] /= mag;
		this.#data[1] /= mag;
		this.#data[2] /= mag;
	}

	add(vec: Vector3) {
		this.#data[0] += vec.#data[0];
		this.#data[1] += vec.#data[1];
		this.#data[2] += vec.#data[2];
	}

	sub(vec: Vector3) {
		this.#data[0] -= vec.#data[0];
		this.#data[1] -= vec.#data[1];
		this.#data[2] -= vec.#data[2];
	}

	/** Scale given vector and add */
	addScaled(vec: Vector3, scalar: number) {
		this.#data[0] += scalar * vec.#data[0];
		this.#data[1] += scalar * vec.#data[1];
		this.#data[2] += scalar * vec.#data[2];
	}

	/** Set from cross product of two given vectors */
	cross(lhs: Vector3, rhs: Vector3) {
		// Xyzzy
		this.#data[0] = lhs.#data[1] * rhs.#data[2] - lhs.#data[2] * rhs.#data[1];
		this.#data[1] = lhs.#data[2] * rhs.#data[0] - lhs.#data[0] * rhs.#data[2];
		this.#data[2] = lhs.#data[0] * rhs.#data[1] - lhs.#data[1] * rhs.#data[0];
	}

}
