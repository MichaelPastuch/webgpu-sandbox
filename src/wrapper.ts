import { Camera } from "./camera";
import { DEG_TO_RAD, DEPTH_TEXTURE, HALF_PI, SHADER_BUFFER, VERTEX_STAGE } from "./constants";
import { type IGpu, type IGpuBindGroup, type IGpuBuffer, type IGpuCanvasContext, type IGpuDevice, type IGpuRenderPipeline, type IGpuShaderModule, type IGpuTexture, type TCanvasFormat, type TRgba } from "./interface";
import type { Model } from "./models/model";
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

	private readonly ambientBuffer: IGpuBuffer;
	private clearValue: TRgba = [0, 0, 0, 0];

	public readonly camera: Camera;

	private readonly globalBindGroup: IGpuBindGroup;

	private readonly models: Model[];

	private readonly renderPipeline: IGpuRenderPipeline;

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
		this.camera.updateProjection(1, 100, width / height, 45 * DEG_TO_RAD);

		// Assemble ambient colour buffer
		this.ambientBuffer = this.device.createBuffer({
			// float32 rgb
			size: 4 * 3,
			usage: SHADER_BUFFER
		});
		this.setAmbientColour(0.8, 0.8, 0.8);

		// Bind global data for vertex/fragment shader usage
		const globalBindGroupLayout = this.device.createBindGroupLayout({
			entries: [{
				binding: 0,
				visibility: VERTEX_STAGE,
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
			new Rectangle(this.device, modelBindGroupLayout, {
				width: 6
			})
				.translate(0, -1.5, 6)
				.rotate(HALF_PI, 0)
				.scale(2)
				.writeBuffer(),
			// Create triangles
			new Triangle(this.device, modelBindGroupLayout, {
				width: 3,
				shiftTop: -0.75,
				colors: "cmy"
			})
				.translate(-1, 0, 9)
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
				.writeBuffer()
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

	public positionCamera(moveX: number, moveY: number, moveZ: number) {
		// Focus at the mid-point of all shapes
		this.camera.updateViewFocus([moveX, moveY, moveZ], [0, 0, 6]);
		// Move focus from a little bit back
		// this.camera.updateViewFocus([0, 0, -1], [moveX, moveY, moveZ]);
		this.camera.writeBuffer();
	}

	public updateFov(newFov: number) {
		this.camera.updateFov(newFov);
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
