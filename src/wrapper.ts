import { Camera } from "./camera";
import { DEG_TO_RAD, DEPTH_TEXTURE, FRAGMENT_STAGE, HALF_PI, SHADER_BUFFER, VERTEX_STAGE } from "./constants";
import { type IGpu, type IGpuBindGroup, type IGpuBuffer, type IGpuCanvasContext, type IGpuDevice, type IGpuRenderPipeline, type IGpuShaderModule, type IGpuTexture, type TCanvasFormat } from "./interface";
import { Circle } from "./models/circle";
import type { Model } from "./models/model";
import { Rectangle } from "./models/rectangle";
import { Triangle } from "./models/trangle";
import type { TVec3 } from "./utils";

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
			device, canvas, context, gpu.getPreferredCanvasFormat(),
		);
	}

	private readonly module: IGpuShaderModule;

	private width: number = 0;
	private height: number = 0;
	private get aspect() {
		return this.width / this.height;
	}

	private depthTexture!: IGpuTexture;

	private readonly ambientBuffer: IGpuBuffer;
	private ambientColor: TVec3 = [0, 0, 0];

	public readonly camera: Camera;

	private readonly globalBindGroup: IGpuBindGroup;

	private readonly models: Model[];

	private readonly renderPipeline: IGpuRenderPipeline;

	private constructor(
		private readonly device: IGpuDevice,
		private readonly canvas: HTMLCanvasElement,
		private readonly context: IGpuCanvasContext,
		private readonly format: TCanvasFormat
	) {
		// Prepare context for WebGPU rendering
		this.context.configure({
			device: this.device,
			format: this.format,
			alphaMode: "premultiplied"
		});

		this.camera = new Camera(this.device);
		// Initialise dimensions, depth buffer, and camera aspect ratio
		this.resize(canvas.width, canvas.height);

		// TODO Function to create shader module
		// Prepare shaders
		const shaderSrc = document.getElementById("shaders");
		if (shaderSrc == null) {
			throw Error("Unable to locate shaders #shaders");
		}
		this.module = this.device.createShaderModule({
			code: shaderSrc.textContent
		});

		// Assemble ambient colour buffer
		this.ambientBuffer = this.device.createBuffer({
			// float32 rgb
			size: 4 * 3,
			usage: SHADER_BUFFER
		});

		// Bind global data for vertex/fragment shader usage
		const globalBindGroupLayout = this.device.createBindGroupLayout({
			entries: [{
				binding: 0,
				visibility: FRAGMENT_STAGE,
				buffer: { type: "uniform" }
			}]
		});
		this.globalBindGroup = this.device.createBindGroup({
			layout: globalBindGroupLayout,
			entries: [{
				binding: 0,
				resource: { buffer: this.ambientBuffer }
			}]
		});

		// Bind per-model data
		const modelBindGroupLayout = this.device.createBindGroupLayout({
			entries: [{
				binding: 0,
				visibility: VERTEX_STAGE,
				buffer: { type: "uniform" }
			}]
		});

		// Create pipeline layout
		const pipelineLayout = this.device.createPipelineLayout({
			bindGroupLayouts: [
				globalBindGroupLayout,
				this.camera.bindGroupLayout,
				modelBindGroupLayout
			]
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
						format: "float32x3"
					}, {
						// Normal
						shaderLocation: 1,
						offset: 12,
						format: "float32x3"
					}, {
						// Colour
						shaderLocation: 2,
						offset: 24,
						format: "float32x3"
					}],
					arrayStride: 36
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
			new Rectangle(this.device, modelBindGroupLayout, {
				width: 6
			})
				.translate(0, -1.5, 6)
				.rotate(HALF_PI, 0)
				.scale(2)
				.writeBuffer(),
			// Create circle (octagon)
			new Circle(device, modelBindGroupLayout, {
				radius: 3,
				numPoints: 16,
				colors: "01"
			})
				.translate(-6, 2, 12)
				.rotate(0, -Math.PI * 0.25)
				.writeBuffer(),
			// Create triangles
			new Triangle(this.device, modelBindGroupLayout, {
				width: 3,
				shiftTop: -0.75,
				colors: "cmy"
			})
				.translate(-1, 0, 9)
				.rotate(0, -Math.PI * 0.125)
				.writeBuffer(),
			new Triangle(this.device, modelBindGroupLayout)
				.translate(0, 0, 6)
				.rotate(0, 0, Math.PI)
				.writeBuffer(),
			new Triangle(this.device, modelBindGroupLayout, {
				width: 0.5,
				shiftTop: 1.25,
				colors: "100"
			})
				.translate(1, 0, 3)
				.rotate(0, Math.PI * 0.125)
				.writeBuffer()
		];
	}

	public resize(width: number, height: number) {
		// Update size if different
		if (this.width !== width || this.height !== height) {
			this.width = width;
			this.height = height;
			this.canvas.width = this.width;
			this.canvas.height = this.height;
			// Rebuild depth texture if different
			this.depthTexture?.destroy();
			this.depthTexture = this.device.createTexture({
				format: "depth24plus",
				size: [this.width, this.height],
				usage: DEPTH_TEXTURE
			});
			// Update projection matrix
			this.camera.updateProjection(1, 100, this.aspect, 45 * DEG_TO_RAD);
		}
	}

	public setAmbientColor(red: number, green: number, blue: number) {
		this.ambientColor = [red, green, blue];
	}

	// TODO Scenegraph system
	public render() {
		// Assume ambient colour may have changed each frame
		const ambientCols = new Float32Array(this.ambientColor);
		this.device.queue.writeBuffer(
			this.ambientBuffer, 0,
			ambientCols, 0, ambientCols.length
		);

		// Assemble GPU work batch
		const commandEncoder = this.device.createCommandEncoder();

		// Prepare render pass - clear canvas and draw triangle to it
		const passEncoder = commandEncoder.beginRenderPass({
			colorAttachments: [{
				clearValue: [...this.ambientColor, 1],
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
		passEncoder.setBindGroup(0, this.globalBindGroup);
		passEncoder.setBindGroup(1, this.camera.bindGroup);

		// Draw models
		this.models.forEach((model) => {
			passEncoder.setBindGroup(2, model.bindGroup);
			model.draw(passEncoder);
		});

		// Complete render pass
		passEncoder.end();

		// Submit commands to GPU
		this.device.queue.submit([commandEncoder.finish()]);
	}

}
