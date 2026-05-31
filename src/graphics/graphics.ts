import { DEG_TO_RAD, HALF_PI } from "../constants";
import { type IGpu, type IGpuBindGroup, type IGpuBindGroupLayout, type IGpuBuffer, type IGpuCanvasContext, type IGpuDevice, type IGpuRenderPipeline, type IGpuSampler, type IGpuShaderModule, type IGpuTexture, type IGpuTextureDescriptor, type TCanvasFormat } from "../interface";
import { Light } from "../lights/light";
import { Circle } from "../models/circle";
import { Cuboid } from "../models/cuboid";
import type { Model } from "../models/model";
import { Rectangle } from "../models/rectangle";
import { Triangle } from "../models/trangle";
import { Vector3 } from "../vector/vector3";
import { Camera } from "./camera";
import shaders from "./shaders.wgsl";

export class Graphics {

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
		return new Graphics(
			device, canvas, context, gpu.getPreferredCanvasFormat(),
		);
	}

	private readonly module: IGpuShaderModule;

	private width: number = 0;
	private height: number = 0;
	private get aspect() {
		return this.width / this.height;
	}

	private readonly depthTextureFormat = "depth24plus";
	private depthTexture!: IGpuTexture;
	private gBufferNormal!: IGpuTexture;
	private gBufferColor!: IGpuTexture;

	readonly #ambientBuffer: IGpuBuffer;
	readonly #ambientData = new ArrayBuffer(Vector3.byteLength);
	readonly #amblentColor = new Vector3(this.#ambientData, 0);
	readonly #clearColor: [number, number, number, number] = [0, 0, 0, 1];

	public readonly camera: Camera;
	private readonly globalBindGroup: IGpuBindGroup;
	private readonly basicSampler: IGpuSampler;

	private readonly models: Model[];
	public readonly light: Light;
	private readonly forwardPipeline: IGpuRenderPipeline;

	private readonly deferredBindGroupLayout: IGpuBindGroupLayout;
	private deferredBindGroup!: IGpuBindGroup;
	private readonly lights: Model[];
	private readonly deferredPipeline: IGpuRenderPipeline;

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

		// Prepare shaders
		this.module = this.device.createShaderModule({
			code: shaders
		});
		this.basicSampler = device.createSampler();

		// Assemble ambient colour buffer
		this.#ambientBuffer = this.device.createBuffer({
			// rgb
			size: this.#ambientData.byteLength,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
		});

		// Bind global data for vertex/fragment shader usage
		const globalBindGroupLayout = this.device.createBindGroupLayout({
			entries: [{
				binding: 0,
				visibility: GPUShaderStage.FRAGMENT,
				buffer: { type: "uniform" }
			}]
		});
		this.globalBindGroup = this.device.createBindGroup({
			layout: globalBindGroupLayout,
			entries: [{
				binding: 0,
				resource: { buffer: this.#ambientBuffer }
			}]
		});

		// Bind per-model data
		const modelBindGroupLayout = this.device.createBindGroupLayout({
			entries: [{
				binding: 0,
				visibility: GPUShaderStage.VERTEX,
				buffer: { type: "uniform" }
			}]
		});

		// Bind light data
		const lightBindGroupLayout = this.device.createBindGroupLayout({
			entries: [{
				binding: 0,
				visibility: GPUShaderStage.FRAGMENT,
				buffer: { type: "uniform" }
			}]
		});

		// Bind deferred pass sampler and textures
		this.deferredBindGroupLayout = this.device.createBindGroupLayout({
			entries: [{
				// Read depth buffer & gbuffers
				binding: 0,
				visibility: GPUShaderStage.FRAGMENT,
				sampler: {
					type: "non-filtering"
				}
			}, {
				binding: 1,
				visibility: GPUShaderStage.FRAGMENT,
				texture: {
					sampleType: "depth"
				}
			}, {
				binding: 2,
				visibility: GPUShaderStage.FRAGMENT,
				texture: {
					sampleType: "float"
				}
			}, {
				binding: 3,
				visibility: GPUShaderStage.FRAGMENT,
				texture: {
					sampleType: "float"
				}
			}]
		});

		// Forward pass single light
		this.light = new Light(this.device, lightBindGroupLayout);

		// TODO Function to create models for sphere, etc.
		this.models = [
			// Initial cube
			new Cuboid(this.device, modelBindGroupLayout, {
				colors: "cm"
			})
				.translate(-1, -1, -3)
				.rotate(0, -Math.PI * 0.25)
				.writeBuffer(),
			// "Hat"
			new Cuboid(this.device, modelBindGroupLayout, {
				length: 0.5,
				colors: "y0"
			})
				.translate(-1, -0.25, -3)
				.writeBuffer(),
			// "Pillar"
			new Cuboid(this.device, modelBindGroupLayout, {
				length: 1,
				height: 3,
				colors: "ry1"
			})
				.translate(3, -0.5, 0)
				.rotate(-Math.PI * 0.125, Math.PI * 0.33)
				.writeBuffer(),
			// Create rectangle
			new Rectangle(this.device, modelBindGroupLayout, {
				width: 6
			})
				.translate(0, -1.5, 0)
				.rotate(HALF_PI, 0)
				.scale(2)
				.writeBuffer(),
			// Create circle (octagon)
			new Circle(device, modelBindGroupLayout, {
				radius: 3,
				numPoints: 16,
				colors: "01b"
			})
				.translate(-6, 2, 6)
				.rotate(0, -Math.PI * 0.25)
				.writeBuffer(),
			// Create triangles
			new Triangle(this.device, modelBindGroupLayout, {
				width: 3,
				shiftTop: -0.75,
				colors: "cmy"
			})
				.translate(-1, 0, 3)
				.rotate(0, -Math.PI * 0.125)
				.writeBuffer(),
			new Triangle(this.device, modelBindGroupLayout)
				.rotate(0, 0, Math.PI)
				.writeBuffer(),
			new Triangle(this.device, modelBindGroupLayout, {
				width: 0.5,
				shiftTop: 1.25,
				colors: "100"
			})
				.translate(1, 0, -3)
				.rotate(0, Math.PI * 0.125)
				.writeBuffer(),
			// "Skybox"
			new Cuboid(this.device, modelBindGroupLayout, {
				colors: "c11c"
			})
				.scale(-20)
				.writeBuffer()
		];

		// Deferred pass directional light
		this.lights = [
			// Directional light, applied to entire screen
			new Rectangle(this.device, modelBindGroupLayout, {
				width: 2,
				colors: "c"
			})
				.writeBuffer()
		];

		// Create pipeline layout
		const forwardPipelineLayout = this.device.createPipelineLayout({
			bindGroupLayouts: [
				globalBindGroupLayout,
				this.camera.bindGroupLayout,
				modelBindGroupLayout,
				lightBindGroupLayout
			]
		});

		// TODO Functions to create/update pipeline with entryPoints and constants
		// Input assembly - describe vertex assembly and wgsl entry points
		this.forwardPipeline = this.device.createRenderPipeline({
			layout: forwardPipelineLayout,
			// Default primitive assemble, here for illustration purposes
			primitive: {
				cullMode: "back",
				topology: "triangle-list"
			},
			depthStencil: {
				depthWriteEnabled: true,
				depthCompare: "less",
				format: this.depthTextureFormat
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
					// Normal
					format: this.format
				}, {
					// Colour
					format: this.format
				}]
			}
		});

		const deferredPipelineLayout = this.device.createPipelineLayout({
			bindGroupLayouts: [
				globalBindGroupLayout,
				this.camera.bindGroupLayout,
				modelBindGroupLayout,
				this.deferredBindGroupLayout
			]
		});

		this.deferredPipeline = this.device.createRenderPipeline({
			layout: deferredPipelineLayout,
			primitive: {
				cullMode: "back",
				topology: "triangle-list"
			},
			vertex: {
				module: this.module,
				entryPoint: "lightVertexShader",
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
				entryPoint: "lightFragmentShader",
				targets: [{
					format: this.format
				}]
			}
		});

		// Initialise dimensions, depth buffer, and camera aspect ratio
		this.resize(canvas.width, canvas.height);
	}

	public resize(width: number, height: number) {
		// Update size if different
		if (this.width !== width || this.height !== height) {
			this.width = width;
			this.height = height;
			this.canvas.width = this.width;
			this.canvas.height = this.height;
			// Update projection matrix
			this.camera.updateProjection(1, 100, this.aspect, 45 * DEG_TO_RAD);
			// Rebuild depth texture
			this.depthTexture?.destroy();
			this.depthTexture = this.device.createTexture({
				format: this.depthTextureFormat,
				size: [this.width, this.height],
				usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
			});
			// Rebuild gbuffers
			const gBufferFormat: IGpuTextureDescriptor = {
				format: "bgra8unorm",
				size: [this.width, this.height],
				usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
			};
			this.gBufferNormal?.destroy();
			this.gBufferNormal = this.device.createTexture(gBufferFormat);
			this.gBufferColor?.destroy();
			this.gBufferColor = this.device.createTexture(gBufferFormat);

			// Rebuild deferred bindings
			this.deferredBindGroup = this.device.createBindGroup({
				layout: this.deferredBindGroupLayout,
				entries: [{
					binding: 0,
					resource: this.basicSampler,
				}, {
					binding: 1,
					resource: this.depthTexture
				}, {
					binding: 2,
					resource: this.gBufferNormal
				}, {
					binding: 3,
					resource: this.gBufferColor
				}]
			});
		}
	}

	public setAmbientColor(red: number, green: number, blue: number) {
		this.#amblentColor.set(red, green, blue);
		this.device.queue.writeBuffer(
			this.#ambientBuffer, 0,
			this.#ambientData, 0, this.#ambientData.byteLength
		);
		// Sync clear value with ambient
		this.#clearColor[0] = red;
		this.#clearColor[1] = green;
		this.#clearColor[2] = blue;
	}

	// TODO Scenegraph system
	public render() {
		// Assemble GPU work batch
		const commandEncoder = this.device.createCommandEncoder();

		// Prepare render pass - draw models
		const forwardPassEncoder = commandEncoder.beginRenderPass({
			colorAttachments: [{
				loadOp: "clear",
				storeOp: "store",
				view: this.gBufferNormal.createView()
			}, {
				loadOp: "clear",
				storeOp: "store",
				view: this.gBufferColor.createView()
			}],
			depthStencilAttachment: {
				depthClearValue: 1.0,
				depthLoadOp: "clear",
				depthStoreOp: "store",
				view: this.depthTexture.createView()
			}
		});

		// Render pipeline and bind groups
		forwardPassEncoder.setPipeline(this.forwardPipeline);
		forwardPassEncoder.setBindGroup(0, this.globalBindGroup);
		forwardPassEncoder.setBindGroup(1, this.camera.bindGroup);

		// Bind light
		forwardPassEncoder.setBindGroup(3, this.light.bindGroup);

		// Draw models
		for (const model of this.models) {
			forwardPassEncoder.setBindGroup(2, model.bindGroup);
			model.draw(forwardPassEncoder);
		}
		forwardPassEncoder.end();

		// Start deferred lighting pass
		// Prepare render pass - clear canvas and draw lights
		const deferredPassEncoder = commandEncoder.beginRenderPass({
			colorAttachments: [{
				clearValue: this.#clearColor,
				loadOp: "clear",
				storeOp: "store",
				view: this.context.getCurrentTexture().createView()
			}]
		});

		// Render pipeline and bind groups
		deferredPassEncoder.setPipeline(this.deferredPipeline);
		deferredPassEncoder.setBindGroup(0, this.globalBindGroup);
		deferredPassEncoder.setBindGroup(1, this.camera.bindGroup);
		deferredPassEncoder.setBindGroup(3, this.deferredBindGroup);

		// Draw lights
		for (const model of this.lights) {
			deferredPassEncoder.setBindGroup(2, model.bindGroup);
			model.draw(deferredPassEncoder);
		}
		deferredPassEncoder.end();

		// Submit commands to GPU
		this.device.queue.submit([commandEncoder.finish()]);
	}

}
