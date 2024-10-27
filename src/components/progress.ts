import {Component, css, html} from '@pucelle/lupos.js'
import {theme} from '../style'
import {tooltip, TooltipOptions} from '../bindings'


/** `<Progress>` gives a progress indicate in percentage, just like `<input type=progress>`. */
export class Progress<E = {}> extends Component<E> {

	static style() {
		let {mainColor} = theme

		return css`
		.progress{
			display: inline-flex;
			align-items: center;
			width: 15em;
			height: 2em;
		}

		.progress-groove{
			width: 100%;
			height: 1px;
			background: ${mainColor.alpha(0.2)};
		}

		.progress-progress{
			height: 100%;
			background: ${mainColor};
		}

		.progress-tooltip{
			font-family: consolas;
		}
		`
	}


	/** 
	 * Progress value betweens `0~1`.
	 * Default value is `0`.
	 */
	value: number = 0

	/** Progress var height, default value is `1`. */
	height: number = 1

	/** 
	 * Fixed decimal count of progress text.
	 * E.g., specifies as `2` will out value `1` to `1.00`.
	 * Default value is `null`.
	 */
	decimalCount: number | null = null

	protected render() {
		let tooltipOptions: Partial<TooltipOptions> = {
			position: 'bc-tr',
			alignTo: '.progress-progress',
			gap: 8,
		}

		return html`
			<template class="progress"
				:tooltip=${this.renderTooltipContent, tooltipOptions}
			>
				<div class="progress-groove" :style.height.px=${this.height}>
					<div class="progress-progress"
						:style.width.percent=${Math.min(this.value, 1) * 100}
					></div>
				</div>
			</template>
		`
	}

	renderTooltipContent() {
		let tipValue = (Math.min(this.value, 1) * 100)
		let tipText = tipValue.toString()

		if (this.decimalCount !== null) {
			tipText = tipValue.toFixed(this.decimalCount)
		}
		tipText += '%'

		return html`<span class="progress-tooltip">${tipText}</span>`
	}
}