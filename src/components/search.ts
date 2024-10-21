import {Component, css, html} from '@pucelle/lupos.js'
import {theme, ThemeSize} from '../style'
import {DOMEvents, immediateWatch, watch} from '@pucelle/ff'
import {Icon} from './icon'


interface SearchEvents {

	/** Triggers after search value changed. */
	change: (value: string) => void
}


/** 
 * `<Search>` can input text to do searching.
 * It contains only an input, can be extend to list suggested data.
 */
export class Search<E = {}> extends Component<SearchEvents & E> {

	static style() {
		let {borderColor, borderRadius, mainColor, focusBlurRadius, fieldBackgroundColor} = theme

		return css`
		.search{
			display: inline-flex;
			align-items: center;
			background: ${fieldBackgroundColor};
			border: 1px solid ${borderColor};
			border-radius: ${borderRadius}px;
			padding: 0 0.2em;
			
			&:focus{
				border-color: ${mainColor};
				box-shadow: 0 0 ${focusBlurRadius}px ${mainColor.alpha(0.5)};
			}
		}

		.search-field{
			flex: 1;
			min-width: 0;
			border: none;
			line-height: 1.6;
			height: 2em;
			padding: 0.2em 0.2em;
			background: transparent;
		}

		.search-icon{
			color: ${borderColor.toIntermediate(0.1)};
		}

		.search-clear-icon{
			color: ${borderColor.toIntermediate(0.1)};
			cursor: pointer;

			&:hover{
				color: ${mainColor};
			}

			&:active{
				transform: translateY(1px);
			}
		}
		`
	}


	size: ThemeSize = 'default'

	/** 
	 * Whether update value after change event.
	 * If is `false`, update value after input event.
	 */
	lazy: boolean = true

	/** Search input placeholder. */
	placeholder: string = ''

	/** Current inputted value. */
	value: string = ''
	
	/** Search input element. */
	protected inputEl!: HTMLInputElement

	/** Whether search input get focus. */
	protected focused: boolean = false

	/** When in composition inputting. */
	protected inCompositionInputting: boolean = false

	protected render() {
		return html`
		<template class="search size-${this.size}">
			<Icon class="search-icon" .type="search" .size="inherit" />

			<input type="text"
				class="search-field"
				placeholder=${this.placeholder}
				.value=${this.value}
				:ref=${this.inputEl}
				@focus=${this.onFocus}
			/>

			<lu:if ${this.value}>
				<Icon class="search-clear-icon" .type="close" .size="inherit"
					@click.stop=${this.clear}
				/>
			</lu:if>
		</template>
		`
	}

	protected onReady() {
		super.onReady()
		this.bindInputEvents(true)
	}

	@watch('lazy')
	protected bindLazyEvents() {
		this.bindInputEvents(false)
	}

	protected bindInputEvents(isFirstTime: boolean) {
		if (!isFirstTime) {
			if (this.lazy) {
				DOMEvents.off(this.inputEl, 'compositionstart', this.onCompositionStart, this)
				DOMEvents.off(this.inputEl, 'compositionend', this.onCompositionEnd, this)
				DOMEvents.off(this.inputEl, 'input', this.onInput, this)
			}
			else {
				DOMEvents.off(this.inputEl, 'change', this.onChange, this)
			}
		}

		if (this.lazy) {
			DOMEvents.on(this.inputEl, 'change', this.onChange, this)
		}
		else {
			DOMEvents.on(this.inputEl, 'compositionstart', this.onCompositionStart, this)
			DOMEvents.on(this.inputEl, 'compositionend', this.onCompositionEnd, this)
			DOMEvents.on(this.inputEl, 'input', this.onInput, this)
		}
	}

	protected onFocus() {
		this.focused = true
		DOMEvents.once(this.inputEl, 'blur', () => this.focused = false)
	}

	protected onChange() {
		this.updateValue()
	}

	protected onCompositionStart() {
		this.inCompositionInputting = true
	}

	protected onCompositionEnd() {
		this.inCompositionInputting = false
		this.onInput()
	}

	protected onInput() {
		this.updateValue()
	}

	protected updateValue(this: Search) {
		if (this.inCompositionInputting) {
			return
		}

		this.value = this.inputEl.value
		this.fire('change', this.value)
	}

	protected clear(this: Search) {
		this.value = ''
		this.fire('change', '')
	}
}