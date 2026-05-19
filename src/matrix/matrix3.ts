import { toMatrix, type TQuat } from "../utils";

// 3x3 matrices need columns packing with extra zeroes
type TMatrix3 = [
	number, number, number, number,
	number, number, number, number,
	number, number, number, number
];

export class Matrix3 {

	static readonly length = 12;
	/** Length of the Matrix4 (in bytes) */
	static readonly byteLength = this.length * Float32Array.BYTES_PER_ELEMENT;

	readonly #data: Float32Array;

	constructor(buffer: ArrayBuffer, byteOffset: number) {
		// Guarantee #data contains 12 Float32
		this.#data = new Float32Array(buffer, byteOffset, Matrix3.length);
	}

	identity() {
		this.#data.set([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0
		] satisfies TMatrix3);
	}

	transposeRotation(rot: TQuat) {
		const inv3 = toMatrix(rot);
		this.#data.set([
			inv3[0], inv3[3], inv3[6], 0,
			inv3[1], inv3[4], inv3[7], 0,
			inv3[2], inv3[5], inv3[8], 0
		] satisfies TMatrix3);
	}

}
