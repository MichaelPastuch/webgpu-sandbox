// WebGPU global bitwise values

declare const GPUBufferUsage: {
	readonly COPY_SRC: number;
	readonly COPY_DST: number;
	readonly INDEX: number;
	readonly VERTEX: number;
	readonly UNIFORM: number;
}

declare const GPUTextureUsage: {
	readonly COPY_SRC: number;
	readonly COPY_DST: number;
	readonly RENDER_ATTACHMENT: number;
	readonly STORAGE_BINDING: number;
	readonly TEXTURE_BINDING: number;
}

declare const GPUShaderStage: {
	readonly VERTEX: number;
	readonly FRAGMENT: number;
}
