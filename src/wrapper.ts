import { SHADER_BUFFER, VERTEX_STAGE } from "./constants";
import { type IGpu, type IGpuBindGroup, type IGpuBuffer, type IGpuCanvasContext, type IGpuDevice, type IGpuRenderPipeline, type IGpuShaderModule, type TCanvasFormat, type TRgba } from "./interface";
import { Triangle } from "./models/trangle";

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

	private readonly triangle: Triangle;
	private readonly triangleFriend: Triangle;
	private readonly triangleFoe: Triangle;

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
		this.triangle = new Triangle(this.device, {
			width: 1.5,
			shiftTop: -1,
			colors: "cmy"
		});
		this.triangleFriend = new Triangle(this.device);
		this.triangleFoe = new Triangle(this.device, {
			width: 0.5,
			shiftTop: 0.5,
			colors: "100"
		});

		// Assemble ambient colour buffer
		this.ambientBuffer = this.device.createBuffer({
			// float32 rgb
			size: 4 * 3,
			usage: SHADER_BUFFER
		});
		this.setAmbientColour(0.5, 0.6, 0.8);

		// Bind data for vertex/fragment shader usage

		const bindGroupLayout = this.device.createBindGroupLayout({
			entries: [{
				binding: 0,
				visibility: VERTEX_STAGE,
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

		// Draw shapes
		this.triangle.draw(passEncoder);
		this.triangleFriend.draw(passEncoder);
		this.triangleFoe.draw(passEncoder);

		// Complete render pass
		passEncoder.end();

		// Submit commands to GPU
		this.device.queue.submit([commandEncoder.finish()]);
	}

}
