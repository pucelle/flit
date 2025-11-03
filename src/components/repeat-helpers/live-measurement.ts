import {barrierDOMReading, ValueListUtils} from '@pucelle/ff'
import {PartialMeasurement, UnCoveredDirection} from './partial-measurement'


interface LatestOnlyPlaceholderProperties {

	/** Latest start index when last time cache placeholder. */
	startIndex: number

	/** Latest end index when last time cache placeholder. */
	endIndex: number

	/** Latest average item size when last time cache placeholder. */
	itemSize: number

	/** Latest data count when last time cache placeholder. */
	dataCount: number

	/** Latest only placeholder size when last time cache placeholder. */
	size: number
}


/**
 * It help to do measurement for LiveRenderer,
 * and cache latest render results for them.
 * And help to assist next time rendering.
 */
export class LiveMeasurement extends PartialMeasurement {

	/** 
	 * If provided, it specifies the suggested end position of each item,
	 * to indicate the base size of each item.
	 * The size has no need to represent real size,
	 * only represents the mutable part would be enough.
	 * Which means: can ignores shared paddings or margins.
	 */
	private preEndPositions: number[] | null = null

	/** 
	 * The only placeholder properties.
	 * Readonly outside.
	 */
	onlyPlaceholderProperties: LatestOnlyPlaceholderProperties = {
		startIndex: 0,
		endIndex: 0,
		itemSize: 0,
		dataCount: 0,
		size: 0,
	}

	/** Directly set but not read scroller size. */
	setScrollerSize(size: number) {
		this.scrollerSize = size
	}

	/** Set `preEndPositions` before updating. */
	setPreEndPositions(positions: number[] | null) {
		this.preEndPositions = positions
	}

	override calcScrollPosition(index: number, alignAt: 'start' | 'end'): number {
		if (this.preEndPositions) {
			if (alignAt === 'start') {
				let start = index > 0 ? this.preEndPositions[index - 1] : 0
				return start
			}
			else {
				let end = index > 0 ? this.preEndPositions[index - 1] : 0
				return end
			}
		}
		else {
			if (alignAt === 'start') {
				return this.getItemSize() * index
			}
			else {
				return this.getItemSize() * index + this.scrollerSize
			}
		}
	}

	override async calcStartIndexByScrolled(): Promise<number> {
		await barrierDOMReading()

		let scrolled = this.doa.getScrolled(this.scroller)

		if (this.preEndPositions) {
			let startIndex = ValueListUtils.binaryFindInsertIndex(this.preEndPositions, scrolled)
			return startIndex
		}
		else {
			let itemSize = this.getItemSize()
			let startIndex = itemSize > 0 ? Math.floor(scrolled / itemSize) : 0

			return startIndex
		}
	}

	/** Update current slider positions. */
	protected override updateSliderProperties(startIndex: number, endIndex: number, sliderClientSize: number) {
		this.sliderProperties.startIndex = startIndex
		this.sliderProperties.endIndex = endIndex

		// offsetTop = top + marginTop, here ignores margin top.
		this.sliderProperties.startOffset = this.doa.getOffset(this.slider, this.scroller)
		this.sliderProperties.endOffset = this.sliderProperties.startOffset + sliderClientSize
	}

	/** 
	 * Not like two placeholders as pair which should always to be updated,
	 * An only placeholder has no need to update at most time,
	 * Only when scrolling down and item size changed much, need to update.
	 */
	shouldUpdateOnlyPlaceholderSize(endIndex: number, dataCount: number): boolean {

		// Data count get changed.
		if (dataCount !== this.onlyPlaceholderProperties.dataCount) {
			return true
		}

		// Normally a line appears.
		let newItemSize = this.getItemSize()
		if (Math.abs(newItemSize - this.onlyPlaceholderProperties.itemSize) > 10) {
			return true
		}

		// When scrolling up, no need to update.
		let scrollingDown = endIndex > this.onlyPlaceholderProperties.endIndex
		if (!scrollingDown) {
			return false
		}

		let newPlaceholderSize = this.calcOnlyPlaceholderSize(dataCount)
		let guessSizeAfterEnd = newPlaceholderSize - this.sliderProperties.endOffset
		let currentSizeAfterEnd = this.onlyPlaceholderProperties.size - this.sliderProperties.endOffset
		let sizeChangedMuch = Math.abs(guessSizeAfterEnd - currentSizeAfterEnd) / Math.max(guessSizeAfterEnd, currentSizeAfterEnd) > 0.333

		return sizeChangedMuch
	}

	/** Calculate the only placeholder size */
	calcOnlyPlaceholderSize(dataCount: number): number {
		if (this.preEndPositions) {
			let end = this.preEndPositions.length > 0 ? this.preEndPositions[this.preEndPositions.length - 1] : 0
			return end
		}

		let itemSize = this.getItemSize()
		let positionProperties = this.sliderProperties

		// Can reuse previous measured end slider position properties.
		if (positionProperties.endIndex <= dataCount
			&& positionProperties.endIndex > 0
			&& positionProperties.endOffset > 0
		) {
			return this.sliderProperties.endOffset + itemSize * (dataCount - positionProperties.endIndex)
		}

		// Can reuse previous measured start slider position properties.
		if (positionProperties.startIndex <= dataCount
			&& positionProperties.startIndex > 0
			&& positionProperties.startOffset > 0
		) {
			return this.sliderProperties.startOffset + itemSize * (dataCount - positionProperties.startIndex)
		}

		return itemSize * dataCount
	}

	/** Cache placeholder size and other properties. */
	cachePlaceholderProperties(startIndex: number, endIndex: number, dataCount: number, size: number) {
		this.onlyPlaceholderProperties = {
			startIndex,
			endIndex,
			itemSize: this.getItemSize(),
			dataCount,
			size,
		}
	}

	/** Check cover situation and decide where to render more contents. */
	async checkUnCoveredDirectionWithEdgeCases(startIndex: number, endIndex: number, dataCount: number): Promise<UnCoveredDirection | null> {
		await barrierDOMReading()

		let scrollerSize = this.doa.getClientSize(this.scroller)
		let sliderSize = this.doa.getClientSize(this.slider)
		let scrolled = this.doa.getScrolled(this.scroller)
		let sliderStart = this.sliderProperties.startOffset - scrolled
		let sliderEnd = sliderStart + sliderSize
		let unexpectedScrollStart = scrolled === 0 && startIndex > 0

		let unexpectedScrollEnd = scrolled + scrollerSize === this.doa.getScrollSize(this.scroller)
			&& endIndex < dataCount

		// No intersection, reset indices by current scroll position.
		let hasNoIntersection = sliderEnd < 0 || sliderStart > scrollerSize
		if (hasNoIntersection) {
			return 'break'
		}

		// Can't cover and need to render more items at top/left.
		else if (sliderStart - 1 > 0 || unexpectedScrollStart) {
			return 'start'
		}

		// Can't cover and need to render more items at bottom/right.
		else if (sliderEnd + 1 < scrollerSize || unexpectedScrollEnd) {
			return 'end'
		}

		// No need to render more.
		return null
	}
}