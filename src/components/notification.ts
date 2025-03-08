import {css, html, Component, RenderResultRenderer} from '@pucelle/lupos.js'
import {Timeout, fold, fade, TransitionResult} from '@pucelle/ff'
import {Icon} from './icon'
import {Button} from './button'


export interface NotificationOptions {

	/** Notification id, if same with an existed item, will replace it. */
	id?: number

	/** Notification type, `info, warning, error, success`. */
	type?: NotificationType

	/** Notification title. */
	title?: string

	/** Notification message. */
	message?: RenderResultRenderer

	/** A data list to show below message. */
	list?: string[]

	/** Additional action buttons. */
	actions?: NotificationAction[]

	/** Hide notification after milliseconds. Default value is `5000`. */
	hideDelay?: number
}

/** Notification type. */
export type NotificationType = 'info' | 'warning' | 'error' | 'success'

export interface NotificationAction {

	/** Button text. */
	text: string

	/** Action button becomes primary if set this to true. */
	primary?: boolean

	/** Call after clicked the action button. */
	handler?: () => void
}

interface NotificationItem extends NotificationOptions {

	/** Notification id. */
	id: number

	/** Whether mouse hovering. */
	hovering: boolean

	/** Timeout to hide current notification. */
	timeout: Timeout | null
}


/** `<Notification>` shows a notification list to notify about infos. */
export class Notification<E = {}> extends Component<E> {

	static style = css`
		.notification{
			position: fixed;
			right: 1em;
			bottom: 1em;
			min-width: 20em;
			max-width: 30em;
			z-index: 1100;	/* Higher than tooltip, dialog, ... */
			font-size: 0.928em;
		}

		.notification-item{
			position: relative;
			display: flex;
			margin-top: 0.8em;
			background: var(--background-color);
			box-shadow: 0 0 var(--popup-shadow-blur-radius) var(--popup-shadow-color);
			cursor: pointer;
			overflow: hidden;
			border-radius: var(--popup-border-radius);
		}

		.notification-stripe{
			width: 4px;
		}

		.notification-left{
			padding: 1em 1em 1em 1.2em;
		}

		.notification-type-icon{
			display: block;
		}

		.notification-content{
			flex: 1;
			min-width: 0;
			padding: 1.1em 1.2em 1.1em 0;
		}

		.notification-close{
			display: flex;
			width: 2em;
			height: 2em;
			color: var(--text-color);

			.icon{
				margin: auto;
			}

			&:hover{
				color: color-mix(in srgb, var(--text-color) 90%, var(--background-color));
			}

			&:active{
				transform: translateY(1px);
			}
		}

		.notification-title{
			font-weight: bold;
			margin-bottom: 0.2em;
		}

		.notification-message{
			flex: 1;
			min-width: 0;
			line-height: 1.4;
			margin-bottom: 0.2em;
			text-align: left;
			word-wrap: break-word;

			a{
				font-weight: bold;
			}
		}

		.notification-list{
			margin: 0.6em 0;
			line-height: 1.4;
			list-style-type: square;
			padding-left: 2em;
		}

		.notification-actions{
			margin-top: 0.5em;
		}

		.notification-action{
			margin-right: 0.4em;
			line-height: 1.4;
			padding: 0 0.6em;
		}

		.notification-type-info{
			&:hover{
				background: color-mix(in srgb, var(--info-color) 5%, var(--background-color));
			}

			.notification-stripe{
				background: var(--info-color);
			}
		}

		.notification-type-warning{
			&:hover{
				background: color-mix(in srgb, var(--warning-color) 5%, var(--background-color));
			}

			.notification-stripe{
				background: var(--warning-color);
			}
		}

		.notification-type-success{
			&:hover{
				background: color-mix(in srgb, var(--success-color) 5%, var(--background-color));
			}

			.notification-stripe{
				background: var(--success-color);
			}
		}

		.notification-type-error{
			&:hover{
				background: color-mix(in srgb, var(--error-color) 5%, var(--background-color));
			}

			.notification-stripe{
				background: var(--error-color);
			}
		}
	`

	protected seed: number = 1
	protected items: NotificationItem[] = []

	protected render() {
		return html`
		<template class="notification">
			<lu:for ${this.items}>${(item: NotificationItem) => html`
				<div class="notification-item"
					:class="notification-type-${item.type}"
					@mouseenter=${() => this.onMouseEnter(item)}
					@mouseleave=${() => this.onMouseLeave(item)}
					@transition-leave-ended=${this.onLeaveTransitionEnded}
					:transition.immediate=${fade()}
					:transition=${fold() as TransitionResult<Element, any>}
				>
					<div class="notification-stripe" />

					<div class="notification-left">
						<Icon class="notification-type-icon" .type=${item.type ?? 'info'} />
					</div>

					<div class="notification-content">
						<lu:if ${item.title}>
							<div class="notification-title">${item.title}</div>
						</lu:if>

						<div class="notification-message">${this.renderMessage(item.message)}</div>
						
						<lu:if ${item.list && item.list.length > 0}>
							<ul class="notification-list">
								${item.list!.map(text => html`<li>${text}</li>`)}
							</ul>
						</lu:if>

						${this.renderActions(item)}
					</div>

					<div class="notification-close" @click=${() => this.onClickClose(item)}>
						<Icon .type="close" />
					</div>
				</div>`
			}</lu:for>
		</template>
		`
	}

	protected renderMessage(message: RenderResultRenderer | undefined) {
		if (typeof message === 'function') {
			return message()
		}
		else {
			return message
		}
	}

	protected onUpdated() {
		super.onUpdated()

		// If a wide item disappear, all other narrow items become narrower.
		// This can prevent them from becoming narrower.
		this.el.style.minWidth = this.el.offsetWidth + 'px'
	}

	protected renderActions(item: NotificationItem) {
		let actions = item.actions

		if (!actions || actions.length === 0) {
			return null
		}

		return html`<div class="notification-actions">${
			actions.map(action => html`
				<Button class="notification-action"
					.primary=${action.primary!}
					@click=${() => this.onClickActionButton(action)}
				>
					${action.text}
				</Button>
			`)
		}</div>`
	}
	
	protected onClickActionButton(action: NotificationAction) {
		if (action.handler) {
			action.handler()
		}
	}

	protected onMouseEnter(item: NotificationItem) {
		item.hovering = true
	}

	protected onMouseLeave(item: NotificationItem) {
		item.hovering = false

		if (!item.timeout) {
			this.hideLater(item)
		}
	}

	protected onClickClose(item: NotificationItem) {
		this.hide(item.id)
	}

	protected onLeaveTransitionEnded() {
		if (this.items.length === 0) {
			this.remove()
			this.el.style.minWidth = ''
		}
	}

	/** 
	 * Shows a notification and returns it's id.
	 * You may use an existing id to overwrite options.
	 */
	show(options: NotificationOptions): number {

		// Overwrite existing.
		if (options.id) {
			let itemIndex = this.items.findIndex(v => v.id === options.id)
			if (itemIndex > -1) {
				let item: NotificationItem = {
					...options,
					hovering: false,
					timeout: null,
				} as NotificationItem

				this.items[itemIndex] = item
				this.hideLater(item)
				
				return options.id
			}
		}

		let item: NotificationItem = {
			id: this.seed++,
			...options,
			hovering: false,
			timeout: null,
		}
				
		this.items.unshift(item)
		this.hideLater(item)

		if (this.items.length === 1) {
			this.appendTo(document.body)
		}

		return item.id
	}

	protected hideLater(item: NotificationItem) {
		if (item.timeout) {
			item.timeout.cancel()
		}

		item.timeout = new Timeout(() => {
			item.timeout = null

			if (!item.hovering) {
				this.hide(item.id)
			}
		}, item.hideDelay || 5000)
		
		item.timeout.start()
	}

	/** Hide notification by it's id. */
	hide(id: number): boolean {
		let index = this.items.findIndex(v => v.id === id)
		if (index > -1) {
			this.items.splice(index, 1)
			return true
		}
		else {
			return false
		}
	}

	/** Hide all notifications. */
	hideAll() {
		this.items = []

		if (this.items.length === 0) {
			this.el.remove()
		}
	}
}


/** Single class to manage notification list. */
export class TypedNotification {

	protected notification: Notification | null = null

	/** 
	 * Returns a unique notification instance,
	 * all notification calls on it will share an unique notification item,
	 * so you can easily replace notification.
	 */
	unique() {
		return new UniqueNotification(this)
	}

	protected showNotification(options: NotificationOptions): number {
		if (!this.notification) {
			this.notification = new Notification()
		}

		return this.notification.show(options)
	}

	/** Shows info type notification, returns it's id. */
	info(message: RenderResultRenderer, options: NotificationOptions = {}): number {
		options.type = 'info'
		options.message = message

		return this.showNotification(options)
	}

	/** Shows warn type notification, returns it's id. */
	warn(message: RenderResultRenderer, options: NotificationOptions = {}): number {
		options.type = 'warning'
		options.message = message

		return this.showNotification(options)
	}

	/** Shows error type notification, returns it's id. */
	error(message: RenderResultRenderer, options: NotificationOptions = {}): number {
		options.type = 'error'
		options.message = message

		return this.showNotification(options)
	}

	/** Shows success type notification, returns it's id. */
	success(message: RenderResultRenderer, options: NotificationOptions = {}): number {
		options.type = 'success'
		options.message = message

		return this.showNotification(options)
	}

	/** Hide notification by it's id. */
	hide(id: number) {
		return this.notification?.hide(id)
	}

	/** Hide all notifications. */
	hideAll() {
		this.notification?.hideAll()
	}
}


/** All notification calls will share a unique notification item. */
export class UniqueNotification {

	protected readonly raw: TypedNotification
	protected id: number | null = null

	constructor(raw: TypedNotification) {
		this.raw = raw
	}

	protected overwriteId(options: NotificationOptions) {
		if (this.id) {
			options.id = this.id
		}
	}
	
	/** Shows info type notification, returns it's id. */
	info(message: RenderResultRenderer, options: NotificationOptions = {}): number {
		this.overwriteId(options)
		return this.id = this.raw.info(message, options)
	}

	/** Shows warn type notification, returns it's id. */
	warn(message: RenderResultRenderer, options: NotificationOptions = {}): number {
		this.overwriteId(options)
		return this.id = this.raw.warn(message, options)
	}

	/** Shows error type notification, returns it's id. */
	error(message: RenderResultRenderer, options: NotificationOptions = {}): number {
		this.overwriteId(options)
		return this.id = this.raw.error(message, options)
	}

	/** Shows success type notification, returns it's id. */
	success(message: RenderResultRenderer, options: NotificationOptions = {}): number {
		this.overwriteId(options)
		return this.id = this.raw.success(message, options)
	}

	/** Hide current notification. */
	hide() {
		if (this.id) {
			return this.raw.hide(this.id)
		}
		else {
			return false
		}
	}
}


/** A quick global API to show notifications. */
export const notification = new TypedNotification()