import { type IGpuBindGroup, type IGpuBindGroupLayout, type IGpuBuffer, type IGpuDevice, type IGpuRenderPassEncoder } from "../interface";
import { Matrix3 } from "../matrix/matrix3";
import { Matrix4 } from "../matrix/matrix4";
import { fromRotation, inverse, type TQuat, type TVec3 } from "../utils";

export abstract class Model {

	private readonly transformBuffer: IGpuBuffer;
	public readonly bindGroup: IGpuBindGroup;

	private translation: TVec3 = [0, 0, 0];
	private rotation: TQuat = [1, 0, 0, 0];
	private scalar: number = 1;

	readonly #modelData = new ArrayBuffer(Matrix4.byteLength + Matrix3.byteLength);
	readonly #modelMatrix = new Matrix4(this.#modelData, 0);
	readonly #normalMatrix = new Matrix3(this.#modelData, Matrix4.byteLength);

	constructor(protected readonly device: IGpuDevice, bindGroupLayout: IGpuBindGroupLayout) {
		// Allocate buffer and bind group
		this.transformBuffer = this.device.createBuffer({
			size: this.#modelData.byteLength,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
		});
		this.bindGroup = this.device.createBindGroup({
			layout: bindGroupLayout,
			entries: [{
				binding: 0,
				resource: { buffer: this.transformBuffer }
			}]
		});
	}

	public translate(x: number, y: number, z: number) {
		this.translation[0] = x;
		this.translation[1] = y;
		this.translation[2] = z;
		return this;
	}

	public rotate(pitch: number, yaw: number, roll?: number) {
		this.rotation = fromRotation(pitch, yaw, roll);
		return this;
	}

	public scale(scale: number) {
		this.scalar = scale;
		return this;
	}

	public writeBuffer() {
		this.#modelMatrix.postitionRotationScale(this.translation, this.rotation, this.scalar);
		// TODO Rework invese transform if supporting non-uniform scaling
		this.#normalMatrix.transposeRotation(inverse(this.rotation));
		this.device.queue.writeBuffer(
			this.transformBuffer, 0,
			this.#modelData, 0, this.#modelData.byteLength
		);
		return this;
	}

	abstract draw(passEncoder: IGpuRenderPassEncoder): void;

}
