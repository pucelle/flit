import {scrollToTop, getScrollDirection} from '@pucelle/ff'
import {css, html, untilRenderComplete, define, TemplateResult, onRenderComplete} from '@pucelle/flit'
import {theme} from '../style/theme'
import {Dropdown} from './dropdown'
import {ListItem} from './list'


interface SelectEvents<T> {

	/** 
	 * Trigger after selected value changed.
	 * `value` parameter is an array filled with selected values when `multiple` is `true`.
	 */
	change: (value: T | T[]) => void
}


/** `<f-select>` works just like `<select>`, you can select one or multiple option from it. */
@define('f-select')
export class Select<T = any, E = {}> extends Dropdown<E & SelectEvents<T>> {
	
	static style() {
		let {mainColor, adjust, borderColor, popupShadowBlurRadius, fieldBackgroundColor, popupShadowColor} = theme

		return css`
		:host{
			display: inline-flex;
			vertical-align: top;
			width: ${adjust(200)}px;
			height: ${adjust(28)}px;
			background: ${fieldBackgroundColor};
			line-height: ${adjust(28)}px;
			justify-content: space-between;
			align-items: center;
			cursor: pointer;
			box-shadow: inset 0 -1px 0 0 ${borderColor};

			&:hover, &.opened{
				box-shadow: inset 0 -1px 0 0 ${mainColor};

				.icon{
					color: ${mainColor};
				}
			}

			&.not-inputable input{
				cursor: pointer;
			}
		}

		.down-icon{
			margin-left: 3px;
			margin-right: 4px;
		}
	
		.display, .input{
			flex: 1;
			min-width: 0;
			padding: 0 0 0 ${adjust(8)}px;
			height: 100%;
			border: none;
			background: transparent;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			box-shadow: none;

			&:focus{
				box-shadow: none;
			}
		}

		.placeholder{
			opacity: 0.5;
		}
	
		.popup{
			padding: 0;
			border-radius: 0;
			filter: none;
			box-shadow: 0 1px ${popupShadowBlurRadius}px ${popupShadowColor};
		}

		.list{
			border-bottom: none;

			.option__f-list{
				padding-left: ${adjust(8)}px;
				border-top: none;
			}
		}

		.selected-icon{
			margin-right: -4px;
		}
		`.extends(super.style())
	}

	readonly refElements!: {

		/** The element of popup component. */
		popup: HTMLElement

		/** Input element to input text to filter list items. */
		input: HTMLInputElement

		/** List element. */
		list: HTMLElement
	}

	/** Inputted text for filtering list items. */
	protected inputted: string = ''

	/** Is in editing mode, in which you can input text to filter list items. */
	protected editing: boolean = false

	/** Trigger event type. Default value is `click`. */
	trigger: 'click' | 'contextmenu' = 'click'

	/** Whether shows triangle. Default value is `false`. */
	triangle: boolean = false

	/** 
	 * Align margin betweens trigger element and popup content.
	 * Default value is '0' in pixels.
	 */
	alignMargin: number | number[] = 0

	/** 
	 * Whether can select multiple items, only for type `selection`.
	 * Default value is `false`.
	 */
	multipleSelect: boolean = false

	/** Whether can input to search from all option text. */
	searchable: boolean = false

	/** Placeholder for search input. */
	placeholder: string = ''

	/** Input data list. */
	data: ListItem<T>[] = []

	/** Current selected value or multiple values when `multipleSelect` is `true`. */
	value: T | T[] | null = null

	/** 
	 * Whether close pop-up after selected.
	 * Only works when doing single-selection.
	 */
	hideAfterSelected: boolean = true

	protected onCreated() {
		this.initializeStartValue()
	}

	protected initializeStartValue() {
		if (this.multipleSelect && !Array.isArray(this.value)) {
			this.value = []
		}
	}

	protected onOpenedChange(opened: boolean) {
		super.onOpenedChange(opened)

		if (this.searchable && !opened && this.editing) {
			this.endEditing()
		}
	}

	protected render() {
		return html`
			<template :class.not-inputable=${!this.searchable}>
				${this.renderDisplayOrInput()}
			</template>
		`.extends(super.render())
	}

	protected renderDisplayOrInput(): TemplateResult | string | number {
		if (this.editing) {
			return html`
				<input type="text"
					class="input"
					:refElement="input"
					.value=${this.inputted}
					.placeholder=${this.placeholder}
					?readonly=${!this.editing}
					@click=${this.onClick}
					@input=${this.onInput}
				>
			`
		}
		else {
			let text = this.renderCurrentDisplay()

			return html`
				<div
					class="input"
					:class.placeholder=${!text}
					@click=${this.onClick}
				>
					${text || this.placeholder}
				</div>
			`
		}
	}

	protected renderPopup() {
		let data = this.getDisplayData()

		return html`
			<f-popup
				class="popup"
				:refElement="popup"
				.triangle="false"
			>
				<f-list class="list"
					:refElement="list"
					.type="selection"
					.selectable
					.data=${data}
					.multipleSelect=${this.multipleSelect}
					.selected=${this.multipleSelect ? this.value : [this.value]}
					.navigateFrom=${() => this.refElements.input}
					@@select=${this.onSelected}
				/>
			</f-popup>
		`
	}

	protected renderCurrentDisplay(): string | number | TemplateResult {
		if (this.multipleSelect) {
			let displays: (string | number)[] = []

			for (let {value, text} of this.data) {
				if ((this.value! as T[]).includes(value!)) {
					displays.push(text.toString())
				}
			}

			return displays.join('; ')
		}
		else {
			for (let {value, text} of this.data) {
				if (this.value === value) {
					return text
				}
			}

			return ''
		}
	}

	protected getDisplayData(): Iterable<ListItem<T>> {
		if (this.searchable && this.inputted) {
			let lowerSearchWord = this.inputted.toLowerCase()
			let filteredData: ListItem<T>[] = []

			for (let item of this.data) {
				let searchText = item.searchText ?? String(item.text).toLowerCase()
				if (searchText.includes(lowerSearchWord)) {
					filteredData.push(item)
				}
			}

			return filteredData
		}
		else {
			return this.data
		}
	}

	protected onClick() {
		if (this.searchable && !this.editing) {
			this.startEditing()
		}
	}

	protected onSelected(this: Select, selected: T | T[]) {
		if (this.multipleSelect) {
			this.value = selected as T[]
		}
		else {
			this.value = selected as T

			if (this.hideAfterSelected) {
				this.hidePopup()
			}
		}
		
		this.emit('change', this.value!)
	}

	protected async startEditing() {
		this.editing = true
		await untilRenderComplete()
		this.refElements.input.focus()
	}

	protected endEditing() {
		this.editing = false
		this.inputted = ''
	}

	protected onPopupOpened() {
		onRenderComplete(() => {
			this.mayFocusInput()
			this.scrollToViewSelectedOption()
		})
	}

	protected mayFocusInput() {
		if (this.editing && this.refElements.input) {
			this.refElements.input.focus()
		}
	}
	
	protected onWillAlign() {
		this.syncPopupWidth()
	}

	protected syncPopupWidth() {
		if (this.refElements.popup) {
			this.refElements.popup.style.minWidth = String(this.el.offsetWidth) + 'px'
		}
	}

	protected scrollToViewSelectedOption() {
		if (this.refElements.list) {
			let selectedOption = this.refElements.list.querySelector('[class*=selected]') as HTMLElement | null
			if (selectedOption && getScrollDirection(this.refElements.list) === 'y') {
				scrollToTop(selectedOption)
			}
		}
	}

	protected onInput() {
		this.inputted = (this.refElements.input as HTMLInputElement).value
		this.showPopup()
	}
}