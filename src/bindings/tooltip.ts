import {html, RenderResultRenderer} from '@pucelle/lupos.js'
import {popup, PopupOptions} from './popup'
import {TooltipType, Tooltip} from '../components'
import {ObjectUtils} from '@pucelle/ff'


export interface TooltipOptions extends PopupOptions{

	/** Tooltip type, `default | prompt | error`. */
	readonly type: TooltipType
}


const DefaultTooltipOptions: Partial<TooltipOptions> = {

	position: 'r',
	gap: 1,

	/** Make it can be shown even out-of viewport. */
	stickToEdges: false,

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
 * `:tooltip=${message, {position, ...}}`
 * `:tooltip=${() => message, {position, ...}}`
 */
export class tooltip extends popup {

	declare options: PartialKeys<TooltipOptions, 'key' | 'alignTo' | 'transition'>

	update(renderer: string | RenderResultRenderer, options: Partial<TooltipOptions> = {}) {
		options = ObjectUtils.assignNonExisted(options, DefaultTooltipOptions)
		super.update(this.popupRenderer.bind(this, renderer), options)
	}

	protected popupRenderer(renderer: string | RenderResultRenderer) {
		let rendered = typeof renderer === 'function' ? renderer.call(this.context) : renderer

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
