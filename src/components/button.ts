import {Component, ComponentStyle, css, html, TemplateResult} from '@pucelle/lupos.js'
import {theme, ThemeSize} from '../style'


/** `<Button>` is nearly equals <button> element. */
export class Button<E = {}> extends Component<E> {

	static style: ComponentStyle = () => {
		let {mainColor, textColor, borderColor, borderRadius, focusBlurRadius, backgroundColor, lightMode} = theme
		
		return css`	
		.button{
			display: inline-flex;
			justify-content: center;
			align-items: center;
			border: 1px solid ${borderColor};
			color: ${textColor};
			border-radius: ${borderRadius}px;
			padding: calc(0.2em - 1px) 0.8em;
			background: ${backgroundColor};
			text-align: center;
			cursor: pointer;
			vertical-align: top;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			
			&:hover, &:focus{
				border-color: ${backgroundColor.toIntermediate((lightMode === 'light' ? 140 : 60) / 255)};
				background-color: ${backgroundColor.toIntermediate((lightMode === 'light' ? 140 : 60) / 255)};
				color: #fff;
			}

			&:focus{
				box-shadow: 0 0 ${focusBlurRadius}px ${mainColor};
			}

			&:active{
				background: ${textColor};
				border-color: ${textColor};
				color: ${backgroundColor};
			}

			.icon, .icon-loading{
				&:first-child{
					margin-right: 0.25em;
					margin-left: -0.25em;
				}

				&:last-child{
					margin-left: 0.25em;
					margin-right: -0.25em;
				}

				&:only-child{
					margin-left: -0.25em;
					margin-right: -0.25em;
				}
			}

			&.primary{
				background: ${mainColor};
				border-color: ${mainColor};
				color: #fff;

				&:hover, &:focus{
					background: ${mainColor.darken(15/255)};
					border-color: ${mainColor.darken(15/255)};
				}
			
				&:active{
					background: ${mainColor.darken(30/255)};
					border-color: ${mainColor.darken(30/255)};
				}
			}

			&.flat{
				border-color: transparent;
				padding-left: 0;
				padding-right: 0;

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


