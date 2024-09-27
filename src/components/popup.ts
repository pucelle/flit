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

		.popup-triangle{
			position: absolute;
			border-left: ${triangleWidth / 2}px solid transparent;
			border-right: ${triangleWidth / 2}px solid transparent;
			border-bottom: ${triangleHeight}px solid ${popupBackgroundColor};
			top: -${triangleHeight}px;
			left: ${triangleX}px;

			&-horizontal{
				border-top: ${triangleWidth / 2}px solid transparent;
				border-bottom: ${triangleWidth / 2}px solid transparent;
				border-right: ${triangleHeight}px solid ${popupBackgroundColor};
				border-left: 0;
				top: ${triangleX}px;
				left: -${triangleHeight}px;
			}
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
	
	/** Show triangle element in horizontal order - left or right position. */
	horizontal: boolean = false

	/** Apply popup binding after been controlled by it. */
	protected binding: popup | null = null

	protected render() {
		return html`
			<template class="popup" tabindex="0">
				<lu:if ${this.triangle}>
					<div class="popup-triangle"
						:class.triangle-horizontal=${this.horizontal}
					/>
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
	protected applyAppendTo() {
		this.appendTo(document.body)
	}

	/** Set related popup binding which control this. */
	setBinding(binding: popup) {
		this.binding = binding
	}

	/** Get the trigger element. */
	getTriggerElement(): HTMLElement | null {
		return this.binding?.getTriggerElement() || null
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
