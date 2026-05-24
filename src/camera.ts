import type { IGpuBindGroup, IGpuBindGroupLayout, IGpuBuffer, IGpuDevice } from "./interface";
import { Matrix4 } from "./matrix/matrix4";
import { type TVec3 } from "./utils";
import { Vector3 } from "./vector/Vector3";

// WebGPU -> x and y range from -1 to +1, z ranges from 0 to 1
// Any values outside of this range are clipped

export class Camera {

	private perspectiveMode = true;

	#near: number = 1;
	#far: number = 20;
	#aspect: number = 1;

	// View matrices
	public readonly viewBuffer: IGpuBuffer;
	readonly #viewData = new ArrayBuffer(3 * Matrix4.byteLength + 2 * Vector3.byteLength);
	readonly #viewMatrix = new Matrix4(this.#viewData, 0);
	readonly #projMatrix = new Matrix4(this.#viewData, Matrix4.byteLength);
	readonly #viewProjMatrix = new Matrix4(this.#viewData, 2 * Matrix4.byteLength);

	/** Assume always normalised and constant */
	#universeUp = Vector3.unmapped();

	/** x = right, y = up, z = forwards */
	#position = new Vector3(this.#viewData, 3 * Matrix4.byteLength);

	#direction = new Vector3(this.#viewData, 3 * Matrix4.byteLength + Vector3.byteLength);
	#right = Vector3.unmapped();
	#up = Vector3.unmapped();

	get direction(): TVec3 {
		return this.#direction._;
	}
	get right(): TVec3 {
		return this.#right._;
	}
	/** x/z components of direction only */
	get forward(): TVec3 {
		const d = this.direction;
		const mag = Math.sqrt(d[0] * d[0] + d[2] * d[2]);
		return [d[0] / mag, 0, d[2] / mag];
	}

	// TODO consider a camera buffer with inverse projection matrix, camera position, and camera direction for fragment shader only, bind viewBuffer only for vertex shader?
	// Camera properties
	// private readonly cameraBuffer: IGpuBuffer;

	readonly bindGroupLayout: IGpuBindGroupLayout;
	readonly bindGroup: IGpuBindGroup;

	constructor(private readonly device: IGpuDevice) {
		this.#universeUp.set(0, 1, 0);
		this.#position.set(0, 0, 0);
		this.#direction.set(0, 0, 1);
		// right and up will be initialised by camere calls
		this.viewBuffer = this.device.createBuffer({
			size: this.#viewData.byteLength,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
		});
		// Bind camera data for vertex/fragment shader usage
		this.bindGroupLayout = this.device.createBindGroupLayout({
			entries: [{
				binding: 0,
				visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
				buffer: { type: "uniform" }
			}]
		});
		this.bindGroup = this.device.createBindGroup({
			layout: this.bindGroupLayout,
			entries: [{
				binding: 0,
				resource: { buffer: this.viewBuffer }
			}]
		});
	}

	// View matrix update
	public updateViewDirection(
		posX: number, posY: number, posZ: number, dirX: number, dirY: number, dirZ: number
	) {
		this.#position.set(posX, posY, posZ);
		// Vector from camera position to reference point
		this.#direction.set(dirX, dirY, dirZ);
		this.#direction.normalize();
		// Right from universe up
		this.#right.cross(this.#universeUp, this.#direction);
		this.#right.normalize();
		// View up from right
		this.#up.cross(this.#direction, this.#right);
		this.#up.normalize();
		this.#viewMatrix.lookAtRH(this.#position, this.#direction, this.#up, this.#right);
	}

	public updateViewFocus(
		posX: number, posY: number, posZ: number, focX: number, focY: number, focZ: number
	) {
		this.updateViewDirection(
			posX, posY, posZ,
			focX - posX, focY - posY, focZ - posZ
		);
	}

	public updateViewOrbital(focus: TVec3, distance: number, pitch: number, yaw: number) {
		// Use angles to position camera on sphere about origin
		const sinPitch = Math.sin(pitch);
		const orbitX = distance * sinPitch * Math.cos(yaw);
		const orbitY = distance * Math.cos(pitch);
		const orbitZ = distance * sinPitch * Math.sin(yaw);
		this.updateViewDirection(
			focus[0] + orbitX, focus[1] + orbitY, focus[2] + orbitZ,
			-orbitX, -orbitY, -orbitZ
		);
	}

	// Projection matrix update
	public updateProjection(near: number, far: number, aspectRatio: number, fovY: number) {
		this.#near = near;
		this.#far = far;
		this.#aspect = aspectRatio;
		this.updateFov(fovY);
	}

	public updateFov(fovY: number) {
		this.perspectiveMode
			? this.#projMatrix.perspectiveProjection(this.#near, this.#far, this.#aspect, fovY)
			: this.#projMatrix.orthoProjectionMatrix(this.#near, this.#far, this.#aspect);
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
	}

}
