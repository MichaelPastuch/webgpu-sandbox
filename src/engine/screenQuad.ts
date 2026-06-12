import type { IGpuBuffer, IGpuDevice, IGpuRenderPassEncoder } from "../interface";

// Intended for drawing as part of a triangle strip
export class ScreenQuad {

	private readonly vertexBuffer: IGpuBuffer;

	constructor(device: IGpuDevice) {
		// Assemble rectangle points, (ABC, CBD)
		const vertices = new Float32Array([
			// Bottom-left
			-1, -1, 0,
			// Bottom-right
			1, -1, 0,
			// Top-left
			-1, 1, 0,
			// Top-right
			1, 1, 0
		]);
		this.vertexBuffer = device.createBuffer({
			size: vertices.byteLength,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
		});
		device.queue.writeBuffer(
			this.vertexBuffer, 0,
			vertices, 0, vertices.length
		);
	}

	public draw(passEncoder: IGpuRenderPassEncoder) {
		passEncoder.setVertexBuffer(0, this.vertexBuffer);
		passEncoder.draw(4);
	}

}
