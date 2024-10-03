import {css, Component, html} from '@pucelle/lupos.js'
import {theme} from '../style/theme'


/** `<Triangle>` represents a small triangle to be contained by popup or tooltip. */
export class Triangle<E = {}> extends Component<E> {

	static style() {
		let {popupBackgroundColor} = theme

		return css`
		.triangle{
			position: absolute;
		}

		.triangle path{
			stroke: none;
			fill: ${popupBackgroundColor};
		}
		`
	}

	/** Triangle width with triangle point to top position. */
	width: number = 10

	/** Triangle height with triangle point to top position. */
	height: number = 7

	/** The direction triangle acute angle point to. */
	direction: 'top' | 'bottom' | 'left' | 'right' = 'top'

	protected render() {
		let w = this.width
		let h = this.height
		let viewBox = [0, 0, this.width, this.height].join(' ')
		let d = `M${w / 2} 0L${w} ${h} H0Z`

		let rotate = this.direction === 'top'
			? 0
			: this.direction === 'bottom'
			? 180
			: this.direction === 'right'
			? 90
			: 270

		return html`
			<template class="triangle">
				<svg viewBox=${viewBox} transform="rotate(${rotate}deg)">
					<path d=${d}>
				</svg>
			</template>
		`
	}
}
