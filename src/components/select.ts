import {computed, DOMScroll, untilComplete} from '@pucelle/ff'
import {css, html, TemplateResult} from '@pucelle/lupos.js'
import {theme, ThemeSize} from '../style'
import {Dropdown} from './dropdown'
import {ListItem, List} from './list'
import {Popup} from './popup'
import {Icon} from './icon'
import {popup} from '../bindings'


interface SelectEvents<V> {

	/** 
	 * Fire after selected value changed.
	 * Only user interaction can cause `change` event get triggered.
	 */
	change: (value: V[]) => void
}


/** 
 * `<Select>` works just like `<select>` element, you can select one or multiple option from it.
 * `<Select .data=${[{text, icon?, tip?}]} .value=${[ItemOfData]}>`
 */
export class Select<V extends ListItem<V> = any, E = {}> extends Dropdown<E & SelectEvents<V>> {
	
	static style() {
		let {mainColor, borderColor, popupShadowBlurRadius, fieldBackgroundColor, popupShadowColor} = theme

		return css`
		.select{
			display: inline-flex;
			vertical-align: top;
			width: calc(20em + 20px);
			height: 1lh;
			background: ${fieldBackgroundColor};
			justify-content: space-between;
			align-items: center;
			cursor: pointer;
			box-shadow: inset 0 -1px 0 0 ${borderColor};

			&:hover, &.opened{
				box-shadow: inset 0 -1px 0 0 ${mainColor};

				.select-down-icon{
					color: ${mainColor};
				}
			}

			&.cant-input input{
				cursor: pointer;
			}
		}

		.select-down-icon{
			margin-left: 3px;
			margin-right: 4px;
		}
	
		.select-display, .select-input{
			flex: 1;
			min-width: 0;
			padding: 0 0 0 0.57em;
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

		.select-placeholder{
			opacity: 0.5;
		}
	
		.select-popup{
			padding: 0;
			border-radius: 0;
			filter: none;
			box-shadow: 0 1px ${popupShadowBlurRadius}px ${popupShadowColor};
		}

		.select-list{
			border-bottom: none;

			.list-item{
				padding-left: 0.57em;
				border-top: none;
			}
		}

		.select-selected-icon{
			margin-right: -4px;
		}
		`
	}


	size: ThemeSize = 'default'
	trigger: 'click' | 'contextmenu' = 'click'
	gap: number | number[] = 0
	
	
	/** Whether shows triangle. Default value is `false`. */
	triangle: boolean = false

	/** 
	 * Whether can select multiple items.
	 * Default value is `false`.
	 */
	multiple: boolean = false

	/** Whether can input to search from all option text. */
	searchable: boolean = false

	/** Placeholder for search input. */
	placeholder: string = ''

	/** Input text data list. */
	data: V[] = []
	
	/** Current selected value or values. */
	value: V[] = []

	/** 
	 * Whether close pop-up content after selected any item.
	 * If omitted as `null`, equals `true` when single selection, `false` otherwise.
	 */
	hideAfterSelected: boolean | null = null


	/** The element of popup component. */
	protected popupEl: HTMLElement | null = null

	/** Input element to input text to filter list items. */
	protected inputEl: HTMLInputElement | null = null

	/** List element. */
	protected listEl: HTMLElement | null = null

	/** Inputted text at input element to filter list items. */
	protected inputtedText: string = ''

	/** Whether in editing mode, in which mode you can input text to filter list items. */
	protected editing: boolean = false


	protected onOpenedChange(opened: boolean) {
		super.onOpenedChange(opened)

		// End editing after closed popup.
		if (!opened && this.editing) {
			this.endEditing()
		}
	}

	protected onWillAlign() {
		this.syncPopupWidth()
	}

	/** Sync popup width with select element. */
	protected syncPopupWidth() {
		if (this.popupEl) {
			this.popupEl.style.minWidth = String(this.el.offsetWidth) + 'px'
		}
	}


	protected render() {
		return html`
			<template :class.opened=${this.opened}
				:class.cant-input=${!this.searchable}
				:popup=${this.getPopupOptions()}
				:ref.binding=${this.refBinding.bind(this)}
			>
				${this.renderDisplayOrInput()}
				<Icon class="dropdown-icon" .type="down" .size="inherit" />
			</template>
		`
	}

	protected renderDisplayOrInput(): TemplateResult | string | number {
		if (this.editing) {
			return html`
				<input type="text" autofocus
					class="select-input"
					:ref=${this.inputEl}
					.value=${this.inputtedText}
					.placeholder=${this.placeholder}
					@click=${this.onClick}
					@input=${this.onInput}
				>
			`
		}
		else {
			let text = this.renderDisplay()

			return html`
				<div
					class="select-display"
					:class.select-placeholder=${!text}
					@click=${this.onClick}
				>
					${text || this.placeholder}
				</div>
			`
		}
	}

	protected renderPopup() {
		let data = this.getFilteredData()

		return html`
			<Popup class="popup" .triangle=${false}>
				<List class="select-list"
					:ref=${this.listEl}
					.mode="selection"
					.selectable
					.data=${data}
					.selected=${this.value}
					.multiple=${this.multiple}
					.keyComeFrom=${() => this.inputEl}
					@select=${this.onSelected}
				/>
			</Popup>
		`
	}

	/** Render text display to represent currently selected. */
	protected renderDisplay(): string {
		let displays = this.value.map(item => String(item.text))
		return displays.join('; ')
	}

	protected getFilteredData(): V[] {
		if (this.searchable && this.inputtedText) {
			let lowerSearchWord = this.inputtedText.toLowerCase()
			let filteredData: V[] = []

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

	protected onSelected(this: Select, selected: V[]) {
		this.value = selected

		let hideAfterSelected = this.hideAfterSelected ?? !this.multiple
		if (hideAfterSelected) {
			this.opened = false
		}
		
		this.fire('change', this.value)
	}

	protected async startEditing() {
		this.editing = true
	}

	protected endEditing() {
		this.editing = false
		this.inputtedText = ''
	}

	protected async onPopupOpened() {
		await untilComplete()
		this.mayFocusInput()
		this.scrollToViewSelectedItem()
	}

	protected mayFocusInput() {
		if (this.editing && this.inputEl) {
			this.inputEl.focus()
		}
	}
	
	protected scrollToViewSelectedItem() {
		if (this.listEl) {
			let selectedItem = this.listEl.querySelector('[class*=selected]') as HTMLElement | null
			if (selectedItem && DOMScroll.getSizedOverflowDirection(this.listEl) === 'vertical') {
				DOMScroll.scrollToTop(selectedItem)
			}
		}
	}

	protected onInput() {
		this.inputtedText = this.inputEl!.value
		this.opened = true
	}
}