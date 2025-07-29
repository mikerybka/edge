const width = 640;
const height = 480;

async function render() {
    const res = await fetch("/demo/frame");
    const buf = await res.arrayBuffer();
    const pixels = new Uint8ClampedArray(buf);
    const imageData = new ImageData(pixels, width, height);
    const canvas = document.getElementById('screen') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
}

// Set body styles
let body = document.body;
if (!body) {
    body = document.createElement('body');
}
body.style.margin = '0';
body.style.padding = '0';
body.style.width = '100vw';
body.style.height = '100vh';
body.style.display = 'flex';
body.style.justifyContent = 'center';
body.style.alignItems = 'center';

// Create screen
body.innerHTML = `<canvas id="screen" width="${width}" height="${height}"></canvas>`;

// Render first frame
setTimeout(render, 1000)

// Create a websocket connection to the backend
const socket = new WebSocket("ws://localhost:3005/demo/updates");
socket.addEventListener("message", (e: MessageEvent<string>) => {
    render();
});
