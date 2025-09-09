import { SHADER_BUFFER } from "./constants";
import type { IGpuBuffer, IGpuDevice } from "./interface";

type TVec3 = [number, number, number];

type TMatrix = [
	number, number, number, number,
	number, number, number, number,
	number, number, number, number,
	number, number, number, number
];

function matrixMultiply(lhs: TMatrix, rhs: TMatrix): TMatrix {
	return [
		// Row 1
		lhs[0] * rhs[0] + lhs[1] * rhs[4] + lhs[2] * rhs[8] + lhs[3] * rhs[12],
		lhs[0] * rhs[1] + lhs[1] * rhs[5] + lhs[2] * rhs[9] + lhs[3] * rhs[13],
		lhs[0] * rhs[2] + lhs[1] * rhs[6] + lhs[2] * rhs[10] + lhs[3] * rhs[14],
		lhs[0] * rhs[3] + lhs[1] * rhs[7] + lhs[2] * rhs[11] + lhs[3] * rhs[15],
		// Row 2
		lhs[4] * rhs[0] + lhs[5] * rhs[4] + lhs[6] * rhs[8] + lhs[7] * rhs[12],
		lhs[4] * rhs[1] + lhs[5] * rhs[5] + lhs[6] * rhs[9] + lhs[7] * rhs[13],
		lhs[4] * rhs[2] + lhs[5] * rhs[6] + lhs[6] * rhs[10] + lhs[7] * rhs[14],
		lhs[4] * rhs[3] + lhs[5] * rhs[7] + lhs[6] * rhs[11] + lhs[7] * rhs[15],
		// Row 3
		lhs[8] * rhs[0] + lhs[9] * rhs[4] + lhs[10] * rhs[8] + lhs[11] * rhs[12],
		lhs[8] * rhs[1] + lhs[9] * rhs[5] + lhs[10] * rhs[9] + lhs[11] * rhs[13],
		lhs[8] * rhs[2] + lhs[9] * rhs[6] + lhs[10] * rhs[10] + lhs[11] * rhs[14],
		lhs[8] * rhs[3] + lhs[9] * rhs[7] + lhs[10] * rhs[11] + lhs[11] * rhs[15],
		// Row 4
		lhs[12] * rhs[0] + lhs[13] * rhs[4] + lhs[14] * rhs[8] + lhs[15] * rhs[12],
		lhs[12] * rhs[1] + lhs[13] * rhs[5] + lhs[14] * rhs[9] + lhs[15] * rhs[13],
		lhs[12] * rhs[2] + lhs[13] * rhs[6] + lhs[14] * rhs[10] + lhs[15] * rhs[14],
		lhs[12] * rhs[3] + lhs[13] * rhs[7] + lhs[14] * rhs[11] + lhs[15] * rhs[15]
	];
}

/** Create vector from lhs to rhs */
function vector(lhs: TVec3, rhs: TVec3): TVec3 {
	return [rhs[0] - lhs[0], rhs[1] - lhs[1], rhs[2] - lhs[2]]
}

/** Vector length */
function magnitude(vec: TVec3) {
	return Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
}

function normalize(vec: TVec3): TVec3 {
	const mag = magnitude(vec);
	return [vec[0] / mag, vec[1] / mag, vec[2] / mag];
}

function cross(lhs: TVec3, rhs: TVec3): TVec3 {
	return [
		lhs[2] * rhs[1] - lhs[1] * rhs[2],
		-(lhs[2] * rhs[0] - lhs[0] * rhs[2]),
		lhs[1] * rhs[0] - lhs[0] * rhs[1]
	];
}

export const identity: TMatrix = [
	1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 1, 0,
	0, 0, 0, 1
];

export class Camera {

	/** Z is "forward" */
	private direction: TVec3 = [0, 0, 1];
	/** Assume always normalised */
	private up: TVec3 = [0, 1, 0];

	private near: number = 1;
	private far: number = 10;
	private aspect: number = 1;
	private perspective: number = 1;

	public readonly buffer: IGpuBuffer;

	constructor(private readonly device: IGpuDevice) {
		this.buffer = this.device.createBuffer({
			size: 4 * 16,
			usage: SHADER_BUFFER
		});
	}

	public updateView(from: TVec3, to: TVec3, up?: TVec3) {
		// Vector from camera position to reference point
		this.direction = normalize(vector(from, to));
		if (up != null) {
			this.up = up;
		}
	}

	// "Classic" gluLookAt view transform
	// https://registry.khronos.org/OpenGL-Refpages/gl2.1/xhtml/gluLookAt.xml
	public get viewMatrix(): TMatrix {
		// Get right with assumed up
		const right = cross(this.direction, this.up);
		// Get "correct" up with respect to view direction
		const up = cross(normalize(right), this.direction);
		return [
			right[0], right[1], right[2], 0,
			up[0], up[1], up[2], 0,
			-this.direction[0], -this.direction[1], -this.direction[2], 0,
			0, 0, 0, 1
		];
	}

	// "Classic" gluPerspective projection transform
	// https://registry.khronos.org/OpenGL-Refpages/gl2.1/xhtml/gluPerspective.xml
	public updateProjection(near: number, far: number, aspectRatio: number, fovY: number) {
		this.near = near;
		this.far = far;
		this.aspect = aspectRatio;
		this.perspective = 1.0 / Math.tan(0.5 * fovY);
	}

	public get projectionMatrix(): TMatrix {
		return identity;
		const delta = this.near - this.far;
		return [
			this.perspective / this.aspect, 0, 0, 0,
			0, this.perspective, 0, 0,
			0, 0, (this.far + this.near) / delta, (2.0 * this.far * this.near) / delta,
			0, 0, -1, 0
		];
	}

	public writeBuffer() {
		const matrix = new Float32Array(
			matrixMultiply(this.viewMatrix, this.projectionMatrix)
		);
		this.device.queue.writeBuffer(
			this.buffer, 0,
			matrix, 0, matrix.length
		);
	}

}
