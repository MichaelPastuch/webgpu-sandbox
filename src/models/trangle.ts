import { VERTEX_BUFFER } from "../constants";
import type { IGpuBuffer, IGpuDevice, IGpuRenderPassEncoder } from "../interface";

type TColor = [number, number, number, number];

interface ITriangleConfig {
	readonly width?: number;
	readonly height?: number;
	readonly shiftTop?: number;
	/** Color codes for top, bottom-left, and bottom-right points */
	readonly colors?: string;
}

export class Triangle {

	private readonly vertexBuffer: IGpuBuffer;

	// TODO Move to Colors static class
	private static readonly red: TColor = [1, 0, 0, 1];
	private static readonly green: TColor = [0, 1, 0, 1];
	private static readonly blue: TColor = [0, 0, 1, 1];
	private static readonly cyan: TColor = [0, 1, 1, 1];
	private static readonly magenta: TColor = [1, 0, 1, 1];
	private static readonly yellow: TColor = [1, 1, 0, 1];
	private static readonly black: TColor = [0, 0, 0, 1];
	private static readonly white: TColor = [1, 1, 1, 1];

	private static readonly colMap: ReadonlyMap<string, TColor> = new Map([
		["r", this.red],
		["g", this.green],
		["b", this.blue],
		["c", this.cyan],
		["m", this.magenta],
		["y", this.yellow],
		["0", this.black],
		["1", this.white]
	]);

	private static fromChar(character?: string) {
		return (character ? this.colMap.get(character) : null) ?? this.black;
	}

	/**
	 * Triangle centered at origin with given width and height,
	 * optional support to shift the top point along the x-axis
	 */
	constructor(private readonly device: IGpuDevice, {
		width = 1,
		height = width,
		shiftTop = 0,
		colors = "rgb"
	}: ITriangleConfig = {}) {

		const x = 0.5 * width;
		const y = 0.5 * height;
		// Assemble triangle
		const vertices = new Float32Array([
			// Top
			// xyzw
			x * shiftTop, y, 0, 1,
			// rgba
			...Triangle.fromChar(colors.at(0)),
			// 0, 1, 1, 1,
			// Bottom-left
			-x, -y, 0, 1,
			...Triangle.fromChar(colors.at(1)),
			// Bottom-right
			x, -y, 0, 1,
			...Triangle.fromChar(colors.at(2))
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
