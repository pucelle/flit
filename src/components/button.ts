import {Component, css, html, TemplateResult} from '@pucelle/lupos.js'
import {ThemeSize} from '../style'


/** `<Button>` is nearly equals <button> element. */
export class Button<E = {}> extends Component<E> {

	static style = css`	
		.button{
			display: inline-flex;
			justify-content: center;
			align-items: center;
			border: 1px solid var(--border-color);
			color: var(--border-color);
			border-radius: var(--border-radius);
			padding: calc(0.2em - 1px) 0.6em;
			background: var(--background-color);
			text-align: center;
			cursor: pointer;
			vertical-align: top;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		
			&:hover, &:focus{
				background-color: var(--border-color);
				color: var(--background-color);
			}

			&:focus{
				box-shadow: 0 0 var(--focus-shadow-blur-radius) var(--primary-color);
			}

			&:active{
				background: var(--border-color);
				border-color: var(--border-color);
				color: var(--background-color);
			}

			.icon, .icon-loading{
				&:first-child{
					margin-right: 0.15em;
					margin-left: -0.25em;
				}

				&:last-child{
					margin-left: 0.15em;
					margin-right: -0.25em;
				}

				&:only-child{
					margin-left: -0.25em;
					margin-right: -0.25em;
				}
			}

			&.primary{
				background: var(--primary-color);
				border-color: var(--primary-color);
				color: #fff;

				&:hover, &:focus{
					background: color-mix(in srgb, var(--primary-color) 80%, var(--text-color));
					border-color: color-mix(in srgb, var(--primary-color) 80%, var(--text-color));
				}
			
				&:active{
					background: color-mix(in srgb, var(--primary-color) 60%, var(--text-color));
					border-color: color-mix(in srgb, var(--primary-color) 60%, var(--text-color));
				}
			}

			&.flat{
				border-color: transparent;
				padding-left: 0;
				padding-right: 0;
				color: color-mix(in srgb, var(--border-color) 66%, var(--text-color));

				&:hover, &:focus{
					background: none;
					color: var(--text-color);
				}

				&:active{
					background: none;
				}

				&:focus{
					box-shadow: none;
				}
			}
		}
	`


	size: ThemeSize = 'default'

	/** Whether be primary button. */
	primary: boolean = false

	/** Whether be flat style, has no border. */
	flat: boolean = false

	protected render(): TemplateResult {
		return html`
			<template
				class="button size-${this.size}"
				tabindex="0"
				:class.primary=${this.primary}
				:class.flat=${this.flat}
			/>
		`
	}
}


