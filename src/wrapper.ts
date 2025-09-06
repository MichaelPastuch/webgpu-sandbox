import { type IGpu, type IGpuBuffer, type IGpuCanvasContext, type IGpuDevice, type IGpuRenderPipeline, type IGpuShaderModule, type IRgba, type TCanvasFormat } from "./interface";

// Annotate global bitwise values
declare var GPUBufferUsage: {
	readonly VERTEX: number;
	readonly COPY_DST: number;
}

export class Wrapper {

	public static async create(canvas: HTMLCanvasElement, gpu: IGpu) {
		const context = canvas.getContext("webgpu") as unknown as IGpuCanvasContext;
		if (context == null) {
			throw Error("Unable to get webgpu canvas context");
		}
		const adapter = await gpu.requestAdapter();
		if (adapter == null) {
			throw Error("gpu.requestAdapter failed");
		}
		const device = await adapter.requestDevice();
		return new Wrapper(context, gpu.getPreferredCanvasFormat(), device);
	}

	private readonly module: IGpuShaderModule;
	private readonly vertexBuffer: IGpuBuffer;
	private readonly renderPipeline: IGpuRenderPipeline;

	private constructor(
		private readonly context: IGpuCanvasContext,
		private readonly format: TCanvasFormat,
		private readonly device: IGpuDevice
	) {

		// Prepare context for WebGPU rendering
		this.context.configure({
			device: this.device,
			format: this.format,
			alphaMode: "premultiplied"
		});

		// TODO Function to create shader module
		// Prepare shaders
		const shaderSrc = document.getElementById("shaders");
		if (shaderSrc == null) {
			throw Error("Unable to locate shaders #shaders");
		}
		this.module = device.createShaderModule({
			code: shaderSrc.textContent
		});

		// TODO Function to create vertex buffer, preset helpers for rectangle, cuboid, sphere, etc.
		// Assemble triangle
		const vertices = new Float32Array([
			// Top
			// xyzw
			0.0, 0.6, 0, 1,
			// rgba
			0, 1, 1, 1,
			// Bottom-left
			-0.6, -0.6, 0, 1,
			1, 0, 1, 1,
			// Bottom-right
			0.6, -0.6, 0, 1,
			1, 1, 0, 1
		]);
		this.vertexBuffer = device.createBuffer({
			size: vertices.byteLength,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
		});
		this.device.queue.writeBuffer(
			this.vertexBuffer, 0,
			vertices, 0, vertices.length
		);

		// TODO Functions to create/update pipeline with entryPoints and constants
		// Input assembly - describe vertex assembly and wgsl entry points
		this.renderPipeline = device.createRenderPipeline({
			vertex: {
				module: this.module,
				entryPoint: "vertexShader",
				buffers: [{
					attributes: [{
						shaderLocation: 0,
						offset: 0,
						format: "float32x4"
					}, {
						shaderLocation: 1,
						offset: 16,
						format: "float32x4"
					}],
					arrayStride: 32
				}]
			},
			fragment: {
				module: this.module,
				entryPoint: "fragmentShader",
				targets: [{
					format: this.format
				}]
			},
			// Default primitive assemble, here for illustration purposes
			primitive: {
				topology: "triangle-list"
			},
			layout: "auto"
		});
	}

	// TODO Scenegraph system
	public render(clearValue: IRgba = { r: 0, g: 0, b: 0.2, a: 1 }) {
		// console.debug(clearValue);

		// Assemble GPU work batch
		const commandEncoder = this.device.createCommandEncoder();

		// Prepare render pass - clear canvas and draw triangle to it
		const passEncoder = commandEncoder.beginRenderPass({
			colorAttachments: [{
				clearValue,
				loadOp: "clear",
				storeOp: "store",
				view: this.context.getCurrentTexture().createView()
			}]
		});

		// Attach pipeline and bind buffer
		passEncoder.setPipeline(this.renderPipeline);
		passEncoder.setVertexBuffer(0, this.vertexBuffer);

		// Draw 3 vertex triangle
		passEncoder.draw(3);

		// Complete render pass
		passEncoder.end();

		// Submit commands to GPU
		this.device.queue.submit([commandEncoder.finish()]);
	}

}
