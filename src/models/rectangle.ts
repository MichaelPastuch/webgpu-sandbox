import { Color } from "../color";
import { INDEX_BUFFER, VERTEX_BUFFER } from "../constants";
import type { IGpuBindGroupLayout, IGpuBuffer, IGpuDevice, IGpuRenderPassEncoder } from "../interface";
import { Model } from "./model";

interface IRectangleConfig {
	readonly width?: number;
	readonly height?: number;
	/** Color codes from top-left corner going anticlockwise */
	readonly colors?: string;
}

export class Rectangle extends Model {

	private readonly vertexBuffer: IGpuBuffer;
	private readonly indexBuffer: IGpuBuffer;

	/** Triangle centered at origin */
	constructor(device: IGpuDevice, bindGroupLayout: IGpuBindGroupLayout, {
		width = 1,
		height = width,
		colors = "ygbr"
	}: IRectangleConfig = {}) {
		super(device, bindGroupLayout);
		const x = 0.5 * width;
		const y = 0.5 * height;
		// Assemble rectangle (xyzw, rgba)
		const vertices = new Float32Array([
			// Top-left
			-x, y, 0, 1,
			...Color.fromChar(colors.at(0)),
			// Bottom-left
			-x, -y, 0, 1,
			...Color.fromChar(colors.at(1)),
			// Bottom-right
			x, -y, 0, 1,
			...Color.fromChar(colors.at(2)),
			// Top-right
			x, y, 0, 1,
			...Color.fromChar(colors.at(3)),
		]);
		this.vertexBuffer = this.device.createBuffer({
			size: vertices.byteLength,
			usage: VERTEX_BUFFER
		});
		this.device.queue.writeBuffer(
			this.vertexBuffer, 0,
			vertices, 0, vertices.length
		);

		// Create index buffer for two triangles
		const indices = new Uint16Array([
			// Tl, bl, br
			0, 1, 2,
			// Br, tr, tl
			2, 3, 0
		]);
		this.indexBuffer = this.device.createBuffer({
			size: indices.byteLength,
			usage: INDEX_BUFFER
		});
		this.device.queue.writeBuffer(
			this.indexBuffer, 0,
			indices, 0, indices.length
		);
	}

	public draw(passEncoder: IGpuRenderPassEncoder) {
		passEncoder.setVertexBuffer(0, this.vertexBuffer);
		passEncoder.setIndexBuffer(this.indexBuffer, "uint16");
		passEncoder.drawIndexed(6);
	}

}
