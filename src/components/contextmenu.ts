import {css, html, RenderResult} from '@pucelle/lupos.js'
import {Popup} from './popup'
import {fade} from '@pucelle/ff'


/** `<Contextmenu>` to render a simple context menu with a `<List>` or `<DropList>` inside. */
export class ContextMenu<E = {}> extends Popup<E> {

	static style = css`
		.contextmenu{
			position: fixed;
			border-radius: 0;
			
			.list{
				border-bottom: none;
			}

			.list-content{
				padding: 0.3em 0.6em;
			}
		}
	`

	
	readonly triangle: boolean = false

	protected render(): RenderResult {
		return html`
			<template class="popup contextmenu" tabindex="0"
				:transition.immediate=${fade()}
			>
				<slot />
			</template>
		`
	}
}
