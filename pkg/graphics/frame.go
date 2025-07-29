package graphics

// const width, height = 640, 480
// const cols, rows = 80, 30

// func NewFrame() Frame {
// 	return Frame([width * height * 4]byte{})
// }

// type Frame [width * height * 4]byte

// func (f Frame) Bytes() []byte {
// 	return f[:]
// }

// func (f Frame) WritePixel(r, g, b, t byte, x, y int) {
// 	i := (y*width + x) * 4
// 	f[i] = r
// 	f[i+1] = g
// 	f[i+2] = b
// 	f[i+3] = b
// 	f[i+4] = t
// }

// func (f Frame) DrawChar(pos int, r rune) {
// 	bmp, ok := defaultFont[r]
// 	if !ok {
// 		return
// 	}
// 	row := pos % cols
// 	col := pos / cols
// 	for i := range bmp {
// 		y := row*16 + i
// 		for j := 0; j < 8; j++ {
// 			x := col*8 + j
// 			if bitAt(bmp[i], j) {
// 				f.WritePixel(255, 255, 255, 255, x, y)
// 			}
// 		}
// 	}
// }

// func (f Frame) DrawText(text string) {
// 	for i, char := range text {
// 		f.DrawChar(i, char)
// 	}
// }
