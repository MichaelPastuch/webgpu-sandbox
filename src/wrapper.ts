import { Camera } from "./camera";
import { DEPTH_TEXTURE, SHADER_BUFFER, VERTEX_STAGE } from "./constants";
import { type IGpu, type IGpuBindGroup, type IGpuBuffer, type IGpuCanvasContext, type IGpuDevice, type IGpuRenderPipeline, type IGpuShaderModule, type IGpuTexture, type TCanvasFormat, type TRgba } from "./interface";
import type { IModel } from "./models/interface";
import { Rectangle } from "./models/rectangle";
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
		return new Wrapper(
			device, context, gpu.getPreferredCanvasFormat(),
			canvas.width, canvas.height
		);
	}

	private readonly module: IGpuShaderModule;

	private readonly depthTexture: IGpuTexture;

	private readonly camera: Camera;
	private cameraX = 0.0;
	private cameraY = 0.0;

	private readonly ambientBuffer: IGpuBuffer;
	private clearValue: TRgba = [0, 0, 0, 0];

	private readonly bindGroup: IGpuBindGroup;
	private readonly renderPipeline: IGpuRenderPipeline;

	private readonly models: IModel[];

	private constructor(
		private readonly device: IGpuDevice,
		private readonly context: IGpuCanvasContext,
		private readonly format: TCanvasFormat,
		width: number,
		height: number
	) {

		// Prepare context for WebGPU rendering
		this.context.configure({
			device: this.device,
			format: this.format,
			alphaMode: "premultiplied"
		});

		this.depthTexture = this.device.createTexture({
			format: "depth24plus",
			size: [width, height],
			usage: DEPTH_TEXTURE
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

		// TODO update projection when canvas is resized
		this.camera = new Camera(this.device);
		this.camera.updateProjection(1, 4, width / height, Math.PI * 0.2);
		this.nudgeCamera(0, 0);

		// Assemble ambient colour buffer
		this.ambientBuffer = this.device.createBuffer({
			// float32 rgb
			size: 4 * 3,
			usage: SHADER_BUFFER
		});
		this.setAmbientColour(0.8, 0.8, 0.8);

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
			bindGroupLayouts: [this.camera.bindGroupLayout, bindGroupLayout]
		});

		// TODO Functions to create/update pipeline with entryPoints and constants
		// Input assembly - describe vertex assembly and wgsl entry points
		this.renderPipeline = this.device.createRenderPipeline({
			layout: pipelineLayout,
			// Default primitive assemble, here for illustration purposes
			primitive: {
				cullMode: "back",
				topology: "triangle-list"
			},
			depthStencil: {
				depthWriteEnabled: true,
				depthCompare: "less",
				format: this.depthTexture.format
			},
			vertex: {
				module: this.module,
				entryPoint: "vertexShader",
				buffers: [{
					attributes: [{
						// Position
						shaderLocation: 0,
						offset: 0,
						format: "float32x4"
					}, {
						// Colour
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

		// TODO Function to create models for cuboid, sphere, etc.
		this.models = [
			// Create rectangle
			new Rectangle(this.device, {
				width: 2.5
			}),
			// Create triangles
			new Triangle(this.device, {
				width: 1.5,
				shiftTop: -0.75,
				colors: "cmy"
			}),
			new Triangle(this.device),
			new Triangle(this.device, {
				width: 0.5,
				shiftTop: 1.25,
				colors: "100"
			})
		];
	}

	public setAmbientColour(red: number, green: number, blue: number) {
		this.clearValue = [red, green, blue, 1];
		const ambientCols = new Float32Array([red, green, blue]);
		this.device.queue.writeBuffer(
			this.ambientBuffer, 0,
			ambientCols, 0, ambientCols.length
		);
	}

	public nudgeCamera(nudgeX: number, nudgeY: number) {
		this.cameraX += nudgeX;
		this.cameraY += nudgeY;
		this.camera.updateView([this.cameraX, this.cameraY, 1], [0, 0, 0]);
		// this.camera.updateView([0, 0, 1], [this.cameraX, this.cameraY, 0]);
		this.camera.writeBuffer();
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
			}],
			depthStencilAttachment: {
				depthClearValue: 1.0,
				depthLoadOp: "clear",
				depthStoreOp: "store",
				view: this.depthTexture.createView()
			}
		});

		// Render pipeline and bind groups
		passEncoder.setPipeline(this.renderPipeline);
		passEncoder.setBindGroup(0, this.camera.bindGroup);
		passEncoder.setBindGroup(1, this.bindGroup);

		// Draw models
		this.models.forEach((model) => model.draw(passEncoder));

		// Complete render pass
		passEncoder.end();

		// Submit commands to GPU
		this.device.queue.submit([commandEncoder.finish()]);
	}

}
