import {Component, html, css} from '@pucelle/lupos.js'
import {icons} from '../icons'
import {theme} from '../style'


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
			margin: auto;
		}
	}
	`

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
		let [,, w, h] = viewBox.split(' ')
		let width = theme.adjustSize(Number(w))
		let height = theme.adjustSize(Number(h))

		return html`
			<svg
				viewBox=${viewBox}
				width=${width}
				height=${height}
				:html=${inner}
			></svg>
		`
	}
}
