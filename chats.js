const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
ctx.textBaseline = "top";
let userID = "me";
let title = "Chats";
let chatIDs = [];
let selected = 0;
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
    // chatIDs = [...data, "new"]
    chatIDs = data
}).then(draw).catch(e => {
    error = e.message;
});

function draw() {
    const baseWidth = 320;
    const baseHeight = 240;
    const width = canvas.width;
    const height = canvas.height;
    const fontHeight = 14 * width / baseWidth;
    ctx.font = `${fontHeight}px sans-serif`;
    ctx.textAlign = "left";
    const margin = 4 * width / baseWidth;
    const padding = 4 * width / baseWidth;
    const titleFontHeight = padding + fontHeight + padding;
    const titleBarHeight = margin * 2 + titleFontHeight + margin * 2;
    const titleBarColor = "#ddd"
    const fontColor = "black"
    const backgroundColor = "white";
    const lineSpacing = (margin + padding + fontHeight + padding + margin) / 2;
    const unselectedListItemColor = "white"
    const unselectedListItemFontColor = "black"
    const selectedListItemColor = "blue"
    const selectedListItemFontColor = "white"

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height)

    // Render any error
    if (error) {
        ctx.fillText("ERROR: " + error, 0, 0)
        return
    }

    // Draw title bar
    ctx.fillStyle = titleBarColor;
    ctx.fillRect(0, 0, width, titleBarHeight);
    ctx.font = `bold ${titleFontHeight}px sans-serif`;
    ctx.fillStyle = fontColor;
    ctx.fillText(title, margin * 2, margin * 2);

    // Draw list of chats
    chatIDs.forEach((chatID, i) => {
        if (selected === i) {
            ctx.fillStyle = selectedListItemColor;
            ctx.fillRect(0, titleBarHeight + i * lineSpacing * 2, width, lineSpacing * 2)
            ctx.font = `${fontHeight}px sans-serif`;
            ctx.fillStyle = selectedListItemFontColor;
            ctx.fillText(chatID, margin * 2, titleBarHeight + margin * 2 + i * lineSpacing * 2)
        } else {
            ctx.fillStyle = unselectedListItemColor;
            ctx.fillRect(0, titleBarHeight + i * lineSpacing * 2, width, lineSpacing * 2)
            ctx.font = `${fontHeight}px sans-serif`;
            ctx.fillStyle = unselectedListItemFontColor;
            ctx.fillText(chatID, margin * 2, titleBarHeight + margin * 2 + i * lineSpacing * 2)
        }
    })
}

function openChat() {
    if (selected >= chatIDs.length) {
        window.location.pathname = "/chats/new";
    } else {
        window.location.pathname = "/chats/" + chatIDs[selected];
    }
}

document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey) return;

    if (e.key === "ArrowLeft") {
    } else if (e.key === "ArrowRight") {
        openChat();
    } else if (e.key === "ArrowDown") {
        if (selected + 1 < chatIDs.length) {
            selected++
            draw();
        }
    } else if (e.key === "ArrowUp") {
        if (selected > 0) {
            selected--
            draw();
        }
    } else if (e.key === "Backspace") {
    } else if (e.key === "Delete") {
    } else if (e.key === "Enter") {
        openChat()
    } else if (e.key.length === 1) {
    }
});

document.addEventListener("paste", (e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData("text");
    if (paste) {
        inputText = inputText.slice(0, cursorIndex) + paste + inputText.slice(cursorIndex);
        cursorIndex += paste.length;
    }
});

draw();
