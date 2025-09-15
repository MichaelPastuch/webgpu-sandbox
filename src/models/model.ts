import { SHADER_BUFFER } from "../constants";
import type { IGpuBindGroup, IGpuBindGroupLayout, IGpuBuffer, IGpuDevice, IGpuRenderPassEncoder } from "../interface";
import { fromRotation, matrixMultiply3, toMatrix, type TMatrix3, type TQuat, type TVec3 } from "../utils";

export abstract class Model {

	private readonly transformBuffer: IGpuBuffer;
	public readonly bindGroup: IGpuBindGroup;

	private translation: TVec3 = [0, 0, 0];
	private rotation: TQuat = [1, 0, 0, 0];
	private scalar: number = 1;

	// TODO Skew support

	constructor(protected readonly device: IGpuDevice, bindGroupLayout: IGpuBindGroupLayout) {
		// Allocate buffer and bind group
		this.transformBuffer = this.device.createBuffer({
			size: 4 * 16,
			usage: SHADER_BUFFER
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

	private scaleRotate(rotation: TMatrix3) {
		return matrixMultiply3([
			this.scalar, 0, 0,
			0, this.scalar, 0,
			0, 0, this.scalar
		], rotation);
	}

	public writeBuffer() {
		const rotation = toMatrix(this.rotation);
		// Skip scaling if not needed
		const mat3 = this.scalar !== 1
			? this.scaleRotate(rotation)
			: rotation
		// Merge scale & rotate into translation
		const transformMatrix = new Float32Array([
			mat3[0], mat3[1], mat3[2], this.translation[0],
			mat3[3], mat3[4], mat3[5], this.translation[1],
			mat3[6], mat3[7], mat3[8], this.translation[2],
			0, 0, 0, 1
		]);
		this.device.queue.writeBuffer(
			this.transformBuffer, 0,
			transformMatrix, 0, transformMatrix.length
		);
		return this;
	}

	abstract draw(passEncoder: IGpuRenderPassEncoder): void;

}
