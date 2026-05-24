import type { IGpuBindGroup, IGpuBindGroupLayout, IGpuBuffer, IGpuDevice } from "../interface";
import { Vector3 } from "../vector/vector3";

export class Light {

	readonly #lightBuffer: IGpuBuffer;
	readonly #lightData = new ArrayBuffer(3 * Vector3.byteLength);

	#position = new Vector3(this.#lightData, 0);
	#color = new Vector3(this.#lightData, Vector3.byteLength);
	#attenuation = new Vector3(this.#lightData, 2 * Vector3.byteLength);

	public readonly bindGroup: IGpuBindGroup;

	constructor(private readonly device: IGpuDevice, bindGroupLayout: IGpuBindGroupLayout) {
		this.#position.set(0, 0, 0);
		this.#color.set(1, 1, 1);
		// this.#attenuation.set(1, 0.22, 0.20);
		this.#attenuation.set(1, 0.14, 0.07);
		this.#lightBuffer = this.device.createBuffer({
			size: this.#lightData.byteLength,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
		});
		this.bindGroup = this.device.createBindGroup({
			layout: bindGroupLayout,
			entries: [{
				binding: 0,
				resource: { buffer: this.#lightBuffer }
			}]
		});
	}

	public position(x: number, y: number, z: number) {
		this.#position.set(x, y, z);
		return this;
	}

	public color(r: number, g: number, b: number) {
		this.#color.set(r, g, b);
		return this;
	}

	public writeBuffer() {
		this.device.queue.writeBuffer(
			this.#lightBuffer, 0,
			this.#lightData, 0, this.#lightData.byteLength
		);
		return this;
	}

}
