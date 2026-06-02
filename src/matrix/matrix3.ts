import type { Quaternion } from "../vector/quaternion";
import type { Vector3 } from "../vector/vector3";

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

	lookAtRH(forward: Vector3, up: Vector3, right: Vector3) {
		const f = forward._;
		const u = up._;
		const r = right._;
		const d = this.#data;
		d[0] = r[0]; d[1] = r[1]; d[2] = r[2]; //d[3] = 0;
		d[4] = u[0]; d[5] = u[1]; d[6] = u[2]; //d[7] = 0;
		d[8] = f[0]; d[9] = f[1]; d[10] = f[2]; //d[11] = 0;
	}

	transposeRotation(rotation: Quaternion) {
		const d = this.#data;
		const q = rotation._;
		const q0q1 = 2 * q[0] * q[1];
		const q0q2 = 2 * q[0] * q[2];
		const q0q3 = 2 * q[0] * q[3];
		const q1q1 = 2 * q[1] * q[1];
		const q1q2 = 2 * q[1] * q[2];
		const q1q3 = 2 * q[1] * q[3];
		const q2q2 = 2 * q[2] * q[2];
		const q2q3 = 2 * q[2] * q[3];
		const q3q3 = 2 * q[3] * q[3];
		d[0] = 1 - q2q2 - q3q3; d[1] = q1q2 + q0q3; d[2] = q1q3 - q0q2; //d[3] = 0;
		d[4] = q1q2 - q0q3; d[5] = 1 - q1q1 - q3q3; d[6] = q2q3 + q0q1; //d[7] = 0;
		d[8] = q1q3 + q0q2; d[9] = q2q3 - q0q1; d[10] = 1 - q1q1 - q2q2; //d[11] = 0;
	}

}
