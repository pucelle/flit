import {html, RenderResultRenderer} from '@pucelle/lupos.js'
import {DefaultPopupOptions, popup, PopupOptions} from './popup'
import {TooltipType, Tooltip} from '../components'


export interface TooltipOptions extends PopupOptions{

	/** Tooltip type, `default | prompt | error`. */
	readonly type: TooltipType
}


const DefaultTooltipOptions: PartialKeys<TooltipOptions, 'key' | 'alignTo'> = {
	...DefaultPopupOptions,

	alignPosition: 'r',
	gap: 3,

	showDelay: 0,
	hideDelay: 200,
	pointable: false,

	type: 'default',
}


/**
 * A `:tooltip` binding can help to show a short text message besides a anchor element.
 * 
 * `:tooltip="message"`
 * `:tooltip=${message}`
 * `:tooltip=${() => message}`
 */
export class tooltip extends popup {

	protected options: PartialKeys<TooltipOptions, 'key' | 'alignTo' | 'transition'> = DefaultTooltipOptions

	update(renderer: string | RenderResultRenderer, options: Partial<TooltipOptions> = {}) {
		super.update(this.popupRenderer.bind(this, renderer), options)
	}

	protected popupRenderer(renderer: string | RenderResultRenderer) {
		let rendered = typeof renderer === 'function' ? renderer() : renderer

		return html`
			<Tooltip
				.type=${this.options.type}
				@to-close=${this.hidePopupLater}
			>
				${rendered}
			</Tooltip>
		`
	}

	protected shouldShowImmediately(): boolean {
		return this.options.showImmediately
			|| this.options.type === 'prompt'
			|| this.options.type === 'error'
	}

	protected shouldKeepVisible(): boolean {
		return this.options.keepVisible
			|| this.options.type === 'prompt'
			|| this.options.type === 'error'
	}
}
