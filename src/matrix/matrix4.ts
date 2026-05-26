import type { Quaternion } from "../vector/quaternion";
import type { Vector3 } from "../vector/vector3";

/**
 * NOTE
 * WebGPU stores matrix values by columns, as opposed to by rows
 * | 0 | 4 | 8 |12 |
 * | 1 | 5 | 9 |13 |
 * | 2 | 6 |10 |14 |
 * | 3 | 7 |11 |15 |
 */

type TMatrix4 = [
	number, number, number, number,
	number, number, number, number,
	number, number, number, number,
	number, number, number, number
];

export class Matrix4 {

	static readonly length = 16;
	/** Length of the Matrix4 (in bytes) */
	static readonly byteLength = this.length * Float32Array.BYTES_PER_ELEMENT;

	readonly #data: TMatrix4;

	constructor(buffer: ArrayBuffer, byteOffset: number) {
		// Guarantee #data contains 16 Float32
		this.#data = new Float32Array(buffer, byteOffset, Matrix4.length) as unknown as TMatrix4;
	}

	identity() {
		const d = this.#data;
		d[0] = 1; d[1] = 0; d[2] = 0; d[3] = 0;
		d[4] = 0; d[5] = 1; d[6] = 0; d[7] = 0;
		d[8] = 0; d[9] = 0; d[10] = 1; d[11] = 0;
		d[12] = 0; d[13] = 0; d[14] = 0; d[15] = 1;
	}

	multiply(left: Matrix4, right: Matrix4) {
		const a = left.#data;
		const b = right.#data;
		const d = this.#data;
		// Col 1
		d[0] = a[0] * b[0] + a[4] * b[1] + a[8] * b[2] + a[12] * b[3];
		d[1] = a[1] * b[0] + a[5] * b[1] + a[9] * b[2] + a[13] * b[3];
		d[2] = a[2] * b[0] + a[6] * b[1] + a[10] * b[2] + a[14] * b[3];
		d[3] = a[3] * b[0] + a[7] * b[1] + a[11] * b[2] + a[15] * b[3];
		// Col 2
		d[4] = a[0] * b[4] + a[4] * b[5] + a[8] * b[6] + a[12] * b[7];
		d[5] = a[1] * b[4] + a[5] * b[5] + a[9] * b[6] + a[13] * b[7];
		d[6] = a[2] * b[4] + a[6] * b[5] + a[10] * b[6] + a[14] * b[7];
		d[7] = a[3] * b[4] + a[7] * b[5] + a[11] * b[6] + a[15] * b[7];
		// Col 3
		d[8] = a[0] * b[8] + a[4] * b[9] + a[8] * b[10] + a[12] * b[11];
		d[9] = a[1] * b[8] + a[5] * b[9] + a[9] * b[10] + a[13] * b[11];
		d[10] = a[2] * b[8] + a[6] * b[9] + a[10] * b[10] + a[14] * b[11];
		d[11] = a[3] * b[8] + a[7] * b[9] + a[11] * b[10] + a[15] * b[11];
		// Col 4
		d[12] = a[0] * b[12] + a[4] * b[13] + a[8] * b[14] + a[12] * b[15];
		d[13] = a[1] * b[12] + a[5] * b[13] + a[9] * b[14] + a[13] * b[15];
		d[14] = a[2] * b[12] + a[6] * b[13] + a[10] * b[14] + a[14] * b[15];
		d[15] = a[3] * b[12] + a[7] * b[13] + a[11] * b[14] + a[15] * b[15];
	}

	// "Classic" D3DXMatrixLookAtRH view transform
	// https://learn.microsoft.com/en-us/windows/win32/direct3d9/d3dxmatrixlookatrh
	lookAtRH(position: Vector3, forward: Vector3, up: Vector3, right: Vector3) {
		const f = forward._;
		const u = up._;
		const r = right._;
		// Translate and rotate the world back to the camera position
		const d = this.#data;
		d[0] = r[0]; d[1] = r[1]; d[2] = r[2]; d[3] = -right.dot(position);
		d[4] = u[0]; d[5] = u[1]; d[6] = u[2]; d[7] = -up.dot(position);
		d[8] = f[0]; d[9] = f[1]; d[10] = f[2]; d[11] = -forward.dot(position);
		// TODO This could be done once only
		d[12] = 0; d[13] = 0; d[14] = 0; d[15] = 1;
	}

	// Perspective projection transform
	// https://www.youtube.com/watch?v=U0_ONQQ5ZNM

	/** Perspective projection, distant objects shrink (orthographic * perspective) */
	perspectiveProjection(near: number, far: number, aspectRatio: number, fovY: number) {
		const perspective = Math.tan(fovY * 0.5);
		// Define perspective bottom and right planes from vertical fov
		const bottom = near * perspective;
		const right = near * aspectRatio * perspective;
		const zScale = -1 / (near - far);
		// Use w to "divide" everything by z, therefore z component needs to be z^2
		const d = this.#data;
		d[0] = near / right; d[1] = 0; d[2] = 0; d[3] = 0;
		d[4] = 0; d[5] = near / bottom; d[6] = 0; d[7] = 0;
		d[8] = 0; d[9] = 0; d[10] = far * zScale; d[11] = -far * near * zScale;
		d[12] = 0; d[13] = 0; d[14] = 1; d[15] = 0;
	}

	/** Orthographic projection, objects are their set size irregardless of distance */
	orthoProjectionMatrix(near: number, far: number, aspectRatio: number) {
		// Assume projection is as wide as it is deep
		const size = far - near;
		const height = size / aspectRatio;
		const d = this.#data;
		// x = -1 to +1
		d[0] = 2 / size; d[1] = 0; d[2] = 0; d[3] = 0;
		// y = -1 to +1
		d[4] = 0; d[5] = 2 / height; d[6] = 0; d[7] = 0;
		// z = 0 to +1
		d[8] = 0; d[9] = 0; d[10] = 1 / size; d[11] = -1 / size;
		d[12] = 0; d[13] = 0; d[14] = 0; d[15] = 1;
	}

	positionRotationScale(position: Vector3, rotation: Quaternion, scalar: number = 1) {
		const d = this.#data;
		const pos = position._;
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
		// 3x3 scaled rotation with translation
		d[0] = scalar * (1 - q2q2 - q3q3); // x scale
		d[1] = scalar * (q1q2 - q0q3); // y scale
		d[2] = scalar * (q1q3 + q0q2); // z scale
		d[3] = pos[0];
		d[4] = scalar * (q1q2 + q0q3);
		d[5] = scalar * (1 - q1q1 - q3q3);
		d[6] = scalar * (q2q3 - q0q1);
		d[7] = pos[1];
		d[8] = scalar * (q1q3 - q0q2);
		d[9] = scalar * (q2q3 + q0q1);
		d[10] = scalar * (1 - q1q1 - q2q2);
		d[11] = pos[2];
		d[12] = 0; d[13] = 0; d[14] = 0; d[15] = 1;
	}

	// TODO Skew support?
}
