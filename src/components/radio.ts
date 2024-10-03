import {Component, html, css} from '@pucelle/lupos.js'
import {theme, ThemeSize} from '../style'
import {Icon} from './icon'
import {RadioGroup} from './radio-group'
import {DOMEvents, DOMModifiableEvents} from '@pucelle/ff'


interface RadioEvents {

	/** 
	 * Triggers change event only when a radio checked.
	 * 
	 * Only user interaction can cause `change` event get triggered,
	 * assigning `checked` property would not trigger.
	 */
	change: (checked: boolean) => void
}


/** `<Radio>` is just like `<input type=radio>`, you can click to check one radio in a radio group. */
export class Radio<E = {}> extends Component<E & RadioEvents> {

	static style() {
		let {mainColor, focusBlurRadius} = theme

		return css`
		.radio{
			display: inline-flex;
			vertical-align: top;
			align-items: center;
			cursor: pointer;

			&:hover{
				color: ${mainColor};
			}

			&:focus{
				color: ${mainColor};

				.icon{
					box-shadow: 0 0 ${focusBlurRadius}px ${mainColor};
				}
			}
		
			&-icon{
				position: relative;
				top: -2px;
				border-radius: 50%;
				margin-right: 0.5em;
			}

			&-checked{
				color: ${mainColor};
			}
		
			&-label{
				flex: 1;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
		}
		`
	}


	size: ThemeSize = 'default'

	/** Radio group container, readonly outside. */
	group: RadioGroup | null = null

	/** 
	 * Whether the radio was checked.
	 * 
	 */
	checked: boolean = false

	/** 
	 * If has been included by a radio group,
	 * the `value` property will be assign to group after current ratio get checked.
	 */
	value: any = null

	protected onConnected() {
		super.onConnected()

		let group = RadioGroup.fromClosest(this.el.parentElement!)
		if (group) {
			this.group = group
			this.checked = this.group.value == this.value
			this.group.register(this)
		}
	}

	protected render() {
		return html`
			<template
				tabindex="0"
				class="radio size-${this.size}"
				:class.radio-checked=${this.checked}
				@click=${this.onClick}
				@focus=${this.onFocus}
			>
				<Icon class="radio-icon" .type=${this.checked ? 'radio-checked' : 'radio-unchecked'} />
				<div class="radio-label">
					<slot />
				</div>
			</template>
		`
	}

	protected onClick() {
		this.getChecked()
	}

	protected getChecked(this: Radio<{}>) {
		if (!this.checked) {
			this.checked = true
			this.fire('change', true)
		}
	}

	protected onFocus() {
		if (!this.checked) {
			DOMEvents.on(this.el, 'blur', this.onBlur, this)
			DOMModifiableEvents.on(document, 'keydown', ['once', 'Enter'], this.onEnter, this)
		}
	}

	protected onBlur() {
		DOMEvents.off(this.el, 'blur', this.onBlur, this)
		DOMEvents.off(document, 'keydown', this.onEnter, this)
	}

	protected onEnter() {
		this.getChecked()
	}
}
