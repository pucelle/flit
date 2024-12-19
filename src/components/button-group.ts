import {Component, css, html, TemplateResult} from '@pucelle/lupos.js'


/** `<ButtonGroup>` can contain several `<Button>` elements as a button group. */
export class ButtonGroup<E = {}> extends Component<E> {

	static style = css`
		.button-group{
			display: inline-flex;
			vertical-align: top;

			.button{
				&:nth-child(n+2){
					margin-left: -1px;
					border-top-left-radius: 0;
					border-bottom-left-radius: 0;
				}
		
				&:nth-last-child(n+2){
					border-top-right-radius: 0;
					border-bottom-right-radius: 0;
				}
		
				&.primary{
					position: relative;
					z-index: 1;
				}

				&:hover{
					position: relative;
					z-index: 1;
				}
			}
		}
	`

	protected render(): TemplateResult {
		return html`
			<template class="button-group" />
		`
	}
}