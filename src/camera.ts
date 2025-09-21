import { FRAGMENT_STAGE, SHADER_BUFFER, VERTEX_STAGE } from "./constants";
import type { IGpuBindGroup, IGpuBindGroupLayout, IGpuBuffer, IGpuDevice } from "./interface";
import { cross, dot, matrixMultiply4, normalize, sub, type TMatrix4, type TVec3 } from "./utils";

// WebGPU -> x and y range from -1 to +1, z ranges from 0 to 1
// Any values outside of this range are clipped

export class Camera {

	private perspectiveMode = true;

	/** Assume always normalised */
	#up: TVec3 = [0, 1, 0];

	/** x = right, y = up, z = forwards */
	#position: TVec3 = [0, 0, 0];

	#direction: TVec3 = [0, 0, 1];
	public get direction(): TVec3 {
		return this.#direction;
	}
	#right: TVec3 = [1, 0, 0];
	public get right(): TVec3 {
		return this.#right;
	}
	/** x/z components of direction only */
	public get forward(): TVec3 {
		// return normalize(cross(this.#right, this.up));
		return normalize([this.#direction[0], 0, this.#direction[2]]);
	}

	private near: number = 1;
	private far: number = 20;
	private aspect: number = 1;
	private perspective: number = 0.4;

	public readonly viewBuffer: IGpuBuffer;
	public readonly projBuffer: IGpuBuffer;
	public readonly viewProjBuffer: IGpuBuffer;
	private readonly cameraBuffer: IGpuBuffer;

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
		this.cameraBuffer = this.device.createBuffer({
			size: 6 * 16,
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
			}, {
				binding: 3,
				visibility: FRAGMENT_STAGE,
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
			}, {
				binding: 3,
				resource: { buffer: this.cameraBuffer }
			}]
		});
	}

	// "Classic" D3DXMatrixLookAtRH view transform
	// https://learn.microsoft.com/en-us/windows/win32/direct3d9/d3dxmatrixlookatrh
	public updateViewDirection(position: TVec3, direction: TVec3, up?: TVec3) {
		this.#position = position;
		// Vector from camera position to reference point
		this.#direction = normalize(direction);
		this.#right = normalize(cross(this.#up, this.#direction));
		if (up != null) {
			this.#up = normalize(up);
		}
	}

	public updateViewFocus(position: TVec3, focus: TVec3, up?: TVec3) {
		this.updateViewDirection(position, sub(position, focus), up);
	}

	public updateViewOrbital(focus: TVec3, distance: number, pitch: number, yaw: number) {
		// Use angles to position camera on sphere about origin
		const sinPitch = Math.sin(pitch);
		const orbitX = distance * sinPitch * Math.cos(yaw);
		const orbitY = distance * Math.cos(pitch);
		const orbitZ = distance * sinPitch * Math.sin(yaw);
		this.updateViewDirection(
			[focus[0] + orbitX, focus[1] + orbitY, focus[2] + orbitZ],
			[-orbitX, -orbitY, -orbitZ]
		);
	}

	private get viewMatrix(): TMatrix4 {
		const pos = this.#position;
		// Assemble orthonormal vectors for camera space
		const fwd = this.#direction;
		const right = this.#right;
		const up = cross(fwd, right);
		// Translate and rotate the world back to the camera position
		return [
			right[0], right[1], right[2], -dot(right, pos),
			up[0], up[1], up[2], -dot(up, pos),
			fwd[0], fwd[1], fwd[2], -dot(fwd, pos),
			0, 0, 0, 1
		];
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
	private get perspProjectionMatrix(): TMatrix4 {
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
	private get orthoProjectionMatrix(): TMatrix4 {
		// Assume projection is as wde as it is deep
		const size = this.far - this.near
		const height = size / this.aspect;
		return [
			// x = -1 to +1
			2 / size, 0, 0, 0,
			// y = -1 to +1
			0, 2 / height, 0, 0,
			// z = 0 to +1
			0, 0, 1 / size, -1 / size,
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
		const projMatrix = this.perspectiveMode
			? this.perspProjectionMatrix
			: this.orthoProjectionMatrix;
		const projData = new Float32Array(projMatrix);
		this.device.queue.writeBuffer(
			this.projBuffer, 0,
			projData, 0, projData.length
		);
		const viewProjData = new Float32Array(
			matrixMultiply4(viewMatrix, projMatrix)
		);
		this.device.queue.writeBuffer(
			this.viewProjBuffer, 0,
			viewProjData, 0, viewProjData.length
		);
		const cameraData = new Float32Array([
			...this.#position,
			...this.#direction
		]);
		this.device.queue.writeBuffer(
			this.cameraBuffer, 0,
			cameraData, 0, cameraData.length
		);
	}

}
