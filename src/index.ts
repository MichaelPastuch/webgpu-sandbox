
document.addEventListener("DOMContentLoaded", () => {

	const main = document.getElementById("main");
	if (main == null) {
		throw new Error("Unable to mount application to #main");
	}
	// main.innerText = "Hello, world!";

	const WIDTH = 640;
	const HEIGHT = 480;

	const canvas = document.createElement("canvas");
	canvas.width = WIDTH;
	canvas.height = HEIGHT;
	main.append(canvas);

	const context = canvas.getContext("2d");
	if (context == null) {
		throw new Error("Unable to get 2d canvas context");
	}

	// Write text about half way down canvas and a quarter of the way in
	context.font = "24px serif";
	context.fillText("Hello, world!", WIDTH >> 2, HEIGHT >> 1);

});
