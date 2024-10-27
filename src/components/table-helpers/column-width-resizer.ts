import {getStyleValueAsNumber, repeatForTimes, sum} from '@pucelle/ff'
import {html, off, on, once, render} from '@pucelle/flit'
import type {TableColumn} from '../table'


/** For `<f-table>` to resize column widths. */
export class ColumnWidthResizer {

	/** Head container. */
	protected readonly head: HTMLTableSectionElement

	/** Column container inside head. */
	protected readonly columnContainer: HTMLElement

	/** Colgroup inside table. */
	protected readonly colgroup: HTMLTableColElement
	
	/** Table column configuration. */
	protected columns: TableColumn[]

	/** Column widths array. */
	protected columnWidths: number[] | null = null

	/** Column widths array when resizeing. */
	protected resizingColumnWidths: number[] | null = null

	/** Whether column resized. */
	protected columnResized: boolean = false

	/** Cached head client width. */
	protected cachedHeadClientWidth: number = 0

	/** Minimum column width in pixels. */
	protected minColumnWidth: number

	/** Class name of resizing mask element. */
	protected resizingMaskClassName: string

	constructor(
			head: HTMLTableSectionElement,
			columnContainer: HTMLElement,
			colgroup: HTMLTableColElement,
			columns: TableColumn[],
			minColumnWidth: number,
			resizingMaskClassName: string
		) {
		this.head = head
		this.columnContainer = columnContainer
		this.colgroup = colgroup
		this.columns = columns
		this.minColumnWidth = minColumnWidth
		this.resizingMaskClassName = resizingMaskClassName
	}

	/** Update column configuration. */
	setColumns(columns: TableColumn[]) {
		this.columns = columns
	}

	/** Update column configuration. */
	setMinColumnWidth(minColumnWidth: number) {
		this.minColumnWidth = minColumnWidth
	}

	/** 
	 * Update column widths from column configuration.
	 * Will check available column width and may cause page reflow.
	 */
	updatColumnWidthsPrecisely() {
		let headClientWidth = this.head.clientWidth - getStyleValueAsNumber(this.head, 'paddingLeft') - getStyleValueAsNumber(this.head, 'paddingRight')
		this.cachedHeadClientWidth = headClientWidth
		this.updatColumnWidthsByAvailableWidth(headClientWidth)
	}

	/** A quick method to update column widths when knows head width is not adjusted. */
	updatColumnWidthsRoughly() {
		this.updatColumnWidthsByAvailableWidth(this.cachedHeadClientWidth)
	}

	/** Update column widths after knows available head width. */
	protected updatColumnWidthsByAvailableWidth(availableWidth: number) {
		let widthAndFlexArray = this.columns.map(({flex, width}, index) => {
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
	protected calcColumnWidths(widthAndFlexArray: [number, number, number][], clientWidth: number, minColumnWidth: number): number[] {
		// Not enough space for even `minColumnWidth`, then average `clientWidth` to each column.
		if (clientWidth < minColumnWidth * widthAndFlexArray.length) {
			return repeatForTimes(clientWidth / widthAndFlexArray.length, widthAndFlexArray.length)
		}

		let totalBaseWidth = 0
		let totalExtendFlex = 0
		let totalShrinkFlex = 0
		let widths = repeatForTimes(minColumnWidth, widthAndFlexArray.length)
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

		return widths
	}

	protected setColumnWidths(widths: number[]) {
		let totalWidth = sum(widths)
		
		for (let index = 0; index < widths.length; index++) {
			let isLastColumn = index === widths.length - 1
			let percent = widths[index] / totalWidth
			let col = this.colgroup.children[index] as HTMLElement

			col.style.width = percent * 100 + '%'

			if (!isLastColumn) {
				let col = this.columnContainer.children[index] as HTMLElement
				col.style.width = percent * 100 + '%'
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

			off(document, 'mousemove', onMouseMove as (e: Event) => void)
			cursorMask.remove()
			this.columnResized = true
		}

		let cursorMask = render(html`<div class="${this.resizingMaskClassName}" />`).getFirstElement() as HTMLElement
		document.body.append(cursorMask)

		on(document, 'mousemove', onMouseMove as (e: Event) => void)
		once(document, 'mouseup', onMouseUp)
	}

	protected resizeColumnByMovementX(movementX: number, index: number) {
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

