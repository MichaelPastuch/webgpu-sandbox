import { Color } from "../color";
import type { IGpuBindGroupLayout, IGpuBuffer, IGpuDevice, IGpuRenderPassEncoder } from "../interface";
import { Model } from "./model";

interface ICubeConfig {
	readonly width?: number;
	readonly height?: number;
	readonly depth?: number;
	readonly colors?: string;
}

export class Cube extends Model {

	private static indices(offset: number) {
		return [
			// Tl, bl, br
			offset, offset + 1, offset + 2,
			// Br, tr, tl
			offset + 2, offset + 3, offset
		];
	}

	private readonly vertexBuffer: IGpuBuffer;
	private readonly indexBuffer: IGpuBuffer;

	/** Triangle centered at origin */
	constructor(device: IGpuDevice, bindGroupLayout: IGpuBindGroupLayout, {
		width = 1,
		height = width,
		depth = width,
		colors = "ygbr"
	}: ICubeConfig = {}) {
		super(device, bindGroupLayout);
		const cols = new Color(colors);
		// Model the box as a simple pair of opposite points
		const x = 0.5 * width;
		const y = 0.5 * height;
		const z = 0.5 * depth;
		// Assemble each cube face
		const vertices = new Float32Array([
			// X: Y is "up", z is "right"
			x, y, -z, 1, 0, 0, ...cols.next(),
			x, -y, -z, 1, 0, 0, ...cols.next(),
			x, -y, z, 1, 0, 0, ...cols.next(),
			x, y, z, 1, 0, 0, ...cols.next(),
			// Y: X is "left", z is "down"
			x, y, -z, 0, 1, 0, ...cols.next(),
			x, y, z, 0, 1, 0, ...cols.next(),
			-x, y, z, 0, 1, 0, ...cols.next(),
			-x, y, -z, 0, 1, 0, ...cols.next(),
			// Z: X is "left", Y is "up"
			x, y, z, 0, 0, 1, ...cols.next(),
			x, -y, z, 0, 0, 1, ...cols.next(),
			-x, -y, z, 0, 0, 1, ...cols.next(),
			-x, y, z, 0, 0, 1, ...cols.next(),
			// -X: Y is "up", z is "left"
			-x, y, z, -1, 0, 0, ...cols.next(),
			-x, -y, z, -1, 0, 0, ...cols.next(),
			-x, -y, -z, -1, 0, 0, ...cols.next(),
			-x, y, -z, -1, 0, 0, ...cols.next(),
			// -Y: X is "right", z is "down"
			-x, -y, -z, 0, -1, 0, ...cols.next(),
			-x, -y, z, 0, -1, 0, ...cols.next(),
			x, -y, z, 0, -1, 0, ...cols.next(),
			x, -y, -z, 0, -1, 0, ...cols.next(),
			// -Z: X is "right", Y is "up"
			-x, y, -z, 0, 0, -1, ...cols.next(),
			-x, -y, -z, 0, 0, -1, ...cols.next(),
			x, -y, -z, 0, 0, -1, ...cols.next(),
			x, y, -z, 0, 0, -1, ...cols.next(),
		]);
		this.vertexBuffer = this.device.createBuffer({
			size: vertices.byteLength,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
		});
		this.device.queue.writeBuffer(
			this.vertexBuffer, 0,
			vertices, 0, vertices.length
		);

		// Create index buffer six sides with triangle pairs
		const indices = new Uint16Array([
			...Cube.indices(0),
			...Cube.indices(4),
			...Cube.indices(8),
			...Cube.indices(12),
			...Cube.indices(16),
			...Cube.indices(20)
		]);
		this.indexBuffer = this.device.createBuffer({
			size: indices.byteLength,
			usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
		});
		this.device.queue.writeBuffer(
			this.indexBuffer, 0,
			indices, 0, indices.length
		);
	}

	public draw(passEncoder: IGpuRenderPassEncoder) {
		passEncoder.setVertexBuffer(0, this.vertexBuffer);
		passEncoder.setIndexBuffer(this.indexBuffer, "uint16");
		passEncoder.drawIndexed(36);
	}

}
