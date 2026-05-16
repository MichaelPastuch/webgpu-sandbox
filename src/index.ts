import m from "mithril";
import { Engine } from "./engine/engine";
import { type IGpu } from "./interface";

document.addEventListener("DOMContentLoaded", () => {
	const main = document.getElementById("main");
	if (main == null) {
		throw Error("Unable to mount application to #main");
	}

	const WIDTH = 1024;
	const HEIGHT = 768;

	const canvas = document.createElement("canvas");
	canvas.width = WIDTH;
	canvas.height = HEIGHT;
	main.append(canvas);

	if ("gpu" in navigator) {
		Engine.create(canvas, navigator.gpu as IGpu)
			.then((engine) => {
				// engine.render();

				const debug = document.createElement("section")
				main.append(debug);
				m.mount(debug, {
					view: () => m("div", {
						style: {
							display: "flex",
							gap: "0.5rem"
						}
					}, [
						m("div", [
							m("pre", "Engine Delta Avg."),
							m("pre", engine.averageDelta)
						]),
						m("div", [
							m("pre", "Frame Scale"),
							m("pre", engine.averageFrameScale)
						])
					])
				});
				setInterval(m.redraw, 1000);
				// TODO Convert debug controls into mithril components, submit changes to engine
				engine.debugControls(main);

				engine.run();
			});
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
