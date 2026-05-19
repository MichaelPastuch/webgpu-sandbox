import { cross, dot, matrixMultiply3, toMatrix, type TQuat, type TVec3 } from "../utils";

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

	readonly #data: Float32Array;

	constructor(buffer: ArrayBuffer, byteOffset: number) {
		// Guarantee #data contains 16 Float32
		this.#data = new Float32Array(buffer, byteOffset, Matrix4.length);
	}

	identity() {
		this.#data.set([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		] satisfies TMatrix4);
	}

	multiply(left: Matrix4, right: Matrix4) {
		const a = left.#data as unknown as TMatrix4;
		const b = right.#data as unknown as TMatrix4;
		this.#data.set([
			// Col 1
			a[0] * b[0] + a[4] * b[1] + a[8] * b[2] + a[12] * b[3],
			a[1] * b[0] + a[5] * b[1] + a[9] * b[2] + a[13] * b[3],
			a[2] * b[0] + a[6] * b[1] + a[10] * b[2] + a[14] * b[3],
			a[3] * b[0] + a[7] * b[1] + a[11] * b[2] + a[15] * b[3],
			// Col 2
			a[0] * b[4] + a[4] * b[5] + a[8] * b[6] + a[12] * b[7],
			a[1] * b[4] + a[5] * b[5] + a[9] * b[6] + a[13] * b[7],
			a[2] * b[4] + a[6] * b[5] + a[10] * b[6] + a[14] * b[7],
			a[3] * b[4] + a[7] * b[5] + a[11] * b[6] + a[15] * b[7],
			// Col 3
			a[0] * b[8] + a[4] * b[9] + a[8] * b[10] + a[12] * b[11],
			a[1] * b[8] + a[5] * b[9] + a[9] * b[10] + a[13] * b[11],
			a[2] * b[8] + a[6] * b[9] + a[10] * b[10] + a[14] * b[11],
			a[3] * b[8] + a[7] * b[9] + a[11] * b[10] + a[15] * b[11],
			// Col 4
			a[0] * b[12] + a[4] * b[13] + a[8] * b[14] + a[12] * b[15],
			a[1] * b[12] + a[5] * b[13] + a[9] * b[14] + a[13] * b[15],
			a[2] * b[12] + a[6] * b[13] + a[10] * b[14] + a[14] * b[15],
			a[3] * b[12] + a[7] * b[13] + a[11] * b[14] + a[15] * b[15]
		] satisfies TMatrix4);
	}

	// "Classic" D3DXMatrixLookAtRH view transform
	// https://learn.microsoft.com/en-us/windows/win32/direct3d9/d3dxmatrixlookatrh
	lookAtRH(pos: TVec3, fwd: TVec3, rgt: TVec3) {
		const up = cross(fwd, rgt);
		// Translate and rotate the world back to the camera position
		this.#data.set([
			rgt[0], rgt[1], rgt[2], -dot(rgt, pos),
			up[0], up[1], up[2], -dot(up, pos),
			fwd[0], fwd[1], fwd[2], -dot(fwd, pos),
			0, 0, 0, 1
		] satisfies TMatrix4);
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
		this.#data.set([
			near / right, 0, 0, 0,
			0, near / bottom, 0, 0,
			0, 0, far * zScale, -far * near * zScale,
			0, 0, 1, 0
		] satisfies TMatrix4);
	}

	/** Orthographic projection, objects are their set size irregardless of distance */
	orthoProjectionMatrix(near: number, far: number, aspectRatio: number) {
		// Assume projection is as wde as it is deep
		const size = far - near;
		const height = size / aspectRatio;
		this.#data.set([
			// x = -1 to +1
			2 / size, 0, 0, 0,
			// y = -1 to +1
			0, 2 / height, 0, 0,
			// z = 0 to +1
			0, 0, 1 / size, -1 / size,
			0, 0, 0, 1
		] satisfies TMatrix4);
	}

	postitionRotationScale(pos: TVec3, rot: TQuat, scalar: number = 1) {
		const rotation = toMatrix(rot);
		const mat3 = scalar === 1
			? rotation
			// TODO "identity-like multiplier", ignore 0 elements
			: matrixMultiply3([
				scalar, 0, 0,
				0, scalar, 0,
				0, 0, scalar
			], rotation);
		this.#data.set([
			mat3[0], mat3[1], mat3[2], pos[0],
			mat3[3], mat3[4], mat3[5], pos[1],
			mat3[6], mat3[7], mat3[8], pos[2],
			0, 0, 0, 1
		] satisfies TMatrix4);
	}

	// TODO Skew support
}
