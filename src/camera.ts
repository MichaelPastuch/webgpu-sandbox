import { HALF_PI, SHADER_BUFFER, VERTEX_STAGE } from "./constants";
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
		return [
			right[0], up[0], forward[0], 0,
			right[1], up[1], forward[1], 0,
			right[2], up[2], forward[2], 0,
			-dot(right, eye), -dot(up, eye), -dot(right, eye), 1
		];
	}

	// "Classic" gluPerspective projection transform
	// https://registry.khronos.org/OpenGL-Refpages/gl2.1/xhtml/gluPerspective.xml
	public updateProjection(near: number, far: number, aspectRatio: number, fovY: number) {
		this.near = near;
		this.far = far;
		this.aspect = aspectRatio;
		this.updateFov(fovY);
	}

	public updateFov(fovY: number) {
		this.perspective = Math.tan(HALF_PI - fovY * 0.5);
	}

	private get projectionMatrix(): TMatrix {
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
			matrixMultiply(this.viewMatrix, this.projectionMatrix)
		);
		this.device.queue.writeBuffer(
			this.viewProjBuffer, 0,
			viewProjMatrix, 0, viewProjMatrix.length
		);
	}

}
