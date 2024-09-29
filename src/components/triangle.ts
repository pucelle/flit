import {css, Component, html} from '@pucelle/lupos.js'
import {theme} from '../style/theme'
import {popup, PopupOptions} from '../bindings'


/** `<Triangle>` represents a small triangle to be contained by popup or tooltip. */
export class Triangle<E = any> extends Component<E> {

	static style() {
		let {popupBackgroundColor} = theme

		return css`
		.triangle{
			position: absolute;
		}

		.triangle path{
			fill: ${popupBackgroundColor};
		}
		`
	}

	width: number = 14
	height: number = 9

	protected render() {
		let {popupBackgroundColor} = theme
		let triangleWidth = theme.adjustSize(14)
		let triangleHeight = theme.adjustSize(9)
		let triangleX = theme.adjustSize(11)

		return html`
			<template class="triangle" tabindex="0">
				<lu:if ${this.triangle}>
					<div class="triangle" />
				</lu:if>
				<slot />
			</template>
		`
	}
}
