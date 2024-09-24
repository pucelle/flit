import {Component, css, html, TemplateResult} from '@pucelle/lupos.js'
import {theme} from '../style'


/** `<Button>` is nearly equals <button> element. */
export class Button<E = {}> extends Component<E> {

	static style() {
		let {mainColor, textColor, borderColor, borderRadius, focusBlurRadius, backgroundColor} = theme
		
		return css`	
		.button{
			display: inline-flex;
			justify-content: center;
			height: ${theme.adjustSize(28)}px;
			line-height: ${theme.adjustSize(28) - 2}px;
			border: 1px solid ${borderColor};
			color: ${textColor};
			border-radius: ${borderRadius}px;
			padding: 0 ${theme.adjustSize(12)}px;
			background: ${backgroundColor};
			text-align: center;
			cursor: pointer;
			vertical-align: top;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			
			&:hover, &:focus{
				border-color: #666;
				background-color: #666;
				color: #fff;
			}

			&:active{
				background: ${textColor};
				border-color: ${textColor};
				color: ${backgroundColor};
			}

			&:focus{
				box-shadow: 0 0 ${focusBlurRadius}px ${mainColor};
			}

			.icon, .icon-loading{
				position: relative;
				top: -1px;

				&:first-child{
					margin-right: ${theme.adjustSize(6)}px;
				}

				&:last-child{
					margin-left: ${theme.adjustSize(6)}px;
				}

				&:only-child{
					margin-left: 0;
					margin-right: 0;
				}
			}

			&.primary{
				background: ${mainColor};
				border-color: ${mainColor};
				color: #fff;

				&:hover, &:focus{
					background: ${mainColor.darken(15)};
					border-color: ${mainColor.darken(15)};
				}
			
				&:active{
					background: ${mainColor.darken(30)};
					border-color: ${mainColor.darken(30)};
				}
			}

			&.flat{
				border: none;
				padding-left: 0;
				padding-right: 0;
				line-height: ${theme.adjustSize(28)}px;

				&:hover, &:focus{
					background: none;
					color: ${textColor};
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
	}


	/** Whether be primary button. */
	primary: boolean = false

	/** Whether be flat style, has no border. */
	flat: boolean = false

	protected render(): TemplateResult {
		return html`
			<template
				class="button"
				tabindex="0"
				:class.primary=${this.primary}
				:class.flat=${this.flat}
			/>
		`
	}
}


