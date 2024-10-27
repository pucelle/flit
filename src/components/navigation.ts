import {css, html} from '@pucelle/lupos.js'
import {List} from './list'
import {theme} from '../style'


/** `<Navigation>` can navigate through various sections or pages. */
export class Navigation<T> extends List<T> {

	static style() {
		let {backgroundColor} = theme

		return css`
		.navigation{
			padding: 0.6em 1.2em;
			border-bottom: none;
			background: ${backgroundColor.toIntermediate(0.09)};
			overflow-y: auto;
		}

		.navigation-title{
			font-size: 1.285em;
			font-weight: 300;
			margin-top: 0.3em;
			margin-bottom: 0.6em;
		}
		`
	}

	/** Type, always be `navigation`. */
	readonly mode: 'selection' | 'navigation' = 'navigation'

	/** Navigation title. */
	title: string = ''

	render() {
		return html`
		<template class="list navigation">
			<lu:if ${this.title}>
				<div class="navigation-title">
					${this.title}
				</div>
			</lu:if>
			${this.renderItems(this.data)}
		</template>
		`
	}
}