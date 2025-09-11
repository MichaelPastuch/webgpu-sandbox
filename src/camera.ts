import { HALF_PI, SHADER_BUFFER, VERTEX_STAGE } from "./constants";
import type { IGpuBindGroup, IGpuBindGroupLayout, IGpuBuffer, IGpuDevice } from "./interface";
import { cross, matrixMultiply, normalize, vector, type TMatrix, type TVec3 } from "./utils";

// WebGPU -> x and y range from -1 to +1, z ranges from 0 to 1
// Any values outside of this range are clipped

export class Camera {

	private position: TVec3 = [0, 0, 1];
	/** x = right, y = up, z = "backwards" */
	private direction: TVec3 = [0, 0, -1];
	/** Assume always normalised */
	private up: TVec3 = [0, 1, 0];

	private near: number = 1;
	private far: number = 4;
	private aspect: number = 1;
	private perspective: number = 3;

	public readonly viewProjBuffer: IGpuBuffer;
	public readonly bindGroupLayout: IGpuBindGroupLayout;
	public readonly bindGroup: IGpuBindGroup;

	constructor(private readonly device: IGpuDevice) {
		this.viewProjBuffer = this.device.createBuffer({
			size: 4 * 16,
			usage: SHADER_BUFFER
		});
		// Bind camera matrices data for vertex/fragment shader usage
		this.bindGroupLayout = this.device.createBindGroupLayout({
			entries: [{
				binding: 0,
				visibility: VERTEX_STAGE,
				buffer: { type: "uniform" }
			}]
		});
		this.bindGroup = this.device.createBindGroup({
			layout: this.bindGroupLayout,
			entries: [{
				binding: 0,
				resource: { buffer: this.viewProjBuffer }
			}]
		});
	}

	public updateView(from: TVec3, to: TVec3, up?: TVec3) {
		this.position = from;
		// Vector from camera position to reference point
		this.direction = normalize(vector(from, to));
		console.debug(this.direction);
		if (up != null) {
			this.up = normalize(up);
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
			this.position[0], this.position[1], this.position[2], 1
		];
	}

	// "Classic" gluPerspective projection transform
	// https://registry.khronos.org/OpenGL-Refpages/gl2.1/xhtml/gluPerspective.xml
	public updateProjection(near: number, far: number, aspectRatio: number, fovY: number) {
		this.near = near;
		this.far = far;
		this.aspect = aspectRatio;
		this.perspective = Math.tan(HALF_PI - fovY * 0.5);
		console.debug(this.perspective);
	}

	public get projectionMatrix(): TMatrix {
		const zScale = this.far / (this.far - this.near);
		return [
			this.perspective / this.aspect, 0, 0, 0,
			0, this.perspective, 0, 0,
			0, 0, zScale, -1,
			0, 0, this.near * zScale, 0
		];
	}

	public writeBuffer() {
		const viewProjMatrix = new Float32Array(
			matrixMultiply(this.projectionMatrix, this.viewMatrix)
		);
		this.device.queue.writeBuffer(
			this.viewProjBuffer, 0,
			viewProjMatrix, 0, viewProjMatrix.length
		);
	}

}
