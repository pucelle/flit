import {Component, html, css} from '@pucelle/lupos.js'


/** `<Label>` displays a text label. */
export class Label<Events = any> extends Component<Events> {

	static override style = css`
		.label{
			font-weight: bold;
			font-size: 0.928em;

			&.required{
				&::after{
					position: relative;
					content: '*';
					color: var(--error-color);
					margin-left: 2px;
					top: calc(0.5lh - 0.5em - 2px);
				}
			}

			.icon{
				color: var(--text-color);
			}
		}
	`


	/** Whether label is required. */
	required: boolean = false
	
	protected override render() {
		return html`
			<template class="label"
				:class.required=${this.required}
			/>
		`
	}
}
