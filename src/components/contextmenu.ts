import {css, html, RenderResult, fade} from '@pucelle/lupos.js'
import {Popup} from './popup'


/** `<Contextmenu>` to render a simple context menu with a `<List>` or `<DropList>` inside. */
export class ContextMenu<E = {}> extends Popup<E> {

	static override style = css`
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

	
	override readonly triangle: boolean = false

	protected override render(): RenderResult {
		return html`
			<template class="popup contextmenu" tabindex="0"
				:transition.immediate=${fade()}
			>
				<slot />
			</template>
		`
	}
}
