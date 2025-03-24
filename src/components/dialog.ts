import {css, html, Component, RenderResultRenderer, RenderResult} from '@pucelle/lupos.js'
import {AnchorAligner, DOMEvents, fade, translations, promiseWithResolves, untilUpdateComplete} from '@pucelle/ff'
import {Input} from './input'
import {Textarea} from './textarea'
import {Icon} from './icon'
import {Button} from './button'


export interface DialogOptions {

	/** Dialog icon on the left side. */
	icon?: string

	/** Dialog title. */
	title?: string

	/** Dialog message. */
	message?: RenderResultRenderer

	/** Dialog actions. */
	actions?: DialogAction[]

	/** Dialog list. */
	list?: string[]
}

export interface DialogAction {

	/** Indicates current action and to know which action button clicked. */
	value?: string

	/** Button text. */
	text: string

	/** Action button becomes primary if set to `true`. */
	primary?: boolean

	/** Third action button of will be put on the left. */
	third?: boolean

	/** 
	 * Calls after clicked the action button.
	 * You may return `true` to interrupt dialog from closing,
	 * and return `null` or void to continue closing.
	 */
	handler?: () => boolean | null | void
}

export interface PromptDialogOptions extends DialogOptions {

	/** Prompt input placeholder. */
	placeholder?: string

	/** Default input value. */
	defaultValue?: string | number

	/** Input type, same with `<input type=...>`. */
	inputType?: 'text' | 'password' | 'textarea'

	/** To validate current value, returns an error message, or `null` if passes. */
	validator?: (value: string) => string | null
}

interface DialogItem {

	/** Current dialog options. */
	options: DialogOptions

	/** Resolved after any action button clicked. */
	resolve: (value: string | undefined) => void
}



/** 
 * `<Dialog>` shows blocking-level content on a overlay modal,
 * you must interact with it before continue.
 */
export class Dialog<E = {}> extends Component<E> {
	
	static style = css`
		.dialog{
			z-index: 1000;
			width: 25em;
			position: fixed;
			border-radius: var(--popup-border-radius);
			box-shadow: 0 0 var(--popup-shadow-blur-radius) var(--popup-shadow-color);
			background: var(--popup-background-color);
			max-width: 95%;
			max-height: 95%;
			padding: 0.6em 1.2em 1.2em;
		}

		.dialog-mask{
			position: fixed;
			z-index: 1000;
			left: 0;
			top: 0;
			width: 100%;
			height: 100%;
			background: rgba(0, 0, 0, 0.5);
		}

		.dialog-header{
			display: flex;
			font-size: 0.928em;
			padding-bottom: 0.4em;
			border-bottom: 1px solid color-mix(in srgb, var(--text-color) 80%, var(--background-color));
		}

		.dialog-title{
			flex: 1;
			min-width: 0;
			padding: 0 1.2em 0 0;
			font-weight: bold;
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}

		.dialog-content{
			display: flex;
			margin-top: 0.6em;
		}

		.dialog-icon{
			margin-top: 0.1em;
			margin-right: 0.8em;
		}

		.dialog-message{
			flex: 1;
			min-width: 0;
			line-height: 1.4;
			padding: 0.2em 0;
		}

		.dialog-list{
			margin: 0.6em 0;
			line-height: 1.4;
			list-style-type: square;
			padding-left: 2em;
		}

		.dialog-actions{
			display: flex;
			justify-content: flex-end;
			margin-top: 1.2em;

			.button{
				margin-left: 0.6em;
			}

			.dialog-third{
				margin-left: 0;
				margin-right: auto;
			}
		}

		.dialog-input{
			margin-top: 0.6em;
			margin-bottom: 0.6em;
			width: 100%;
		}
	`


	/** Mask element. */
	protected maskEl!: HTMLElement

	/** Options for current dialog. */
	protected options: DialogOptions | null = null

	/** Also as a marker to know if current options are expired. */
	protected resolve: ((value: string | undefined) => void) | null = null

	/** Dialog stack, will show one by one. */
	protected stack: DialogItem[] = []

	/** Whether dialog opened. */
	protected opened: boolean = false

	protected render(): RenderResult {
		let options = this.options
		if (!options) {
			return null
		}

		return html`
			<template tabindex="0" autofocus
				class="dialog"
				:transition.immediate=${fade()}
				@transition-leave-ended=${this.onLeaveTransitionEnded}
			>
				<lu:portal>
					<div class="dialog-mask"
						:ref=${this.maskEl}
						:transition.immediate.global=${fade()}
					/>
				</lu:portal>

				<lu:if ${options.title}>
					<div class="dialog-header">
						<div class="dialog-title">
							${options.title}
						</div>
					</div>
				</lu:if>

				<div class="dialog-content">

					<lu:if ${options.icon}>
						<Icon class="dialog-icon" .type="${options.icon}" />
					</lu:if>

					<div class="dialog-message">
						${this.renderMessage()}
					</div>

					<lu:if ${options.list && options.list.length > 0}>
						<ul class="dialog-list">
							${options.list!.map(text => html`<li>${text}</li>`)}
						</ul>
					</lu:if>
				</div>

				${this.renderActions(options.actions)}
			</template>
		`
	}

	protected renderMessage() {
		let message = this.options!.message

		if (typeof message === 'function') {
			return message()
		}
		else {
			return message
		}
	}

	protected renderActions(actions: DialogAction[] | undefined) {
		if (!actions || actions.length === 0) {
			return null
		}

		return html`<div class="dialog-actions">${actions.map(action => html`
			<Button class="action"
				.primary=${!!action.primary}
				:class.dialog-third=${action.third}
				@click=${() => this.onClickActionButton(action)}
			>
				${action.text}
			</Button>
		`)}</div>`
	}

	protected onClickActionButton(action: DialogAction) {

		// Prevent from closing.
		if (action.handler) {
			let returned = action.handler()
			if (returned === true) {
				return
			}
		}

		if (this.resolve) {
			this.resolve(action.value)
			this.resolve = null
		}

		if (this.stack.length > 0) {
			let item = this.stack.shift()!
			this.applyOptions(item.options, item.resolve)
		}
		else {
			this.hide()
		}
	}

	protected onLeaveTransitionEnded() {
		this.maskEl.remove()
	}

	protected onConnected() {
		super.onConnected()
		
		untilUpdateComplete().then(() => {
			if (this.maskEl && this.el.previousElementSibling !== this.maskEl) {
				this.el.before(this.maskEl)
			}
		})
		
		DOMEvents.on(window, 'resize', this.onWindowResize, this)
	}

	protected onUpdated() {
		this.toCenter()
	}

	protected onDisconnected() {
		DOMEvents.off(window, 'resize', this.onWindowResize, this)
	}

	protected onWindowResize() {
		this.toCenter()
	}

	protected toCenter() {
		new AnchorAligner(this.el, {position: 'c'}).alignTo(document.documentElement)
	}

	/** Apply options as current options. */
	protected applyOptions(options: DialogOptions, resolve: (value: string | undefined) => void) {
		this.options = options
		this.resolve = resolve
	}

	/** Add an option to stack. */
	async addOptions(options: DialogOptions): Promise<string | undefined> {
		let {promise, resolve} = promiseWithResolves<string | undefined>()

		if (this.resolve) {
			this.stack.push({
				options,
				resolve,
			})
		}
		else {
			this.applyOptions(options, resolve)
			this.show()
		}

		return promise 
	}

	/** Show current dialog. */
	show() {
		if (this.opened) {
			return
		}

		this.opened = true
		this.appendTo(document.body)
	}

	/** Hide current dialog. */
	hide() {
		if (!this.opened) {
			return
		}

		this.opened = false
		this.remove(true)
	}

	/** Trigger specified action manually. */
	triggerAction(value: string) {
		if (!this.options || !this.options.actions) {
			return
		}

		let action = this.options.actions.find(action => action.value === value)
		if (action) {
			this.onClickActionButton(action)
		}
	}
}


export class TypedDialog {

	protected dialog!: Dialog

	protected addOptions(options: DialogOptions) {
		if (!this.dialog) {
			this.dialog = new Dialog()
		}

		return this.dialog.addOptions(options)
	}

	/** Show default type dialog or add it to dialog stack. */
	show(message: RenderResultRenderer, options: DialogOptions = {}): Promise<string | undefined> {
		return this.addOptions({
			message,
			actions: [{value: 'ok', text: translations.get('ok')}],
			...options,
		})
	}

	/** Show confirm type dialog or add it to dialog stack. */
	confirm(message: RenderResultRenderer, options: DialogOptions = {}): Promise<string | undefined> {
		return this.addOptions({
			icon: 'confirm',
			message,
			actions: [
				{value: 'cancel', text: translations.get('cancel')},
				{value: 'ok', text: translations.get('ok'), primary: true},
			],
			... options,
		})
	}

	/** Show prompt type dialog or add it to dialog stack. */
	async prompt(message: RenderResultRenderer, options: PromptDialogOptions = {}): Promise<string | undefined> {
		let value: string = options.defaultValue ? String(options.defaultValue) : ''
		let input: Input | Textarea

		let messageOverwritten = () => html`
			${typeof message === 'function' ? message() : message}

			<lu:if ${options.inputType === 'textarea'}>
				<Textarea class="dialog-input" 
					.placeholder=${options.placeholder ?? ''}
					.validator=${options.validator ?? null}
					.value=${value}
					:ref=${input!}
					@input=${(v: string) => {value = v}}
				/>
			</lu:if>
			<lu:else>
				<Input class="dialog-input" 
					.placeholder=${options.placeholder ?? ''}
					.validator=${options.validator ?? null}
					.type=${options.inputType as "text" | "password" || 'text'}
					.value=${value}
					:ref=${input!}
					@input=${(v: string) => value = v}
					@keydown.enter=${() => this.dialog.triggerAction('ok')}
				/>
			</lu:else>
		`

		let btn = await this.addOptions({
			message: messageOverwritten,
			actions: [
				{value: 'cancel', text: translations.get('cancel')},
				{value: 'ok', text: translations.get('ok'), primary: true, handler() {
					if (!input!.touched || !input!.valid) {
						input!.touched = true
						return true
					}

					return null
				}},
			],
			...options,
		})

		if (btn === 'ok') {
			return value
		}

		return undefined
	}
}


/** A quick global API to show dialogs. */
export const dialog = new TypedDialog()


/** Default transitions for `<Dialog>`. */
translations.add('en-us', {
	ok: 'OK',
	cancel: 'Cancel',
	yes: 'Yes',
	no: 'No',
})
