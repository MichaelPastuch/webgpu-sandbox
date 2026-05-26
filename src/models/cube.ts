import { Color } from "../color";
import type { IGpuBindGroupLayout, IGpuBuffer, IGpuDevice, IGpuRenderPassEncoder } from "../interface";
import { Model } from "./model";

interface ICubeConfig {
	readonly width?: number;
	readonly height?: number;
	readonly depth?: number;
	readonly colors?: string;
}

type TPoint = [number, number, number];
type TFace = [TPoint, TPoint, TPoint, TPoint];

class Box {

	// Create box with corner a distance away from the origin
	constructor(
		private readonly x: number,
		private readonly y: number,
		private readonly z: number
	) { }

	// Four points for face where all X values are the same, anti-clockwise from "top-left"
	get xFace(): TFace {
		// Y is "up", z is "left"
		return [
			[-this.x, this.y, this.z],
			[-this.x, -this.y, this.z],
			[-this.x, -this.y, -this.z],
			[-this.x, this.y, -this.z]
		];
	}
	get yFace(): TFace {
		// X is "right", z is "down"
		return [
			[-this.x, -this.y, -this.z],
			[-this.x, -this.y, this.z],
			[this.x, -this.y, this.z],
			[this.x, -this.y, -this.z]
		];
	}
	get zFace(): TFace {
		// X is "right", Y is "up"
		return [
			[-this.x, this.y, -this.z],
			[-this.x, -this.y, -this.z],
			[this.x, -this.y, -this.z],
			[this.x, this.y, -this.z]
		];
	}
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
		const box = new Box(
			0.5 * width,
			0.5 * height,
			0.5 * depth
		);
		const xF = box.xFace;
		const yF = box.yFace;
		const zF = box.zFace;

		// Assemble each cube face
		const vertices = new Float32Array([
			// X
			// Top-left
			xF[0][0], xF[0][1], xF[0][2], -1, 0, 0, ...cols.next(),
			// Bottom-left
			xF[1][0], xF[1][1], xF[1][2], -1, 0, 0, ...cols.next(),
			// Bottom-right
			xF[2][0], xF[2][1], xF[2][2], -1, 0, 0, ...cols.next(),
			// Top-right
			xF[3][0], xF[3][1], xF[3][2], -1, 0, 0, ...cols.next(),

			// Y
			// Top-left
			yF[0][0], yF[0][1], yF[0][2], 0, -1, 0, ...cols.next(),
			// Bottom-left
			yF[1][0], yF[1][1], yF[1][2], 0, -1, 0, ...cols.next(),
			// Bottom-right
			yF[2][0], yF[2][1], yF[2][2], 0, -1, 0, ...cols.next(),
			// Top-right
			yF[3][0], yF[3][1], yF[3][2], 0, -1, 0, ...cols.next(),

			// Z
			// Top-left
			zF[0][0], zF[0][1], zF[0][2], 0, 0, -1, ...cols.next(),
			// Bottom-left
			zF[1][0], zF[1][1], zF[1][2], 0, 0, -1, ...cols.next(),
			// Bottom-right
			zF[2][0], zF[2][1], zF[2][2], 0, 0, -1, ...cols.next(),
			// Top-right
			zF[3][0], zF[3][1], zF[3][2], 0, 0, -1, ...cols.next(),

			// "Mirror" faces

			// -X
			// Top-left
			-xF[3][0], xF[3][1], xF[3][2], 1, 0, 0, ...cols.next(),
			// Bottom-left
			-xF[2][0], xF[2][1], xF[2][2], 1, 0, 0, ...cols.next(),
			// Bottom-right
			-xF[1][0], xF[1][1], xF[1][2], 1, 0, 0, ...cols.next(),
			// Top-right
			-xF[0][0], xF[0][1], xF[0][2], 1, 0, 0, ...cols.next(),

			// -Y
			// Top-left
			yF[3][0], -yF[3][1], yF[3][2], 0, 1, 0, ...cols.next(),
			// Bottom-left
			yF[2][0], -yF[2][1], yF[2][2], 0, 1, 0, ...cols.next(),
			// Bottom-right
			yF[1][0], -yF[1][1], yF[1][2], 0, 1, 0, ...cols.next(),
			// Top-right
			yF[0][0], -yF[0][1], yF[0][2], 0, 1, 0, ...cols.next(),

			// -Z
			// Top-left
			zF[3][0], zF[3][1], -zF[3][2], 0, 0, 1, ...cols.next(),
			// Bottom-left
			zF[2][0], zF[2][1], -zF[2][2], 0, 0, 1, ...cols.next(),
			// Bottom-right
			zF[1][0], zF[1][1], -zF[1][2], 0, 0, 1, ...cols.next(),
			// Top-right
			zF[0][0], zF[0][1], -zF[0][2], 0, 0, 1, ...cols.next()
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
