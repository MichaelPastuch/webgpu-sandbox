export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEC = 1 / DEG_TO_RAD;
export const TWO_PI = Math.PI * 2;
export const HALF_PI = Math.PI * 0.5;

// Annotate global bitwise values
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

/** Bind data for usage in vertex shader */
export const VERTEX_BUFFER = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
export const INDEX_BUFFER = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST;

/** Bind texture for storing depth */
export const DEPTH_TEXTURE = GPUTextureUsage.RENDER_ATTACHMENT;

/** Bind arbitrary data for usage in vertex/fragment shaders */
export const SHADER_BUFFER = GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM;

/** Bind group visibility in vertex shader stage */
export const VERTEX_STAGE = GPUShaderStage.VERTEX;
