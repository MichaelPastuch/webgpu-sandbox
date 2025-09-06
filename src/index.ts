import { type IGpu, type IGpuCanvasContext } from "./interface";

// Annotate global bitwise values
declare var GPUBufferUsage: {
	readonly VERTEX: number;
	readonly COPY_DST: number;
}

document.addEventListener("DOMContentLoaded", () => {
	const main = document.getElementById("main");
	if (main == null) {
		throw Error("Unable to mount application to #main");
	}
	// main.innerText = "Hello, world!";

	const WIDTH = 640;
	const HEIGHT = 480;
	const canvas = document.createElement("canvas");
	canvas.width = WIDTH;
	canvas.height = HEIGHT;
	main.append(canvas);

	if ("gpu" in navigator) {
		initWebGpu(canvas, navigator.gpu as IGpu);
	} else {
		const context = canvas.getContext("2d");
		if (context == null) {
			throw Error("Unable to get 2d canvas context");
		}
		// Write text about half way down canvas and a quarter of the way in
		context.font = "24px serif";
		context.fillText("WebGPU is not supported", WIDTH >> 2, HEIGHT >> 1);
	}

});

async function initWebGpu(canvas: HTMLCanvasElement, gpu: IGpu) {
	const context = canvas.getContext("webgpu") as unknown as IGpuCanvasContext;
	if (context == null) {
		throw Error("Unable to get webgpu canvas context");
	}

	const adapter = await gpu.requestAdapter();
	if (adapter == null) {
		throw Error("Request WebGPU adapter failed");
	}
	const device = await adapter.requestDevice();

	// Prepare context for WebGPU rendering
	context.configure({
		device,
		format: gpu.getPreferredCanvasFormat(),
		alphaMode: "premultiplied"
	});

	// Prepare shaders
	const shaderSrc = document.getElementById("shaders");
	if (shaderSrc == null) {
		throw Error("Unable to locate shaders #shaders");
	}
	const module = device.createShaderModule({
		code: shaderSrc.textContent
	});

	// Add triangle to GPU

	const vertices = new Float32Array([
		// Top
		// xyzw
		0.0, 0.6, 0, 1,
		// rgba
		1, 0, 0, 1,

		// Bottom-left
		-0.5, -0.6, 0, 1,
		0, 1, 0, 1,

		// Bottom-right
		0.5, -0.6, 0, 1,
		0, 0, 1, 1,
	]);

	const vertexBuffer = device.createBuffer({
		size: vertices.byteLength,
		usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
	});

	device.queue.writeBuffer(
		vertexBuffer, 0,
		vertices, 0, vertices.length
	);

	// Input assembly - describe vertex assembly and wgsl entry points

	const renderPipelline = device.createRenderPipeline({
		vertex: {
			module,
			entryPoint: "vertexShader",
			buffers: [{
				attributes: [{
					shaderLocation: 0,
					offset: 0,
					format: "float32x4"
				}, {
					shaderLocation: 1,
					offset: 16,
					format: "float32x4"
				}],
				arrayStride: 32
			}]
		},
		fragment: {
			module,
			entryPoint: "fragmentShader",
			targets: [{
				format: gpu.getPreferredCanvasFormat()
			}]
		},
		// Default primitive assemble, here for illustration purposes
		primitive: {
			topology: "triangle-list"
		},
		layout: "auto"
	});

	console.debug(renderPipelline);

	const commandEncoder = device.createCommandEncoder();

	// https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API#running_a_rendering_pass
	console.debug(commandEncoder);
}
