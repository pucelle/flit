import {css, html, Component, Binding, RenderResultRenderer, RenderResult} from '@pucelle/lupos.js'
import {theme} from '../style'
import {popup, PopupOptions} from '../bindings'
import {Icon} from './icon'
import {Popup} from './popup'
import {TriggerType} from '../bindings'
import {AlignerPosition, computed, TransitionResult} from '@pucelle/ff'


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
				margin-right: 0;
			}
		}
		`
	}


	// When these options are undefined, use default `:popup` options.

	alignPosition: AlignerPosition | undefined = undefined
	gap: number | number[] | undefined = undefined
	stickToEdges: boolean | undefined = undefined
	canSwapPosition: boolean | undefined = undefined
	canShrinkOnY: boolean | undefined = undefined
	fixTriangle: boolean | undefined = undefined

	key: string | undefined = undefined
	alignTo: string | ((trigger: Element) => Element) | undefined = undefined
	trigger: TriggerType | undefined = undefined
	showDelay: number | undefined = undefined
	hideDelay: number | undefined = undefined
	transition: TransitionResult | undefined = undefined
	showImmediately: boolean | undefined = undefined
	autoFocus: boolean | undefined = undefined
	pointable: boolean | undefined = undefined
	cacheable: boolean | undefined = undefined
	keepVisible: boolean | undefined = undefined

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

	private _opened: boolean = false

	/** To know whether dropdown content is opening. */
	get opened(): boolean {
		return this._opened
	}

	/** To control popup opened state. */
	set opened(opened: boolean) {
		if (opened !== this.opened) {
			if (opened) {
				this.binding?.showPopup()
			}
			else {
				this.binding?.hidePopup()
			}
		}
	}

	protected render() {
		return html`
			<template :class.opened=${this.opened}
				:popup=${this.renderPopup, this.popupOptions}
				:ref.binding=${this.refBinding}
			>
				<slot />
				<Icon class="dropdown-icon" .type="down" .size="inherit" />
			</template>
		`
	}

	/** Avoid this option object get changed, and cause `:popup` re-update. */
	@computed
	protected get popupOptions(): Partial<PopupOptions> {
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

	/** Ref popup binding and bind events. */
	protected refBinding(binding: popup) {
		this.binding = binding
		this.binding.on('opened-change', this.onOpenedChange, this)
		this.binding.on('will-align', this.onWillAlign, this)
	}

	/** After popup binding opened state change. */
	protected onOpenedChange(opened: boolean) {
		this._opened = opened
	}

	/** Before will align popup content. */
	protected onWillAlign(_content: Popup) {}
}