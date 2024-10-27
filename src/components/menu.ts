import {css, html} from '@pucelle/lupos.js'
import {theme, ThemeSize} from '../style'
import {Popup} from './popup'
import {Triangle} from './triangle'


/** `<Menu>` shows a menu with a list inside. */
export class Menu<E = {}> extends Popup<E> {

	static style() {
		let {textColor} = theme

		return css`
		.menu{
			min-width: 15em;
			max-width: 30em;
			padding: 0.6em 1em;
			
			.list{
				border-bottom: none;
				max-height: 100%;
				overflow-y: auto;
			}
		}

		.menu-triangle{
			left: 1em;
		}

		.menu-header{
			display: flex;
			font-size: 0.928em;
			padding-bottom: 0.4em;
			border-bottom: 1px solid ${textColor.alpha(0.8)};
		}

		.menu-title{
			flex: 1;
			min-width: 0;
			padding: 0 1em 0 0;
			font-weight: bold;
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}
		`
	}


	size: ThemeSize = 'default'

	/** Menu title. */
	title: string = ''

	protected render() {
		return html`
		<template class="popup menu size-${this.size}">
			<lu:if ${this.triangle}>
				<Triangle class="menu-triangle" .direction=${this.triangleDirection} />
			</lu:if>
			${this.renderHead()}
			<slot />
		</template>
		`
	}

	protected renderHead() {
		if (!this.title) {
			return null
		}

		return html`
			<div class="menu-header">
				<div class="menu-title">${this.title}</div>
			</div>
		`
	}
}
