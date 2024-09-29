import {css, Component, html} from '@pucelle/lupos.js'
import {theme} from '../style/theme'
import {popup, PopupOptions} from '../bindings'


/** 
 * `<Popup>` represents the container of popup content.
 * `<Popup>` should be contained by a `<lu:portal>` when rendering.
 */
export class Popup<E = any> extends Component<E> {

	static style() {
		let {popupBorderRadius, popupBackgroundColor, popupShadowBlurRadius, popupShadowColor} = theme
		let triangleWidth = theme.adjustSize(14)
		let triangleHeight = theme.adjustSize(9)
		let triangleX = theme.adjustSize(11)

		return css`
		.popup{
			position: absolute;
			left: 0;
			top: 0;

			// Same with window type components, so if inside of a window, we must move it behind the window.
			z-index: 1000;

			background: ${popupBackgroundColor};
			border-radius: ${popupBorderRadius}px;

			// 3px drop shadow nearly equals 6px of box-shadow.
			filter: drop-shadow(0 0 ${popupShadowBlurRadius / 2}px ${popupShadowColor});
		}
		`
	}


	/** 
	 * Options to overwrite default `:popup` binding options,
	 * normally use this to control default alignment for extended classes.
	 * Will be overwritten by binding options passed to `:popup=${{...}}`.
	 */
	readonly defaultPopupOptions: PopupOptions | null = null

	/** Whether shows triangle element. */
	triangle: boolean = true

	/** Apply popup binding after been controlled by it. */
	protected binding: popup | null = null

	/** Get the trigger element. */
	get triggerElement(): HTMLElement | null {
		return this.binding?.el || null
	}

	protected render() {
		return html`
			<template class="popup" tabindex="0">
				<lu:if ${this.triangle}>
					<div class="triangle" />
				</lu:if>
				<slot />
			</template>
		`
	}
	
	protected onConnected() {
		super.onConnected()
		this.applyAppendTo()
	}
	
	/** 
	 * Insert element into document after connected.
	 * You may overwrite this.
	 */
	applyAppendTo() {
		this.appendTo(document.body)
	}

	/** Set related popup binding which control this. */
	setBinding(binding: popup) {
		this.binding = binding
	}

	/** Close popup content, may play leave transition. */
	close() {
		if (this.binding) {
			this.binding.hidePopupLater()
		}
		else {
			this.remove()
		}
	}
}
