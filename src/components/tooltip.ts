import {css, html, fade} from '@pucelle/lupos.js'
import {ThemeSize} from '../style'
import {Popup} from './popup'
import {Icon} from './icon'
import {Triangle} from './triangle'
import {IconClose} from '../icons'


/** 
 * Tooltip type:
 * - `default`: when mouse hover to trigger.
 * - `prompt`: show by default and can be closed.
 * - `error`: always show if having error.
 */
export type TooltipType = 'default' | 'prompt' | 'error'


/** `<Tooltip>` shows a short text or html type message beside it's trigger element. */
export class Tooltip<E = {}> extends Popup<E> {

	static style = css`
		.tooltip{
			display: flex;
			max-width: 15em;
			padding: 0.4em 0.8em;
			line-height: 1.4;
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
			margin-right: -0.4em;
			margin-left: 0.2em;
			cursor: pointer;

			&:active{
				transform: translateY(1px);
			}

			.icon{
				margin: auto;
			}
		}

		.tooltip.type-default{
			background: color-mix(in srgb, var(--popup-background-color) 95%, var(--text-color));
			color: var(--text-color);

			.triangle path{
				fill: color-mix(in srgb, var(--popup-background-color) 95%, var(--text-color));
			}
		}

		.tooltip.type-prompt{
			background: var(--text-color);
			color: var(--background-color);
			pointer-events: auto;

			.triangle path{
				fill: var(--text-color);
			}
		}

		.tooltip.type-error{
			background: var(--error-color);
			color: #fff;

			.triangle path{
				fill: var(--error-color);
			}
		}
	`

	
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
			<template class="popup tooltip size-${this.size} type-${this.type}"
				:transition.immediate=${fade()}
			>
				<lu:if ${this.triangle}>
					<Triangle .direction=${this.triangleDirection} />
				</lu:if>

				<div class="tooltip-text">
					<slot />
				</div>

				<lu:if ${this.type === 'prompt'}>
					<div class="tooltip-close"
						@click=${this.close}
					>
						<Icon .icon=${IconClose} .size="inherit" />
					</div>
				</lu:if>
			</template>
		`
	}
}

