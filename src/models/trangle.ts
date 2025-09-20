import { Color } from "../color";
import { VERTEX_BUFFER } from "../constants";
import type { IGpuBindGroupLayout, IGpuBuffer, IGpuDevice, IGpuRenderPassEncoder } from "../interface";
import { Model } from "./model";

interface ITriangleConfig {
	readonly width?: number;
	readonly height?: number;
	/** Offset top point from triangle center as a fraction of width */
	readonly shiftTop?: number;
	/** Color codes for top, bottom-left, and bottom-right points */
	readonly colors?: string;
}

export class Triangle extends Model {

	private readonly vertexBuffer: IGpuBuffer;

	/** Triangle centered at origin */
	constructor(device: IGpuDevice, bindGroupLayout: IGpuBindGroupLayout, {
		width = 1,
		height = width,
		shiftTop = 0,
		colors = "rgb"
	}: ITriangleConfig = {}) {
		super(device, bindGroupLayout);
		const cols = new Color(colors);
		const x = 0.5 * width;
		const y = 0.5 * height;
		// Assemble triangle (xyzw, rgba)
		const vertices = new Float32Array([
			// Top
			x * shiftTop, y, 0, 1,
			...cols.next(),
			// Bottom-left
			-x, -y, 0, 1,
			...cols.next(),
			// Bottom-right
			x, -y, 0, 1,
			...cols.next()
		]);
		this.vertexBuffer = this.device.createBuffer({
			size: vertices.byteLength,
			usage: VERTEX_BUFFER
		});
		this.device.queue.writeBuffer(
			this.vertexBuffer, 0,
			vertices, 0, vertices.length
		);
	}

	public draw(passEncoder: IGpuRenderPassEncoder) {
		passEncoder.setVertexBuffer(0, this.vertexBuffer);
		passEncoder.draw(3);
	}

}
