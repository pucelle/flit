import {css, html} from '@pucelle/lupos.js'
import {ThemeSize} from '../style/'
import {Popup} from './popup'
import {Triangle} from './triangle'
import {Icon} from './icon'
import {fade} from '@pucelle/ff'


/** 
 * `<Popover>` shows content message on a popup beside it's trigger element.
 * 
 * `:slot=action` - single action button or action buttons container.
 */
export class Popover<E = {}> extends Popup<E> {

	static style = css`
		.popover{
			padding: 0.6em 1em;
			min-width: 15em;
			max-width: 30em;
		}

		.popover-triangle{
			left: 1em;
		}

		.popover-header{
			display: flex;
			font-size: 0.928em;
			padding-bottom: 0.3em;
			border-bottom: 1px solid color-mix(in srgb, var(--text-color) 80%, var(--background-color));
			margin-bottom: 0.5em;
		}

		.popover-title{
			flex: 1;
			min-width: 0;
			font-weight: bold;
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}

		.popover-close{
			display: flex;
			width: 2em;
			height: 2em;
			margin-top: -0.2em;
			margin-right: -0.6em;
			cursor: pointer;

			&:active{
				transform: translateY(1px);
			}

			.icon{
				margin: auto;
			}
		}

		.popover-actions{
			margin-left: 2em;

			.button{
				margin-left: 0.4em;
				line-height: 1.5em;
				padding: 0 0.6em;
			}
		}

		.popover-content{
			line-height: 1.5em;
			padding: 0.2em 0;
		}
	`


	/** Normally action button or a container of buttons. */
	declare protected slotElements: {action: HTMLElement}

	size: ThemeSize = 'default'

	/** Popover title. */
	title: string = ''

	/** Whether shows a close icon to quickly close current popover. */
	closable: boolean = false

	protected render() {
		return html`
			<template class="popup popover size-${this.size}"
				:transition=${fade()}
			>
				<lu:if ${this.triangle}>
					<Triangle class="popover-triangle" .direction=${this.triangleDirection} />
				</lu:if>
				${this.renderHead()}
				<div class="content"><slot /></div>
			</template>
		`
	}

	protected renderHead() {
		if (!this.title && !this.slotElements.action) {
			return null
		}

		return html`
			<div class="popover-header">
				<lu:if ${this.title}>
					<div class="popover-title">${this.title}</div>
				</lu:if>

				<lu:if ${this.slotElements.action}>
					<div class="popover-actions">
						<slot name="action" />
					</div>
				</lu:if>

				<lu:if ${this.closable && !this.slotElements.action}>
					<div class="popover-close" @click=${this.close}>
						<Icon .type="close" />
					</div>
				</lu:if>
			</div>
		`
	}
}
