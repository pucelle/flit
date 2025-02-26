import {html, RenderResultRenderer} from '@pucelle/lupos.js'
import {popup, PopupOptions} from './popup'
import {TooltipType, Tooltip} from '../components'
import {ThemeSize} from '../style'


export interface TooltipOptions extends PopupOptions{

	/** Tooltip type, `default | prompt | error`. */
	readonly type: TooltipType

	/** Tooltip text size. */
	size: ThemeSize
}


const DefaultTooltipOptions: Partial<TooltipOptions> = {

	key: 'tooltip',

	position: 'r',
	gaps: 1,

	/** Make it can be shown even out-of viewport. */
	stickToEdges: true,

	showDelay: 0,
	hideDelay: 200,

	type: 'default',
	size: 'default',
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

	declare options: TooltipOptions

	update(renderer: string | RenderResultRenderer | null, options: Partial<TooltipOptions> = {}) {
		options = {...DefaultTooltipOptions, ...options}
		super.update(renderer ? this.popupRenderer.bind(this, renderer) : null, options)
	}

	protected popupRenderer(renderer: string | RenderResultRenderer) {
		let rendered = typeof renderer === 'function' ? renderer.call(this.context) : renderer

		return html`
			<Tooltip .type=${this.options.type} .size=${this.options.size}>
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
