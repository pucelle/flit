import {css, Component, html, RenderResult, RenderResultRenderer} from '@pucelle/lupos.js'
import {ThemeSize} from '../style'
import {DOMEvents, EventKeys, Observed, fold, effect, DOMScroll, PerFrameTransitionEasingName, TransitionResult, FoldTransitionOptions} from '@pucelle/ff'
import {ListDataNavigator} from './list-helpers/list-data-navigator'
import {Icon} from './icon'
import {tooltip, contextmenu, PopupOptions} from '../bindings'


/** 
 * Base type of list item.
 * If data struct you have is absolutely different with this,
 * you may declare a class to implement this.
 */
export type ListItem<T = any> = {

	/** Unique value to identify current item. */
	value?: T

	/** 
	 * List item content, can be a pre-generated template result.
	 * If wanting to render template result, overwrite `List.renderText`.
	 */
	text?: string

	/** 
	 * List item icon type.
	 * Can be empty string to make it not show icon, but have a icon placeholder.
	 */
	icon?: string

	/** 
	 * Tooltip content to show as tooltip when mouse hover.
	 * If wanting to render template result, overwrite `List.renderTooltip`.
	 */
	tooltip?: string

	/** 
	 * Child items to render subsection list.
	 * Can insert an empty object `{}` to represent a splitter.
	 */
	children?: ListItem<T>[]
}

export interface ListEvents<T> {

	/** 
	 * Fires after selected items changed.
	 * Only user interaction can cause `select` event get triggered.
	 */
	select: (selected: ReadonlyArray<T>) => void

	/** Fires after clicked a list item. */
	click: (clicked: T) => void
}


/** 
 * `<List>` will render data items as a list,
 * and supports sub list.
 * Otherwise it provides single or multiple selection,
 * and direction key navigation.
 * 
 * Use it like:
 * `<List .data=${[{text, icon?, tip?}]}>` or
 * `<List .data=${[...]} .itemRenderer=${(item) => html`...`}>`
 */
export class List<T = any, E = {}> extends Component<E & ListEvents<T>> {

	/** Walk item and all descendant items recursively. */
	static *walkItems<T>(item: ListItem<T>): Iterable<ListItem<T>> {
		yield item

		if (item.children) {
			for (let child of item.children) {
				if (child.hasOwnProperty('value')) {
					yield* List.walkItems(child as ListItem<T>)
				}
			}
		}
	}

	static style = css`
		.list{
			display: block;
			border-bottom: 1px solid color-mix(in srgb, var(--border-color) 50%, var(--background-color));
		}

		.list-splitter{
			height: 1px;
			background: color-mix(in srgb, var(--border-color) 50%, var(--background-color));
			margin: 2px 0;
		}
		
		.list-item{
			position: relative;
			display: flex;
			align-items: center;
			cursor: pointer;

			&:hover{
				color: var(--primary-color);
			}

			&.selected{
				color: var(--primary-color);
			}

			&.arrow-selected{
				background-color: color-mix(in srgb, var(--primary-color) 10%, var(--background-color));
			}
		}

		.list-toggle-placeholder{
			display: flex;
			width: 1.6em;
			opacity: 0.7;
			align-items: center;
		}

		.list-icon-placeholder{
			display: flex;
			width: 1.6em;
			align-items: center;
		}

		.list-icon{
			margin-right: 0.2em;
		}

		.list-content{
			flex: 1;
			min-width: 0;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			padding: 0.4em 0;
			padding-right: 4px;
		}

		.list-selected-icon{
			margin: 0 -0.45em 0 0.2em;
		}

		.list-subsection{
			padding-left: 1.6em;
			padding-bottom: 4px;
			overflow: hidden;
			font-size: 0.928em;

			.list-item{
				border-top: none;
				line-height: calc(1lh - 2px);
			}

			.list-content{
				padding-top: 0.3em;
				padding-bottom: 0.3em;
			}

			.list-subsection{
				font-size: 1em;
				padding-top: 0;
			}

			.list-subsection:not(:last-child){
				padding-bottom: 3px;
				margin-bottom: 3px;
				border-bottom: 1px solid color-mix(in srgb, var(--border-color) 50%, var(--background-color));
			}

			.list-subsection:last-child{
				padding-bottom: 0;
				margin-bottom: 0;
			}
		}
	`


	size: ThemeSize = 'default'

	/** 
	 * Whether each item is selectable, only available for `selection` mode.
	 * Default value is `false`.
	 */
	selectable: boolean = false

	/** 
	 * Whether can select multiple items, only available for `selection` mode.
	 * Default value is `false`.
	 */
	multipleSelect: boolean = false

	/** 
	 * Whether can select directory.
	 * If specifies as `false`, items have children will not be selected.
	 * Default value is `true`.
	 */
	dirSelectable: boolean = true

	/** Input data list. */
	data: ListItem<T>[] = []

	/** 
	 * Renderer to render text content.
	 * If specifies, it overwrites default action of rendering `text` property.
	 */
	textRenderer: ((item: ListItem<T>) => RenderResult | string | number) | null = null

	/** Indicates currently selected values. */
	selected: T[] = []

	/** Currently expanded items. */
	expanded: T[] = []

	/** 
	 * If specified, when this element get focus,
	 * you can use keyboard arrow keys to navigate across current list.
	 */
	keyComeFrom: HTMLInputElement | HTMLTextAreaElement | null = null

	/** 
	 * Selected and all parental indices by keyboard navigation.
	 * Only the last index is the truly selected.
	 */
	protected readonly keyNavigator: ListDataNavigator<T> = new ListDataNavigator()

	/** For only latest expanded or collapsed can play transition. */
	private latestExpandedOrCollapsed: T | null = null

	/** Whether watching keyboard navigation events. */
	private inKeyNavigating: boolean = false

	@effect
	protected applyKeyNavigatorProperties() {
		this.keyNavigator.update(this.data, this.expanded)
	}

	protected render() {
		return html`
			<template class="list">
				${this.renderItems(this.data)}
			</template>
		`
	}

	protected renderItems(items: Observed<ListItem<T>[]>): RenderResult {
		let anySiblingHaveChildren = items.some(item => {
			return (item as ListItem<T>).children
				&& (item as ListItem<T>).children!.length > 0
		})

		return html`
			<lu:for ${items}>${(item: ListItem<T> | {}) => {
				return this.renderItemOrSplitter(item, anySiblingHaveChildren)
			}
		}</lu:for>
		`
	}

	protected renderItemOrSplitter(item: Observed<ListItem<T>> | {}, anySiblingHaveChildren: boolean): RenderResult {
		if (!item.hasOwnProperty('value')) {
			return html`<div class="list-splitter"></div>`
		}
		else {
			return this.renderItem(item as ListItem<T>, anySiblingHaveChildren)
		}
	}

	protected renderItem(item: Observed<ListItem<T>>, anySiblingHaveChildren: boolean): RenderResult {
		let expanded = this.hasExpanded(item)
		let itemTooltip = this.renderTooltip(item)
		let itemContextmenu = this.renderContextmenu(item)

		return html`
			<div
				class="list-item"
				:class.selected=${this.hasSelected(item)}
				:class.arrow-selected=${item === this.keyNavigator.current}
				?:tooltip=${itemTooltip, itemTooltip!}
				?:contextmenu=${itemContextmenu, itemContextmenu!, {matchSelector: '.list-item'} as PopupOptions}
				@click.prevent=${() => this.onClickItem(item)}
			>
				${this.renderItemPlaceholder(item, expanded, anySiblingHaveChildren)}
				${this.renderIcon(item)}
				${this.renderItemContent(item)}
				${this.renderSelectedIcon(item)}
			</div>

			${this.renderSubsection(item, expanded)}
		`
	}

	protected renderItemPlaceholder(item: Observed<ListItem<T>>, expanded: boolean, anySiblingHaveChildren: boolean) {
		let children = item.children
		if (children && children.length > 0) {
			return html`
				<div class='list-toggle-placeholder'
					@click.stop=${() => this.toggleExpanded(item)}
				>
					<Icon .type=${expanded ? 'triangle-down' : 'triangle-right'} .size="inherit" />
				</div>
			`
		}
		else if (anySiblingHaveChildren) {
			return html`<div class='list-toggle-placeholder' />`
		}
		else {
			return null
		}
	}

	protected renderIcon(item: Observed<ListItem<T>>) {
		if (item.icon === undefined) {
			return null
		}

		return html`
			<div class='list-icon'>
				<lu:if ${item.icon}>
					<Icon .type=${item.icon!} .size="inherit" />
				</>
			</div>
		`
	}

	protected renderTooltip(item: Observed<ListItem<T>>): RenderResultRenderer | undefined {
		return item.tooltip
	}

	protected renderContextmenu(_item: Observed<ListItem<T>>): RenderResultRenderer {
		return null
	}

	/** 
	 * Render item content, can be overwritten for sub classes
	 * who know about more details about data items.
	 */
	protected renderItemContent(item: Observed<ListItem<T>>): RenderResult {
		return html`
			<div class="list-content">
				${this.renderText(item)}
			</div>
		`
	}

	/** Render text content within each list item. */
	protected renderText(item: Observed<ListItem<T>>): RenderResult | undefined {
		if (this.textRenderer) {
			return this.textRenderer(item)
		}
		else {
			return item.text
		}
	}

	protected renderSelectedIcon(item: Observed<ListItem<T>>) {
		if (!this.hasSelected(item)) {
			return null
		}

		return html`
			<Icon class="list-selected-icon" .type="checked" .size="inherit" />
		`
	}

	protected renderSubsection(item: Observed<ListItem<T>>, expanded: boolean) {
		let children = item.children
		if (!children || children.length === 0 || !expanded) {
			return null
		}

		return html`
			<div class="list-subsection"
				:transition.immediate=${
					() => item.value === this.latestExpandedOrCollapsed
						? fold() as TransitionResult<Element, FoldTransitionOptions>
						: null
				}
			>
				${this.renderItems(children!)}
			</div>
		`
	}

	/** Whether an item has been selected.  */
	protected hasSelected(item: Observed<ListItem<T>>): boolean {
		return this.selected.includes(item.value!)
	}

	/** Whether an item has been expanded.  */
	protected hasExpanded(item: Observed<ListItem<T>>): boolean {
		return this.expanded.includes(item.value!)
	}

	/** Toggle expanded state. */
	protected toggleExpanded(item: Observed<ListItem<T>>) {
		if (this.hasExpanded(item)) {
			this.expanded.splice(this.expanded.indexOf(item.value!), 1)
		}
		else {
			this.expanded.push(item.value!)
		}

		this.latestExpandedOrCollapsed = item.value!
	}

	/** Do selection or navigation. */
	protected onClickItem(this: List, item: Observed<ListItem<T>>) {
		if (this.selectable && (this.dirSelectable || !item.children)) {
			if (this.multipleSelect) {
				if (this.selected.includes(item.value)) {
					this.selected.splice(this.selected.indexOf(item), 1)
				}
				else {
					this.selected.push(item.value)
				}
			}
			else {
				this.selected = [item.value]
			}

			this.fire('select', this.selected)
		}

		this.fire('click', item.value)
	}

	/** 
	 * If get contained in a scroller, scroll first selected item to topmost or leftmost of scroll viewport.
	 * Returns a promise which will be resolved after scrolling end,
	 * and resolve by whether scrolled.
	 * Must after update complete.
	 */
	async scrollSelectedToStart(gap?: number, duration?: number, easing?: PerFrameTransitionEasingName): Promise<boolean> {
		let el = this.el.querySelector('.list-item.selected') as HTMLElement | null
		if (!el) {
			return false
		}

		return DOMScroll.scrollToStart(el, null, gap, duration, easing)
	}

	/** 
	 * If get contained in a scroller, scroll to view first selected item.
	 * Returns a promise which will be resolved after scrolling end,
	 * and resolve by whether scrolled.
	 * Must after update complete.
	 */
	async scrollSelectedToView(gap?: number, duration?: number, easing?: PerFrameTransitionEasingName): Promise<boolean> {
		let el = this.el.querySelector('.list-item.selected') as HTMLElement | null
		if (!el) {
			return false
		}

		return DOMScroll.scrollToView(el, null, gap, duration, easing)
	}

	/** 
	 * Expand item, and all of it's ancestors recursively.
	 * This method will not visit dom properties, so no need update complete.
	 * Note this method will walk all data items recursively.
	 */
	expandDeeply(value: T) {
		this.applyExpandedRecursively(this.data, value)
	}

	/** 
	 * Make active item been expanded recursively.
	 * Returns whether any of items has expanded descendants.
	  */
	private applyExpandedRecursively(items: ListItem<T>[], active: T): boolean {
		return items.some(item => {
			if (item === active) {
				return true
			}

			if (item.children) {
				let hasActiveChildItem = this.applyExpandedRecursively(item.children as ListItem<T>[], active)
				if (hasActiveChildItem) {
					if (!this.hasExpanded(item)) {
						this.expanded.push(item.value!)
					}
				}
			}

			return false
		})
	}


	private lastKeyComeFrom: HTMLElement | null = null

	/** On `keyComeFrom` property change. */
	@effect
	protected onKeyComeFromChange() {
		if (!this.keyComeFrom) {
			return
		}

		if (this.lastKeyComeFrom) {
			DOMEvents.off(this.lastKeyComeFrom, 'keydown', this.keyNavigateByEvent, this)
			DOMEvents.off(this.lastKeyComeFrom, 'blur', this.onKeyComeFromBlur, this)
		}

		if (this.keyComeFrom) {
			DOMEvents.on(this.keyComeFrom, 'keydown', this.keyNavigateByEvent, this)
			DOMEvents.on(this.keyComeFrom, 'blur', this.onKeyComeFromBlur, this)
		}

		this.lastKeyComeFrom = this.keyComeFrom
	}

	/** Moves arrow selected by a keyboard event. */
	protected keyNavigateByEvent(event: KeyboardEvent) {
		let key = EventKeys.getShortcutKey(event)

		// Active key navigation if not yet.
		if (key === 'ArrowUp' || key === 'ArrowDown') {
			this.inKeyNavigating = true
		}
		
		if (key === 'ArrowUp') {
			this.keyNavigator.moveUp()
		}
		else if (key === 'ArrowDown') {
			this.keyNavigator.moveDown()
		}
		else if (key === 'ArrowLeft') {
			if (this.inKeyNavigating) {
				this.keyNavigator.moveLeft()
			}
		}
		else if (key === 'ArrowRight') {
			if (this.inKeyNavigating) {
				let item = this.keyNavigator.current
				if (item && !this.hasExpanded(item) && item.children) {
					this.toggleExpanded(item)
					this.keyNavigator.moveRight()
				}
			}
		}
		else if (key === 'Enter') {
			if (this.inKeyNavigating) {
				let item = this.keyNavigator.current
				if (item) {
					this.onClickItem(item)
				}
			}
		}
		else if (key === 'Escape') {
			this.inKeyNavigating = false
			this.keyNavigator.clear()
		}
	}

	protected onKeyComeFromBlur() {
		this.inKeyNavigating = false
		this.keyNavigator.clear()
	}
}