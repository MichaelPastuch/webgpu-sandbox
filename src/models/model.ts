import { SHADER_BUFFER } from "../constants";
import type { IGpuBindGroup, IGpuBindGroupLayout, IGpuBuffer, IGpuDevice, IGpuRenderPassEncoder } from "../interface";
import { fromRotation, toMatrix, type TQuat, type TVec3 } from "../utils";

export abstract class Model {

	private readonly transformBuffer: IGpuBuffer;
	public readonly bindGroup: IGpuBindGroup;

	private translation: TVec3 = [0, 0, 0];
	private rotation: TQuat = [1, 0, 0, 0];

	// TODO scaling support

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

	public writeBuffer() {
		const rotation = toMatrix(this.rotation);
		const transformMatrix = new Float32Array([
			rotation[0], rotation[1], rotation[2], this.translation[0],
			rotation[3], rotation[4], rotation[5], this.translation[1],
			rotation[6], rotation[7], rotation[8], this.translation[2],
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
