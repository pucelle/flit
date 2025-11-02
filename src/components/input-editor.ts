import {css, html} from '@pucelle/lupos.js'
import {Popup} from './popup'
import {BoxOffsets, RectWatcher} from '@pucelle/ff'
import {DOMEvents, EventKeys} from '@pucelle/lupos'
import {tooltip, TooltipOptions} from '../bindings'


export interface InputEditorEvents {

	/** After cancel editing. */
	cancel: () => void

	/** 
	 * After commit editing.
	 * Calls refocus to do focus again.
	 */
	commit: (value: string, refocus: () => void) => void
}


/** Single line text editor, align with an editing element. */
export class InputEditor extends Popup<InputEditorEvents> {

	static override style = css`
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

	/** Specifies width to cover using width of editing element. */
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
	protected endedInputting: boolean = false
	protected inputStyle: Partial<CSSStyleDeclaration> = {}

	protected override render() {
		let text = this.value ?? this.editing.textContent

		return html`
			<template class="input-editor"
				:style=${this.inputStyle}
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

	protected override async onReady() {
		super.onReady()
	
		// Select all after ready.
		this.inputRef.select()
	}

	protected override onConnected() {
		super.onConnected()
		this.updatePosition()
		RectWatcher.watch(this.editing, this.updatePosition, this)
		DOMEvents.on(document, 'mousedown', this.onDOMMouseDown, this)
	}

	protected override onWillDisconnect() {
		super.onWillDisconnect()
		RectWatcher.unwatch(this.editing, this.updatePosition, this)
		DOMEvents.off(document, 'mousedown', this.onDOMMouseDown, this)
	}

	protected updatePosition(rect: DOMRect = this.editing.getBoundingClientRect()) {
		let style = getComputedStyle(this.editing)
		let textAlignRate = style.textAlign === 'center' ? 0.5 : style.textAlign === 'right' ? 1 : 0
		let paddingList = Array.isArray(this.padding) ? this.padding : [this.padding]
		let padding = paddingList.map(v => v + 'px').join(' ')
		let elWidth = this.width || rect.width
		let left = rect.left + (rect.width - elWidth) * textAlignRate
		let top = rect.top
		let edges = new BoxOffsets(...paddingList)

		this.inputStyle = {
			left: left - edges.left + 'px',
			top: top - edges.top + 'px',
			width: elWidth + 'px',
			padding,
		}
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
		if (this.endedInputting) {
			return
		}
		
		let target = e.target as HTMLElement
		if (!this.el.contains(target)) {
			this.fire('commit', this.inputRef.value, () => this.refocus())
			this.endedInputting = true
		}
	}

	protected refocus() {
		this.inputRef.focus()
		this.endedInputting = false
	}

	protected onKeyDown(e: KeyboardEvent) {
		e.stopPropagation()

		let key = EventKeys.getShortcutKey(e)
		if (key === 'Enter') {
			this.fire('commit', this.inputRef.value, () => this.refocus())
			this.endedInputting = true
		}
		else if (key === 'Escape') {
			this.fire('cancel')
			this.endedInputting = true
		}
	}
}