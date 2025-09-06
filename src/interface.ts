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
interface IGpuTexture {
	createView(): IGpuTextureView;
}

export interface IGpuCanvasContext {
	/** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/GPUCanvasContext/configure) */
	configure(config: IGpuCanvasConfig): void;
	getCurrentTexture(): IGpuTexture;
}

// WebGPU device

interface IGpuBindGroupLayoutDescriptorEntry {
	readonly binding: number;
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

interface IGpuBindGroupLayout {
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
		readonly depthBias?: number;
		readonly depthBiasClamp?: number;
		readonly depthBiasSlopeScale?: number;
		readonly depthWriteEnabled?: boolean;
		// TODO populate from MDN docs
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

/** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/GPURenderPassEncoder) */
interface IGpuRenderPassEncoder {
	readonly label: string;
	setPipeline(pipeline: IGpuRenderPipeline): void;
	setBindGroup(index: number, bindGroup: IGpuBindGroup): void;
	// TODO setBindGroup with dynamicOffsets variants
	setVertexBuffer(slot: number, buffer: IGpuBuffer | null): void;
	setVertexBuffer(slot: number, buffer: IGpuBuffer, offset: number): void;
	setVertexBuffer(slot: number, buffer: IGpuBuffer, offset: number, size: number): void;
	draw(vertexCount: number): void;
	draw(vertexCount: number, instanceCount: number): void;
	draw(vertexCount: number, instanceCount: number, firstVertex: number): void;
	draw(vertexCount: number, instanceCount: number, firstVertex: number, firstInstance: number): void;
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
}

/** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandBuffer) */
interface IGpuCommandBuffer {
	readonly label: string;
}

/** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder) */
interface IGpuCommandEncoder {
	beginRenderPass(descriptor: IRenderPassDescriptor): IGpuRenderPassEncoder;
	finish(descriptor?: { readonly label?: string }): IGpuCommandBuffer;
}

export interface IGpuDevice {
	createShaderModule(opts: IGpuShaderModuleOpts): IGpuShaderModule;
	createBuffer(opts: IGpuBufferOpts): IGpuBuffer;
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
