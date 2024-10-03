
import {Component, html, css} from '@pucelle/lupos.js'
import {theme, ThemeSize} from '../style'


/** `<Link>` can include `<a>`. */
export class Link<Events = any> extends Component<Events> {

	static style() {
		let {mainColor} = theme

		return css`
		.link.primary{
			a{
				color: ${mainColor};
			}
		}
		`
	}


	protected render() {
		return html`
			<template class="link" />
		`
	}
}

