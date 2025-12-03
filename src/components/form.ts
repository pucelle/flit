import {Component} from 'lupos.html'
import {Input} from './input'


/** `<Form>` can contain several `<Input>` and `<Textarea>` and validate them. */
export class Form<E = {}> extends Component<E> {

	/** 
	 * Whether all inputs and textareas are valid.
	 * Must call `validate` to make this value fresh.
	 */
	valid: boolean = true

	protected get inputs(): Input[] {
		return [...this.el.querySelectorAll('.input')]
			.map(el => Input.from(el)!)
	}

	/** Validate all child inputs and textareas */
	validate() {
		for (let input of this.inputs) {
			input.touched = true
		}
	}

	/** Reset valid state to initial for all child inputs and textareas. */
	reset() {
		for (let input of this.inputs) {
			input.touched = false
		}
	}
}