import {css, Component, html} from '@pucelle/lupos.js'


/** `<Triangle>` represents a small triangle to be contained by popup or tooltip. */
export class Triangle<E = {}> extends Component<E> {

	static style = css`
		.triangle{
			position: absolute;
		}

		.triangle svg{
			display: block;
		}

		.triangle path{
			stroke: none;
			fill: var(--popup-background-color);
		}
	`

	/** Triangle width when triangle point to top position. */
	width: number = 10

	/** Triangle height when triangle point to top position. */
	height: number = 6

	/** The direction triangle's acute angle point to. */
	direction: 'top' | 'bottom' | 'left' | 'right' = 'top'

	protected render() {
		let w = this.width
		let h = this.height
		let outputWidth = this.direction === 'top' || this.direction === 'bottom' ? w : h
		let outputHeight = this.direction === 'top' || this.direction === 'bottom' ? h : w
		let viewBox = [0, 0, outputWidth, outputHeight].join(' ')

		let p1 = new DOMPoint(w / 2, 0)
		let p2 = new DOMPoint(w, h)
		let p3 = new DOMPoint(0, h)

		let rotateAngle = this.direction === 'left'
			? 270
			: this.direction === 'bottom'
			? 180
			: this.direction === 'right'
			? 90
			: 0

		let m = new DOMMatrix()
		m.rotateSelf(0, 0, rotateAngle)

		p1 = p1.matrixTransform(m)
		p2 = p2.matrixTransform(m)
		p3 = p3.matrixTransform(m)

		let tx = Math.max(0, -p2.x)
		let ty = Math.max(0, -p2.y)

		p1.x += tx
		p1.y += ty
		p2.x += tx
		p2.y += ty
		p3.x += tx
		p3.y += ty

		let d = `M${p1.x} ${p1.y} L${p2.x} ${p2.y} L${p3.x} ${p3.y}Z`

		return html`
			<template class="triangle"
				style="${this.direction}: ${-this.height}px"
			>
				<svg viewBox=${viewBox}
					width=${outputWidth}
					height=${outputHeight}
				>
					<path d=${d}>
				</svg>
			</template>
		`
	}
}
