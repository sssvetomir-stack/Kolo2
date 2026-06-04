const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname);
const port = Number(process.argv[2] || 5178);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png"
};

http.createServer((req, res) => {
  const urlPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const file = path.resolve(root, decodeURIComponent(urlPath.slice(1)));

  if (!file.startsWith(root + path.sep) && file !== root) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("not found");
      return;
    }

    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`Kolo Suisse prototype: http://127.0.0.1:${port}`);
});
