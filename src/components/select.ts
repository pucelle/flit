import {UpdateQueue} from '@pucelle/lupos'
import {fade, css, html, RenderResult, TemplateResult} from '@pucelle/lupos.js'
import {ThemeSize} from '../style'
import {Dropdown} from './dropdown'
import {ListItem, List} from './list'
import {Popup} from './popup'
import {Icon} from './icon'
import {popup} from '../bindings'
import {ScrollUtils} from '@pucelle/ff'
import {IconClose, IconDown} from '../icons'
import {DOMScroll} from '../tools'


interface SelectEvents<T, M extends boolean> {

	/** 
	 * Fire after selected value changed.
	 * Only user interaction can cause `change` event get triggered.
	 */
	change: (value: M extends true ? T[] : T) => void
}


/** 
 * `<Select>` works just like html `<select>` element, supports single or multiple option selection.
 * 
 * Use it like:
 * `<Select .data=${[{text, icon?, tip?}]} .value=${[ItemOfData]}>`
 * 
 * `<Select>` doesn't support custom item renderer, you may extend it to a new class to implement.
 */
export class Select<T = any, M extends boolean = false, E = {}> extends Dropdown<E & SelectEvents<T, M>> {
	
	static override style = css`
		.select{
			display: inline-flex;
			vertical-align: top;
			width: calc(20em + 20px);
			height: 2em;
			padding: 0.2em 0;
			background: var(--field-color);
			justify-content: space-between;
			align-items: center;
			cursor: pointer;
			box-shadow: inset 0 -1px 0 0 var(--border-color);

			&:hover, &.opened{
				box-shadow: inset 0 -1px 0 0 var(--primary-color);

				.select-dropdown-icon{
					color: var(--primary-color);
				}
			}

			&.cant-input input{
				cursor: pointer;
			}
		}

		.select-dropdown-icon{
			margin: 0 0.2em;
		}

		.select-clear-icon{
			margin: 0 0.2em;
		}
	
		.select-display, .select-input{
			flex: 1;
			min-width: 0;
			padding: 0 0 0 0.6em;
			height: 100%;
			border: none;
			background: transparent;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			box-shadow: none;

			/** Ensure to inherit <Input> element. */
			color: inherit;
			font-family: inherit;
			font-size: inherit;
			font-weight: inherit;
			font-style: inherit;
			text-align: inherit;
			line-height: inherit;

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
		}

		.select-list{
			border-bottom: none;

			.list-item{
				padding-left: 0.6em;
				padding-right: 0.15em;
				border-bottom: none;
			}
		}
	`


	size: ThemeSize = 'default'

	override trigger: 'click' | 'contextmenu' | undefined = 'click'
	override showDelay: number | undefined = 0
	override hideDelay: number | undefined = 0
	override gaps: number | number[] | undefined = 0
	
	/** Whether shows triangle. Default value is `false`. */
	triangle: boolean = false

	/** 
	 * Whether can select multiple items.
	 * Default value is `false`.
	 */
	multiple: M = false as M

	/** Whether can input to search from all option text. */
	searchable: boolean = false

	/** Placeholder for search input. */
	placeholder: string = ''

	/** Input text data list. */
	data: ListItem<T>[] = []
	
	/** Current selected value or values. */
	value: M extends true ? T[] | null : T | null = null

	/** 
	 * Whether close pop-up content after selected any item.
	 * If omitted as `null`, equals `true` when single selection, `false` otherwise.
	 */
	hideAfterSelected: boolean | null = null

	/** 
	 * Renderer to render text content.
	 * If specifies, it overwrites default action of rendering `text` property.
	 */
	textRenderer: ((item: ListItem<T>) => RenderResult | string | number) | null = null


	/** The element of popup component. */
	protected popupEl: HTMLElement | null = null

	/** Input element to input text to filter list items. */
	protected inputRef: HTMLInputElement | null = null

	/** List element. */
	protected listEl: HTMLElement | null = null

	/** Inputted text at input element to filter list items. */
	protected inputtedText: string = ''

	/** Whether in editing mode, in which mode you can input text to filter list items. */
	protected editing: boolean = false

	protected override async onPopupOpenedChange(opened: boolean) {
		super.onPopupOpenedChange(opened)

		// End editing after closed popup.
		if (!opened && this.editing) {
			this.endEditing()
		}

		// Focus and scroll to view after opened popup.
		else if (opened) {
			await UpdateQueue.untilChildComplete(this)
			this.mayFocusInput()
			this.scrollToViewSelectedItem()
		}
	}

	protected override onPopupWillAlign() {
		this.syncPopupWidth()
	}

	/** Sync popup width with select element. */
	protected syncPopupWidth() {
		if (this.popupEl) {
			this.popupEl.style.minWidth = String(this.el.offsetWidth) + 'px'
		}
	}

	protected override render() {
		return html`
			<template class="dropdown select"
				:class.opened=${this.opened}
				:class.cant-input=${!this.searchable}
				:popup=${this.renderPopup, this.popupOptions}
				:ref.binding=${this.binding}
				@click=${this.onClick}
			>
				${this.renderDisplayOrInput()}

				<lu:if ${this.inputtedText}>
					<Icon class="select-clear-icon" .icon=${IconClose} .size="inherit"
						@click.stop=${this.clearInputtedText}
					/>
				</lu:if>
				<lu:else>
					<Icon class="dropdown-icon select-dropdown-icon" .icon=${IconDown} .size="inherit" />
				</lu:else>
			</template>
		`
	}

	protected renderDisplayOrInput(): TemplateResult | string | number {
		if (this.editing) {
			return html`
				<input type="text" autofocus
					class="select-input"
					autocomplete="chrome-off"
					:ref=${this.inputRef}
					.value=${this.inputtedText}
					.placeholder=${this.placeholder}
					@input=${this.onInput}
				>
			`
		}
		else {
			let display = this.renderDisplay()

			return html`
				<div
					class="select-display"
					:class.select-placeholder=${!display}
					@click=${this.onClick}
				>
					${display || this.placeholder}
				</div>
			`
		}
	}

	protected override renderPopup() {
		let data = this.getFilteredData()

		return html`
			<Popup class="select-popup"
				.triangle=${false}
				:ref.el=${this.popupEl}
				:transition.immediate=${fade()}
			>
				<List class="select-list"
					:ref.el=${this.listEl}
					.selectable
					.data=${data}
					.textRenderer=${this.textRenderer}
					.selected=${(this.multiple ? this.value : this.value === null ? [] : [this.value])}
					.multipleSelect=${this.multiple}
					.keyComeFrom=${this.inputRef}
					@select=${this.onSelected}
				/>
			</>
		`
	}

	/** Render text display to represent currently selected. */
	protected renderDisplay(): string | null {
		let filteredData: ListItem<T>[] = []

		if (this.multiple) {
			if (Array.isArray(this.value)) {
				filteredData = this.data.filter(item => (this.value as T[]).includes(item.value!))
			}
		}
		else {
			if (this.value !== null) {
				filteredData = this.data.filter(item => item.value === this.value)
			}
		}

		let displays = filteredData.map(item => item.text)
		if (displays.length === 0) {
			return null
		}

		return displays.join('; ')
	}

	protected getFilteredData(): ListItem<T>[] {
		if (this.searchable && this.inputtedText) {
			let lowerSearchWord = this.inputtedText.toLowerCase()
			let filteredData: ListItem<T>[] = []

			for (let item of this.data) {
				let searchText = item.text
				if (searchText?.includes(lowerSearchWord)) {
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

	protected onSelected(this: Select, selected: readonly T[]) {
		this.value = this.multiple ? selected : selected[0] ?? null

		let hideAfterSelected = this.hideAfterSelected ?? !this.multiple
		if (hideAfterSelected) {
			this.opened = false
		}
		
		this.fire('change', this.value)
	}

	protected async startEditing() {
		this.inputtedText = ''
		this.editing = true
	}

	protected endEditing() {
		this.editing = false
	}

	protected mayFocusInput() {
		if (this.editing && this.inputRef) {
			this.inputRef.focus()
		}
	}
	
	protected scrollToViewSelectedItem() {
		if (this.listEl) {
			let selectedItem = this.listEl.querySelector('[class*=selected]') as HTMLElement | null
			if (selectedItem && ScrollUtils.getSizedOverflowDirection(this.listEl) === 'vertical') {
				DOMScroll.scrollToTop(selectedItem)
			}
		}
	}

	protected onInput() {
		this.inputtedText = this.inputRef!.value
		this.opened = true
	}

	protected clearInputtedText() {
		this.inputtedText = ''
	}

	/** Focus on input field. */
	focus() {
		this.inputRef?.focus()
	}

	/** Select all input text. */
	select() {
		this.inputRef?.select()
	}
}