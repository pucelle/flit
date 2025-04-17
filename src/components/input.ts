import {Component, css, html} from '@pucelle/lupos.js'
import {tooltip, TooltipOptions} from '../bindings'
import {Icon} from './icon'
import {ThemeSize} from '../style'
import {DOMModifiableEvents, watch} from '@pucelle/ff'


interface InputEvents {

	/** Triggers after input every character. */
	input: (value: string) => void

	/** Triggers after input value changed. */
	change: (value: string, valid: boolean | null) => void
}


/** 
 * `<Input>` works just like a `<input type="text">`,
 * you can set validator to validate it's value, or set customized error message.
 */
export class Input<E = {}> extends Component<InputEvents & E> {

	static style = css`
		.input{
			display: inline-block;
			vertical-align: top;
			position: relative;
			width: 15em;
			padding-bottom: 1px solid none;
			background: var(--field-color);
			box-shadow: inset 0 -1px 0 0 var(--border-color);
		}

		.input-field{
			width: 100%;
			height: 2em;
			padding: 0.2em 0.6em;
			border: none;
			background: none;
		}

		.input-focus{
			box-shadow: inset 0 -1px 0 0 var(--primary-color);
		}

		.input-valid{
			box-shadow: inset 0 -1px 0 0 var(--success-color);

			input, textarea{
				padding-right: 2em;
			}
		}

		.input-invalid{
			box-shadow: inset 0 -1px 0 0 var(--error-color);

			input, textarea{
				padding-right: 2em;
			}
		}

		.input-valid-icon{
			position: absolute;
			top: 0;
			bottom: 0;
			right: 6px;
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
	type: 'text' | 'password' = 'text'

	/** Whether get focus after been inserted into document. */
	autoFocus: boolean = false

	/** Whether get focus. */
	focusGot: boolean = false

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
	validator: ((value: string) => Promise<string | null>) | null = null

	/** Show custom error message. */
	errorMessage: string | null = ''

	/** Whether show error on a tooltip, so it doesn't need to leave a space for error message. */
	errorOnTooltip: boolean = false

	/** Input field element reference. */
	protected fieldRef!: HTMLInputElement | HTMLTextAreaElement
	
	protected render() {
		return html`
			<template class=${this.renderClassName()}
				:class.input-focus=${this.focusGot}
				:class.input-valid=${this.touched && this.valid}
				:class.input-invalid=${this.touched && this.valid === false}
			>
				${this.renderField()}

				<lu:if ${this.touched && this.valid}>
					<Icon class="input-valid-icon" .type="checked" .size="inherit" />
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
			?:tooltip=${this.touched && this.errorMessage && this.errorOnTooltip, this.errorMessage, {type: 'error'} as Partial<TooltipOptions>}
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

	protected onEnter(e: Event) {
		e.preventDefault()
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

		// Clear validate result after input.
		if (this.validator) {
			this.valid = null
			this.errorMessage = ''
		}

		this.fire('input', value)
	}

	protected onChange(this: Input) {
		let value = this.value = this.fieldRef.value

		this.validate()
		this.fire('change', value, this.valid)
	}

	@watch('touched')
	protected onSetTouched(touched: boolean) {
		if (touched) {
			this.validate()
		}
	}

	protected async validate() {
		if (this.validator) {
			let value = this.value
			let error = await this.validator(this.value)

			if (value === this.value) {
				this.errorMessage = error
				this.valid = !error
			}
		}
	}
}