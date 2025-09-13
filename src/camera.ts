import { DEG_TO_RAD, HALF_PI, SHADER_BUFFER, VERTEX_STAGE } from "./constants";
import type { IGpuBindGroup, IGpuBindGroupLayout, IGpuBuffer, IGpuDevice } from "./interface";
import { cross, dot, matrixMultiply, normalize, vector, type TMatrix, type TVec3 } from "./utils";

// WebGPU -> x and y range from -1 to +1, z ranges from 0 to 1
// Any values outside of this range are clipped

export class Camera {

	/** x = right, y = up, z = "backwards" */
	private position: TVec3 = [0, 0, 1];
	private direction: TVec3 = [0, 0, -1];
	/** Assume always normalised */
	private up: TVec3 = [0, 1, 0];

	private near: number = 1;
	private far: number = 4;
	private aspect: number = 1;
	private perspective: number = 3;

	public readonly viewBuffer: IGpuBuffer;
	public readonly projBuffer: IGpuBuffer;
	public readonly viewProjBuffer: IGpuBuffer;
	public readonly bindGroupLayout: IGpuBindGroupLayout;
	public readonly bindGroup: IGpuBindGroup;

	constructor(private readonly device: IGpuDevice) {
		this.viewBuffer = this.device.createBuffer({
			size: 4 * 16,
			usage: SHADER_BUFFER
		});
		this.projBuffer = this.device.createBuffer({
			size: 4 * 16,
			usage: SHADER_BUFFER
		});
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
			}, {
				binding: 1,
				visibility: VERTEX_STAGE,
				buffer: { type: "uniform" }
			}, {
				binding: 2,
				visibility: VERTEX_STAGE,
				buffer: { type: "uniform" }
			}]
		});
		this.bindGroup = this.device.createBindGroup({
			layout: this.bindGroupLayout,
			entries: [{
				binding: 0,
				resource: { buffer: this.viewBuffer }
			}, {
				binding: 1,
				resource: { buffer: this.projBuffer }
			}, {
				binding: 2,
				resource: { buffer: this.viewProjBuffer }
			}]
		});
	}

	// "Classic" D3DXMatrixLookAtRH view transform
	// https://learn.microsoft.com/en-us/windows/win32/direct3d9/d3dxmatrixlookatrh
	public updateView(position: TVec3, focus: TVec3, up?: TVec3) {
		this.position = position;
		// Vector from camera position to reference point
		this.direction = normalize(vector(focus, position));
		if (up != null) {
			this.up = normalize(up);
		}
	}

	private get viewMatrix(): TMatrix {
		const eye = this.position;
		const forward = this.direction;
		const right = normalize(cross(this.up, forward));
		const up = cross(forward, right);

		// D3DXMatrixLookAtRH
		// return [
		// 	right[0], up[0], forward[0], 0,
		// 	right[1], up[1], forward[1], 0,
		// 	right[2], up[2], forward[2], 0,
		// 	-dot(right, eye), -dot(up, eye), -dot(forward, eye), 1
		// ];
		// Transposed D3DXMatrixLookAtRH
		return [
			right[0], right[1], right[2], dot(right, eye),
			up[0], up[1], up[2], dot(up, eye),
			forward[0], forward[1], forward[2], dot(forward, eye),
			0, 0, 0, 1
		];

		// Look at
		// return [
		// 	right[0], right[1], right[2], eye[0],
		// 	up[0], up[1], up[2], eye[1],
		// 	forward[0], forward[1], forward[2], eye[2],
		// 	0, 0, 0, 1
		// ];
		// Transposed look at
		// return [
		// 	right[0], up[0], forward[0], 0,
		// 	right[1], up[1], forward[1], 0,
		// 	right[2], up[2], forward[2], 0,
		// 	eye[0], eye[1], eye[2], 1
		// ];
	}

	// Perspective projection transform
	// https://www.youtube.com/watch?v=U0_ONQQ5ZNM
	public updateProjection(near: number, far: number, aspectRatio: number, fovY: number) {
		this.near = near;
		this.far = far;
		this.aspect = aspectRatio;
		this.updateFov(fovY);
	}

	public updateFov(fovY: number) {
		this.perspective = Math.tan(fovY * 0.5);
	}

	/** Perspective projection, distant objects shrink (orthographic * perspective) */
	private get perspProjectionMatrix(): TMatrix {
		// Assume viewpoint looks down z axis
		// Define perspective bottom and right planes from vertical fov
		const bottom = this.near * this.perspective;
		const right = this.near * this.aspect * this.perspective;
		const zScale = -1 / (this.near - this.far);
		// Use w to "divide" everything by z, therefore z component needs to be z^2
		return [
			this.near / right, 0, 0, 0,
			0, this.near / bottom, 0, 0,
			0, 0, this.far * zScale, -this.far * this.near * zScale,
			0, 0, 1, 0
		];
	}

	/** Orthographic projection, objects are their set size irregardless of distance */
	private get orthoProjectionMatrix(): TMatrix {
		// Assume viewpoint looks down z axis
		// Assume x ranges from -10 to +10
		const width = 20;
		const height = width / this.aspect;
		const depth = this.far - this.near
		return [
			// x = -1 to +1
			2 / width, 0, 0, 0,
			// y = -1 to +1
			0, 2 / height, 0, 0,
			// z = 0 to +1
			0, 0, 1 / depth, -1 / depth,
			0, 0, 0, 1
		];
	}

	public writeBuffer() {
		const viewMatrix = this.viewMatrix;
		const viewData = new Float32Array(viewMatrix);
		this.device.queue.writeBuffer(
			this.viewBuffer, 0,
			viewData, 0, viewData.length
		);
		const projMatrix = this.perspProjectionMatrix;
		const projData = new Float32Array(projMatrix);
		this.device.queue.writeBuffer(
			this.projBuffer, 0,
			projData, 0, projData.length
		);
		const viewProjData = new Float32Array(
			matrixMultiply(projMatrix, viewMatrix)
		);
		this.device.queue.writeBuffer(
			this.viewProjBuffer, 0,
			viewProjData, 0, viewProjData.length
		);
	}

}
