import {Component, html, css, ComponentStyle} from '@pucelle/lupos.js'
import {icons} from '../icons'
import {ThemeSize} from '../style'


/** `<Icon .type>` will show a specified type of svg icon. */
export class Icon<Events = any> extends Component<Events> {

	static style: ComponentStyle = css`
	.icon{
		display: inline-flex;
		stroke: currentColor;
		fill: none;
		margin: auto 0;
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
	 * Icon type.
	 * You may extend more icons by `icons.add(...)`.
	 */
	type: string = ''
	
	protected render() {
		let item = icons.get(this.type)
		if (!item) {
			return ''
		}

		let code = item.code
		let [x, y, w, h] = item.viewBox!

		x += (w - 22) / 2
		y += (h - 22) / 2

		return html`
			<template class="icon size-${this.size}">
				<svg
					viewBox=${[x, y, 22, 22].join(' ')}
					:html=${code}
				></svg>
			</template>
		`
	}
}
