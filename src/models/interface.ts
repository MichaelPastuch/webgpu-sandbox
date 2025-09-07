import type { IGpuRenderPassEncoder } from "../interface";

export interface IModel {
	draw(passEncoder: IGpuRenderPassEncoder): void;
}
