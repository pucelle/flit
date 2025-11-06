import {css, Component, html, RenderResult, RenderResultRenderer, fold, PerFrameTransitionEasingName, TransitionResult, FoldTransitionOptions} from '@pucelle/lupos.js'
import {ThemeSize} from '../style'
import {DOMEvents, EventKeys, Observed, effect, untilChildUpdateComplete} from '@pucelle/lupos'
import {ListDataNavigator} from './list-helpers/list-data-navigator'
import {Icon} from './icon'
import {tooltip, contextmenu, PopupOptions} from '../bindings'
import {IconChecked, IconTriangleDown, IconTriangleRight} from '../icons'
import {DOMScroll} from '../tools'
import {PartialRepeat} from './partial-repeat'


/** List item and index. */
export interface ItemPath<T> {
	item: ListItem<T>
	index: number
}


/** 
 * Base type of list item.
 * If data struct you have is absolutely different with this,
 * you may declare a class to implement this.
 */
export interface ListItem<T = any> extends Observed {

	/** Unique value to identify current item. */
	value?: T

	/** 
	 * List item content, can be a pre-generated template result.
	 * If wanting to render template result, overwrite `List.renderText` or specifies `textRenderer`.
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
 * `<List>` renders data items as a list,
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

	static override style = css`
		.list{
			display: block;
			border-bottom: 1px solid color-mix(in srgb, var(--border-color) 30%, var(--background-color));
		}

		.list-splitter{
			height: 1px;
			background: color-mix(in srgb, var(--border-color) 50%, var(--background-color));
			margin: 2px 0;
		}

		/* Contains list item and subsection. */
		.list-each{

		}
		
		.list-item{
			position: relative;
			display: flex;
			align-items: center;
			border-bottom: 1px solid color-mix(in srgb, var(--border-color) 30%, var(--background-color));
			cursor: pointer;

			&:last-child{
				border-bottom: none;
			}

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
			margin: 0 0 0 0.2em;
		}

		.list-partial-repeat{}

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

	/** If provided, will start partial rendering for large list. */
	partialRenderingScrollerSelector: string | null = null

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
	protected latestExpandedOrCollapsed: T | null = null

	/** Whether watching keyboard navigation events. */
	protected inKeyNavigating: boolean = false

	@effect
	protected applyKeyNavigatorProperties() {
		this.keyNavigator.update(this.data, this.expanded)
	}

	protected override render() {
		return html`
			<template class="list">
				${this.renderItems(this.data)}
			</template>
		`
	}

	protected renderItems(items: ListItem<T>[]): RenderResult {
		if (this.shouldRenderPartialRepeat(items)) {
			return html`
				<PartialRepeat class="list-partial-repeat"
					.data=${items}
					.renderFn=${(item: ListItem<T>) => this.renderItemOrSplitter(item)}
					.overflowDirection="vertical"
					.guessedItemSize=${25}
					.scrollerSelector=${this.partialRenderingScrollerSelector}
				/>
			`
		}
		else {
			return html`
				<lu:for ${items}>${(item: ListItem<T>) => {
					return this.renderItemOrSplitter(item)
				}}</lu:for>
			`
		}
	}

	protected shouldRenderPartialRepeat(items: ListItem<T>[]) {
		return this.partialRenderingScrollerSelector && items.length > 50
	}

	protected renderItemOrSplitter(item: ListItem<T>): RenderResult {
		if (!item.hasOwnProperty('value')) {
			return html`<div class="list-splitter"></div>`
		}
		else {
			return this.renderItem(item as ListItem<T>)
		}
	}

	protected renderItem(item: ListItem<T>): RenderResult {
		let expanded = this.hasExpanded(item.value!)
		let itemTooltip = this.renderTooltip(item)
		let itemContextmenu = this.renderContextmenu(item)

		return html`
			<div class="list-each">
				<div
					class="list-item"
					:class.selected=${this.hasSelected(item.value!)}
					:class.arrow-selected=${item === this.keyNavigator.current}
					?:tooltip=${itemTooltip, itemTooltip!}
					?:contextmenu=${itemContextmenu, itemContextmenu!, {matchSelector: '.list-item'} as PopupOptions}
					@click.prevent=${() => this.onClickItem(item)}
				>
					${this.renderItemPlaceholder(item, expanded)}
					${this.renderIcon(item)}
					${this.renderItemContent(item)}
					${this.renderSelectedIcon(item)}
				</div>

				${this.renderSubsection(item, expanded)}
			</div>
		`
	}

	protected renderItemPlaceholder(item: ListItem<T>, expanded: boolean) {
		let children = item.children
		if (children && children.length > 0) {
			return html`
				<div class='list-toggle-placeholder'
					@click.stop=${() => this.toggleExpanded(item.value!)}
				>
					<Icon .icon=${expanded ? IconTriangleDown : IconTriangleRight} .size="inherit" />
				</div>
			`
		}
		else {
			return html`<div class='list-toggle-placeholder' />`
		}
	}

	protected renderIcon(item: ListItem<T>) {
		if (item.icon === undefined) {
			return null
		}

		return html`
			<div class='list-icon'>
				<lu:if ${item.icon}>
					<Icon .icon=${item.icon!} .size="inherit" />
				</>
			</div>
		`
	}

	protected renderTooltip(item: ListItem<T>): RenderResultRenderer | undefined {
		return item.tooltip
	}

	protected renderContextmenu(_item: ListItem<T>): RenderResultRenderer {
		return null
	}

	/** 
	 * Render item content, can be overwritten for sub classes
	 * who know about more details about data items.
	 */
	protected renderItemContent(item: ListItem<T>): RenderResult {
		return html`
			<div class="list-content">
				${this.renderText(item)}
			</div>
		`
	}

	/** Render text content within each list item. */
	protected renderText(item: ListItem<T>): RenderResult | undefined {
		if (this.textRenderer) {
			return this.textRenderer(item)
		}
		else {
			return item.text
		}
	}

	protected renderSelectedIcon(item: ListItem<T>) {
		if (!this.hasSelected(item.value!)) {
			return null
		}

		return html`
			<Icon class="list-selected-icon" .icon=${IconChecked} .size="inherit" />
		`
	}

	protected renderSubsection(item: ListItem<T>, expanded: boolean) {
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
	protected hasSelected(value: T): boolean {
		return this.selected.includes(value)
	}

	/** Whether an item has been expanded.  */
	protected hasExpanded(value: T): boolean {
		return this.expanded.includes(value)
	}

	/** Toggle expanded state. */
	protected toggleExpanded(value: T) {
		if (this.hasExpanded(value)) {
			this.expanded.splice(this.expanded.indexOf(value), 1)
		}
		else {
			this.expanded.push(value)
		}

		this.latestExpandedOrCollapsed = value
	}

	/** Do selection or navigation. */
	protected onClickItem(this: List, item: ListItem<T>) {
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
	 */
	async scrollSelectedToStart(gap?: number, duration?: number, easing?: PerFrameTransitionEasingName): Promise<boolean> {
		if (this.selected.length !== 1) {
			return false
		}

		let el = this.el.querySelector('.list-item.selected') as HTMLElement | null
		if (!el) {
			let selected = this.selected[0]
			let itemPath = this.findItemPathsTo(selected)
			if (!itemPath) {
				return false
			}
			
			if (!await this.ensureItemPathsRendered(itemPath)) {
				return false
			}

			el = this.el.querySelector('.list-item.selected') as HTMLElement | null
		}
		
		if (el) {
			return DOMScroll.scrollToStart(el, null, gap, duration, easing)
		}
		else {
			return false
		}
	}

	/** 
	 * If get contained in a scroller, scroll to view first selected item.
	 * Returns a promise which will be resolved after scrolling end,
	 * and resolve by whether scrolled.
	 */
	async scrollSelectedToView(gap?: number, duration?: number, easing?: PerFrameTransitionEasingName): Promise<boolean> {
		let el = this.el.querySelector('.list-item.selected') as HTMLElement | null
		if (!el) {
			let selected = this.selected[0]
			let itemPath = this.findItemPathsTo(selected)
			if (!itemPath) {
				return false
			}
			
			if (!await this.ensureItemPathsRendered(itemPath)) {
				return false
			}

			el = this.el.querySelector('.list-item.selected') as HTMLElement | null
		}

		if (el) {
			return DOMScroll.scrollToView(el, null, gap, duration, easing)
		}
		else {
			return false
		}
	}

	private async ensureItemPathsRendered(itemPaths: ItemPath<T>[]): Promise<boolean> {

		// Expand all but not last.
		if (this.expandByItemPaths(itemPaths)) {
			await untilChildUpdateComplete(this)
		}

		return await this.ensureEachItemPathRendered(this.el, 0, itemPaths)
	}

	private async ensureEachItemPathRendered(el: HTMLElement, depth: number, itemPaths: ItemPath<T>[]): Promise<boolean> {
		let {index} = itemPaths[depth]
		let childItemContainer: HTMLElement | null = null

		let partialRepeatEl = el.querySelector(`:scope > .list-partial-repeat`)
		if (partialRepeatEl) {
			let partialRepeat = PartialRepeat.from(partialRepeatEl)
			if (partialRepeat) {
				await partialRepeat.toRenderItemAtIndex(index, 'start')
				childItemContainer = partialRepeat.getElementAtIndex(index) ?? null
			}
		}
		else {
			childItemContainer = el.children[index] as HTMLElement | null
		}

		if (depth === itemPaths.length - 1) {
			return true
		}

		let childSubsection = childItemContainer?.querySelector(':scope > .list-subsection') as HTMLElement | null | undefined
		if (!childSubsection) {
			return false
		}

		return await this.ensureEachItemPathRendered(childSubsection, depth + 1, itemPaths)
	}

	/** Looking for the all the ancestral list items for specified value. */
	findItemPathsTo(value: T): ItemPath<T>[] | undefined {
		for (let {path, dir} of this.walkForItemPath()) {
			if (path.item.value === value) {
				return [...dir, path]
			}
		}

		return undefined
	}

	/** Walk for item and path. */
	protected *walkForItemPath(): Iterable<{path: ItemPath<T>, dir: ItemPath<T>[]}> {
		return yield* this.walkItemsForItemPath(this.data, [])
	}

	/** Walk for item and path. */
	protected *walkItemsForItemPath(items: ListItem<T>[], paths: ItemPath<T>[]): Iterable<{path: ItemPath<T>, dir: ItemPath<T>[]}> {
		for (let index = 0; index < items.length; index++) {
			let item = items[index]

			let path: ItemPath<T> = {
				item,
				index,
			}

			yield {path, dir: paths}

			if (item.children) {
				let childPaths = [...paths, path]
				yield* this.walkItemsForItemPath(item.children, childPaths)
			}
		}
	}

	/** 
	 * Expand item, and all of it's ancestors recursively.
	 * This method will not visit dom properties, so no need update complete.
	 * Note this method will walk all data items recursively.
	 * Returns whether expanded state changed.
	 */
	expandDeeply(value: T): boolean {
		let itemPaths = this.findItemPathsTo(value)
		if (!itemPaths) {
			return false
		}

		return this.expandByItemPaths(itemPaths)
	}

	/** Returns whether expanded state changed. */
	protected expandByItemPaths(itemPaths: ItemPath<T>[]): boolean {
		let expandedChanged = false

		for (let index = 0; index < itemPaths.length - 1; index++) {
			let item = itemPaths[index].item
			if (!this.hasExpanded(item.value!)) {
				this.expanded.push(item.value!)
				expandedChanged = true
			}
		}

		return expandedChanged
	}

	protected lastKeyComeFrom: HTMLElement | null = null

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
	protected keyNavigateByEvent(e: KeyboardEvent) {

		// Prevent being captured by outer component.
		e.stopPropagation()

		let key = EventKeys.getShortcutKey(e)

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
				if (item && !this.hasExpanded(item.value!) && item.children) {
					this.toggleExpanded(item.value!)
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