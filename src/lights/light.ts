import { SHADER_BUFFER } from "../constants";
import type { IGpuBindGroup, IGpuBindGroupLayout, IGpuBuffer, IGpuDevice } from "../interface";
import { type TVec3 } from "../utils";

export class Light {

	#position: TVec3 = [0, 0, 0];
	#color: TVec3 = [1, 1, 1];
	// #attenuation: TVec3 = [1, 0.22, 0.20];
	#attenuation: TVec3 = [1, 0.14, 0.07];

	private readonly lightBuffer: IGpuBuffer;
	public readonly bindGroup: IGpuBindGroup;

	constructor(private readonly device: IGpuDevice, bindGroupLayout: IGpuBindGroupLayout) {
		this.lightBuffer = this.device.createBuffer({
			size: 4 * (3 * 4),
			usage: SHADER_BUFFER
		});
		this.bindGroup = this.device.createBindGroup({
			layout: bindGroupLayout,
			entries: [{
				binding: 0,
				resource: { buffer: this.lightBuffer }
			}]
		});
	}

	public position(x: number, y: number, z: number) {
		this.#position[0] = x;
		this.#position[1] = y;
		this.#position[2] = z;
		return this;
	}

	public color(r: number, g: number, b: number) {
		this.#color[0] = r;
		this.#color[1] = g;
		this.#color[2] = b;
		return this;
	}

	public writeBuffer() {
		const lightData = new Float32Array([
			...this.#position, 0,
			...this.#color, 0,
			...this.#attenuation, 0
		]);
		this.device.queue.writeBuffer(
			this.lightBuffer, 0,
			lightData, 0, lightData.length
		);
		return this;
	}

}
