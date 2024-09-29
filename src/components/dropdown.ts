import {AlignerPosition} from '@pucelle/ff'
import {css, html, Component, Binding} from '@pucelle/lupos.js'
import {theme} from '../style'
import {popup} from '../bindings'


/** 
 * `<Dropdown>` is abstract class for any component having popup content to show.
 * You should extend it to implement some dropdown type components, like `Select`.
  */
export abstract class Dropdown<E = {}> extends Component<E> {

	static style() {
		let {mainColor} = theme

		return css`
		.dropdown{
			display: inline-flex;
		}

		.opened{
			color: ${mainColor};
		}

		.down-icon{
			margin-right: 6px;
		}

		.popup{
			padding: 5px 0;
		}

		.list{
			overflow-y: auto;
			max-height: 100%;
		}
		`
	}

	protected popupBinding: popup | null = null

	/** Whether dropdown content is opened. */
	opened: boolean = false

	/** Trigger event type. Default value is `click`. */
	trigger: 'hover' | 'click' | 'focus' | 'contextmenu' = 'click'

	/** Whether shows triangle. Default value is `true`. */
	triangle: boolean = true

	/** 
	 * Align position with trigger element.
	 * Default value is 'b', means bottom position.
	 */
	alignPosition: AlignPosition = 'b'

	/** 
	 * Align margin betweens trigger element and popup content.
	 * Default value is '3' in pixels.
	 */
	alignMargin: number | number[] = 3

	/** 
	 * Transition to play when begin to show or hide popup content.
	 * Default value is fade css transition.
	 */
	transition: TransitionOptions = {name: 'fade'}

	/** 
	 * Delay in milliseconds before showing popup content.
	 * Default value is `100` ms.
	 */
	showDelay: number = 100

	/** 
	 * Delay in milliseconds before hiding popup content.
	 * Default value is `100` ms.
	 */
	hideDelay: number = 100

	protected render() {
		let {trigger, triangle, alignPosition, alignMargin, transition, showDelay, hideDelay} = this

		let toPopup = refBinding(
			popup(this.renderPopup.bind(this), {trigger, triangle, alignPosition, alignMargin, transition, showDelay, hideDelay}),
			this.refBinding.bind(this)
		)
		
		return html`
			<template :class.opened=${this.opened} ${toPopup}>
				<slot />
				<f-icon class="down-icon" .type="down" />
			</template>
		`
	}

	protected renderPopup() {
		return html`
			<f-popup
				class="popup"
				.triangle=${this.triangle}
			/>
		`
	}

	protected refBinding(binding: Binding) {
		this.popupBinding = binding as PopupBinding
		this.popupBinding.on('openedStateChange', this.setOpened, this)
		this.popupBinding.on('willAlign', this.onWillAlign, this)
	}

	protected setOpened(opened: boolean) {
		this.opened = opened

		if (opened) {
			this.onPopupOpened()
		}
	}

	protected onPopupOpened() {}

	protected onWillAlign() {}

	protected showPopup() {
		if (this.popupBinding) {
			this.popupBinding.showPopupLater()
		}
	}

	protected hidePopup() {
		if (this.popupBinding) {
			this.popupBinding.hidePopupLater()
		}
	}
}