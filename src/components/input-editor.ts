import {css, html} from '@pucelle/lupos.js'
import {Popup} from './popup'
import {DOMEvents, EventKeys, Inset} from '@pucelle/ff'
import {tooltip, TooltipOptions} from '../bindings'


export interface InputEditorEvents {

	/** After cancel editing. */
	cancel: () => void

	/** After commit editing. */
	commit: (value: string) => void
}


/** Single line text editor. */
export class InputEditor extends Popup<InputEditorEvents> {

	static style = css`
		.input-editor{
			position: fixed;
			border: 1px solid var(--border-color);
			background: var(--background-color);
		}

		.input-editor-input{
			width: 100%;
			border: none;
			background: transparent;
		}
	`


	/** Input text value, is is `null`, read text content of `editing` instead. */
	value: string | null = null

	/** Which element is in editing. */
	editing!: HTMLElement

	/** Specifies width. */
	width: number | null = null

	/** Additional padding values. */
	padding: number
		| [number]
		| [number, number]
		| [number, number, number]
		| [number, number, number, number]
		 = 0

	/** 
	 * To validate current value, returns error message or `null` if valid.
	 * Can also returns `null` and later set `error` asynchronously.
	 */
	validator: ((value: string) => string | null) | null = null

	/** Replace whole value after having error. */
	replacer: ((value: string) => string) | null = null

	protected errorMessage: string | null = null
	protected inputRef!: HTMLInputElement

	protected render() {
		let text = this.value ?? this.editing.textContent

		return html`
			<template class="input-editor"
				:style=${this.getStyle()}
				:tooltip=${this.errorMessage, {position: 'b', type: 'error'} as Partial<TooltipOptions>}
			>
				<input type="text" class="input-editor-input"
					:ref=${this.inputRef}
					:style=${this.getTextStyle()}
					.value=${text}
					@input=${this.onInput}
					@keydown=${this.onKeyDown}
				/>
			</template>
		`
	}

	protected getStyle() {
		let style = getComputedStyle(this.editing)
		let textAlignRate = style.textAlign === 'center' ? 0.5 : style.textAlign === 'right' ? 1 : 0
		let paddingList = Array.isArray(this.padding) ? this.padding : [this.padding]
		let padding = paddingList.map(v => v + 'px').join(' ')
		let editingRect = this.editing.getBoundingClientRect()
		let elWidth = this.width || editingRect.width
		let left = editingRect.left + (editingRect.width - elWidth) * textAlignRate
		let top = editingRect.top
		let edges = new Inset(...paddingList)

		return {
			left: left - edges.left + 'px',
			top: top - edges.top + 'px',
			width: elWidth + 'px',
			padding,
		}
	}

	protected getTextStyle() {
		let style = getComputedStyle(this.editing)

		return {
			'font-family': style.fontFamily,
			'font-size': style.fontSize,
			'font-weight': style.fontWeight,
			'font-style': style.fontStyle,
			'text-align': style.textAlign,
			'line-height': style.lineHeight,
			'padding': style.padding,
		}
	}

	protected async onReady() {
		super.onReady()
	
		// Select all after updated.
		this.inputRef.select()
	}

	protected onConnected() {
		super.onConnected()
		DOMEvents.on(document, 'mousedown', this.onDOMMouseDown, this)
	}

	protected onWillDisconnect() {
		super.onWillDisconnect()
		DOMEvents.off(document, 'mousedown', this.onDOMMouseDown, this)
	}

	protected onInput(e: KeyboardEvent) {
		if (e.isComposing) {
			return
		}

		let value = this.inputRef.value

		// Clear validate result after input.
		if (this.validator) {
			this.errorMessage = this.validator(value)

			// Overwrite input value.
			if (this.errorMessage && this.replacer) {
				value = this.replacer(value)
				this.inputRef.value = value
			}
		}
	}
	protected onDOMMouseDown(e: MouseEvent) {
		let target = e.target as HTMLElement
		if (!this.el.contains(target)) {
			this.fire('commit', this.inputRef.value)
			this.remove()
		}
	}

	protected onKeyDown(e: KeyboardEvent) {
		e.stopPropagation()

		let key = EventKeys.getShortcutKey(e)
		if (key === 'Enter') {
			this.fire('commit', this.inputRef.value)
			this.remove()
		}
		else if (key === 'Escape') {
			this.fire('cancel')
			this.remove()
		}
	}
}