import {Component, css, html} from '@pucelle/lupos.js'
import {theme} from '../style'


/** `<Loader>` shows an loading animation to indicate resource is loading. */
export class Loader<E = {}> extends Component<E> {

	static style() {
		let {mainColor, backgroundColor} = theme

		return css`
		.loader{
			display: inline-block;
			vertical-align: top;
			color: ${mainColor};
		}

		.loader.as-cover{
			position: absolute;
			left: 0;
			top: 0;
			right: 0;
			bottom: 0;
			z-index: 10;
			background: ${backgroundColor.alpha(0.9)};
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			text-align: center;
		}

		.loader svg{
			margin: auto;
		}

		.loader path{
			stroke: currentColor;
			fill: none;
			stroke-linecap: square;
		}

		.loader-bg{
			stroke-opacity: 0.3;
		}
		`
	}


	/** 
	 * Size of loader,
	 * Default value is `18`.
	 */
	size: number = 18

	/** 
	 * Stroke size of loader,
	 * Default value is `3`.
	 */
	strokeSize: number = 3

	/** 
	 * Whether work as a cover to cover whole parent element.
	 * Parent element should set `position` to be not static.
	 * Default value is `false`.
	 */
	asCover: boolean = false

	/** How many round per second. */
	speed: number = 0.6

	protected snakeEl!: SVGPathElement

	protected render() {
		let size = this.size
		let strokeWidth = this.strokeSize
		let halfWidth = strokeWidth / 2
		let d = `M${halfWidth} ${halfWidth} H${size - halfWidth} V${size - halfWidth} H${halfWidth}Z`
		let dashArray = `${size - strokeWidth} ${(size - strokeWidth) * 3}`

		return html`
			<template class="loader"
				:class.as-cover=${this.asCover}
				:style.width.px=${size}
				:style.height.px=${size}
				:style.animation="loader-snake-${this.size} 2s linear infinite"
			>
				<svg viewBox="0 0 ${size} ${size}" width=${size} height=${size}>
					<path class="loader-bg" d=${d} style="stroke-width: ${strokeWidth}" />
					<path :ref=${this.snakeEl} d=${d} style="stroke-width: ${strokeWidth}; stroke-dasharray: ${dashArray};" />
				</svg>
			</template>
		`
	}

	protected onReady() {
		let size = this.size
		let strokeWidth = this.strokeSize

		this.snakeEl.animate([
			{strokeDashoffset: 0},
			{strokeDashoffset: - (size - strokeWidth) * 4},
		], 
		{
			duration: 1000 / this.speed,
			iterations: Infinity
		})
	}
}
