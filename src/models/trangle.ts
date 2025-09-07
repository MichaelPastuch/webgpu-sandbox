import { Color } from "../color";
import { VERTEX_BUFFER } from "../constants";
import type { IGpuBuffer, IGpuDevice, IGpuRenderPassEncoder } from "../interface";

interface ITriangleConfig {
	readonly width?: number;
	readonly height?: number;
	/** Offset top point from triangle center as a fraction of width */
	readonly shiftTop?: number;
	/** Color codes for top, bottom-left, and bottom-right points */
	readonly colors?: string;
}

export class Triangle {

	private readonly vertexBuffer: IGpuBuffer;

	/** Triangle centered at origin */
	constructor(private readonly device: IGpuDevice, {
		width = 1,
		height = width,
		shiftTop = 0,
		colors = "rgb"
	}: ITriangleConfig = {}) {

		const x = 0.5 * width;
		const y = 0.5 * height;
		// Assemble triangle (xyzw, rgba)
		const vertices = new Float32Array([
			// Top
			x * shiftTop, y, 0, 1,
			...Color.fromChar(colors.at(0)),
			// Bottom-left
			-x, -y, 0, 1,
			...Color.fromChar(colors.at(1)),
			// Bottom-right
			x, -y, 0, 1,
			...Color.fromChar(colors.at(2))
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

	public draw(passEncoder: IGpuRenderPassEncoder, slot = 0) {
		passEncoder.setVertexBuffer(slot, this.vertexBuffer);
		passEncoder.draw(3);
	}

}
