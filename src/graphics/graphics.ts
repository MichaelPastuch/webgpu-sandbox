import { DEG_TO_RAD, HALF_PI } from "../constants";
import { ScreenQuad } from "../engine/screenQuad";
import { type IGpu, type IGpuBindGroup, type IGpuBindGroupLayout, type IGpuBuffer, type IGpuCanvasContext, type IGpuDevice, type IGpuPipelineLayout, type IGpuRenderPipeline, type IGpuShaderModule, type IGpuTexture, type TCanvasFormat } from "../interface";
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
	private readonly gBufferNormalFormat = "rgba16float";
	private gBufferNormal!: IGpuTexture;
	private gBufferColor!: IGpuTexture;

	readonly #ambientBuffer: IGpuBuffer;
	readonly #ambientData = new ArrayBuffer(Vector3.byteLength);
	readonly #amblentColor = new Vector3(this.#ambientData, 0);

	public readonly camera: Camera;
	private readonly globalBindGroup: IGpuBindGroup;
	// private readonly basicSampler: IGpuSampler;

	private readonly screenQuad: ScreenQuad;

	// Scene models
	private readonly models: Model[];
	private readonly forwardPipeline: IGpuRenderPipeline;

	// Light objects
	private readonly directionalLight: Light;
	public readonly lights: Light[];
	// TODO Point and spot light models

	private readonly deferredBindGroupLayout: IGpuBindGroupLayout;
	private deferredBindGroup!: IGpuBindGroup;

	private readonly deferredPipelineLayout: IGpuPipelineLayout;
	private readonly directionalLightPipeline: IGpuRenderPipeline;
	private readonly pointLightPipeline: IGpuRenderPipeline;

	private createDeferredPipeline(vertexEntryPoint: string, fragmentEntryPoint: string) {
		return this.device.createRenderPipeline({
			layout: this.deferredPipelineLayout,
			primitive: {
				cullMode: "back",
				topology: "triangle-strip"
			},
			vertex: {
				module: this.module,
				entryPoint: vertexEntryPoint,
				buffers: [{
					attributes: [{
						// Position
						shaderLocation: 0,
						offset: 0,
						format: "float32x3"
					}],
					arrayStride: 12
				}]
			},
			fragment: {
				module: this.module,
				entryPoint: fragmentEntryPoint,
				targets: [{
					format: this.format,
					blend: {
						color: {
							srcFactor: "one",
							dstFactor: "one"
						},
						alpha: {
							srcFactor: "one",
							dstFactor: "one"
						}
					}
				}]
			}
		});
	}

	private constructor(
		private readonly device: IGpuDevice,
		private readonly canvas: HTMLCanvasElement,
		private readonly context: IGpuCanvasContext,
		// TODO Update interfaces to allow this type to be used for gBuffer color
		private readonly format: TCanvasFormat
	) {
		// Prepare context for WebGPU rendering
		this.context.configure({
			device: this.device,
			format: this.format,
			alphaMode: "opaque"
		});

		this.camera = new Camera(this.device);

		this.screenQuad = new ScreenQuad(this.device);

		// Prepare shaders
		this.module = this.device.createShaderModule({
			code: shaders
		});
		// this.basicSampler = device.createSampler();

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
				visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
				buffer: { type: "uniform" }
			}]
		});

		// Bind deferred pass sampler and textures
		this.deferredBindGroupLayout = this.device.createBindGroupLayout({
			entries: [{
				binding: 0,
				visibility: GPUShaderStage.FRAGMENT,
				texture: {
					sampleType: "depth"
				}
			}, {
				binding: 1,
				visibility: GPUShaderStage.FRAGMENT,
				texture: {
					sampleType: "unfilterable-float"
				}
			}, {
				binding: 2,
				visibility: GPUShaderStage.FRAGMENT,
				texture: {
					sampleType: "unfilterable-float"
				}
			}]
		});

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

		// Create pipeline layout
		const forwardPipelineLayout = this.device.createPipelineLayout({
			bindGroupLayouts: [
				globalBindGroupLayout,
				this.camera.bindGroupLayout,
				modelBindGroupLayout
			]
		});

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
					format: this.gBufferNormalFormat
				}, {
					// Colour
					format: "bgra8unorm"
				}]
			}
		});

		// Deferred pass directional light, engine initialises & calls writeBuffer
		this.directionalLight = new Light(this.device, this.camera.viewMatrix, lightBindGroupLayout)
			// Position repurposed as direction
			.position(0.2, 0.8, -1);

		// Full-screen point lights
		this.lights = [
			// Engine wraps with PointLight & calls writeBuffer
			new Light(this.device, this.camera.viewMatrix, lightBindGroupLayout),
			new Light(this.device, this.camera.viewMatrix, lightBindGroupLayout)
				.color(1, 1, 0.6)
				.range(5),
			// Static
			new Light(this.device, this.camera.viewMatrix, lightBindGroupLayout)
				.position(6, 0.5, -6)
				.color(0.8, 0.2, 0.2)
				.range(12)
				.writeBuffer(),
			new Light(this.device, this.camera.viewMatrix, lightBindGroupLayout)
				.position(-6, 0.5, 6)
				.color(0.2, 0.2, 0.8)
				.range(12)
				.writeBuffer()
		];

		this.deferredPipelineLayout = this.device.createPipelineLayout({
			bindGroupLayouts: [
				globalBindGroupLayout,
				this.camera.bindGroupLayout,
				this.deferredBindGroupLayout,
				lightBindGroupLayout
			]
		});

		this.directionalLightPipeline = this.createDeferredPipeline(
			"lightVertexShader", "directionalLightFragment"
		);

		this.pointLightPipeline = this.createDeferredPipeline(
			"lightVertexShader", "pointLightFragment"
		);

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
			this.gBufferNormal?.destroy();
			this.gBufferNormal = this.device.createTexture({
				format: this.gBufferNormalFormat,
				size: [this.width, this.height],
				usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
			});
			this.gBufferColor?.destroy();
			this.gBufferColor = this.device.createTexture({
				format: "bgra8unorm",
				size: [this.width, this.height],
				usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
			});
			// Build deferred bindings
			this.deferredBindGroup = this.device.createBindGroup({
				layout: this.deferredBindGroupLayout,
				entries: [{
					binding: 0,
					resource: this.depthTexture
				}, {
					binding: 1,
					resource: this.gBufferNormal
				}, {
					binding: 2,
					resource: this.gBufferColor
				}]
			});
		}
	}

	public setAmbientColor(red: number, green: number, blue: number) {
		this.directionalLight.color(red, green, blue)
			.writeBuffer();
		// TODO Retire
		this.#amblentColor.set(red, green, blue);
		this.device.queue.writeBuffer(
			this.#ambientBuffer, 0,
			this.#ambientData, 0, this.#ambientData.byteLength
		);
	}

	// TODO Scenegraph system
	public render() {
		// Assemble GPU work batch
		const commandEncoder = this.device.createCommandEncoder();

		// Prepare render pass - draw models
		const forwardPassEncoder = commandEncoder.beginRenderPass({
			colorAttachments: [{
				loadOp: "load",
				storeOp: "store",
				view: this.gBufferNormal.createView()
			}, {
				loadOp: "load",
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
				loadOp: "clear",
				storeOp: "store",
				view: this.context.getCurrentTexture().createView()
			}]
		});

		deferredPassEncoder.setBindGroup(0, this.globalBindGroup);
		// TODO Create bind group combining deferred textures and camera?
		deferredPassEncoder.setBindGroup(1, this.camera.bindGroup);
		deferredPassEncoder.setBindGroup(2, this.deferredBindGroup);

		// Draw directional ambient light
		deferredPassEncoder.setPipeline(this.directionalLightPipeline);
		deferredPassEncoder.setBindGroup(3, this.directionalLight.bindGroup);
		this.screenQuad.draw(deferredPassEncoder);

		// Draw full-screen point lights
		deferredPassEncoder.setPipeline(this.pointLightPipeline);
		for (const light of this.lights) {
			deferredPassEncoder.setBindGroup(3, light.bindGroup);
			// TODO Draw point lights within range circles
			this.screenQuad.draw(deferredPassEncoder);
		}

		deferredPassEncoder.end();

		// TODO Post process pass: gamma correction, lense effects, vignette, etc.

		// Submit commands to GPU
		this.device.queue.submit([commandEncoder.finish()]);
	}

}
