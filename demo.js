const width = 640;
const height = 480;
async function render() {
  const res = await fetch("/demo/frame");
  const buf = await res.arrayBuffer();
  const pixels = new Uint8ClampedArray(buf);
  let count = 0;
  pixels.forEach((b) => {
    if (b === 255) {
      count++;
    }
  });
  console.log(count);
  const imageData = new ImageData(pixels, width, height);
  const canvas = document.getElementById("screen");
  const ctx = canvas.getContext("2d");
  ctx.putImageData(imageData, 0, 0);
}
let body = document.body;
if (!body) {
  body = document.createElement("body");
}
body.style.margin = "0";
body.style.padding = "0";
body.style.width = "100vw";
body.style.height = "100vh";
body.style.display = "flex";
body.style.justifyContent = "center";
body.style.alignItems = "center";
body.innerHTML = `<canvas id="screen" width="${width}" height="${height}"></canvas>`;
setTimeout(render, 1e3);
const socket = new WebSocket("ws://localhost:3005/demo/updates");
socket.addEventListener("message", (e) => {
  console.log(e);
});
