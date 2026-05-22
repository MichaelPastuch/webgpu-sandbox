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
	lookAtRH(pos: TVec3, fwd: TVec3, rgt: TVec3) {
		const up = cross(fwd, rgt);
		// Translate and rotate the world back to the camera position
		const d = this.#data;
		d[0] = rgt[0]; d[1] = rgt[1]; d[2] = rgt[2]; d[3] = -dot(rgt, pos);
		d[4] = up[0]; d[5] = up[1]; d[6] = up[2]; d[7] = -dot(up, pos);
		d[8] = fwd[0]; d[9] = fwd[1]; d[10] = fwd[2]; d[11] = -dot(fwd, pos);
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
		// Assume projection is as wde as it is deep
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
		const d = this.#data;
		d[0] = mat3[0]; d[1] = mat3[1]; d[2] = mat3[2]; d[3] = pos[0];
		d[4] = mat3[3]; d[5] = mat3[4]; d[6] = mat3[5]; d[7] = pos[1];
		d[8] = mat3[6]; d[9] = mat3[7]; d[10] = mat3[8]; d[11] = pos[2];
		d[12] = 0; d[13] = 0; d[14] = 0; d[15] = 1;
	}

	// TODO Skew support
}
