import {Component, css, html, RenderResult, TemplateResult} from '@pucelle/lupos.js'
import {Store} from '../data'
import {effect, LayoutWatcher, Observed, PerFrameTransitionEasingName, TransitionResult} from '@pucelle/ff'
import {ColumnWidthResizer} from './table-helpers/column-width-resizer'
import {RemoteStore} from '../data/remote-store'
import {LiveRepeat} from './live-repeat'
import {Repeat} from './repeat'
import {AsyncLiveRepeat} from './live-repeat-async'
import {Icon} from './icon'


export interface TableEvents<T> {

	/** After column order get changed. */
	'order-change': (columnName: string | null, orderDirection: 'asc' | 'desc' | null) => void

	/** Triggers after live data get updated on live mode. */
	'live-updated': (data: T[], scrollDirection: 'start' | 'end' | null) => void
}


export interface TableColumn<T = any> {

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
}


/** 
 * `<Table>` works just like a HTML Element `<table>`,
 * it renders rows and columns by provided data items.
 * 
 * - `columns` provides data column mode for table view.
 * - `store` provides data service and also data filtering and data ordering.
 */
export class Table<T = any, E = {}> extends Component<TableEvents<T> & E> {

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
			margin-right: -0.5em;

			&.current{
				visibility: visible;
			}
		}

		.table-resizer{
			position: relative;
			z-index: 1;
			width: 17px;
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

			&:last-child .table-cell{
				border-bottom-color: transparent;
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
	* Rate of how many items to render compare with the minimum items that can cover scroll viewport.
	* Works only when `live` is `true`.
	* See `LiveRepeat.coverageRate` for more info.
	*/
	coverageRate: number = 1.5

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
	 * Help to resize column widths when `resizable` is `true`.
	 * Get updated of columns config get changed.
	 * Must get it after render completed.
	 */
	protected columnResizer: ColumnWidthResizer | null = null

	/** Help to watch size of current element. */
	protected sizeWatcher!: LayoutWatcher<"size">

	/** Repeat component used. */
	protected repeatComponent!: Repeat<T> | LiveRepeat<T> | AsyncLiveRepeat<T>

	/** The start index of the first item. */
	get startIndex(): number {
		if (!this.live) {
			return 0
		}

		return (this.repeatComponent as LiveRepeat<T>).startIndex
	}

	/** The end slicing index of the live data. */
	get endIndex(): number {
		if (!this.live) {
			return 0
		}

		return (this.repeatComponent as LiveRepeat<T>).endIndex
	}

	/** 
	 * Live data, rendering part of all the data.
	 * If uses remote store, live data items may be `null`.
	 */
	get liveData(): (T | null)[] {
		if (!this.live) {
			return this.repeatComponent.data as T[]
		}

		return (this.repeatComponent as LiveRepeat<T>).liveData
	}

	/** 
	 * Apply properties to resizer after properties change,
	 * and also update column widths.
	 */
	@effect
	protected applyColumnResizerProperties() {
		this.columnResizer?.update(this.columns, this.minColumnWidth)
		this.columnResizer?.updateColumnWidths()
	}

	protected onCreated() {
		super.onCreated()
		this.sizeWatcher = new LayoutWatcher(this.el, 'size', this.onSizeChange, this)
	}

	protected onConnected() {
		super.onConnected()
		this.sizeWatcher.watch()
	}

	protected onWillDisconnect() {
		this.sizeWatcher.unwatch()
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
		<template class="table">
			<div class="table-head">
				<div class="table-columns">
					${this.renderColumns()}
				</div>
			</div>

			<div class="table-body">
				<table class="table-table">
					<colgroup>
						${this.columns.map(column => html`
							<col :style.text-align=${column.align || ''} />
						`)}
					</colgroup>
					${this.renderRows()}
				</table>
			</div>
		</template>
		`
	}

	protected renderColumns(): TemplateResult[] {
		return this.columns.map((column, index) => this.renderColumn(column, index))
	}

	protected renderColumn(column: Observed<TableColumn>, index: number) {
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
		</div>`
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
				<AsyncLiveRepeat tagName="tbody" :ref=${this.repeatComponent}
					.coverageRate=${this.coverageRate}
					.renderFn=${this.renderRow.bind(this)}
					.scrollerSelector=".table-body"
					.dataLoader=${(this.store as RemoteStore).dataLoader}
					@freshly-updated=${this.onLiveDataUpdated}
				/>
			`
		}
		else if (this.live) {
			return html`
				<LiveRepeat tagName="tbody" :ref=${this.repeatComponent}
					.coverageRate=${this.coverageRate}
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
					:ref=${this.repeatComponent}
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
		index += this.startIndex

		let tds = this.columns.map(column => {
			let result = column.renderer ? column.renderer.call(this, item, index) : '\xa0'

			return html`
				<td class="table-cell"
					:style.text-align=${column.align || ''}
				>
					${result}
				</td>
			`
		})

		return html`<tr class="table-row">${tds}</tr>`
	}

	/** Triggers `liveDataUpdated` event. */
	protected onLiveDataUpdated(this: Table) {
		let repeat = this.repeatComponent as LiveRepeat | AsyncLiveRepeat
		let data = repeat.liveData as T[]
		let scrollDirection = repeat.scrollDirection
		this.fire('live-updated', data, scrollDirection)
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

	/** Order specified column with specified direction by column name. */
	@effect
	protected applyOrderToStore() {
		let column = this.columns.find((c, index) => this.getColumnName(c, index) === this.orderName)

		if (this.store instanceof RemoteStore) {
			this.store.orderName = this.orderName
		}
		else {
			this.store.order = column?.orderBy ?? this.orderName
		}

		this.store.orderDirection = this.orderDirection
	}

	/** Locate start or end index at which the item is visible in viewport. */
	locateVisibleIndex(direction: 'start' | 'end'): number {
		return this.repeatComponent.locateVisibleIndex(direction)
	}

	/** 
	 * Scroll the closest viewport, make the element at this index to be scrolled to the topmost
	 * or leftmost of the whole scroll viewport.
	 * Returns a promise, be resolved after scroll transition end, by whether scrolled.
	 */
	async scrollIndexToStart(index: number, gap?: number, duration?: number, easing?: PerFrameTransitionEasingName): Promise<boolean> {
		return this.repeatComponent.scrollIndexToStart(index, gap, duration, easing)
	}

	/** 
	 * Scroll the closest viewport for minimum, make the element at this index to be scrolled into viewport.
	 * Returns a promise, be resolved after scroll transition end, by whether scrolled.
	 */
	async scrollIndexToView(index: number, gap?: number, duration?: number, easing?: PerFrameTransitionEasingName): Promise<boolean> {
		return this.repeatComponent.scrollIndexToView(index, gap, duration, easing)
	}
}
