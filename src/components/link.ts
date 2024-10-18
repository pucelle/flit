
import {Component, html, css, ComponentStyle} from '@pucelle/lupos.js'
import {theme} from '../style'


/** `<Link>` can include `<a>`. */
export class Link<Events = any> extends Component<Events> {

	static style: ComponentStyle = () => {
		let {mainColor} = theme

		return css`
		.link.primary{
			a{
				color: ${mainColor};
			}
		}
		`
	}

	/** Whether be primary link. */
	primary: boolean = false

	protected render() {
		return html`
			<template class="link" :class.primary=${this.primary} />
		`
	}
}

