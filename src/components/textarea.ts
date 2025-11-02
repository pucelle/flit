import {css, html} from '@pucelle/lupos.js'
import {Input} from './input'


/** 
 * `<Textarea>` works just like html `<textarea>` element,
 * it supports custom validator or custom error message.
 */
export class Textarea extends Input {

	static override style = css`
		.textarea{
			height: auto;
			padding: 0.4em 0.6em;

			.input-field{
				height: auto;
			}
		}
	`

	
	/** Not like `<Input>`, `<Textarea>` doesn't support show error message on tooltip. */
	declare errorOnTooltip: boolean
	
	/** On which direction or directions can resize. */
	resize: 'both' | 'horizontal' | 'vertical' | 'none' = 'none'
	
	/** Textarea rows to control width. */
	rows: number | null = null

	/** Textarea columns to control width. */
	cols: number | null = null

	protected override renderClassName() {
		return 'input textarea'
	}

	protected override renderField() {
		return html`
			<textarea class="input-field"
				placeholder=${this.placeholder}
				?autofocus=${this.autoFocus}
				:ref=${this.fieldRef}
				:class.valid=${this.touched && this.valid === true}
				:class.invalid=${this.touched && this.valid === false}
				:style.resize=${this.resize}
				.value=${this.value}
				.rows=${this.rows}
				.cols=${this.cols}
				@focus=${this.onBlur}
				@input=${this.onInput}
				@change=${this.onChange}
			/>
		`
	}

	protected override onFocus() {
		this.focusGot = true
	}

	protected override onBlur() {
		this.focusGot = false
		this.touched = true
		this.validate()
	}
}
