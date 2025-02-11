import {DOMEvents, DOMUtils, ListUtils, Observed, untilReadComplete, untilUpdateComplete, ValueListUtils} from '@pucelle/ff'
import type {TableColumn} from '../table'
import {html, render} from '@pucelle/lupos.js'


/** For `<f-table>` to resize column widths. */
export class ColumnWidthResizer {

	/** Head container. */
	readonly head: HTMLTableSectionElement

	/** Column container inside head. */
	readonly columnContainer: HTMLElement

	/** Colgroup inside table. */
	readonly colgroup: HTMLTableColElement
	
	/** Table column configuration. */
	columns!: Observed<TableColumn[]>

	/** Minimum column width in pixels. */
	minColumnWidth!: number


	/** Whether column resized. */
	private columnResized: boolean = false

	/** Column widths array. */
	private columnWidths: number[] | null = null

	/** Column widths array when resizing. */
	private resizingColumnWidths: number[] | null = null

	/** Class name of resizing mask element. */
	private resizingMaskClassName: string

	constructor(
		head: HTMLTableSectionElement,
		columnContainer: HTMLElement,
		colgroup: HTMLTableColElement,
		resizingMaskClassName: string
	) {
		this.head = head
		this.columnContainer = columnContainer
		this.colgroup = colgroup
		this.resizingMaskClassName = resizingMaskClassName
	}

	/** Update properties from <Table>. */
	update(columns: TableColumn[], minColumnWidth: number) {
		this.columns = columns
		this.minColumnWidth = minColumnWidth
	}

	/** 
	 * Update column widths from column configuration.
	 * Will check available column width and may cause page reflow.
	 */
	async updateColumnWidths() {

		// Now can read dom properties.
		await untilUpdateComplete()
		
		let headAvailableWidth = this.head.clientWidth
			- DOMUtils.getNumericStyleValue(this.head, 'paddingLeft')
			- DOMUtils.getNumericStyleValue(this.head, 'paddingRight')

		// Now can write dom properties.
		await untilReadComplete()

		this.updateColumnWidthsByAvailable(headAvailableWidth)
	}

	/** Update column widths after knows available head width. */
	private updateColumnWidthsByAvailable(availableWidth: number) {
		let widthAndFlexArray = this.columns.map((column: TableColumn, index) => {
			let {flex, width} = column
			let baseWidthInColumnConfig = Math.max(width || 0, this.minColumnWidth)

			// If column resized, we use the column width percentage to calculate new column width.
			let baseWidth = this.columnResized ? this.columnWidths![index] : baseWidthInColumnConfig
			let extendFlex = 0
			let shrinkFlex = 0

			if (Array.isArray(flex)) {
				extendFlex = flex[0] ?? 0
				shrinkFlex = flex[1] ?? extendFlex
			}
			else {
				extendFlex = shrinkFlex = flex ?? 0
			}

			return [baseWidth, extendFlex, shrinkFlex]
		}) as [number, number, number][]
		
		let widths = this.calcColumnWidths(widthAndFlexArray, availableWidth, this.minColumnWidth)
		this.columnWidths = widths
		this.setColumnWidths(widths)
	}

	/**
	 * Calculate column widths from `[baseWidth, extendFlex, shrinkFlex]` values in column config.
	 * The algorithm is nearly same with the flex layout,
	 * except that the total column widths will always equal the available client width,
	 * and no column width should less than `minColumnWidth`.
	 */
	private calcColumnWidths(widthAndFlexArray: [number, number, number][], clientWidth: number, minColumnWidth: number): number[] {

		// Not enough space for even `minColumnWidth`, then average `clientWidth` to each column.
		if (clientWidth < minColumnWidth * widthAndFlexArray.length) {
			return ListUtils.repeatForTimes(clientWidth / widthAndFlexArray.length, widthAndFlexArray.length)
		}

		let totalBaseWidth = 0
		let totalExtendFlex = 0
		let totalShrinkFlex = 0
		let widths = ListUtils.repeatForTimes(minColumnWidth, widthAndFlexArray.length)
		let excludedIndexSet: Set<number> = new Set()

		for (let [baseWidth, extendFlex, shrinkFlex] of widthAndFlexArray) {
			totalBaseWidth += baseWidth
			totalExtendFlex += extendFlex
			totalShrinkFlex += shrinkFlex
		}

		// If no `flex` set for any column, set `flex` to `1` for all the columns.
		if (totalExtendFlex === 0) {
			totalExtendFlex = widthAndFlexArray.length
			widthAndFlexArray.forEach(a => a[1] = 1)
		}

		if (totalShrinkFlex === 0) {
			totalShrinkFlex = widthAndFlexArray.length
			widthAndFlexArray.forEach(a => a[2] = 1)
		}

		// May need to be adjusted for multiple times because of the existing of minimum column width.
		while (true) {
			let totalFlex = clientWidth >= totalBaseWidth ? totalExtendFlex : totalShrinkFlex
			let widthPerFlex = (clientWidth - totalBaseWidth) / totalFlex
			let moreColumnExcluded = false

			for (let index = 0; index < widthAndFlexArray.length; index++) {
				if (excludedIndexSet.has(index)) {
					continue
				}

				let [baseWidth, extendFlex, shrinkFlex] = widthAndFlexArray[index]
				let flex = widthPerFlex >= 0 ? extendFlex : shrinkFlex
				let width = flex * widthPerFlex + baseWidth

				if (width < minColumnWidth) {
					clientWidth -= minColumnWidth
					totalBaseWidth -= minColumnWidth
					totalExtendFlex -= flex
					excludedIndexSet.add(index)
					moreColumnExcluded = true
				}
				else {
					widths[index] = width
				}
			}

			if (!moreColumnExcluded) {
				break
			}
		}

		let diff = 0
		
		for (let i = 0; i < widths.length - 1; i++) {
			let width = widths[i]
			let roundedWidth = Math.round(width)

			widths[i] = roundedWidth
			diff += roundedWidth - width
		}

		widths[widths.length - 1] -= diff

		return widths
	}

	private setColumnWidths(widths: number[]) {
		let totalWidth = ValueListUtils.sum(widths)
		
		// Leave last column not set width.
		for (let i = 0; i < widths.length - 1; i++) {
			let width = widths[i]
			let percent = width / totalWidth
			let col = this.colgroup.children[i] as HTMLElement
			let headCol = this.columnContainer.children[i] as HTMLElement

			if (this.columns[i].flex) {
				headCol.style.width = col.style.width = percent * 100 + '%'
			}
			else {
				headCol.style.width = col.style.width = width + 'px'
			}
		}
	}

	/** Called after mouse down at column resizer. */
	onStartResize(e: MouseEvent, index: number) {
		let startX = e.clientX

		let onMouseMove = (e: MouseEvent) => {
			e.preventDefault()
			this.resizeColumnByMovementX(e.clientX - startX, index)
		}

		let onMouseUp = () => {
			if (this.resizingColumnWidths) {
				this.columnWidths = this.resizingColumnWidths
				this.resizingColumnWidths = null
			}

			DOMEvents.off(document, 'mousemove', onMouseMove as (e: Event) => void)
			cursorMask.remove()
			this.columnResized = true
		}

		let cursorMask = render(html`<div class="${this.resizingMaskClassName}" />`)
		cursorMask.appendTo(document.body)

		DOMEvents.on(document, 'mousemove', onMouseMove as (e: Event) => void)
		DOMEvents.once(document, 'mouseup', onMouseUp)
	}

	private resizeColumnByMovementX(movementX: number, index: number) {
		let widths = [...this.columnWidths!]
		let needShrink = Math.abs(movementX)
		let moveLeft = movementX < 0
		let expandIndex = moveLeft ? index + 1 : index
		let firstShrinkIndex = moveLeft ? index : index + 1

		// When move to left, we reduce the width of current and previous columns until the `minWidth`,
		// then we add the reduced width to next column.

		// When move to right, we reduce the width of next columns until the `minWidth`,
		// then we add the reduced width to current column.
		for (let i = firstShrinkIndex; (moveLeft ? i >= 0 : i < this.columns.length) && needShrink > 0; moveLeft ? i-- : i++) {
			let width = widths[i]
			let shrink = needShrink

			if (width - shrink < this.minColumnWidth) {
				shrink = width - this.minColumnWidth
			}

			widths[i] -= shrink
			widths[expandIndex] += shrink	// index <= column count - 2
			needShrink -= shrink
		}

		this.resizingColumnWidths = widths
		this.setColumnWidths(widths)
	}
}

