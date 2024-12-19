import {css, html} from '@pucelle/lupos.js'
import {Popup} from './popup'


/** `<Contextmenu>` to render a simple context menu with a list inside. */
export class ContextMenu<E = {}> extends Popup<E> {

	static style = css`
		.contextmenu{
			position: fixed;
			border-radius: 0;
			
			.list{
				border-bottom: none;
			}

			.list-item{
				padding: 0.2em 0.6em;
			}
		}
	`

	
	readonly triangle: boolean = false

	protected render() {
		return html`
			<template class="popup contextmenu" tabindex="0">
				<slot />
			</template>
		`
	}
}
