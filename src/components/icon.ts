import {Component, html, css} from '@pucelle/lupos.js'
import {icons} from '../icons'
import {theme, ThemeSize} from '../style'


/** `<Icon .type>` will show a specified type of svg icon. */
export class Icon<Events = any> extends Component<Events> {

	static style = css`
	.icon{
		display: inline-flex;
		stroke: currentColor;
		fill: none;
		margin: auto 0;
		vertical-align: middle;
		position: relative;

		svg{
			width: 100%;
			height: 100%;
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
		let code = icons.get(this.type)
		if (!code) {
			return ''
		}

		let [, viewBox, inner] = code.match(/<svg viewBox="(.+?)">([\s\S]+?)<\/svg>/)!
		let [x, y, w, h] = viewBox.split(' ').map(v => Number(v))

		x += (w - 24) / 2
		y += (h - 24) / 2

		return html`
			<template class="icon size-${this.size}">
				<svg
					class="size-${this.size}"
					viewBox=${[x, y, 24, 24].join(' ')}
					width=${24}
					height=${24}
					:html=${inner}
				></svg>
			</template>
		`
	}
}
