import {css, html, Component, RenderResultRenderer, RenderResult} from '@pucelle/lupos.js'
import {popup, PopupOptions} from '../bindings'
import {Icon} from './icon'
import {Popup} from './popup'
import {TriggerType} from '../bindings'
import {AnchorPosition, HVDirection, ObjectUtils} from '@pucelle/ff'
import {computed} from '@pucelle/lupos'
import {IconDown} from '../icons'


/** `<Dropdown>` for containing both trigger element and popup content.  */
export class Dropdown<E = {}> extends Component<E> implements Partial<PopupOptions> {

	static style = css`
		.dropdown{
			display: inline-flex;

			&.opened{
				.dropdown-icon{
					color: var(--primary-color);
				}
			}
		}
	`


	// When these options are undefined, use default `:popup` options.

	position: AnchorPosition | undefined = undefined
	gaps: number | number[] | undefined = undefined
	stickToEdges: boolean | undefined = undefined
	flipDirection: HVDirection | 'auto' | undefined = undefined
	fixedTriangle: boolean | undefined = undefined

	key: string | undefined = undefined
	alignTo: string | ((trigger: Element) => Element) | undefined = undefined
	trigger: TriggerType | undefined = undefined
	showDelay: number | undefined = undefined
	hideDelay: number | undefined = undefined
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
			<template class="dropdown"
				:class.opened=${this.opened}
				:popup=${this.renderPopup, this.popupOptions}
			>
				<slot />
				<Icon class="dropdown-icon" .icon=${IconDown} .size="inherit" />
			</template>
		`
	}

	/** Avoid this option object get changed, and cause `:popup` re-update. */
	@computed
	protected get popupOptions(): Partial<PopupOptions> {
		return ObjectUtils.cleanEmptyValues({
			position: this.position,
			gaps: this.gaps,
			stickToEdges: this.stickToEdges,
			flipDirection: this.flipDirection,
			fixedTriangle: this.fixedTriangle,

			key: this.key,
			alignTo: this.alignTo,
			trigger: this.trigger,
			showDelay: this.showDelay,
			hideDelay: this.hideDelay,
			showImmediately: this.showImmediately,
			autoFocus: this.autoFocus,
			pointable: this.pointable,
			cacheable: this.cacheable,
			keepVisible: this.keepVisible,
			onOpenedChange: this.onPopupOpenedChange.bind(this),
			onWillAlign: this.onPopupWillAlign.bind(this),
		} as PopupOptions)
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

	/** After popup binding opened state change. */
	protected onPopupOpenedChange(opened: boolean) {
		this._opened = opened
	}

	/** Before will align popup content. */
	protected onPopupWillAlign(_content: Popup) {}
}