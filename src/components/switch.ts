import {Component, html, css, getCSSEasingValue} from '@pucelle/lupos.js'
import {ThemeSize} from '../style'
import {DOMEvents, EventKeys} from '@pucelle/lupos'


interface SwitchEvents {

	/** Triggers after switch on or off state changed. */
	change: (value: boolean) => void
}


/** `<Switch>` allows users to toggle between on and off states. */
export class Switch<E = {}> extends Component<E & SwitchEvents> {

	static style = css`
		.switch{
			display: inline-block;
			vertical-align: top;
			width: 2em;
			height: 1.25em;
			border-radius: 0.625em;
			background: var(--field-color);
			padding: 1px;
			transition: background-color 0.2s ${/*#__PURE__*/getCSSEasingValue('ease-out-cubic')};
			cursor: pointer;

			&:hover{
				background: color-mix(in srgb, var(--field-color) 80%, var(--text-color));
			}
			
			&:focus{
				box-shadow: 0 0 var(--focus-shadow-blur-radius) var(--primary-color);
			}
		}
	
		.switch-ball{
			width: calc(1.25em - 2px);
			height: calc(1.25em - 2px);
			background: var(--background-color);
			border-radius: 50%;
			transition: margin 0.2s ${/*#__PURE__*/getCSSEasingValue('ease-out-cubic')};
		}
	
		.switch-on{		
			background: var(--primary-color);

			.switch-ball{
				border-color: var(--background-color);
				margin-left: 0.75em;
			}

			&:hover{
				background: var(--primary-color);
			}
		}
	`


	size: ThemeSize = 'default'
	
	/** Whether the switch is in on state. */
	value: boolean = false

	protected render() {
		return html`
			<template tabindex="0"
				class="switch size-${this.size}"
				:class.switch-on=${this.value}
				@click=${this.onClick}
				@focus=${this.onFocus}
				@blur=${this.onBlur}
			>
				<div class="switch-ball"></div>
			</template>
		`
	}

	protected onClick() {
		this.toggleValue()

		// Should not keep focus when click to toggle.
		this.el.blur()
	}

	protected toggleValue(this: Switch) {
		this.setValue(!this.value)
	}

	protected setValue(this: Switch, value: boolean) {
		if (value !== this.value) {
			this.value = value
			this.fire('change', value)
		}
	}

	protected onFocus() {
		DOMEvents.on(document, 'keydown', this.onKeyDown as (e: Event) => void, this)
	}

	protected onKeyDown(e: KeyboardEvent) {
		let key = EventKeys.getShortcutKey(e)
		if (key === 'Enter') {
			e.stopPropagation()
			this.toggleValue()
		}
		else if (key === 'ArrowLeft') {
			if (this.value) {
				e.preventDefault()
				e.stopPropagation()
				this.setValue(false)
			}
		}
		else if (key === 'ArrowRight') {
			if (!this.value) {
				e.preventDefault()
				e.stopPropagation()
				this.setValue(true)
			}
		}
	}

	protected onBlur() {
		DOMEvents.off(document, 'keydown', this.onKeyDown as (e: Event) => void, this)
	}
}
