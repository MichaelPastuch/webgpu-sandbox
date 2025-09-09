import { SHADER_BUFFER } from "./constants";
import type { IGpuBuffer, IGpuDevice } from "./interface";
import { cross, identity, matrixMultiply, normalize, vector, type TMatrix, type TVec3 } from "./utils";

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
