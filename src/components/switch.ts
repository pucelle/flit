import {Component, html, css} from '@pucelle/lupos.js'
import {theme, ThemeSize} from '../style'
import {DOMEvents, EventKeys, getCSSEasingValue} from '@pucelle/ff'


interface SwitchEvents {

	/** Triggers after switch on or off state changed. */
	change: (value: boolean) => void
}


/** `<Switch>` work just like `<Checkbox>` but easier to interact with. */
export class Switch<E = {}> extends Component<E & SwitchEvents> {

	static style() {
		let {mainColor, focusBlurRadius, backgroundColor} = theme

		return css`
		.switch{
			display: inline-block;
			vertical-align: top;
			width: 2em;
			height: 1.25em;
			border-radius: 0.625em;
			background: ${backgroundColor.toIntermediate(0.2)};
			padding: 1px;
			transition: background-color 0.2s ${getCSSEasingValue('ease-out-cubic')};
			cursor: pointer;

			&:hover{
				background: ${backgroundColor.toIntermediate(0.3)};
			}
			
			&:focus{
				box-shadow: 0 0 ${focusBlurRadius}px ${mainColor};
			}
		}
	
		.switch-ball{
			width: calc(1.25em - 2px);
			height: calc(1.25em - 2px);
			background: ${backgroundColor};
			border-radius: 50%;
			transition: margin 0.2s ${getCSSEasingValue('ease-out-cubic')};
		}
	
		.switch-on{		
			background: ${mainColor};

			.switch-ball{
				border-color: ${backgroundColor};
				margin-left: 0.75em;
			}

			&:hover{
				background: ${mainColor.toIntermediate(0.1)};
			}
		}
		`
	}


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
			e.preventDefault()
			this.toggleValue()
		}
		else if (key === 'ArrowLeft') {
			if (this.value) {
				e.preventDefault()
				this.setValue(false)
			}
		}
		else if (key === 'ArrowRight') {
			if (!this.value) {
				e.preventDefault()
				this.setValue(true)
			}
		}
	}

	protected onBlur() {
		DOMEvents.off(document, 'keydown', this.onKeyDown as (e: Event) => void, this)
	}
}
