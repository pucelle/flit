import {css, html, Component, Binding, RenderResultRenderer, RenderResult} from '@pucelle/lupos.js'
import {theme} from '../style'
import {popup, PopupOptions} from '../bindings'
import {Icon} from './icon'
import {Popup} from './popup'


/** `<Dropdown>` for containing both trigger element and popup content.  */
export class Dropdown<E = {}> extends Component<E> implements Partial<PopupOptions> {

	static style() {
		let {mainColor} = theme

		return css`
		.dropdown{
			display: inline-flex;

			&.opened{
				color: ${mainColor};
			}

			&-icon{
				margin-right: 0.4em;
			}
		}
		`
	}


	// When undefined, use default `:popup` options.

	alignPosition = undefined
	gap = undefined
	stickToEdges = undefined
	canSwapPosition = undefined
	canShrinkOnY = undefined
	fixTriangle = undefined

	key = undefined
	alignTo = undefined
	trigger = undefined
	showDelay = undefined
	hideDelay = undefined
	transition = undefined
	showImmediately = undefined
	autoFocus = undefined
	pointable = undefined
	cacheable = undefined
	keepVisible = undefined

	/** 
	 * A fixed render result to render popup content,
	 * or a function to render dynamic render result.
	 * use rendered result to render popup content.
	 * 
	 * You may leave this property to null and choose to
	 * overwrite `renderPopup` method to implement a new component.
	 */
	popupRenderer: RenderResultRenderer | null = null

	/** Apply popup binding after been controlled by it. */
	protected binding: popup | null = null

	/** To know whether dropdown content is opening. */
	get opened(): boolean {
		return this.binding?.opened ?? false
	}

	/** To control popup opened state. */
	set opened(opened: boolean) {
		if (opened !== this.opened) {
			if (opened) {
				this.binding?.showPopupLater()
			}
			else {
				this.binding?.hidePopupLater()
			}
		}
	}

	protected render() {
		return html`
			<template :class.opened=${this.opened}
				:popup=${this.getPopupOptions()}
				:ref.binding=${this.refBinding.bind(this)}
			>
				<slot />
				<Icon class="dropdown-icon" .type="down" .size="inherit" />
			</template>
		`
	}

	protected getPopupOptions(): Partial<PopupOptions> {
		return {
			alignPosition: this.alignPosition,
			gap: this.gap,
			stickToEdges: this.stickToEdges,
			canSwapPosition: this.canSwapPosition,
			canShrinkOnY: this.canShrinkOnY,
			fixTriangle: this.fixTriangle,

			key: this.key,
			alignTo: this.alignTo,
			trigger: this.trigger,
			showDelay: this.showDelay,
			hideDelay: this.hideDelay,
			transition: this.transition,
			showImmediately: this.showImmediately,
			autoFocus: this.autoFocus,
			pointable: this.pointable,
			cacheable: this.cacheable,
			keepVisible: this.keepVisible,
		}
	}

	/** 
	 * To render popup content.
	 * You may choose to specify `popupRenderer` property
	 * if you don't want to implement a new component.
	 */
	protected renderPopup(): RenderResult {
		if (typeof this.popupRenderer === 'function') {
			return this.popupRenderer()
		}
		else {
			return this.popupRenderer
		}
	}

	protected refBinding(binding: popup) {
		this.binding = binding
		this.binding.on('opened-change', this.onOpenedChange, this)
		this.binding.on('will-align', this.onWillAlign, this)
	}

	/** After binding opened state change. */
	protected onOpenedChange(_opened: boolean) {}

	/** Before will align popup content. */
	protected onWillAlign(_content: Popup) {}
}