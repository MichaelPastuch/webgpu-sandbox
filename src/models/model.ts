import { type IGpuBindGroup, type IGpuBindGroupLayout, type IGpuBuffer, type IGpuDevice, type IGpuRenderPassEncoder } from "../interface";
import { Matrix3 } from "../matrix/matrix3";
import { Matrix4 } from "../matrix/matrix4";
import { Quaternion } from "../vector/quaternion";
import { Vector3 } from "../vector/vector3";

export abstract class Model {

	readonly #transformBuffer: IGpuBuffer;
	public readonly bindGroup: IGpuBindGroup;

	protected readonly translation = Vector3.unmapped();
	protected readonly rotation = Quaternion.unmapped();
	#normalRotation = Quaternion.unmapped();
	protected scalar: number = 1;

	readonly #modelData = new ArrayBuffer(Matrix4.byteLength + Matrix3.byteLength);
	readonly #modelMatrix = new Matrix4(this.#modelData, 0);
	readonly #normalMatrix = new Matrix3(this.#modelData, Matrix4.byteLength);

	constructor(protected readonly device: IGpuDevice, bindGroupLayout: IGpuBindGroupLayout) {
		// Allocate buffer and bind group
		this.#transformBuffer = this.device.createBuffer({
			size: this.#modelData.byteLength,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
		});
		this.bindGroup = this.device.createBindGroup({
			layout: bindGroupLayout,
			entries: [{
				binding: 0,
				resource: { buffer: this.#transformBuffer }
			}]
		});
	}

	public translate(x: number, y: number, z: number) {
		this.translation.set(x, y, z);
		return this;
	}

	public rotate(pitch: number, yaw: number, roll?: number) {
		this.rotation.fromRotation(pitch, yaw, roll);
		this.#normalRotation.inverse(this.rotation);
		return this;
	}

	public scale(scale: number) {
		this.scalar = scale;
		return this;
	}

	public writeBuffer() {
		this.#modelMatrix.positionRotationScale(
			this.translation,
			this.rotation,
			this.scalar
		);
		// TODO Rework invese transform if supporting non-uniform scaling
		this.#normalMatrix.transposeRotation(this.#normalRotation);
		this.device.queue.writeBuffer(
			this.#transformBuffer, 0,
			this.#modelData, 0, this.#modelData.byteLength
		);
		return this;
	}

	abstract draw(passEncoder: IGpuRenderPassEncoder): void;

}
