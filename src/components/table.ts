import {Component, css, html, TemplateResult} from '@pucelle/lupos.js'
import {theme} from '../style'
import {Store} from '../data'
import {DOMScroll, ListUtils} from '@pucelle/ff'
import {ColumnWidthResizer} from './table-helpers/column-width-resizer'
import {RemoteStore} from '../data/remote-store'
import {TableStateCacher, TableStateOptions} from './table-helpers/table-state'


export interface TableEvents<T> {

	/** After column order get changed. */
	'order-change': (columnName: string, orderDirection: 'asc' | 'desc' | '') => void

	/** Triggers after live data get updated on live mode. */
	'live-updated': (data: T[], startIndex: number, scrollDirection: 'up' | 'down' | null) => void
}


export interface TableColumn<T = any> {

	/** 
	 * Give name to each column can help to remember last ordered columns, and restore it from storage.
	 * If not provided, uses `orderBy` instead.
	 */
	name: string

	/** Column title. */
	title: TemplateResult | string

	/** Column basis width. */
	width?: number

	/** 
	 * Column flex width, just like flex grow and shrink.
	 * Can be a number, or a pair of number values `[extendFlex, shrinkFlex]`.
	 */
	flex?: number | number[]

	/** 
	 * Returns the value used for ordering, must be specified as a string type key when using `RemoteStore`.
	 * Implies column is not orderable if not configured.
	 */
	orderBy?: ((item: T) => string | number | null | undefined) | string | ListUtils.Order<T>

	/** If specified as `true`, will using `desc` ordering as default. */
	descFirst?: boolean

	/** Returns cell text content string or html`<td>...</td>`. */
	render?: (this: Table<T>, item: T, index: number) => TemplateResult | string | number

	/** 
	 * Specifies cell content alignment.
	 * Note if you choose to overwrite `renderRow`, this option gona not work any more,
	 * you must specify `text-align` for cells manually.
	 */
	align?: 'left' | 'right' | 'center'
}


/** 
 * `<Table>` works just like a HTML Element `<table>`,
 * it renders rows and columns by provided data items.
 * `columns` configs data column mode for table view.
 * `store` provides data service and also data filtering and data ordering.
 */
export class Table<T = any, E = {}> extends Component<TableEvents<T> & E> {

	static style() {
		let {mainColor, textColor, backgroundColor} = theme
		let scrollbarWidth = DOMScroll.getScrollbarWidth()

		return css`
		.table{
			display: flex;
			flex-direction: column;
			height: 200px;
		}

		.table-head{
			padding-right: ${scrollbarWidth}px;
			color: ${textColor.toIntermediate(0.2)};
			font-size: 0.928em;
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
			padding: 0 0.6em;
			border-bottom: 1px solid ${backgroundColor.toIntermediate(0.2)};

			&:last-child{
				flex: 1;
				min-width: 0;
				padding-right: ${scrollbarWidth}px;
				margin-right: -${scrollbarWidth}px;
			}
		}

		.table-column-left{
			display: flex;
			flex: 1;
			max-width: 100%;

			&:hover .table-order{
				display: flex;
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
			margin-right: 0.6em;	// Gives 16 - 8 = 8px as cell padding-right.
			display: none;

			f-icon{
				margin: auto;
			}

			&.current{
				display: flex;
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
				background: ${backgroundColor.toIntermediate(0.2)};
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
			border-bottom: 1px solid ${backgroundColor.toIntermediate(0.13)};
		}

		.table-table{
			table-layout: fixed;
			position: absolute;
			width: 100%;
		}

		.table-row{
			&:hover{
				background: ${mainColor.alpha(0.05)};
			}

			&.selected{
				background: ${mainColor.alpha(0.1)};
			}

			&:last-child .table-col{
				border-bottom-color: transparent;
			}
		}

		.table-col{
			vertical-align: middle;
			padding: 0.2em 0.6em;
			border-bottom: 1px solid ${backgroundColor.toIntermediate(0.13)};
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			cursor: default;
		}

		.table-resizer-mask{
			position: fixed;
			z-index: 9999;
			left: 0;
			right: 0;
			top: 0;
			bottom: 0;
			cursor: ew-resize;
		}
		`
	}

	/** 
	 * If `true`, will only render the rows that in viewport.
	 * Default value is `false`.
	 * Implies to be `true` when uses `RemoteStore`.
	 */
	live: boolean = false

	/**
	 * Item count in one page that should be rendered each time.
	 * Works only when `live` is `true`.
	 * Default value is `50`, set it smaller if don't need to render so much.
	 * Suggested to be large enough to cover table height, but not covers more than 2x of table height.
	 * Otherwise it should provide more than 120px scrolling buffer height more than table height.
	 */
	renderCount: number = 50

	/** If what you are rendering is very complex and can't complete in one animation frame, set this to `true`. */
	preRendering: boolean = false

	/** 
	 * Whether each column is resizeable.
	 * Default value is `false`.
	 */
	resizable: boolean = false

	/** Store to cache data. */
	store!: S

	/** Column configuration, you must set this! */
	columns!: TableColumn<T>[]

	/** Minimum column width in pixels. */
	minColumnWidth: number = 64

	/** Transition for each row after created or removed. */
	transition: ContextualTransitionOptions | undefined = undefined

	/** Column name to indicate which column is in order. */
	protected orderName: string | null = null

	/** Current column order direction. */
	protected orderDirection: 'asc' | 'desc' | '' = ''

	/** 
	 * Repeat directive inside, only available when `live`.
	 * Ready after `ready` event.
	 */
	protected repeatDir!: LiveRepeatDirective<T> | LiveAsyncRepeatDirective<T> | RepeatDirective<T>

	/** Resize column widths when `resizable` is `true`. */
	protected resizer: ColumnWidthResizer | null = null

	/** To cache and restore table state. */
	protected stateCacher!: TableStateCacher

	/** Whether set a first visible index and not applied yet. */
	protected firstVisibleIndexSpecified: boolean = false

	constructor(el: HTMLElement) {
		super(el)
		this.stateCacher = new TableStateCacher(this)
	}

	refElements!: {
		/** Head container. */
		head: HTMLTableSectionElement

		/** Column container inside head. */
		columnContainer: HTMLElement

		/** Table element. */
		table: HTMLTableElement

		/** Colgroup inside table. */
		colgroup: HTMLTableColElement
	}

	/** If specified, it's returned result will be used to overwrite `column`. */
	protected getColumns(): TableColumn[] | null {
		return null
	}

	protected onCreated() {
		this.store.on('dataChange', this.onStoreDataChange, this)

		this.watchImmediately(() => this.getColumns(), columns => {
			if (columns) {
				this.columns = columns
			}
		})
	}

	protected onStoreDataChange() {
		if (this.repeatDir instanceof LiveAsyncRepeatDirective) {
			this.repeatDir.reload()
		}
	}

	protected render(): TemplateResult {
		return html`
			<div class="head" :refElement="head">
				<div class="columns" :refElement="columnContainer">
					${this.renderColumns()}
				</div>
			</div>

			<div class="body">
				<table class="table" :refElement="table">
					<colgroup :refElement="colgroup">
						${this.columns.map(column => html`
							<col :style.text-align=${column.align || ''} />
						`)}
					</colgroup>
					${this.renderRows()}
				</table>
			</div>
		`
	}

	protected renderColumns(): TemplateResult[] {
		return this.columns.map((column, index) => {
			let orderName = column.name
			let isOrdered = this.orderName === orderName
			let flexAlign = column.align === 'right' ? 'flex-end' : column.align === 'center' ? 'center' : ''

			return html`
			<div class="column"
				:class.column-ordered=${isOrdered}
				@click=${(e: MouseEvent) => this.doOrdering(e, index)}
			>
				<div class="column-left" :style.justify-content=${flexAlign}>
					<div class="column-title">${column.title}</div>
					${column.orderBy ? html`
						<div class="order" :class.current=${isOrdered && this.orderDirection !== ''}>
							<f-icon .type=${this.getOrderDirectionIcon(orderName)} />
						</div>`
					: ''}
				</div>

				${this.resizable && index < this.columns.length - 1 ? html`
					<div class="resizer" @mousedown=${(e: MouseEvent) => this.resizer?.onStartResize(e, index)} />`
				: ''}
			</div>`
		})
	}

	protected renderRows(): DirectiveResult {
		if (this.store instanceof RemoteStore) {
			return refDirective(liveAsyncRepeat(
				this.store.getLiveAsyncRepeatDirectiveOptions(),
				this.renderRow.bind(this),
				{
					renderCount: this.renderCount,
					preRendering: this.preRendering,
				},
				this.transition,
			), this.refDirective.bind(this))
		}
		else if (this.live) {
			return refDirective(liveRepeat(
				(this.store as Store).getCurrentData(),
				this.renderRow.bind(this),
				{
					renderCount: this.renderCount,
					preRendering: this.preRendering,
				},
				this.transition
			), this.refDirective.bind(this))
		}
		else {
			return refDirective(repeat(
				(this.store as Store).getCurrentData(),
				this.renderRow.bind(this),
				this.transition
			), this.refDirective.bind(this))
		}
	}

	/** 
	 * How to render each row.
	 * You should define a new component and overwrite this method if want to do more customized rendering.
	 */
	protected renderRow(item: T | null, index: number): TemplateResult {
		let tds = this.columns.map((column) => {
			let result = item && column.render ? column.render.call(this, item, index) : '\xa0'
			return html`<td :style.text-align=${column.align || ''}>${result}</td>`
		})

		return html`<tr>${tds}</tr>`
	}

	/** Reference repeat directive, only for once. */
	protected refDirective(dir: Directive) {
		this.repeatDir = dir as (LiveRepeatDirective<T> | LiveAsyncRepeatDirective<T>)

		if ((this.repeatDir instanceof LiveRepeatDirective) || (this.repeatDir as any instanceof LiveAsyncRepeatDirective)) {
			this.repeatDir.on('liveDataUpdated', this.onLiveDataUpdated, this)
			this.repeatDir.on('liveDataRendered', this.onLiveDataRendered, this)
		}
	}

	/** Triggers `liveDataUpdated` event. */
	protected onLiveDataUpdated(this: Table, data: T[], index: number, scrollDirection: 'up' | 'down' | null) {
		this.emit('liveDataUpdated', data, index, scrollDirection)
	}

	/** Triggers `liveDataRendered` event. */
	protected onLiveDataRendered(this: Table, data: T[], index: number, scrollDirection: 'up' | 'down' | null) {
		this.emit('liveDataRendered', data, index, scrollDirection)
	}

	/** Get order icon to indicate order direction. */
	protected getOrderDirectionIcon(orderName: string): string {
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

	/** Do column ordering for column with specified index. */
	protected doOrdering(e: MouseEvent, index: number) {
		// Clicked column resizer.
		if ((e.target as HTMLElement).closest(this.scopeClassName('.resizer'))) {
			return
		}

		let columns = this.columns
		let column = columns[index]

		// Column is not orderable.
		let canOrder = !!column.orderBy
		if (!canOrder) {
			return
		}

		let direction: 'asc' | 'desc' | '' = ''
		let descFirst = column.descFirst
		let columnName = column.name

		if (columnName === this.orderName) {
			if (descFirst) {
				direction = this.orderDirection === '' ? 'desc' : this.orderDirection === 'desc' ? 'asc' : ''
			}
			else {
				direction = this.orderDirection === '' ? 'asc' : this.orderDirection === 'asc' ? 'desc' : ''
			}
		}
		else {
			direction = descFirst ? 'desc' : 'asc'
		}

		this.setOrder(columnName, direction)
	}

	protected onReady() {
		this.resizer = new ColumnWidthResizer(
			this.refElements.head,
			this.refElements.columnContainer,
			this.refElements.colgroup,
			this.columns,
			this.minColumnWidth,
			this.scopeClassName('resizing-mask')
		)

		this.watch(() => observeGetting(this, 'columns'), async (columns: TableColumn[]) => {
			this.resizer?.setColumns(columns)

			// Here we need it render new `<col>`s.
			await untilRenderComplete()
			this.resizer?.updatColumnWidthsPrecisely()
		})
		
		onRenderComplete(() => {
			this.resizer?.updatColumnWidthsPrecisely()
		})
	}

	protected onConnected(this: Table) {
		onRenderComplete(() => {
			let unwatchSize = watchLayout(this.el, 'size', () => this.resizer?.updatColumnWidthsPrecisely())
			this.once('disconnected', unwatchSize)
		})
	}

	/** Order specified column by column name. */
	setOrder(columnName: string | null, direction: 'asc' | 'desc' | '' = '') {
		this.orderName = columnName
		this.orderDirection = direction

		let column = this.columns?.find(col => col.name === columnName)
		if (column) {
			this.applyOrder(column, direction)
		} 
		else {
			this.watchOnce(() => this.columns, columns => {
				let column = columns.find(col => col.name === columnName)
				if (column) {
					this.applyOrder(column, direction)
				}
			})
		}
	}

	/** Clear column order. */
	clearOrder() {
		this.orderName = null
		this.orderDirection = ''
		this.store.setOrder(null)
		this.store.sync()
	}

	/** Order specified column with specified direction by column name. */
	protected applyOrder(this: Table, column: TableColumn, direction: 'asc' | 'desc' | '' = '') {
		if (column.orderBy && direction !== '') {
			this.store.setOrder(column.orderBy as any, direction)
		}
		else {
			this.store.setOrder(null)
		}

		this.store.sync()
		this.emit('orderChange', this.orderName!, direction)
	}

	/** Column name to indicate which column is in order. */
	getOrderName(): string | null {
		return this.orderName
	}

	/** Current column order direction. */
	getOrderDirection(): '' | 'asc' | 'desc' {
		return this.orderDirection
	}

	/** Get start index of live data in live mode, otherwise returns `0`. */
	protected getStartIndex() {
		if (this.repeatDir instanceof RepeatDirective) {
			return 0
		}
		else {
			return this.repeatDir?.getStartIndex() ?? 0
		}
	}

	/** Get end index of live data in live mode, otherwise returns data length. */
	protected getEndIndex() {
		if (this.repeatDir instanceof RepeatDirective) {
			return (this.store as Store).getCurrentData().length
		}
		else {
			return this.repeatDir.getEndIndex() ?? (this.store as Store).getFullData().length
		}
	}

	/** 
	 * Set start index property, and scroll to appropriate position.
	 * You can safely call this before any thing rendered.
	 * Note the final `startIndex` property may be different, 
	 * and you can't ensure the element is this index is visible.
	 */
	async setStartIndex(index: number) {
		await this.untilReady()

		if (this.repeatDir instanceof LiveRepeatDirective || this.repeatDir instanceof LiveAsyncRepeatDirective) {
			this.repeatDir.setStartIndex(index)
		}
		else {
			this.repeatDir.setFirstVisibleIndex(index)
		}
	}

	/** Whether specifies a start index. */
	isStartIndexSpecified() {
		if (this.repeatDir instanceof LiveRepeatDirective || this.repeatDir instanceof LiveAsyncRepeatDirective) {
			return this.repeatDir.isStartIndexSpecified()
		}
		else {
			return false
		}
	}

	/** 
	 * Adjust `startIndex` and scroll position to make item in the specified index becomes visible if it's not.
	 * Returns whether find the element in specified index.
	 */
	async makeIndexVisible(index: number): Promise<boolean> {
		await this.untilReady()
		return this.repeatDir.makeIndexVisible(index)
	}

	/** 
	 * Make item in the specified index becomes visible at the top scroll position.
	 * Returns whether find the element in specified index.
	 * You can safely call this before any thing rendered.
	 */
	async setFirstVisibleIndex(index: number): Promise<boolean> {
		this.firstVisibleIndexSpecified = true
		
		await this.untilReady()
		let setResult = await this.repeatDir.setFirstVisibleIndex(index)

		this.firstVisibleIndexSpecified = false

		return setResult
	}

	/** Returns whether set a first visible index and not applied yet. */
	isFirstVisibleIndexSpecified(): boolean {
		return this.firstVisibleIndexSpecified
	}

	/** 
	 * Get the index of the first visible element.
	 * Must after first time rendered.
	 */
	getFirstVisibleIndex() {
		if (this.repeatDir instanceof LiveRepeatDirective || this.repeatDir instanceof LiveAsyncRepeatDirective) {
			return this.repeatDir.getFirstVisibleIndex()
		}
		else {
			return locateFirstVisibleIndex(this.refElements.table, this.refElements.table.rows)
		}
	}

	/** 
	 * Get currently rendered data item at specified index.
	 * Returns null if it's not rendered yet.
	 */
	getRenderedItem(index: number): T | null {
		let isRendered = index >= this.getStartIndex() && index < this.getEndIndex()
		if (isRendered) {
			if (this.store instanceof RemoteStore) {
				return this.store.getImmediateData(index, index + 1)[0]
			}
			else {
				return (this.store as Store).getCurrentData()[index]
			}
		}
		else {
			return null
		}
	}

	/** 
	 * Get rendered row at specified index.
	 * Please makesure rendering is completed.
	 */
	getRenderedRow(index: number): HTMLTableRowElement | null {
		return this.refElements.table.rows[index - this.getStartIndex()] || null
	}

	/** Checks whether have state cached in a specified name. */
	hasState(name: string): boolean {
		return this.stateCacher.has(name)
	}

	/** 
	 * Caches a state includes order, filter, startIndex...
	 * Remember the `name` must be unique for each table instance.
	 */
	cacheState(name: string, options: TableStateOptions = {}) {
		this.stateCacher.cache(name, options)
	}

	/** 
	 * Restore table state by it's cached name.
	 * Returns customized data with `{}` as default value if restored successfully,
	 * Returns `undefined` if have no cache to restore.
	 * Will clear the cache after restored.
	 */
	restoreState(name: string): object | undefined {
		return this.stateCacher.restore(name)
	}

	/** Clear cached state with specified name. */
	clearState(name: string) {
		this.stateCacher.clear(name)
	}
}
