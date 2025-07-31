package graphics

// const width, height = 640, 480
const width, height = 320, 240
const numPixels = width * height

// const cols, rows = 80, 30
const cols, rows = 40, 15
const charWidth, charHeight = 8, 16

func TUI(s string) []byte {
	img := []byte{}
	for i := 0; i < numPixels; i++ {
		img = append(img, getPixel(s, i)...)
	}
	return img
}

func getPixel(s string, i int) []byte {
	x := i % width
	y := i / width
	col := x / charWidth
	row := y / charHeight
	charIndex := row*cols + col
	if charIndex >= len(s) {
		return []byte{0, 0, 0, 255}
	}
	char := s[charIndex]
	bmp, ok := DefaultFont[rune(char)]
	if !ok {
		return []byte{0, 0, 0, 255}
	}
	charOffsetX := col * charWidth
	charOffsetY := row * charHeight
	charX := x - charOffsetX
	charY := y - charOffsetY
	shaded := bmp.Pixel(charX, charY)
	if shaded {
		return []byte{255, 255, 255, 255}
	}
	return []byte{0, 0, 0, 255}
}

func getCharIndex(pixelIndex int) int {
	x := pixelIndex % width
	y := pixelIndex / width
	col := x / charWidth
	row := y / charHeight
	i := cols*col + row
	if i > cols*rows {
		panic("i out of range")
	}
	return i
}
