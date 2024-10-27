import {css, html, Component, TemplateResult, ComponentStyle} from '@pucelle/lupos.js'
import {theme} from '../style'
import {Timeout, Color, Observed, fold, fade} from '@pucelle/ff'
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
	message?: string | TemplateResult

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

	static style: ComponentStyle = () => {
		let {infoColor, successColor, errorColor, warningColor, popupBorderRadius, popupShadowBlurRadius, backgroundColor, textColor, popupShadowColor} = theme
		
		let types = [
			['info', infoColor],
			['warning', warningColor],
			['error', errorColor],
			['success', successColor]
		] as [NotificationType, Color][]

		return css`
		.notification{
			position: fixed;
			right: 1em;
			bottom: 1em;
			min-width: 20em;
			max-width: 30em;
			z-index: 1100;	// Higher than tooltip, dialog, ...
			font-size: 0.928em;
		}

		.notification-item{
			position: relative;
			display: flex;
			margin-top: 0.8em;
			background: ${backgroundColor};
			box-shadow: 0 0 ${popupShadowBlurRadius}px ${popupShadowColor};
			cursor: pointer;
			overflow: hidden;
			border-radius: ${popupBorderRadius}px;
		}

		.notification-stripe{
			width: 4px;
		}

		.notification-left{
			padding: 1em 1em 1.2em 1.2em;
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
			color: ${textColor};

			.icon{
				margin: auto;
			}

			&:hover{
				color: ${textColor.toIntermediate(0.1)};
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

		${types.map(([type, color]) => css`
			.notification-type-${type}{
				&:hover{
					background: ${color.mix(backgroundColor, 0.95)};
				}

				.notification-stripe{
					background: ${color};
				}
			}
		`)}
		`
	}

	protected seed: number = 1
	protected items: NotificationItem[] = []

	protected render() {
		return html`
		<template class="notification">
			<lu:for ${this.items}>${(item: Observed<NotificationItem>) => html`
				<div class="notification-item"
					:class="notification-type-${item.type}"
					@mouseenter=${() => this.onMouseEnter(item)}
					@mouseleave=${() => this.onMouseLeave(item)}
					@transition-leave-ended=${this.onLeaveTransitionEnded}
					:transition.immediate=${fade()}
					:transition=${fold()}
				>
					<div class="notification-stripe" />

					<div class="notification-left">
						<Icon class="notification-type-icon" .type=${item.type} />
					</div>

					<div class="notification-content">
						<lu:if ${item.title}>
							<div class="notification-title">${item.title}</div>
						</lu:if>

						<div class="notification-message">${item.message}</div>
						
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
					.primary=${action.primary}
					@click=${() => this.onClickActionButton(action, item)}
				>
					${action.text}
				</Button>
			`)
		}</div>`
	}
	
	protected onClickActionButton(action: NotificationAction, item: NotificationItem) {
		if (action.handler) {
			action.handler()
		}

		this.hide(item.id)
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

	protected onLeaveTransitionEnded(type: string) {
		if (type === 'leave' && this.items.length === 0) {
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
			let item = this.items.find(v => v.id === options.id)
			if (item) {
				Object.assign(item, options)
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
	info(message: string | TemplateResult, options: NotificationOptions = {}): number {
		options.type = 'info'
		options.message = message

		return this.showNotification(options)
	}

	/** Shows warn type notification, returns it's id. */
	warn(message: string | TemplateResult, options: NotificationOptions = {}): number {
		options.type = 'warning'
		options.message = message

		return this.showNotification(options)
	}

	/** Shows error type notification, returns it's id. */
	error(message: string | TemplateResult, options: NotificationOptions = {}): number {
		options.type = 'error'
		options.message = message

		return this.showNotification(options)
	}

	/** Shows success type notification, returns it's id. */
	success(message: string | TemplateResult, options: NotificationOptions = {}): number {
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
class UniqueNotification {

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
	info(message: string | TemplateResult, options: NotificationOptions = {}): number {
		this.overwriteId(options)
		return this.id = this.raw.info(message, options)
	}

	/** Shows warn type notification, returns it's id. */
	warn(message: string | TemplateResult, options: NotificationOptions = {}): number {
		this.overwriteId(options)
		return this.id = this.raw.warn(message, options)
	}

	/** Shows error type notification, returns it's id. */
	error(message: string | TemplateResult, options: NotificationOptions = {}): number {
		this.overwriteId(options)
		return this.id = this.raw.error(message, options)
	}

	/** Shows success type notification, returns it's id. */
	success(message: string | TemplateResult, options: NotificationOptions = {}): number {
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