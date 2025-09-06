import { type IGpu } from "./interface";
import { Wrapper } from "./wrapper";

document.addEventListener("DOMContentLoaded", () => {
	const main = document.getElementById("main");
	if (main == null) {
		throw Error("Unable to mount application to #main");
	}

	const WIDTH = 800;
	const HEIGHT = 600;
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
	const wrapper = await Wrapper.create(canvas, gpu);

	// First render
	wrapper.render();

	// Redraw with different background on key press
	document.addEventListener("keypress", (event) => {
		const code = event.key.charCodeAt(0);

		// Assemble an interesting RGB value from key code
		wrapper.setAmbientColour({
			r: (code % 83) * 1.0 / 83,
			g: (code % 19) * 1.0 / 19,
			b: (code % 43) * 1.0 / 43,
			a: 1
		});

		wrapper.render();
	});

}
