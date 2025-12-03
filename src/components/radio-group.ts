import {Component} from 'lupos.html'
import {Radio} from './radio'
import {ListUtils} from 'ff-kit'
import {watch} from 'lupos'


interface RadioGroupEvents<T> {

	/** 
	 * If a child `<Radio>` get checked and have `value` property specified,
	 * here it will trigger change event with it's value as parameter.
	 * 
	 * Only user interaction can cause `change` event get triggered,
	 * assigning `value` property would not trigger.
	 */
	change: (value: T) => void
}


/** 
 * `<RadioGroup>` can contain several `<Radio>` as it's child radios.
 * `<RadioGroup>` has no style specified by default.
 */
export class RadioGroup<T = any, E = {}> extends Component<RadioGroupEvents<T> & E> {
	
	/** List of child `<Radio>`. */
	readonly radios: Radio[] = []

	/** Current value, child radio which have same value will be checked. */
	value: T | null = null

	/** Register a child radio. */
	register(radio: Radio) {
		this.radios.push(radio)

		let handler = this.onRadioChecked.bind(this, radio)
		radio.on('change', handler)

		radio.once('will-disconnect', () => {
			ListUtils.remove(this.radios, radio)
			radio.off('change', handler)
		})
	}

	@watch('value')
	protected onValueChange(value: T | null) {
		if (value === null) {
			return
		}

		for (let radio of this.radios) {
			if (radio.value === value) {
				radio.checked = true
			}
			else {
				radio.checked = false
			}
		}
	}

	protected onRadioChecked(this: RadioGroup<any, {}>, checkedRadio: Radio) {
		this.value = checkedRadio.value
		this.fire('change', this.value)
	}
}
