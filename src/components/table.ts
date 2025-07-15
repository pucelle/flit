import {Component, css, html, RenderResult, TemplateResult, PerFrameTransitionEasingName, TransitionResult} from '@pucelle/lupos.js'
import {Store} from '../data'
import {DOMEvents, effect, Observed} from '@pucelle/lupos'
import {ResizeWatcher, Selections, sleep} from '@pucelle/ff'
import {ColumnWidthResizer} from './table-helpers/column-width-resizer'
import {RemoteStore} from '../data/remote-store'
import {LiveRepeat} from './repeat-live'
import {Repeat} from './repeat'
import {AsyncLiveRepeat} from './repeat-live-async'
import {Icon} from './icon'
import {RectSelection} from './rect-selection'


export interface TableEvents {

	/** After column order get changed. */
	'order-change': (columnName: string | null, orderDirection: 'asc' | 'desc' | null) => void

	/** Triggers after live data get updated on live mode. */
	'live-updated': () => void
}


export interface TableColumn<T = any> extends Observed {

	/** 
	 * Give a unique name to each column can help to identify current column.
	 * If omitted, use `column_index` instead.
	 */
	name?: string

	/** Column title, must provided. */
	title: TemplateResult | string

	/** 
	 * Column basis width.
	 * I omit, 
	 */
	width?: number

	/** 
	 * Column flex value, just like flex grow or shrink of flex layout.
	 * Can be a number, or a pair of `[extendFlex, shrinkFlex]`.
	 */
	flex?: number | [number, number]

	/** 
	 * An order by function to return the value used for ordering,
	 * or a string which is the key of data items.
	 * It must be specified as a string key when work with `RemoteStore`.
	 * Implies column is not orderable if this option is omitted.
	 */
	orderBy?: ((item: T) => string | number | null | undefined) | string

	/**
     * Whether enables numeric sorting.
     * Can only apply on string type data value.
     * Default value is false.
     */
	orderNumeric?: boolean

	/**
	  * Whether disables case sensitivity.
	  * Can only apply on string type data value.
	  */
	orderIgnoreCase?: boolean

	/** If specified as `true`, will use `desc` order ahead of `asc` when doing ordering. */
	descFirst?: boolean

	/** 
	 * Renderer to render each cell of current column.
	 * It should render content like html`<td>...</td>`.
	 */
	renderer?: (this: Table<T>, item: T, index: number) => RenderResult

	/** 
	 * Specifies cell content alignment.
	 * Note if you choose to overwrite `renderRow`, this option gonna not work any more,
	 * you must specify `text-align` for cells manually.
	 */
	align?: 'left' | 'right' | 'center'

	/** Class name that will apply to table cell. */
	className?: string
}


/** 
 * `<Table>` works just like a HTML Element `<table>`,
 * it renders rows and columns by provided data items.
 * 
 * - `columns` provides data column mode for table view.
 * - `store` provides data service and also data filtering and data ordering.
 */
export class Table<T = any, E = {}> extends Component<TableEvents & E> {

	static style = css`
		.table{
			display: flex;
			flex-direction: column;
			height: 200px;
		}

		.table-head{
			padding-right: 8px;
			color: color-mix(in srgb, var(--text-color) 70%, var(--background-color));;
			font-weight: bold;
			user-select: none;
		}

		.table-columns{
			display: flex;
			height: 100%;
		}

		.table-column{
			position: relative;
			display: flex;
			align-items: stretch;
			font-size: 0.928em;
			padding: 0.2em 0.6em;
			border-bottom: 1px solid color-mix(in srgb, var(--text-color) 20%, var(--background-color));;

			&:last-child{
				flex: 1;
				min-width: 0;
				padding-right: 8px;
				margin-right: -8px;
			}
		}

		.table-column-left{
			display: flex;
			flex: 1;
			max-width: 100%;

			&:hover .table-order{
				visibility: visible;
			}
		}

		.table-column-title{
			flex: 0 1 auto;
			min-width: 0;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.table-column-ordered{
			border-bottom-color: #888;
		}

		.table-resizable .table-column-title{
			flex: 1;
		}

		.table-order{
			width: 1.2em;
			flex: none;
			display: flex;
			visibility: hidden;
			margin-right: -1.2em;

			&.current{
				visibility: visible;
			}
		}

		.table-resizer{
			position: relative;
			z-index: 1;
			width: 1.2em;
			margin-left: auto;
			margin-right: -1.2em;
			cursor: e-resize;

			&::before{
				content: '';
				position: absolute;
				left: 8px;
				top: 6px;
				bottom: 6px;
				width: 1px;
				background: color-mix(in srgb, var(--text-color) 20%, var(--background-color));
			}
		}

		.table-scroller{
			flex: 1;
			overflow-y: scroll;
			overflow-x: hidden;
		}

		.table-body{
			flex: 1;
			overflow-y: scroll;
			overflow-x: hidden;
			position: relative;
			border-bottom: 1px solid color-mix(in srgb, var(--text-color) 10%, var(--background-color));
		}

		.table-table{
			table-layout: fixed;
			position: absolute;
			width: 100%;
		}

		.table-row{
			&:hover{
				background: light-dark(
					color-mix(in srgb, var(--primary-color) 2.5%, var(--background-color)),
					color-mix(in srgb, var(--primary-color) 5%, var(--background-color))
				);
			}

			&.selected{
				background: color-mix(in srgb, var(--primary-color) 10%, var(--background-color));
			}
		}

		.table-cell{
			vertical-align: middle;
			padding: 0.4em 0.6em;
			border-bottom: 1px solid color-mix(in srgb, var(--text-color) 5%, var(--background-color));;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			cursor: default;
		}

		.table-resizing-mask{
			position: fixed;
			z-index: 9999;
			left: 0;
			right: 0;
			top: 0;
			bottom: 0;
			cursor: ew-resize;
		}
	`


	/** 
	 * If `true`, will only render the rows that appear in the viewport.
	 * Default value is `false`.
	 * Omit as `true` when work with `RemoteStore`.
	 */
	live: boolean = false

	/**
	* How many pixels to reserve to reduce update frequency when scrolling.
	* On Windows, scroll for 100px each time.
	* So `200px` is a reasonable value.
	* For larger area scrolling, you may set this value to `500~600`.
	*/
	reservedPixels: number = 200

	/** 
	 * Whether each column width can be resized.
	 * Default value is `false`.
	 */
	resizable: boolean = false

	/** 
	 * Store to cache data.
	 * Can either be a normal store, or a remote store.
	 */
	store!: Store | RemoteStore

	/** Table column configuration, must be provided. */
	columns!: TableColumn<T>[]

	/** Minimum column width in pixels. */
	minColumnWidth: number = 48

	/** Transition for each row to play after inserted or before removed. */
	rowTransition: TransitionResult | null = null

	/** Column name to indicate which column has get ordered. */
	orderName: string | null = null

	/** Current column order direction. */
	orderDirection: 'asc' | 'desc' | null = null

	/** 
	 * Whether can select rows.
	 * Default value is `false`.
	 */
	rowSelectable: boolean = false

	/** 
	 * Whether can select rows by rect selection.
	 * Requires `rowSelectable` to be true to work.
	 * Default value is `false`.
	 * Note recently selection can't work in remote mode.`
	 */
	rowRectSelectable: boolean = false

	/** 
	 * If specified, and select start from element match this selector,
	 * will not start selection.
	 */
	rowRectSelectionIgnoreSelector: string | null = null

	/** 
	 * Manage all selected items, exist when `rowSelectable` is true.
	 * If not assign this property, will initialize a new instance.
	 */
	selections: Selections<T> | null = null

	/** 
	 * Help to resize column widths when `resizable` is `true`.
	 * Get updated of columns config get changed.
	 * Must get it after update completed.
	 */
	protected columnResizer: ColumnWidthResizer | null = null

	/** Repeat component used. */
	protected repeatRef!: Repeat<T> | LiveRepeat<T> | AsyncLiveRepeat<T>

	/** The start row index when starting row rect selection. */
	protected rectSelectionStartRowIndex: number = 0

	/** The selection results when rect selection started. */
	protected rectStartSelections: T[] | null = null

	/** Prevent selections change when has just completed rect selection. */
	protected preventingLoseSelections: boolean = false

	/** Initialize selections if needed. */
	@effect
	protected initSelections() {
		if (this.rowSelectable && !this.selections) {
			this.selections = new Selections()
		}
	}

	/** Cancel selection when have some selections on clicking document. */
	@effect
	protected cancelSelectionOnClick() {
		if (!this.selections) {
			return
		}
		
		let hasSelected = this.selections.hasAnySelected()
		if (hasSelected) {
			DOMEvents.on(this.el, 'click', this.clearSelections, this)
		}
		else {
			DOMEvents.off(this.el, 'click', this.clearSelections, this)
		}
	}

	/** Clear all selections. */
	private clearSelections() {
		if (!this.selections) {
			return
		}

		if (!this.preventingLoseSelections) {
			this.selections.clear()
		}
	}

	/** 
	 * Apply properties to resizer after properties change,
	 * and also update column widths.
	 */
	@effect
	protected applyColumnResizerProperties() {
		this.columnResizer?.update(this.columns, this.minColumnWidth)
	}

	/** Order specified column with specified direction by column name. */
	@effect
	protected applyOrderToStore() {
		let column = this.columns.find((c, index) => this.getColumnName(c, index) === this.orderName)

		if (this.store instanceof RemoteStore) {
			if (this.orderName && this.orderDirection) {
				this.store.orderName = this.orderName
				this.store.orderDirection = this.orderDirection
			}
			else {
				this.store.orderName = null
				this.store.orderDirection = null
			}
		}
		else {
			this.store.setOrder(
				column?.orderBy ?? this.orderName,
				this.orderDirection,
				column?.orderNumeric,
				column?.orderIgnoreCase
			)
		}
	}

	/** The start index of the first item. */
	get startIndex(): number {
		if (!this.live) {
			return 0
		}

		return (this.repeatRef as LiveRepeat<T>).startIndex
	}

	/** The end slicing index of the live data. */
	get endIndex(): number {
		if (!this.live) {
			return 0
		}

		return (this.repeatRef as LiveRepeat<T>).endIndex
	}

	/** 
	 * Live data, rendering part of all the data.
	 * If uses remote store, live data items may be `null`.
	 */
	get liveData(): (T | null)[] {
		if (!this.live) {
			return this.repeatRef.data as T[]
		}

		return (this.repeatRef as LiveRepeat<T>).liveData
	}

	/** Get latest align direction. */
	get alignDirection(): 'start' | 'end' | null {
		if (!this.live) {
			return null
		}

		return (this.repeatRef as LiveRepeat<T>).alignDirection
	}

	protected onCreated() {
		super.onCreated()
	}

	protected onConnected() {
		super.onConnected()
		ResizeWatcher.watch(this.el, this.onSizeChange, this)
	}

	protected onWillDisconnect() {
		ResizeWatcher.unwatch(this.el, this.onSizeChange, this)
	}

	protected onReady() {
		this.initColumnResizer()
	}

	/** After element size change, update column widths. */
	protected onSizeChange() {
		this.columnResizer?.updateColumnWidths()
	}

	/** Initialize `columnResizer` after ready. */
	protected initColumnResizer() {
		let head = this.el.querySelector('.table-head') as HTMLTableSectionElement
		let columnContainer = this.el.querySelector('.table-columns') as HTMLElement
		let colgroup = this.el.querySelector('.table-table > colgroup') as HTMLTableColElement

		this.columnResizer = new ColumnWidthResizer(
			head,
			columnContainer,
			colgroup,
			'table-resizing-mask'
		)
	}

	protected render(): TemplateResult {
		return html`
		<template class="table" @mousedown=${this.onMouseDown}>
			${this.renderHead()}
			${this.renderBody()}
		</template>
		`
	}

	protected renderHead() {
		return html`
			<div class="table-head">
				<div class="table-columns">
					${this.renderColumns()}
				</div>
			</div>
		`
	}

	protected renderBody() {
		return html`
			<div class="table-body">
				<table class="table-table">
					<colgroup>
						${this.columns.map(column => html`
							<col :style.text-align=${column.align || ''} />
						`)}
					</colgroup>
					${this.renderRows()}
				</table>
				<lu:if ${this.rowSelectable}>
					<RectSelection
						.ignoreSelector=${this.rowRectSelectionIgnoreSelector}
						@select-started=${this.onRectSelectStarted}
						@select-ended=${this.onRectSelectEnded}
						@select-update=${this.onRectSelectUpdate}
					/>
				</lu:if>
			</div>
		`
	}

	protected renderColumns(): TemplateResult[] {
		return this.columns.map((column, index) => this.renderColumn(column, index))
	}

	protected renderColumn(column: TableColumn, index: number) {
		let orderName = this.getColumnName(column, index)
		let hasOrdered = this.orderName === orderName
		let flexAlign = column.align === 'right' ? 'flex-end' : column.align === 'center' ? 'center' : ''

		return html`
			<div class="table-column"
				:class.table-column-ordered=${hasOrdered}
				@click=${(e: MouseEvent) => this.doOrdering(e, index)}
			>
				<div class="table-column-left"
					:style.justify-content=${flexAlign}
				>
					<div class="table-column-title">
						${column.title}
					</div>

					<lu:if ${column.orderBy}>
						<div class="table-order"
							:class.current=${hasOrdered && this.orderDirection !== null}
						>
							<Icon .type=${this.renderOrderDirectionIcon(orderName!)} .size="inherit" />
						</div>
					</lu:if>
				</div>

				<lu:if ${this.resizable && index < this.columns.length - 1}>
					<div class="table-resizer"
						@mousedown=${(e: MouseEvent) => this.columnResizer!.onStartResize(e, index)}
					/>
				</lu:if>
			</div>
		`
	}

	/** Render order icon to indicate order direction. */
	protected renderOrderDirectionIcon(orderName: string): string {
		if (orderName === this.orderName) {
			if (this.orderDirection === 'asc') {
				return 'order-asc'
			}
			else if (this.orderDirection === 'desc') {
				return 'order-desc'
			}
		}

		return 'order-default'
	}

	protected renderRows() {
		if (this.store instanceof RemoteStore) {
			return html`
				<AsyncLiveRepeat tagName="tbody" :ref=${this.repeatRef}
					.reservedPixels=${this.reservedPixels}
					.renderFn=${this.renderRow.bind(this)}
					.scrollerSelector=".table-body"
					.dataLoader=${(this.store as RemoteStore).dataLoader}
					@freshly-updated=${this.onLiveDataUpdated}
				/>
			`
		}
		else if (this.live) {
			return html`
				<LiveRepeat tagName="tbody" :ref=${this.repeatRef}
					.reservedPixels=${this.reservedPixels}
					.renderFn=${this.renderRow.bind(this)}
					.data=${this.store.currentData}
					.scrollerSelector=".table-body"
					@updated=${this.onLiveDataUpdated}
				/>
			`
		}
		else {
			return html`
				<Repeat tagName="tbody" style="display: table-row-group"
					:ref=${this.repeatRef}
					.renderFn=${this.renderRow.bind(this)}
					.data=${this.store.currentData}
					.scrollerSelector=".table-body"
				/>
			`
		}
	}

	/** 
	 * How to render each row.
	 * You may define a new component and overwrite this method
	 * if want to do more customized rendering.
	 */
	protected renderRow(item: T, index: number) {
		return html`
			<tr class="table-row"
				:class.selected=${this.selections?.hasSelected(item)}
				@click=${(e: MouseEvent) => this.onClickRow(item, index, e)}
			>
				${this.renderCells(item, index)}
			</tr>
		`
	}

	/** Render all cells within a row. */
	protected renderCells(item: T, index: number) {
		index += this.startIndex

		let cells = this.columns.map(column => {
			let result = column.renderer ? column.renderer.call(this, item, index) : '\xa0'

			return html`
				<td class="table-cell"
					:class=${column.className ?? ''}
					:style.text-align=${column.align || ''}
				>
					${result}
				</td>
			`
		})

		return cells
	}

	/** Triggers `liveDataUpdated` event. */
	protected onLiveDataUpdated(this: Table) {
		this.fire('live-updated')
	}

	/** Do column ordering for column with specified index. */
	protected doOrdering(this: Table, e: MouseEvent, index: number) {

		// Clicked column resizer.
		if ((e.target as HTMLElement).closest('.resizer')) {
			return
		}

		let columns = this.columns
		let column = columns[index]

		// Column is not orderable.
		let canOrder = !!column.orderBy
		if (!canOrder) {
			return
		}

		let direction: 'asc' | 'desc' | null = null
		let descFirst = column.descFirst
		let columnName = this.getColumnName(column, index)

		if (columnName === this.orderName) {
			if (descFirst) {
				direction = this.orderDirection === null ? 'desc' : this.orderDirection === 'desc' ? 'asc' : null
			}
			else {
				direction = this.orderDirection === null ? 'asc' : this.orderDirection === 'asc' ? 'desc' : null
			}
		}
		else {
			direction = descFirst ? 'desc' : 'asc'
		}

		this.orderName = direction === null ? null : columnName
		this.orderDirection = direction

		this.fire('order-change', this.orderName, this.orderDirection)
	}

	protected getColumnName(column: TableColumn, index: number): string {
		return column.name ?? 'column_' + index
	}

	/** Prevent shift text selection. */
	protected onMouseDown(e: MouseEvent) {
		if (this.rowSelectable && e.shiftKey) {
			e.preventDefault()
		}
	}

	protected onClickRow(_item: T, index: number, e: MouseEvent) {
		if (!this.rowSelectable) {
			return
		}
			
		// Prevent clicking container to cause losing selections.
		e.stopPropagation()
		e.preventDefault()

		if (e.type === 'contextmenu') {
			let item = (this.store as Store).currentData[index]
			if (!item) {
				return
			}

			if (this.selections!.hasSelected(item)) {
				return
			}

			this.selections!.selectByMouseEvent(index, (this.store as Store).currentData, e)
		}
		else {
			this.selections!.selectByMouseEvent(index, (this.store as Store).currentData, e)
		}
	}

	protected onRectSelectStarted(startOffset: DOMPoint, e: MouseEvent) {
		this.rectSelectionStartRowIndex = this.repeatRef.getIndexAtOffset(startOffset.y)

		if (e.ctrlKey || e.shiftKey) {
			this.rectStartSelections = [...this.selections!.getSelected()]
		}
		else {
			this.rectStartSelections = []
		}
	}

	protected onRectSelectEnded() {
		this.rectStartSelections = null
		this.rectSelectionStartRowIndex = 0
		this.preventingLoseSelections = true

		sleep(0).then(() => {
			this.preventingLoseSelections = false
		})
	}

	protected onRectSelectUpdate(endOffset: DOMPoint) {
		let startRowIndex = this.rectSelectionStartRowIndex
		let endRowIndex = this.repeatRef.getIndexAtOffset(endOffset.y)

		if (startRowIndex === -1 || endRowIndex === -1) {
			return
		}

		if (startRowIndex > endRowIndex) {
			[startRowIndex, endRowIndex] = [endRowIndex, startRowIndex]
		}

		let allData = (this.store as Store).currentData
		let items = allData.slice(startRowIndex, endRowIndex + 1)

		items.push(...this.rectStartSelections!)
		this.selections!.selectOnly(...items)
	}

	/** Check whether item at specified index is rendered. */
	isIndexRendered(index: number): boolean {
		return index >= this.startIndex && index < this.endIndex
	}

	/** Check whether item at specified index is visible. */
	isIndexVisible(index: number, minimumRatio: number = 0): boolean {
		return index >= this.getStartVisibleIndex(minimumRatio)
			&& index <= this.getEndVisibleIndex(minimumRatio)
	}
	
	/** Get the index of the first visible item. */
	getStartVisibleIndex(minimumRatio: number = 0): number {
		return this.repeatRef.getStartVisibleIndex(minimumRatio)
	}

	/** Get the index after the last visible item. */
	getEndVisibleIndex(minimumRatio: number = 0): number {
		return this.repeatRef.getEndVisibleIndex(minimumRatio)
	}

	/** 
	 * Set start visible index of rendered items.
	 * The data item of this index will be renderer at the topmost or leftmost of the viewport.
	 * You can safely call this before update complete, no additional rendering will cost.
	 */
	async setStartVisibleIndex(startIndex: number) {
		if (!this.live) {
			throw new Error(`"setStartIndex(...)" only works in "live" mode.`)
		}

		if (!this.repeatRef) {
			await this.untilUpdated()
		}
		
		(this.repeatRef as LiveRepeat).setStartVisibleIndex(startIndex)
	}

	/** 
	 * Scroll the closest viewport, make the element at this index to be scrolled to the topmost
	 * or leftmost of the whole scroll viewport.
	 * Returns a promise, be resolved after scroll transition end, by whether scrolled.
	 */
	async scrollIndexToStart(index: number, gap?: number, duration?: number, easing?: PerFrameTransitionEasingName): Promise<boolean> {
		return this.repeatRef.scrollIndexToStart(index, gap, duration, easing)
	}

	/** 
	 * Scroll the closest viewport for minimum, make the element at this index to be scrolled into viewport.
	 * Returns a promise, be resolved after scroll transition end, by whether scrolled.
	 */
	async scrollIndexToView(index: number, gap?: number, duration?: number, easing?: PerFrameTransitionEasingName): Promise<boolean> {
		return this.repeatRef.scrollIndexToView(index, gap, duration, easing)
	}
}
