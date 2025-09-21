import { Color } from "../color";
import { INDEX_BUFFER, TWO_PI, VERTEX_BUFFER } from "../constants";
import type { IGpuBindGroupLayout, IGpuBuffer, IGpuDevice, IGpuRenderPassEncoder } from "../interface";
import { wrap } from "../utils";
import { Model } from "./model";

interface ICircleConfig {
	/** Distance from center to each vertex */
	readonly radius?: number;
	/** Ideally a factor of 360, must be greater than 2 */
	readonly numPoints?: number;
	/** Color codes from top-left corner going anticlockwise */
	readonly colors?: string;
}

export class Circle extends Model {

	private readonly vertexBuffer: IGpuBuffer;
	private readonly indexBuffer: IGpuBuffer;
	private readonly indexCount: number;

	/** Triangle centered at origin */
	constructor(device: IGpuDevice, bindGroupLayout: IGpuBindGroupLayout, {
		radius = 1,
		numPoints = 5,
		colors = "rgbym"
	}: ICircleConfig = {}) {
		super(device, bindGroupLayout);
		if (numPoints < 3) {
			throw Error("Circle must have at least 3 points");
		}
		const cols = new Color(colors);
		// Assemble circle, sampling anticlockwise
		const anglePerSample = -TWO_PI / numPoints;
		const circleData: number[] = [];
		for (let sample = 0; sample < numPoints; sample++) {
			// Produce x/y coordinates for each circle sample point, anti-clockwise
			const angle = sample * anglePerSample;
			circleData.push(
				radius * Math.sin(angle), radius * Math.cos(angle), 0,
				0, 0, -1,
				...cols.next()
			);
		}
		const vertices = new Float32Array(circleData);
		this.vertexBuffer = this.device.createBuffer({
			size: vertices.byteLength,
			usage: VERTEX_BUFFER
		});
		this.device.queue.writeBuffer(
			this.vertexBuffer, 0,
			vertices, 0, vertices.length
		);

		const numTris = numPoints - 2;
		// Track indices for assembling alternate triangles
		let startIdx = 1;
		let endIdx = 0;
		const wrapIndex = wrap(0, numPoints);
		const circleIndices: number[] = [];
		// Assemble triangle "strip" from remaining points
		for (let tri = 0; tri < numTris; tri++) {
			if ((tri & 1) === 0) {
				const forward = startIdx + 1;
				circleIndices.push(startIdx, forward, endIdx);
				// Forward to next triangle
				startIdx = forward;
			} else {
				const backward = wrapIndex(endIdx, -1);
				circleIndices.push(startIdx, backward, endIdx);
				// Backward to next triangle
				endIdx = backward;
			}
		}
		// Index arrays must have at least 4 entries
		if (numTris === 1) {
			circleIndices.push(0);
		}
		this.indexCount = circleIndices.length;

		// Create index buffer for two triangles
		const indices = new Uint16Array(circleIndices);
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
		passEncoder.drawIndexed(this.indexCount);
	}

}
