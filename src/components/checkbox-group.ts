import {Component} from '@pucelle/lupos.js'
import {ListUtils, watch} from '@pucelle/ff'
import {Checkbox} from './checkbox'


interface CheckboxGroupEvents<T> {

	/** After any of child checkbox changed, get all values of checked checkbox as parameter and trigger this event. */
	change: (value: T[]) => void
}


/** 
 * `<CheckboxGroup>` can contains several `<Checkbox>` as child.
 * `<CheckboxGroup>` has no style specified by default.
 */
export class CheckboxGroup<T = any, E = {}> extends Component<E & CheckboxGroupEvents<T>> {

	/** List of child `<Checkbox>`. */
	readonly checkboxes: Checkbox[] = []

	/** All checked values. */
	value: T[] = []

	/** Register a child checkbox. */
	register(checkbox: Checkbox) {
		this.checkboxes.push(checkbox)

		let handler = this.onCheckboxChange.bind(this, checkbox)
		checkbox.on('change', handler)

		checkbox.once('will-disconnect', () => {
			ListUtils.remove(this.checkboxes, checkbox)
			checkbox.off('change', handler)
		})
	}

	@watch('value')
	protected onValueChange(value: T[]) {
		for (let checkbox of this.checkboxes) {
			if (value.includes(checkbox.value)) {
				checkbox.checked = true
			}
			else {
				checkbox.checked = false
			}
		}
	}

	protected onCheckboxChange(this: CheckboxGroup, checkbox: Checkbox) {
		if (checkbox.checked) {
			this.value.push(checkbox.value)
		}
		else {
			let index = this.value.indexOf(checkbox.value)
			if (index > -1) {
				this.value.splice(index, 1)
			}
		}

		this.fire('change', this.value)
	}
}
