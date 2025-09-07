// Annotate global bitwise values
declare const GPUBufferUsage: {
	readonly COPY_SRC: number;
	readonly COPY_DST: number;
	readonly INDEX: number;
	readonly VERTEX: number;
	readonly UNIFORM: number;
}

declare const GPUShaderStage: {
	readonly VERTEX: number;
	readonly FRAGMENT: number;
}

/** Bind data for usage in vertex shader */
export const VERTEX_BUFFER = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
export const INDEX_BUFFER = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST;

/** Bind arbitrary data for usage in vertex/fragment shaders */
export const SHADER_BUFFER = GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM;

/** Bind group visibility in vertex shader stage */
export const VERTEX_STAGE = GPUShaderStage.VERTEX;
