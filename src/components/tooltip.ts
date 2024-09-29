import {Color} from '@pucelle/ff'
import {css, html} from '@pucelle/lupos.js'
import {theme} from '../style'
import {Popup} from './popup'
import {Icon} from './icon'


/** 
 * Tooltip type:
 * - `default`: when mouse hover to trigger.
 * - `prompt`: show by default and can be closed.
 * - `error`: always show if having error.
 */
export type TooltipType = 'default' | 'prompt' | 'error'


/** `<Tooltip>` shows a short text or html type message beside it's trigger element. */
export class Tooltip<E = {}> extends Popup<E> {

	static style() {
		let {popupBackgroundColor, textColor, errorColor} = theme

		let types = [
			['default', popupBackgroundColor],
			['prompt', textColor.toIntermediate(0.1)],
			['error', errorColor.toIntermediate(0.05)]
		] as [TooltipType, Color][]

		return css`
		.tooltip{
			display: flex;
			font-size: ${theme.adjustFontSize(13)}px;
			max-width: ${theme.adjustSize(220)}px;
			padding: ${theme.adjustSize(4)}px ${theme.adjustSize(8)}px;
			line-height: ${theme.adjustSize(20)}px;

			&-text{
				flex: 1;
				min-width: 0;
			}

			&-close{
				display: flex;
				width: ${theme.adjustSize(28)}px;
				height: ${theme.adjustSize(28)}px;
				margin-top: ${theme.adjustSize(-4)}px;
				margin-bottom: ${theme.adjustSize(-4)}px;
				margin-right: ${theme.adjustSize(-8)}px;
				cursor: pointer;

				&:active{
					transform: translateY(1px);
				}

				.icon{
					margin: auto;
				}
			}
		}

		${types.map(([type, color]) => {
			let textColor = color.gray > 0.5 ? '#000' : '#fff'

			return css`
			.tooltip.type-${type}{
				background: ${color};
				color: ${textColor};
			}
			
			.tooltip .triangle{
				border-bottom-color: ${color};
			}
			`
		})}

		.tooltip.type-prompt{
			pointer-events: auto;
		}
		`
	}

	/** 
	 * Tooltip type:
	 * 
	 * `default`: when mouse hover to trigger.
	 * `prompt`: shows be default and can be closed.
	 * `error`: always show if having error.
	 */
	type: TooltipType = 'default'

	protected render() {
		return html`
			<template class="popup tooltip type-${this.type}">
				<lu:if ${this.triangle}>
					<div class="triangle" />
				</lu:if>

				<div class="tooltip-text">
					<slot />
				</div>

				<lu:if ${this.type === 'prompt'}>
					<div class="tooltip-close"
						@click=${this.close}
					>
						<Icon .type="close" />
					</div>
				</lu:if>
			</template>
		`
	}
}

