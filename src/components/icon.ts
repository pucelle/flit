import {Component, html, css} from '@pucelle/lupos.js'
import {ThemeSize} from '../style'
import {parseSVGCode} from '../icons'


/** `<Icon .type>` will show a specified type of svg icon. */
export class Icon<Events = any> extends Component<Events> {

	static style = css`
		.icon{
			display: inline-flex;
			stroke: currentColor;
			fill: none;
			vertical-align: middle;
			position: relative;

			svg{
				width: 1lh;
				height: 1lh;
			}
		}
	`


	size: ThemeSize = 'default'
	
	/** 
	 * Icon code.
	 * See `/icons` for all icons available.
	 */
	icon: string = ''
	
	protected render() {
		let parsed = parseSVGCode(this.icon)
		if (!parsed) {
			return null
		}
	
		let {box: {x, y, width, height}, inner} = parsed
		x += (width - 22) / 2
		y += (height - 22) / 2

		return html`
			<template class="icon size-${this.size}">
				<svg
					viewBox=${[x, y, 22, 22].join(' ')}
					:html=${inner}
				></svg>
			</template>
		`
	}
}
