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

	const MOVE_SCALE = 0.05;
	document.addEventListener("keydown", (event) => {
		switch (event.code) {
			case "ArrowUp":
				wrapper.nudgeCamera(0, MOVE_SCALE);
				break;
			case "ArrowDown":
				wrapper.nudgeCamera(0, -MOVE_SCALE);
				break;
			case "ArrowLeft":
				wrapper.nudgeCamera(-MOVE_SCALE, 0);
				break;
			case "ArrowRight":
				wrapper.nudgeCamera(MOVE_SCALE, 0);
				break;
		}
		wrapper.render();
	});

	// Redraw with different background on key press
	document.addEventListener("keypress", (event) => {
		if (event.key === "Enter") {
			// White
			wrapper.setAmbientColour(1, 1, 1);
		} else {
			// Assemble an interesting RGB value from key code
			const code = event.key.charCodeAt(0);
			wrapper.setAmbientColour(
				(code % 83) / 83.0,
				(code % 19) / 19.0,
				(code % 43) / 43.0,
			);
		}

		// Redraw with new ambient colour
		wrapper.render();
	});

}
