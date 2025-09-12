import { SHADER_BUFFER } from "../constants";
import type { IGpuBindGroup, IGpuBindGroupLayout, IGpuBuffer, IGpuDevice, IGpuRenderPassEncoder } from "../interface";
import type { TVec3 } from "../utils";

export abstract class Model {

	private readonly transformBuffer: IGpuBuffer;
	public readonly bindGroup: IGpuBindGroup;

	private translation: TVec3 = [0, 0, 0];

	// TODO rotation and scaling support

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

	public writeBuffer() {
		const transformMatrix = new Float32Array([
			1, 0, 0, this.translation[0],
			0, 1, 0, this.translation[1],
			0, 0, 1, this.translation[2],
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
