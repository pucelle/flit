import {Component, css, html} from '@pucelle/lupos.js'
import {tooltip, TooltipOptions} from '../bindings'
import {Icon} from './icon'
import {ThemeSize} from '../style'
import {DOMModifiableEvents, watch} from '@pucelle/lupos'
import {IconChecked} from '../icons'


interface InputEvents {

	/** Triggers after input every character. */
	input: (value: string) => void

	/** 
	 * Triggers after input value changed.
	 * `valid` indicates whether inputted value is valid, only `false` means not valid.
	 * Calls `refocus` can cause input field get focus.
	 */
	change: (value: string, valid: boolean | null, refocus: () => void) => void
}


/** 
 * `<Input>` works just like a `<input type="text">`,
 * you can set validator to validate it's value, or set customized error message.
 */
export class Input<E = {}> extends Component<InputEvents & E> {

	static style = css`
		.input{
			display: inline-flex;
			align-items: stretch;
			position: relative;
			width: 15em;
			height: 2em;
			padding: 0.2em 0.6em;
			background: var(--field-color);
			box-shadow: inset 0 -1px 0 0 var(--border-color);
			
			&.focus{
				box-shadow: inset 0 -1px 0 0 var(--primary-color);
			}

			&.valid{
				box-shadow: inset 0 -1px 0 0 var(--success-color);
			}

			&.invalid{
				box-shadow: inset 0 -1px 0 0 var(--error-color);
			}
		}

		.input-field{
			flex: 1;
			min-width: 0;
			border: none;
			background: none;

			/** Ensure to inherit <Input> element. */
			color: inherit;
			font-family: inherit;
			font-size: inherit;
			font-weight: inherit;
			font-style: inherit;
			text-align: inherit;
			line-height: inherit;
		}

		.input-valid-icon{
			align-items: center;
			margin-right: 0.2em;
			color: var(--success-color);
		}

		.input-error{
			position: absolute;
			left: 0;
			top: 100%;
			font-size: 0.928em;
			color: var(--error-color);
		}
	`


	size: ThemeSize = 'default'

	/** Input type, same with `<input type=...>`. */
	type: 'text' | 'password' | 'number' = 'text'

	/** Whether get focus after been inserted into document. */
	autoFocus: boolean = false

	/** 
	 * Whether input has been touched, error messages only appears after touched.
	 * Set it from `false` to `true` will cause validate.
	 */
	touched: boolean = false

	/** Whether current input is valid, be `null` if not validate yet. */
	valid: boolean | null = null

	/** Placeholder shows when input content is empty. */
	placeholder: string = ''
	
	/** Current value. */
	value: string = ''

	/** 
	 * To validate current value, returns error message or `null` if valid.
	 * Can also returns `null` and later set `error` asynchronously.
	 */
	validator: ((value: string) => string | null) | null = null

	/** Format whole input value, like trimming. */
	formatter: ((value: string) => string) | null = null

	/** Show custom error message. */
	errorMessage: string | null = ''

	/** 
	 * Whether show error on a tooltip, so it doesn't need to leave a space for error message.
	 * Default value is `false`.
	 */
	errorOnTooltip: boolean = false

	/** Whether haven got focus. */
	protected focusGot: boolean = false

	/** Input field element reference. */
	protected fieldRef!: HTMLInputElement | HTMLTextAreaElement
	
	protected render() {
		return html`
			<template class=${this.renderClassName()}
				:class.focus=${this.focusGot}
				:class.valid=${this.touched && this.valid}
				:class.invalid=${this.touched && this.valid === false}
				?:tooltip=${
					this.touched && this.errorMessage && this.errorOnTooltip,
					this.errorMessage,
					{type: 'error'} as Partial<TooltipOptions>
				}
			>
				${this.renderField()}

				<lu:if ${this.touched && this.valid}>
					<Icon class="input-valid-icon" .icon=${IconChecked} .size="inherit" />
				</lu:if>

				<lu:if ${this.touched && this.errorMessage && !this.errorOnTooltip}>
					<div class="input-error">${this.errorMessage}</div>
				</lu:if>
			</template>
		`
	}

	protected renderClassName() {
		return 'input'
	}

	protected renderField() {
		return html`
		<input class="input-field" type=${this.type}
			?autofocus=${this.autoFocus}
			.placeholder=${this.placeholder || ''}
			.value=${this.value}
			:ref=${this.fieldRef}
			@focus=${this.onFocus}
			@blur=${this.onBlur}
			@input=${this.onInput}
			@change=${this.onChange}
		/>`
	}

	protected onFocus() {
		this.focusGot = true
		DOMModifiableEvents.on(document, 'keydown', ['Enter'], this.onEnter, this)
	}

	protected onEnter(_e: KeyboardEvent) {
		this.onChange()
	}

	protected onBlur() {
		DOMModifiableEvents.off(document, 'keydown', this.onEnter, this)
		
		this.focusGot = false
		this.touched = true

		// Validate after only change event is not enough.
		// Since we clear error message after input,
		// So may still not valid even though not changed.
		this.validate()
	}

	protected onInput(this: Input, e: KeyboardEvent) {
		if (e.isComposing) {
			return
		}

		let value = this.fieldRef.value
		if (this.formatter) {
			value = this.formatter(value)
		}

		// Clear validate result after input.
		if (this.validator) {
			this.valid = null
			this.errorMessage = ''
		}

		this.fire('input', value)
	}

	protected onChange(this: Input) {
		let value = this.fieldRef.value
		if (this.formatter) {
			value = this.formatter(value)
		}

		this.value = value
		this.validate()
		this.fire('change', value, this.valid, () => this.fieldRef.focus())
	}

	@watch('touched')
	protected onSetTouched(touched: boolean) {
		if (touched) {
			this.validate()
		}
	}

	protected validate() {
		if (this.validator) {
			let value = this.value
			let error = this.validator(this.value)

			if (value === this.value) {
				this.errorMessage = error
				this.valid = !error
			}
		}
	}

	/** Focus on input field. */
	focus() {
		this.fieldRef.focus()
	}

	/** Select all text. */
	select() {
		this.fieldRef.select()
	}
}