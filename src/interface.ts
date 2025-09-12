type bytes = number;

export type TRgba = {
	readonly r: number;
	readonly g: number;
	readonly b: number;
	readonly a: number;
} | [number, number, number, number];

// WebGPU canvas context

interface IGpuCanvasConfig {
	readonly device: IGpuDevice;
	readonly format: TCanvasFormat;
	readonly alphaMode?: "opaque" | "premultiplied";
	readonly colorspace?: "srgb" | "display-p3";
	// readonly toneMapping
	// readonly usage
	// readonly viewFormats
}

/** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/GPUTextureView) */
interface IGpuTextureView {
	readonly label: string;
}

/** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/GPUTexture) */
export interface IGpuTexture {
	readonly label: string;
	readonly format: string;
	// TODO varios other common properties from IGpuTextureDescriptor
	createView(): IGpuTextureView;
	destroy(): void;
}

/** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createTexture) */
interface IGpuTextureDescriptor {
	readonly label?: string;
	readonly dimension?: "1d" | "2d" | "3d";
	// TODO Add formats as they are required
	/** [WebGPU Reference](https://gpuweb.github.io/gpuweb/#enumdef-gputextureformat) */
	readonly format: "rgba8uint" |
	// Depth/stencil
	"stencil8" | "depth16unorm" | "depth24plus" | "depth24plus-stencil8" | "depth32float";
	// Subject to dimension
	// TODO create typings for each dimension with size constraints
	readonly size: [width: number] | [number, number] | [number, number, number] |
	{ readonly width: number; } | { readonly width: number; readonly height: number; } |
	{ readonly width: number; readonly height: number; readonly depthOrArrayLayers: number };
	/** GPUTextureUsage */
	readonly usage: unknown;
	readonly mipLevelCount?: number;
	readonly sampleCount?: 1 | 4;
	readonly viewFormats?: ReadonlyArray<IGpuTextureDescriptor["format"]>;
}

export interface IGpuCanvasContext {
	/** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/GPUCanvasContext/configure) */
	configure(config: IGpuCanvasConfig): void;
	getCurrentTexture(): IGpuTexture;
}

// WebGPU device

interface IGpuBindGroupLayoutDescriptorEntry {
	readonly binding: number;
	/** GPUShaderStage */
	readonly visibility: unknown;
}

interface IBindGroupBuffer extends IGpuBindGroupLayoutDescriptorEntry {
	readonly buffer: {
		// Match with GPUBufferUsage value set on buffer
		readonly type?: "read-only-storage" | "storage" | "uniform";
		readonly hasDynamicOffset?: boolean;
		readonly minBindingSize?: number;
	};
}

interface IBindGroupTexture extends IGpuBindGroupLayoutDescriptorEntry {
	readonly texture: {
		readonly multisampled?: boolean;
		readonly sampleType?: "depth" | "float" | "sint" | "uint" | "unfilterable-float";
		// readonly viewDimension?
	};
}

// Additional bind group layouts extend IGpuBindGroupLayoutDescriptorEntry

// https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBindGroupLayout#resource_layout_objects
type TGpuBindGroupLayoutDescriptorEntries = IBindGroupBuffer | IBindGroupTexture

interface IGpuBindGroupLayoutDescriptor {
	readonly label?: string;
	readonly entries: ReadonlyArray<TGpuBindGroupLayoutDescriptorEntries>;
}

export interface IGpuBindGroupLayout {
	readonly label: string;
}

interface IGpuBufferBinding {
	readonly buffer: IGpuBuffer;
}

interface IGpuBindGroupDescriptor {
	readonly label?: string;
	readonly layout: IGpuBindGroupLayout;
	readonly entries: ReadonlyArray<{
		readonly binding: number;
		// TODO module variants: GPUExternalTexture, GPUSampler, GPUTextureView
		readonly resource: IGpuBufferBinding;
	}>
}

export interface IGpuBindGroup {
	readonly label: string;
}

interface IGpuPipelineLayoutDescriptor {
	readonly label?: string;
	readonly bindGroupLayouts: ReadonlyArray<IGpuBindGroupLayout>;
}

interface IGpuPipelineLayout {
	readonly label: string;
}

interface IPipelineBase {
	readonly entryPoint?: string;
	readonly constants?: Record<string, number | boolean>;
	readonly module: IGpuShaderModule;
}

interface IVertexPipeline extends IPipelineBase {
	readonly buffers: ReadonlyArray<{
		readonly arrayStride: bytes;
		readonly attributes: ReadonlyArray<{
			readonly shaderLocation: number;
			readonly offset: bytes;
			// https://gpuweb.github.io/gpuweb/#enumdef-gpuvertexformat
			// TODO uint, sint, unorm, snorm, float16, etc.
			readonly format: "float32" | "float32x2" | "float32x3" | "float32x4";
		}>;
		readonly stepMode?: "vertex" | "instanced";
	}>
}

interface IFragmentPipeline extends IPipelineBase {
	// https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline#fragment_object_structure
	readonly targets: ReadonlyArray<{
		// readonly blend
		// https://gpuweb.github.io/gpuweb/#enumdef-gputextureformat
		// Typically rgba 16/32 float, unorm, int, etc. See getPreferredCanvasFormat
		readonly format: string;
		// readonly writeMask
	}>;
}

/** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/GPURenderPipeline) */
export interface IGpuRenderPipeline {
	readonly label: string;
	// getBindGroupLayout()
}

interface IPipelineDescriptorConfig {
	readonly label?: string;
	readonly vertex: IVertexPipeline;
	// https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline#depthstencil_object_structure
	readonly depthStencil?: {
		readonly format?: string;
		readonly depthBias?: number;
		readonly depthBiasClamp?: number;
		readonly depthBiasSlopeScale?: number;
		readonly depthWriteEnabled?: boolean;
		readonly depthCompare?: "always" | "never" |
		"less" | "less-equal" |
		"greater" | "greater-equal" |
		"equal" | "not-equal";
		// TODO populate from MDN docs stencil stuff
	};
	// https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline#primitive_object_structure
	readonly primitive?: {
		/** Cull polygons based on facing direction */
		readonly cullMode?: "back" | "front" | "none";
		/** Define vertex order that is condidered front-facing */
		readonly frontFace?: "ccw" | "cw";
		readonly stripIndexFormat?: "uint16" | "uint32";
		readonly topology?: "line-list" | "line-strip" | "point-list" | "triangle-list" | "triangle-strip";
		readonly unclippedDepth?: boolean;
	};
	readonly fragment?: IFragmentPipeline;
	// https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline#multisample_object_structure
	// readonly multisample?: {};
	readonly layout: "auto" | IGpuPipelineLayout;
}

/** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/GPUShaderModule) */
export interface IGpuShaderModule { }

interface IGpuShaderModuleOpts {
	readonly label?: string;
	readonly code: string;
	readonly hints?: Record<string, string>;
	// readonly sourceMap
}

export interface IGpuBuffer { }

interface IGpuBufferOpts {
	readonly size: number;
	/** GPUBufferUsage */
	readonly usage: unknown;
}

/** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/GPUQueue) */
interface IGpuQueue {
	writeBuffer<T>(
		buffer: IGpuBuffer, bufferOffset: number,
		data: T, dataOffset: number,
		size?: number
	): void;
	submit(commandBuffers: ReadonlyArray<IGpuCommandBuffer>): void;
}

type TIndexFormat = "uint16" | "uint32";

/** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/GPURenderPassEncoder) */
export interface IGpuRenderPassEncoder {
	readonly label: string;
	setPipeline(pipeline: IGpuRenderPipeline): void;
	setBindGroup(index: number, bindGroup: IGpuBindGroup): void;
	// TODO setBindGroup with dynamicOffsets variants
	setIndexBuffer(buffer: IGpuBuffer, indexFormat: TIndexFormat): void;
	setIndexBuffer(buffer: IGpuBuffer, indexFormat: TIndexFormat, offset: number): void;
	setIndexBuffer(buffer: IGpuBuffer, indexFormat: TIndexFormat, offset: number, size: number): void;
	setVertexBuffer(slot: number, buffer: IGpuBuffer | null): void;
	setVertexBuffer(slot: number, buffer: IGpuBuffer, offset: number): void;
	setVertexBuffer(slot: number, buffer: IGpuBuffer, offset: number, size: number): void;
	draw(vertexCount: number): void;
	draw(vertexCount: number, instanceCount: number): void;
	draw(vertexCount: number, instanceCount: number, firstVertex: number): void;
	draw(vertexCount: number, instanceCount: number, firstVertex: number, firstInstance: number): void;
	drawIndexed(indexCount: number): void;
	drawIndexed(indexCount: number, instanceCount: number): void;
	drawIndexed(indexCount: number, instanceCount: number, firstIndex: number): void;
	drawIndexed(indexCount: number, instanceCount: number, firstIndex: number, baseVertex: number): void;
	drawIndexed(indexCount: number, instanceCount: number, firstIndex: number, baseVertex: number, firstInstance: number): void;
	end(): void;
}

interface IRenderPassDescriptor {
	readonly label?: string;
	readonly colorAttachments: ReadonlyArray<{
		readonly clearValue?: TRgba;
		readonly depthSlice?: number;
		readonly loadOp: "clear" | "load";
		readonly storeOp: "discard" | "store";
		readonly reosolveTarget?: IGpuTextureView;
		readonly view: IGpuTextureView;
	}>;
	readonly depthStencilAttachment?: {
		/** From 0.0 to 1.0 inclusive */
		readonly depthClearValue?: number;
		readonly depthLoadOp?: "clear" | "load";
		readonly depthReadOnly?: boolean;
		readonly depthStoreOp?: "discard" | "store";
		// TODO stencil opts
		readonly view: IGpuTextureView;
	};
}

/** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandBuffer) */
interface IGpuCommandBuffer {
	readonly label: string;
}

/** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder) */
interface IGpuCommandEncoder {
	beginRenderPass(descriptor: IRenderPassDescriptor): IGpuRenderPassEncoder;
	copyBufferToBuffer(source: IGpuBuffer, destination: IGpuBuffer): void;
	copyBufferToBuffer(source: IGpuBuffer, destination: IGpuBuffer, size: number): void;
	copyBufferToBuffer(
		source: IGpuBuffer, sourceOffset: number,
		destination: IGpuBuffer, destinationOffset: number, size: number
	): void;
	finish(descriptor?: { readonly label?: string }): IGpuCommandBuffer;
}

export interface IGpuDevice {
	createShaderModule(opts: IGpuShaderModuleOpts): IGpuShaderModule;
	createBuffer(opts: IGpuBufferOpts): IGpuBuffer;
	createTexture(descriptor: IGpuTextureDescriptor): IGpuTexture;
	createBindGroupLayout(descriptor: IGpuBindGroupLayoutDescriptor): IGpuBindGroupLayout;
	createBindGroup(descriptor: IGpuBindGroupDescriptor): IGpuBindGroup;
	createPipelineLayout(descriptor: IGpuPipelineLayoutDescriptor): IGpuPipelineLayout;
	createRenderPipeline(descriptor: IPipelineDescriptorConfig): IGpuRenderPipeline;
	createCommandEncoder(descriptor?: { readonly label?: string }): IGpuCommandEncoder;
	readonly queue: IGpuQueue;
}

interface IGpuAdapter {
	requestDevice(): Promise<IGpuDevice>;
}

export type TCanvasFormat = "bgra8unorm" | "rgba8unorm" | "rgba16float";

export interface IGpu {
	requestAdapter(): Promise<IGpuAdapter>;
	getPreferredCanvasFormat(): TCanvasFormat;
}
