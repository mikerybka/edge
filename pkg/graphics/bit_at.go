package graphics

func bitAt(val byte, i int) bool {
	if i < 0 || i > 7 {
		panic("i out of range")
	}
	return (val>>(7-i))&1 == 1
}
