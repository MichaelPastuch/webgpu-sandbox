import { type IGpu, type IGpuBuffer, type IGpuCanvasContext, type IGpuDevice, type IGpuRenderPipeline, type IGpuShaderModule, type TRgba, type TCanvasFormat, type IGpuBindGroup } from "./interface";

// Annotate global bitwise values
declare var GPUBufferUsage: {
	readonly VERTEX: number;
	readonly COPY_DST: number;
	readonly UNIFORM: number;
}

declare var GPUShaderStage: {
	readonly VERTEX: number;
	readonly FRAGMENT: number;
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
	private readonly ambientBuffer: IGpuBuffer;
	private clearValue: TRgba = [0, 0, 0, 0];

	private bindGroup: IGpuBindGroup;
	private renderPipeline: IGpuRenderPipeline;

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
		this.module = this.device.createShaderModule({
			code: shaderSrc.textContent
		});

		// TODO Function to create vertex buffer, preset helpers for rectangle, cuboid, sphere, etc.
		// Assemble triangle
		const vertices = new Float32Array([
			// Top
			// xyzw
			0, 0.6, 0, 1,
			// rgba
			0, 1, 1, 1,
			// Bottom-left
			-0.6, -0.6, 0, 1,
			1, 0, 1, 1,
			// Bottom-right
			0.6, -0.6, 0, 1,
			1, 1, 0, 1
		]);
		this.vertexBuffer = this.device.createBuffer({
			size: vertices.byteLength,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
		});
		this.device.queue.writeBuffer(
			this.vertexBuffer, 0,
			vertices, 0, vertices.length
		);

		// Assemble ambient colour buffer
		this.ambientBuffer = this.device.createBuffer({
			// float32 rgb
			size: 4 * 3,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
		});
		this.setAmbientColour(0.5, 0.6, 0.8);

		// Bind data for vertex/fragment shader usage

		const bindGroupLayout = this.device.createBindGroupLayout({
			entries: [{
				binding: 0,
				visibility: GPUShaderStage.VERTEX,
				buffer: { type: "uniform" }
			}]
		});
		this.bindGroup = this.device.createBindGroup({
			layout: bindGroupLayout,
			entries: [{
				binding: 0,
				resource: { buffer: this.ambientBuffer }
			}]
		});

		// Create pipeline layout
		const pipelineLayout = this.device.createPipelineLayout({
			bindGroupLayouts: [
				bindGroupLayout
			]
		});

		// TODO Functions to create/update pipeline with entryPoints and constants
		// Input assembly - describe vertex assembly and wgsl entry points
		this.renderPipeline = this.device.createRenderPipeline({
			layout: pipelineLayout,
			// Default primitive assemble, here for illustration purposes
			primitive: { topology: "triangle-list" },
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
			}
		});
	}

	public setAmbientColour(red: number, green: number, blue: number) {
		this.clearValue = [red, green, blue, 1];
		const ambientCols = new Float32Array([red, green, blue]);
		this.device.queue.writeBuffer(
			this.ambientBuffer, 0,
			ambientCols, 0, ambientCols.length
		);
	}

	// TODO Scenegraph system
	public render() {

		// Assemble GPU work batch
		const commandEncoder = this.device.createCommandEncoder();

		// Prepare render pass - clear canvas and draw triangle to it
		const passEncoder = commandEncoder.beginRenderPass({
			colorAttachments: [{
				clearValue: this.clearValue,
				loadOp: "clear",
				storeOp: "store",
				view: this.context.getCurrentTexture().createView()
			}]
		});

		// Render pipeline and bind groups
		passEncoder.setPipeline(this.renderPipeline);
		passEncoder.setBindGroup(0, this.bindGroup);

		// Draw 3 vertex triangle
		passEncoder.setVertexBuffer(0, this.vertexBuffer);
		passEncoder.draw(3);

		// Complete render pass
		passEncoder.end();

		// Submit commands to GPU
		this.device.queue.submit([commandEncoder.finish()]);
	}

}
