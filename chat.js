const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
ctx.textBaseline = "top";
let userID = "me";
let title = ""
let inputText = "";
let cursorIndex = 0;
let blinkState = true;
let selectingState = false;
let messages = [];
let scrollOffset = 0;
let error;

fetch("/api" + window.location.pathname).then(res => {
    if (res.ok) {
        return res.json()
    } else {
        res.text().then(text => {
            error = `${res.status}: ${text}`;
        }).catch(e => {
            error = res.statusText;
        });
    }
}).then(data => {
    if (data.title) title = data.title;
    if (data.messages) messages = data.messages;
    draw();
}).then(update).catch(e => {
    error = e.message;
});

async function update() {
    const res = await fetch("/api" + window.location.pathname + "/update");
    if (res.ok) {
        const data = await res.json()
        if (data.title) title = data.title;
        if (data.messages) messages = data.messages;
    } else {
        error = await res.text();
    }
    draw();
    update();
}

function calculateLines(maxWidth, inputText) {
    let lines = [""];
    inputText.split(" ").forEach((word, i) => {
        const lastLine = lines[lines.length - 1]
        const testLine = (lastLine + " " + word);
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && i > 0) {
            lines = [...lines, word];
        } else {
            lines[lines.length - 1] = testLine;
        }
    });
    return lines;
}

function countLines(chat) {
    let total = 0;
    chat.forEach(msg => {
        total += msg.lines.length + 1;
    })
    return total;
}

// Draw rounded rectangle (for chat bubbles)
function drawRoundedRect(x, y, w, h, r, fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.fill();
}

function calculateBubbleWidth(msg, padding) {
    let widestLine = 0;
    msg.lines.forEach(line => {
        const w = ctx.measureText(line.trim()).width;
        if (w > widestLine) {
            widestLine = w;
        }
    });
    return widestLine + padding * 2;
}

function calculateCursorCoordinates(inputLines, cursorIndex) {
    let cursorRow = 0;
    let cursorCol = 0;
    for (let i = 0; i < cursorIndex; i++) {
        if (inputLines[cursorRow].length > cursorCol) {
            cursorCol++;
        } else {
            cursorRow++;
            cursorCol = 0;
        }
    }
    return { cursorRow, cursorCol };
}

function draw() {
    const baseWidth = 320;
    const baseHeight = 240;
    const width = canvas.width;
    const height = canvas.height;
    const fontHeight = 14 * width / baseWidth;
    ctx.font = `${fontHeight}px sans-serif`;
    ctx.textAlign = "left";
    const backgroundColor = "white";
    const margin = 4 * width / baseWidth;
    const padding = 4 * width / baseWidth;
    const titleFontHeight = padding + fontHeight + padding;
    const titleBarHeight = margin * 2 + titleFontHeight + margin * 2;
    const titleBarColor = "#ddd"
    const fontColor = "black"
    const lineSpacing = (margin + padding + fontHeight + padding + margin) / 2;
    const maxMessageTextWidth = width - margin - margin - padding - padding - margin;
    const chat = messages.map(m => {
        return {
            from: m.from,
            lines: calculateLines(maxMessageTextWidth, m.text),
        };
    });
    const maxInputTextWidth = width - margin - padding - padding - margin;
    const inputLines = calculateLines(maxInputTextWidth, inputText);
    const sentBubbleColor = "#aaa";
    const recievedBubbleColor = "#ccc";
    const inputBoxColor = "#bbb";
    const inputBubbleColor = "white";
    const inputBoxWidth = width;
    const inputBoxHeight = lineSpacing * (inputLines.length + 1);
    const inputBoxX = 0;
    const inputBoxY = height - inputBoxHeight;
    const bubbleRadius = padding;
    const inputBubbleX = inputBoxX + margin;
    const inputBubbleY = inputBoxY + margin;
    const inputBubbleWidth = inputBoxWidth - margin - margin;
    const inputBubbleHeight = inputBoxHeight - margin - margin;
    const inputPadding = padding + margin;
    const { cursorRow, cursorCol } = calculateCursorCoordinates(inputLines, cursorIndex);
    const beforeCursor = inputLines[cursorRow].trimStart(' ').slice(0, cursorCol + 1);
    const cursorX = inputPadding + ctx.measureText(beforeCursor).width;
    const cursorY = height - inputBoxHeight + margin + padding + cursorRow * lineSpacing;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height)

    // Render any error
    if (error) {
        ctx.fillText("ERROR: " + error, 0, 0)
        return
    }

    // Draw input box
    ctx.fillStyle = inputBoxColor;
    ctx.fillRect(inputBoxX, inputBoxY, inputBoxWidth, inputBoxHeight);

    // Draw input bubble
    drawRoundedRect(inputBubbleX, inputBubbleY, inputBubbleWidth, inputBubbleHeight, bubbleRadius, inputBubbleColor);

    // Draw input lines
    ctx.fillStyle = 'black';
    for (let i = 0; i < inputLines.length; i++) {
        const x = inputBubbleX + padding;
        const y = inputBubbleY + padding + (i * lineSpacing);
        ctx.fillText(inputLines[i].trim(), x, y);
    }

    // Draw blinking cursor
    if (blinkState) {
        ctx.beginPath();
        ctx.moveTo(cursorX, cursorY);
        ctx.lineTo(cursorX, cursorY + fontHeight);
        ctx.strokeStyle = "#000";
        ctx.stroke();
    }

    // Draw chat
    let y = height - inputBoxHeight;
    const r = margin;
    for (let i = chat.length - 1; i >= 0; i--) {
        const msg = chat[i];
        const c = msg.from === userID ? sentBubbleColor : recievedBubbleColor;
        const w = calculateBubbleWidth(msg, padding);
        const x = msg.from === userID ? width - margin - w : margin;
        y -= lineSpacing;
        y -= msg.lines.length * lineSpacing;
        const h = padding + msg.lines.length * lineSpacing + padding;
        if (y + h < titleBarHeight) {
            break;
        }
        drawRoundedRect(x, y, w, h, r, c);
        if (msg.from === userID) {
            ctx.textAlign = "right";
            msg.lines.forEach((line, i) => {
                ctx.fillStyle = fontColor;
                ctx.fillText(line.trim(), width - margin - padding, y + padding + i * lineSpacing);
            })
        } else {
            ctx.textAlign = "left";
            msg.lines.forEach((line, i) => {
                ctx.fillStyle = fontColor;
                ctx.fillText(line.trim(), x + padding, y + padding + i * lineSpacing);
            })
        }
    }

    // Draw title bar
    ctx.fillStyle = titleBarColor;
    ctx.fillRect(0, 0, width, titleBarHeight);
    ctx.font = `bold ${titleFontHeight}px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillStyle = fontColor;
    ctx.fillText(title, margin * 2, margin * 2);
}

document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey) return;

    if (e.key === "ArrowLeft") {
        if (cursorIndex > 0) {
            cursorIndex--
        } else {
            window.location.pathname = "/chats"
        }
    } else if (e.key === "ArrowRight") {
        if (cursorIndex < inputText.length) cursorIndex++;
    } else if (e.key === "Backspace") {
        if (cursorIndex > 0) {
            inputText = inputText.slice(0, cursorIndex - 1) + inputText.slice(cursorIndex);
            cursorIndex--;
        }
    } else if (e.key === "Delete") {
        if (cursorIndex < inputText.length) {
            inputText = inputText.slice(0, cursorIndex) + inputText.slice(cursorIndex + 1);
        }
    } else if (e.key === "Enter") {
        if (inputText.trim()) {
            const now = new Date();
            const msg = { from: userID, text: inputText.trim(), sentAt: JSON.stringify(now) };
            fetch("/api" + window.location.pathname, {
                method: "POST",
                body: JSON.stringify(msg),
            });
            inputText = "";
            cursorIndex = 0;
        }
    } else if (e.key.length === 1) {
        inputText = inputText.slice(0, cursorIndex) + e.key + inputText.slice(cursorIndex);
        cursorIndex++;
    }

    draw();
});

document.addEventListener("paste", (e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData("text");
    if (paste) {
        inputText = inputText.slice(0, cursorIndex) + paste + inputText.slice(cursorIndex);
        cursorIndex += paste.length;
    }
    draw();
});

// setInterval(() => {
//     blinkState = !blinkState;
//     draw();
// }, 500);

draw();
