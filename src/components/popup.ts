import {AlignerOptions} from '@pucelle/ff'
import {css, Component, html} from '@pucelle/lupos.js'
import {theme} from '../style/theme'
import {Triangle} from './triangle'


/** 
 * `<Popup>` represents the container of popup content.
 * `<Popup>` should be contained by a `<lu:portal>` when rendering.
 */
export class Popup<E = {}> extends Component<E> {

	static style() {
		let {popupBorderRadius, popupBackgroundColor, popupShadowBlurRadius, popupShadowColor} = theme

		return css`
		.popup{
			position: absolute;
			left: 0;
			top: 0;
			background: ${popupBackgroundColor};
			border-radius: ${popupBorderRadius}px;

			// Same with window type components, so if inside of a window, we must move it behind the window.
			z-index: 1000;

			// 3px drop shadow nearly equals 6px of box-shadow.
			filter: drop-shadow(0 0 ${popupShadowBlurRadius / 2}px ${popupShadowColor});
		}
		`
	}


	/** Whether shows triangle element. */
	triangle: boolean = true

	protected render() {
		return html`
			<template class="popup" tabindex="0">
				<lu:if ${this.triangle}>
					<Triangle />
				</lu:if>
				<slot />
			</template>
		`
	}

	/** 
	 * Insert element into document after connected.
	 * You may overwrite this.
	 */
	applyAppendTo() {
		this.appendTo(document.body)
	}
}
