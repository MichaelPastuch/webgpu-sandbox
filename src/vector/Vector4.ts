
type TVec4 = [number, number, number, number];

export class Vector4 {

	static readonly length = 4;
	/** Length of the Vector4 (in bytes) */
	static readonly byteLength = this.length * Float32Array.BYTES_PER_ELEMENT;

	/** Construct a Vector4 that is not mapped to an underlying ArrayBuffer */
	static unmapped() {
		return new Vector4(new ArrayBuffer(Vector4.byteLength), 0);
	}

	readonly #data: TVec4;

	constructor(buffer: ArrayBuffer, byteOffset: number) {
		// Guarantee #data contains 16 Float32
		this.#data = new Float32Array(buffer, byteOffset, Vector4.length) as unknown as TVec4;
	}

	/** Access raw data */
	get _() {
		return this.#data;
	}

	get magnitude() {
		const d = this.#data;
		return Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2] + d[3] * d[3]);
	}

	dot(vec: Vector4) {
		return this.#data[0] * vec.#data[0]
			+ this.#data[1] * vec.#data[1]
			+ this.#data[2] * vec.#data[2]
			+ this.#data[3] * vec.#data[3];
	}

	set(x: number, y: number, z: number, w: number) {
		this.#data[0] = x;
		this.#data[1] = y;
		this.#data[2] = z;
		this.#data[3] = w;
	}
}
