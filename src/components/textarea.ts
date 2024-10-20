import {ComponentStyle, css, html} from '@pucelle/lupos.js'
import {tooltip} from '../bindings'
import {Input} from './input'


/** 
 * `<Textarea>` works just like a `<textarea>`,
 * you can set validator to validate it's value, or set customized error message.
 */
export class Textarea extends Input {

	static style: ComponentStyle = css`
		.textarea-field{
			height: auto;
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

	protected renderClassName() {
		return 'input textarea'
	}

	protected renderField() {
		return html`
			<textarea class="input-field textarea-field"
				placeholder=${this.placeholder}
				:ref=${this.field}
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
}
