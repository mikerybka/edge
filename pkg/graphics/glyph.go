package graphics

type Glyph [16]byte

func (g Glyph) Pixel(x, y int) bool {
	return bitAt(g[y], x)
}
