const { createServer } = require("node:http");
const { readFile } = require("node:fs");

const port = 4000;
const hostname = "127.0.0.1";

const server = createServer((req, res) => {
	res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
	if (req.url === "/" || req.url === "/index.html") {
		readFile("./index.html", function (_, text) {
			res.statusCode = 200;
			res.setHeader("Content-Type", "text/html");
			res.end(text);
		});
	} else if (req.url === "/dist/index.js") {
		readFile("./dist/index.js", function (_, text) {
			res.statusCode = 200;
			res.setHeader("Content-Type", "text/javascript");
			res.end(text);
		});
	} else {
		res.statusCode = 404;
		res.end("Not Found");
	}
});

server.listen(port, hostname, () => {
	console.debug(`Server running at http://${hostname}:${port}/`);
});
