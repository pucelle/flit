import {Color} from '@pucelle/ff'
import {ComponentStyle, css, html} from '@pucelle/lupos.js'
import {theme, ThemeSize} from '../style'
import {Popup} from './popup'
import {Icon} from './icon'
import {Triangle} from './triangle'


/** 
 * Tooltip type:
 * - `default`: when mouse hover to trigger.
 * - `prompt`: show by default and can be closed.
 * - `error`: always show if having error.
 */
export type TooltipType = 'default' | 'prompt' | 'error'


export interface TooltipEvents {

	/** Request to close tooltip. */
	'to-close'(): void
}


/** `<Tooltip>` shows a short text or html type message beside it's trigger element. */
export class Tooltip<E = {}> extends Popup<E & TooltipEvents> {

	static style: ComponentStyle = () => {
		let {popupBackgroundColor, textColor, errorColor} = theme

		let types = [
			['default', popupBackgroundColor.toIntermediate(0.05)],
			['prompt', textColor.toIntermediate(0.1)],
			['error', errorColor.toIntermediate(0.05)]
		] as [TooltipType, Color][]

		return css`
		.tooltip{
			display: flex;
			max-width: 15em;
			padding: 0.2em 0.5em;
		}

		.tooltip-text{
			flex: 1;
			min-width: 0;
			font-size: 0.928em;
		}

		.tooltip-close{
			display: flex;
			width: 1lh;
			height: 1lh;
			margin-top: -0.3em;
			margin-bottom: -0.3em;
			margin-right: -0.6em;
			cursor: pointer;

			&:active{
				transform: translateY(1px);
			}

			.icon{
				margin: auto;
			}
		}

		${types.map(([type, color]) => {
			let textColor = color.gray > 0.5 ? '#000' : '#fff'

			return css`
			.tooltip.type-${type}{
				background: ${color};
				color: ${textColor};

				.triangle path{
					fill: ${color};
				}
			}
			`
		})}

		.tooltip.type-prompt{
			pointer-events: auto;
		}
		`
	}

	
	size: ThemeSize = 'default'

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
			<template class="popup tooltip size-${this.size} type-${this.type}">
				<lu:if ${this.triangle}>
					<Triangle .direction=${this.triangleDirection} />
				</lu:if>

				<div class="tooltip-text">
					<slot />
				</div>

				<lu:if ${this.type === 'prompt'}>
					<div class="tooltip-close"
						@click=${this.toClose}
					>
						<Icon .type="close" .size="inherit" />
					</div>
				</lu:if>
			</template>
		`
	}

	protected toClose(this: Tooltip) {
		this.fire('to-close')
	}
}

