import {RenderResultRenderer} from '@pucelle/lupos.js'
import {popup, PopupOptions} from './popup'


const DefaultContextMenuOptions: Partial<PopupOptions> = {
	key: 'contextmenu',
	followEvents: true,
	trigger: 'contextmenu',
	position: 'br',
	showDelay: 0,
	hideDelay: 0,
}


/** 
 * `:contextmenu` binding pops-up a context menu when right click bound element,
 * the context menu will be aligned to the position where you clicked.
 * 
 * `:contextmenu=${() => html`<ContextMenu>`}`
 * `:contextmenu=${html`<ContextMenu>`}`
 */
export class contextmenu extends popup {

	update(renderer: RenderResultRenderer, options: Partial<PopupOptions> = {}) {
		options = {...DefaultContextMenuOptions, ...options}
		super.update(renderer, options)
	}
}
