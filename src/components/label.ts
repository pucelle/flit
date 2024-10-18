import {Component, html, css, ComponentStyle} from '@pucelle/lupos.js'
import {theme} from '../style'


/** `<Label>` shows a text label. */
export class Label<Events = any> extends Component<Events> {

	static style: ComponentStyle = () => {
		let {errorColor, textColor} = theme

		return css`
		.label{
			font-weight: bold;
			font-size: 0.928em;

			&.required{
				&::after{
					position: relative;
					content: '*';
					color: ${errorColor};
					margin-left: 2px;
					top: calc(0.5lh - 0.5em - 2px);
				}
			}

			.icon{
				margin-left: 4px;
				color: ${textColor.toIntermediate(20/255)};
			}
		}
		`
	}


	/** Whether label is required. */
	required: boolean = false
	
	protected render() {
		return html`
			<template class="label"
				:class.required=${this.required}
			/>
		`
	}
}
