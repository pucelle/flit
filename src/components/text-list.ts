import {css, Component, html, TemplateResult} from '@pucelle/lupos.js'
import {theme} from '../style/theme'
import {add, remove} from '@pucelle/ff'
import {tooltip} from '../bindings2/tooltip'
import {TreeDataNavigation} from './list-helpers/list-data-navigator'


export interface ListItem<T = any> {

	/** 
	 * Unique value to identify current item.
	 * If value is `undefined`, and have any children, clicking it will cause it to be expanded.
	 */
	value?: T

	/** List item content, can be a template result. */
	text: string | TemplateResult

	/** Shows as tooltip content when mouse hover. */
	tip?: string | TemplateResult

	/** List item icon type. */
	icon?: string

	/** To render subsection list. */
	children?: ListItem<T>[]

	/** Whether current list is expanded. */
	expanded?: boolean
}

interface ListEvents<T> {

	/** Triggers after selected items changed. */
	select: (selected: T[]) => void

	/** Triggers after navigated item changed. */
	navigate: (navigated: T) => void

	/** Triggers after clicking list item. */
	click: (clicked: T) => void
}


/** 
 * `<List>` will render data items as a list,
 * and supports sub list.
 * Otherwise it provides single or multiple selection,
 * and direction key navigation.
 */
export class List<T = any, E = {}> extends Component<E & ListEvents<T>> {

	static style() {
		let {mainColor, adjust, borderColor, adjustFontSize} = theme

		return css`
		.list{
			display: block;
			border-bottom: 1px solid ${borderColor.alpha(0.4)};
		}
		
		.list-option{
			position: relative;
			display: flex;
			padding-top: ${adjust(2)}px;
			padding-bottom: ${adjust(2)}px;
			cursor: pointer;
			border-top: 1px solid ${borderColor.alpha(0.4)};

			&:first-child{
				border-top: none;
			}

			&:hover{
				color: ${mainColor};
			}

			&.selected{
				color: ${mainColor};
			}

			&.active{
				color: ${mainColor};

				&::after{
					content: '';
					position: absolute;
					top: ${adjust(3)}px;
					bottom: ${adjust(3)}px;
					right: 0;
					width: 2px;
					background: ${mainColor(0.8)};
				}
			}

			&.arrow-selected{
				background-color: ${mainColor.alpha(0.1)};
			}
		}

		.toggle{
			display: flex;
			width: ${adjust(22)}px;
			opacity: 0.7;
		}

		.icon{
			display: flex;
			width: ${adjust(22)}px;
		}

		.text{
			flex: 1;
			min-width: 0;
			padding-right: 4px;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.selected-icon{
			margin: 0 ${adjust(6)}px;
		}

		.subsection{
			padding-left: ${adjust(22)}px;
			padding-bottom: ${adjust(4)}px;
			overflow: hidden;
			font-size: ${adjustFontSize(13)}px;

			.option{
				padding-top: 0;
				padding-bottom: 0;
				border-top: none;
				line-height: ${adjust(26)}px;
			}

			.subsection{
				padding-top: 0;
			}

			.subsection:not(:last-child){
				padding-bottom: ${adjust(3)}px;
				margin-bottom: ${adjust(3)}px;
				border-bottom: 1px solid ${borderColor.alpha(0.4)};
			}

			.subsection:last-child{
				padding-bottom: 0;
				margin-bottom: 0;
			}
		}
		`
	}

	/** Selected indices by keyboard navigation. */
	protected treeNavigationIndices: number[] = []

	/** Whether watching keyboard navigation events. */
	protected watchingKeyBoardNavigation: boolean = false

	/** List type:
	 * `selection`: provide single item or multiple items selection with a checkbox icon.
	 * `navigation`: provide single item navigation with a vertical line icon.
	 * Default value is `selection`.
	 */
	type: 'selection' | 'navigation' = 'selection'

	/** 
	 * Whether each item is selectable, only when at `selection` mode.
	 * Default value is `false`.
	 */
	selectable: boolean = false

	/** 
	 * Whether can select multiple items, only for type `selection`.
	 * Default value is `false`.
	 */
	multipleSelect: boolean = false

	/** Input data list. */
	data: ListItem<T>[] = []

	/** Indicates current select values. */
	selected: T[] = []

	/** 
	 * Unique active value for `navigation` type.
	 * If this value set when initializing, will make the associated item visible.
	 * Otherwise you can call `ensureActiveItemVisible()` to do same thing.
	 */
	active: T | null = null

	/** If specified, when the element get focus, you can use keyboard arrow keys to navigate inside current list. */
	navigateFrom: HTMLInputElement | HTMLTextAreaElement | null | (() => HTMLInputElement | HTMLTextAreaElement | null) = null

	protected render() {
		return html`${this.renderOptions(this.data, this.treeNavigationIndices)}`
	}

	protected renderOptions(items: ListItem<T>[], indices: number[] | null): DirectiveResult {
		let siblingsHaveIcon = items.some(item => item.icon)
		let siblingsHaveChildren = items.some(item => item.children)

		let options = repeat(items, (item, index) => {
			let childIndices = indices?.[0] === index ? indices.slice(1) : null
			return this.renderOption(item, siblingsHaveIcon, siblingsHaveChildren, childIndices)
		})

		return options
	}

	protected renderOption(item: ListItem<T>, siblingsHaveIcon: boolean, siblingsHaveChildren: boolean, indices: number[] | null) {
		let subsection = item.children && item.expanded ? html`
			<div class="subsection">${this.renderOptions(item.children, indices)}</div>
		` : null

		let tip = item.tip ? tooltip(item.tip) : null

		return html`
			<div
				class="option"
				:class=${this.renderClassName(item)}
				:class.arrow-selected=${indices?.length === 0}
				@click.prevent=${() => this.onClickOption(item)}
				${tip}

			>
				${item.children ? html`
					<div class='toggle' @click.stop=${() => this.toggleOpened(item)}>
						<f-icon .type=${item.expanded ? 'triangle-down' : 'triangle-right'} />
					</div>
				` : siblingsHaveChildren ? html`
					<div class='toggle' />
				` : ''}

				${siblingsHaveIcon ? html`
					<div class='icon'>
						<f-icon .type=${item.icon} />
					</div>
				` : ''}
		
				<div class="text">
					${item.text}
				</div>

				${this.isSelected(item) ? html`<f-icon class="selected-icon" .type="checked" />` : ''}
			</div>

			${toggle(subsection, {properties: ['height', 'marginBottom', 'paddingBottom', 'opacity']})}
		`
	}

	protected onCreated() {
		if (this.active) {
			this.ensureActiveItemVisible()
		}
	}

	protected onReady() {
		if (this.navigateFrom) {
			let lastElement: HTMLElement | null = null

			this.watchImmediately(() => {
				if (typeof this.navigateFrom === 'function') {
					return this.navigateFrom()
				}
				else {
					return this.navigateFrom
				}
			}, navigateFrom => {
				if (lastElement) {
					off(lastElement, 'keydown', this.moveArrowSelectedByEvent as any, this)
					off(lastElement, 'blur', this.onNavigateFromElementBlur as any, this)
				}

				if (navigateFrom) {
					on(navigateFrom, 'keydown', this.moveArrowSelectedByEvent as any, this)
					on(navigateFrom, 'blur', this.onNavigateFromElementBlur as any, this)
				}

				lastElement = navigateFrom
			})
		}
	}

	/** Moves arrow selected by a keyboard event. */
	protected moveArrowSelectedByEvent(event: KeyboardEvent) {
		if (event.key === 'ArrowUp') {
			this.watchingKeyBoardNavigation = true
			this.treeNavigationIndices = TreeDataNavigation.moveArrowUp(this.data, this.treeNavigationIndices)
		}
		else if (event.key === 'ArrowDown') {
			this.watchingKeyBoardNavigation = true
			this.treeNavigationIndices = TreeDataNavigation.moveArrowDown(this.data, this.treeNavigationIndices)
		}
		else if (event.key === 'ArrowLeft') {
			if (this.watchingKeyBoardNavigation) {
				this.treeNavigationIndices = TreeDataNavigation.moveArrowLeft(this.data, this.treeNavigationIndices)
			}
		}
		else if (event.key === 'ArrowRight') {
			if (this.watchingKeyBoardNavigation && this.treeNavigationIndices) {
				let item = TreeDataNavigation.getCurrentItem(this.data, this.treeNavigationIndices)
				if (item && !item.expanded && item.children) {
					this.toggleOpened(item)
					this.treeNavigationIndices = TreeDataNavigation.moveArrowRight(this.data, this.treeNavigationIndices)
				}
			}
		}
		else if (event.key === 'Enter') {
			if (this.watchingKeyBoardNavigation && this.treeNavigationIndices) {
				let el = this.el.querySelector(this.scopeClassName('.arrow-selected'))
				if (el) {
					let box = el.getBoundingClientRect()
					let centerEl = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) as HTMLElement
					if (centerEl instanceof HTMLElement) {
						centerEl.click()
					}
				}
			}
		}
		else {
			this.watchingKeyBoardNavigation = false
			this.treeNavigationIndices = []
		}
	}

	protected onNavigateFromElementBlur() {
		this.watchingKeyBoardNavigation = false
		this.treeNavigationIndices = []
	}

	protected renderClassName(item: ListItem<T>) {
		if (this.type === 'navigation') {
			if (this.active === item.value) {
				return 'active'
			}
		}
		else {
			if (this.isSelected(item)) {
				return 'selected'
			}
		}
		
		return ''
	}

	protected isSelected(item: ListItem<T>) {
		return this.selected.includes(item.value!)
	}

	protected onClickOption(this: List, item: ListItem<T>) {
		if (item.value === undefined) {
			this.toggleOpened(item)
		}
		else if (this.type === 'navigation') {
			this.active = item.value!
			this.emit('navigate', item.value)
		}
		else if (this.selectable) {
			if (this.multipleSelect) {
				if (this.selected.includes(item.value!)) {
					remove(this.selected, item.value)
				}
				else {
					add(this.selected, item.value)
				}
			}
			else {
				this.selected = [item.value!]
			}

			this.emit('select', this.multipleSelect ? this.selected : this.selected[0])
		}
		else {
			this.emit('click', item.value)
		}
	}

	protected toggleOpened(item: ListItem<T>) {
		if (item.children) {
			item.expanded = !item.expanded
		}
	}

	/** Open sub list recursively to make sure active item becomes visible. */
	ensureActiveItemVisible() {
		if (this.active) {
			this.ensureActiveItemVisibleRecursively(this.data)
		}
	}

	private ensureActiveItemVisibleRecursively(items: ListItem<T>[]) {
		return items.some(item => {
			if (item.value === this.active) {
				return true
			}

			if (item.children) {
				let hasActiveChildItem = this.ensureActiveItemVisibleRecursively(item.children)
				if (hasActiveChildItem) {
					item.expanded = true
				}
			}

			return item.expanded
		})
	}
}