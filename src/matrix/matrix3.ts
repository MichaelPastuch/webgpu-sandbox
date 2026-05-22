import { toMatrix, type TQuat } from "../utils";

// 3x3 matrices need columns packing with extra zeroes
type TMatrix3 = [
	number, number, number, number,
	number, number, number, number,
	number, number, number, number
];

export class Matrix3 {

	static readonly length = 12;
	/** Length of the Matrix3 (in bytes) */
	static readonly byteLength = this.length * Float32Array.BYTES_PER_ELEMENT;

	readonly #data: TMatrix3;

	constructor(buffer: ArrayBuffer, byteOffset: number) {
		// Guarantee #data contains 12 Float32
		this.#data = new Float32Array(buffer, byteOffset, Matrix3.length) as unknown as TMatrix3;
	}

	identity() {
		const d = this.#data;
		d[0] = 1; d[1] = 0; d[2] = 0; //d[3] = 0;
		d[4] = 0; d[5] = 1; d[6] = 0; //d[7] = 0;
		d[8] = 0; d[9] = 0; d[10] = 1; //d[11] = 0;
	}

	transposeRotation(rot: TQuat) {
		const inv3 = toMatrix(rot);
		const d = this.#data;
		d[0] = inv3[0]; d[1] = inv3[3]; d[2] = inv3[6]; //d[3] = 0;
		d[4] = inv3[1]; d[5] = inv3[4]; d[6] = inv3[7]; //d[7] = 0;
		d[8] = inv3[2]; d[9] = inv3[5]; d[10] = inv3[8]; //d[11] = 0;
	}

}
