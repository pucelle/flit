import {Component, html, css} from 'lupos.html'


/** `<Link>` can include `<a>`. */
export class Link<Events = any> extends Component<Events> {

	static override style = css`
		.link.primary{
			a{
				color: var(--primary-color);
			}
		}
	`

	/** Whether be primary link. */
	primary: boolean = false

	protected override render() {
		return html`
			<template class="link" :class.primary=${this.primary} />
		`
	}
}

