import type { IGpuBindGroup, IGpuBindGroupLayout, IGpuBuffer, IGpuDevice } from "./interface";
import { Matrix4 } from "./matrix/matrix4";
import { cross, normalize, sub, type TVec3 } from "./utils";

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

	// View matrices
	public readonly viewBuffer: IGpuBuffer;
	readonly #viewData = new ArrayBuffer(3 * Matrix4.byteLength);
	readonly #viewMatrix = new Matrix4(this.#viewData, 0);
	readonly #projMatrix = new Matrix4(this.#viewData, Matrix4.byteLength);
	readonly #viewProjMatrix = new Matrix4(this.#viewData, 2 * Matrix4.byteLength);

	// Camera properties
	private readonly cameraBuffer: IGpuBuffer;

	public readonly bindGroupLayout: IGpuBindGroupLayout;
	public readonly bindGroup: IGpuBindGroup;

	constructor(private readonly device: IGpuDevice) {
		this.viewBuffer = this.device.createBuffer({
			size: this.#viewData.byteLength,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
		});
		this.cameraBuffer = this.device.createBuffer({
			// 2 vec3 (NOTE vec3 requires 4 numbers)
			size: (2 * 4) * Float32Array.BYTES_PER_ELEMENT,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
		});
		// Bind camera matrices data for vertex/fragment shader usage
		this.bindGroupLayout = this.device.createBindGroupLayout({
			entries: [{
				binding: 0,
				visibility: GPUShaderStage.VERTEX,
				buffer: { type: "uniform" }
			}, {
				binding: 1,
				visibility: GPUShaderStage.FRAGMENT,
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
				resource: { buffer: this.cameraBuffer }
			}]
		});
	}

	// View matrix update
	public updateViewDirection(position: TVec3, direction: TVec3, up?: TVec3) {
		this.#position = position;
		// Vector from camera position to reference point
		this.#direction = normalize(direction);
		if (up != null) {
			this.#up = normalize(up);
		}
		this.#right = normalize(cross(this.#up, this.#direction));
		this.#viewMatrix.lookAtRH(this.#position, this.#direction, this.#right);
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

	// Projection matrix update
	public updateProjection(near: number, far: number, aspectRatio: number, fovY: number) {
		this.near = near;
		this.far = far;
		this.aspect = aspectRatio;
		this.updateFov(fovY);
	}

	public updateFov(fovY: number) {
		this.perspectiveMode
			? this.#projMatrix.perspectiveProjection(this.near, this.far, this.aspect, fovY)
			: this.#projMatrix.orthoProjectionMatrix(this.near, this.far, this.aspect);
	}

	public writeBuffer() {
		// Update view x projection
		this.#viewProjMatrix.multiply(
			this.#viewMatrix,
			this.#projMatrix
		);
		this.device.queue.writeBuffer(
			this.viewBuffer, 0,
			this.#viewData, 0, this.#viewData.byteLength
		);
		// Write camera data for fragment shaders
		const cameraData = new Float32Array([
			...this.#position, 0,
			...this.#direction, 0
		]);
		this.device.queue.writeBuffer(
			this.cameraBuffer, 0,
			cameraData, 0, cameraData.length
		);
	}

}
