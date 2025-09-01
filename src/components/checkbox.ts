import {Component, html, css} from '@pucelle/lupos.js'
import {ThemeSize} from '../style'
import {DOMModifiableEvents} from '@pucelle/lupos'
import {CheckboxGroup} from './checkbox-group'
import {Icon} from './icon'
import {IconCheckboxChecked, IconCheckboxIndeterminate, IconCheckboxUnchecked} from '../icons'


interface CheckboxEvents {

	/** Triggers change event after checkbox get checked or unchecked. */
	change: (checked: boolean) => void
}

/** 
 * `<Checkbox>` works just like `<input type="checkbox">`,
 * you can click to toggle check and uncheck a checkbox.
 */
export class Checkbox<T = any, E = {}> extends Component<E & CheckboxEvents> {

	static style = css`
		.checkbox{
			display: inline-flex;
			vertical-align: top;
			align-items: center;
			cursor: pointer;

			&:hover{
				color: var(--primary-color);
			}

			&:focus{
				color: var(--primary-color);
				box-shadow: 0 0 0 1px var(--primary-color);
			}

			&.indeterminate, &.checked{
				color: var(--primary-color);
			}
		}

		.checkbox-icon{
			position: relative;
			margin-right: 0.2em;
		}

		.checkbox-label{
			flex: 1;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			padding-right: 0.2em;
		}
	`

	size: ThemeSize = 'default'
	
	group: CheckboxGroup | null = null

	/** Whether the checkbox get checked. */
	checked: boolean = false

	/** 
	 * Whether the checkbox in indeterminate state,
	 * which means, not determined checked or unchecked.
	  */
	indeterminate: boolean = false

	/** 
	 * If having a parent `<CheckboxGroup>`, the `value` property will
	 * be assign to it's `value` list after current checkbox checked.
	 */
	value: T | null = null

	onConnected() {
		super.onConnected()

		let group = CheckboxGroup.fromClosest(this.el.parentElement!)
		if (group) {
			this.group = group
			this.checked = this.group.value.includes(this.value)
			this.group.register(this)
		}
	}

	protected render() {
		let icon = this.checked
			? IconCheckboxChecked
			: this.indeterminate
			? IconCheckboxIndeterminate
			: IconCheckboxUnchecked

		return html`
			<template tabindex="0"
				class="checkbox size-${this.size}" 
				:class.checked=${this.checked}
				:class.indeterminate=${this.indeterminate}
				@click=${this.onClick}
				@focus=${this.onFocus}
				@blur=${this.onBlur}
			>
				<Icon class="checkbox-icon" .icon=${icon} .size="inherit" />
				<div class="checkbox-label">
					<slot />
				</div>
			</template>
		`
	}

	protected onClick() {
		this.toggleChecked()
	}

	protected toggleChecked(this: Checkbox) {
		this.checked = !this.checked
		this.indeterminate = false
		this.fire('change', this.checked)
	}

	protected onFocus() {
		DOMModifiableEvents.on(document, 'keydown', ['Enter'], this.onEnter, this)
	}

	protected onEnter(e: Event) {
		e.preventDefault()
		this.toggleChecked()
	}

	protected onBlur() {
		DOMModifiableEvents.off(document, 'keydown', this.onEnter, this)
	}
}

