import {PartialRendererSizeStat} from './partial-renderer-size-stat'
import {DirectionalOverflowAccessor} from './directional-overflow-accessor'
import {binaryFindInsertIndexWithAdditionSize} from './binary-find'


export type UnCoveredSituation =
	'start'				// Not fully covered at start
	| 'end'				// Not fully covered at end
	| 'quarterly-start'	// Has less than 1/4 rest at start
	| 'quarterly-end'	// Has less than 1/4 rest at end
	| 'break'			// Have no intersection, ust re-render totally by current scroll position.


interface LatestPlaceholderProperties {

	/** Latest end index when last time measure placeholder. */
	endIndex: number

	/** Latest average item size when last time measure placeholder. */
	itemSize: number

	/** Latest data count when last time measure placeholder. */
	dataCount: number

	/** Latest placeholder size. */
	placeholderSize: number
}


/** Indicates a continuous render range. */
interface ContinuousRenderRange {
	startIndex: number
	endIndex: number
	startPosition: number
	endPosition: number
}


/**
 * It help to do measurement for PartialRenderer,
 * and cache latest render result of a partial renderer.
 * And help to assist next time rendering.
 * 
 * It only get dom properties, never set.
 */
export class PartialRendererMeasurement {

	private readonly scroller: HTMLElement
	private readonly slider: HTMLElement

	/** Do rendered item size statistic, guess item size. */
	private readonly stat: PartialRendererSizeStat = new PartialRendererSizeStat()

	/** Help to get and set based on overflow direction. */
	private readonly doa: DirectionalOverflowAccessor

	/** Indicates a continuous render range to make it more precisely to compute item size. */
	private continuousRenderRange: ContinuousRenderRange | null = null
	
	/** 
	 * If provided, it specifies the suggested end position,
	 * to indicate the size of each item.
	 * The size has no need to represent real size,
	 * only represents the mutable part would be enough.
	 * Which means: can ignores shared paddings or margins.
	 */
	private preEndPositions: number[] | null = null

	/** Do additional item size statistic, guess additional item size. */
	private preAdditionalStat: PartialRendererSizeStat | null = null

	/** 
	 * Latest properties use when last time measure placeholder,
	 * thus, can avoid update placeholder when scrolling up.
	 */
	cachedPlaceholderProperties: LatestPlaceholderProperties = {
		endIndex: 0,
		itemSize: 0,
		dataCount: 0,
		placeholderSize: 0,
	}

	/** 
	 * Latest scroller size.
	 * Readonly outside.
	 */
	cachedScrollerSize: number = 0

	/** 
	 * Latest top/left position of slider, update it before or after every time rendered.
	 * Readonly outside.
	 */
	cachedSliderStartPosition: number = 0

	/** 
	 * Latest bottom/right position of slider, update it before or after every time rendered.
	 * Readonly outside.
	 */
	cachedSliderEndPosition: number = 0

	constructor(
		scroller: HTMLElement,
		slider: HTMLElement,
		doa: DirectionalOverflowAccessor
	) {
		this.scroller = scroller
		this.slider = slider
		this.doa = doa
	}

	/** Set `preEndPositions` before updating. */
	setPreEndPositions(positions: number[] | null) {
		this.preEndPositions = positions

		if (positions && !this.preAdditionalStat) {
			this.preAdditionalStat = new PartialRendererSizeStat()
		}
		else if (!positions && this.preAdditionalStat) {
			this.preAdditionalStat = null
		}
	}

	/** Set new slider position. */
	cacheSliderPosition(position: number, alignDirection: 'start' | 'end') {
		if (alignDirection === 'start') {
			this.cachedSliderStartPosition = position
		}
		else {
			this.cachedSliderEndPosition = position
		}
	}

	/** Read new scroller size. */
	readScrollerSize() {
		this.cachedScrollerSize = this.doa.getClientSize(this.scroller)
	}

	/* Whether has measured. */
	hasMeasured(): boolean {
		return this.getItemSize() > 0
	}

	/** Get item size. */
	private getItemSize(): number {
		return this.stat.getLatestSize()
	}

	/** 
	 * Get safe render count of items to render.
	 * If `proposed` specified, and finally render count close to it, will use it.
	 */
	getSafeRenderCount(reservedPixels: number, proposed: number): number {
		if (this.cachedScrollerSize === 0) {
			return 1
		}

		let itemSize = this.getItemSize()
		if (itemSize === 0) {
			return 1
		}

		// Because normally can scroll twice per frame.
		let totalSize = this.cachedScrollerSize + reservedPixels
		let minimumCount = this.cachedScrollerSize / itemSize
		let count = totalSize / itemSize

		if (Math.abs(count - proposed) < 0.5 && proposed > minimumCount) {
			return proposed
		}

		return Math.ceil(totalSize / itemSize)
	}

	/** Calc new slider position by start and end indices. */
	calcSliderPositionByIndex(startOrEndIndex: number, alignDirection: 'start' | 'end') {
		if (this.preEndPositions) {
			let preAdditionalSize = this.preAdditionalStat!.getLatestSize()

			if (alignDirection === 'start') {
				let start = startOrEndIndex > 0 ? this.preEndPositions[startOrEndIndex - 1] : 0
				return start + preAdditionalSize * startOrEndIndex
			}
			else {
				let end = startOrEndIndex > 0 ? this.preEndPositions[startOrEndIndex - 1] : 0
				return end + preAdditionalSize * startOrEndIndex
			}
		}
		else {
			if (alignDirection === 'start') {
				return this.getItemSize() * startOrEndIndex
			}
			else {
				return this.getItemSize() * startOrEndIndex + this.cachedScrollerSize
			}
		}
	}

	/** Calc new start index by current scrolled position. */
	calcStartIndexByScrolled() {
		let scrolled = this.doa.getScrolled(this.scroller)

		if (this.preEndPositions) {
			let preAdditionalSize = this.preAdditionalStat!.getLatestSize()
			let index = binaryFindInsertIndexWithAdditionSize(this.preEndPositions, preAdditionalSize, scrolled)

			return index
		}
		else {
			let itemSize = this.getItemSize()
			let startIndex = itemSize > 0 ? Math.floor(scrolled / itemSize) : 0

			return startIndex
		}
	}

	/** If re-render from a new index, call this. */
	breakContinuousRenderRange() {
		this.continuousRenderRange = null
	}

	/** Every time after update complete, do measurement. */
	measureAfterRendered(startIndex: number, endIndex: number, alignDirection: 'start' | 'end') {
		let sliderInnerSize = this.doa.getInnerSize(this.slider)
		let sliderClientSize = this.doa.getClientSize(this.slider)
		let paddingSize = sliderClientSize - sliderInnerSize

		if (alignDirection === 'start') {
			this.cachedSliderEndPosition = this.cachedSliderStartPosition + sliderClientSize
		}
		else {
			this.cachedSliderStartPosition = this.cachedSliderEndPosition - sliderClientSize
		}

		if (this.continuousRenderRange) {
			if (startIndex <= this.continuousRenderRange.startIndex) {
				this.continuousRenderRange.startIndex = startIndex
				this.continuousRenderRange.startPosition = this.cachedSliderStartPosition
			}

			if (endIndex >= this.continuousRenderRange.endIndex) {
				this.continuousRenderRange.endIndex = endIndex
				this.continuousRenderRange.endPosition = this.cachedSliderEndPosition
			}
		}
		else {
			this.continuousRenderRange = {
				startIndex,
				endIndex,
				startPosition: this.cachedSliderStartPosition,
				endPosition: this.cachedSliderEndPosition
			}
		}

		let renderCount = this.continuousRenderRange.endIndex - this.continuousRenderRange.startIndex
		let renderSize = this.continuousRenderRange.endPosition - this.continuousRenderRange.startPosition - paddingSize

		// Avoid update when hidden.
		if (renderCount > 0 && renderSize > 0) {
			this.stat.update(renderCount, renderSize, true)
		}

		if (renderCount > 0 && this.preEndPositions) {
			let start = startIndex > 0 ? this.preEndPositions[startIndex - 1] : 0
			let end = endIndex > 0 ? this.preEndPositions[endIndex - 1] : 0

			this.preAdditionalStat!.update(renderCount, sliderInnerSize - (end - start), false)
		}
	}

	/** 
	 * Whether should update placeholder size.
	 * When scrolling down and item size changed much, need to update.
	 */
	shouldUpdatePlaceholderSize(startIndex: number, endIndex: number, dataCount: number): boolean {

		// Data count get changed.
		if (dataCount !== this.cachedPlaceholderProperties.dataCount) {
			return true
		}

		// When scrolling up, not update.
		let scrollingDown = endIndex > this.cachedPlaceholderProperties.endIndex
		if (!scrollingDown) {
			return false
		}

		let newPlaceholderSize = this.calcPlaceholderSize(startIndex, endIndex, dataCount, 'start')
		let guessSizeAfterEnd = newPlaceholderSize - this.cachedSliderEndPosition
		let currentSizeAfterEnd = this.cachedPlaceholderProperties.placeholderSize - this.cachedSliderEndPosition
		let sizeChangedMuch = Math.abs(guessSizeAfterEnd - currentSizeAfterEnd) / Math.max(guessSizeAfterEnd, currentSizeAfterEnd) > 0.333

		return sizeChangedMuch
	}

	/** 
	 * Calculate height/width of placeholder progressively.
	 * When scrolling down, and will render more items in the end, update size.
	 * No need to update when scrolling up.
	 */
	calcPlaceholderSize(startIndex: number, endIndex: number, dataCount: number, alignDirection: 'start' | 'end') {
		if (this.preEndPositions) {
			let end = this.preEndPositions.length > 0 ? this.preEndPositions[this.preEndPositions.length - 1] : 0
			let additionalItemSize = this.preAdditionalStat!.getLatestSize()

			return end + additionalItemSize * dataCount
		}
		else {
			let itemSize = this.getItemSize()
	
			// If has measured before.
			if (this.cachedPlaceholderProperties.itemSize > 0) {
				if (alignDirection === 'start') {
					return itemSize * (dataCount - startIndex) + this.cachedSliderStartPosition
				}
				else {
					return itemSize * (dataCount - endIndex) + this.cachedSliderEndPosition
				}
			}
			else {
				return itemSize * dataCount
			}
		}
	}

	/** Cache placeholder size and other properties. */
	cachePlaceholderProperties(endIndex: number, dataCount: number, placeholderSize: number) {
		this.cachedPlaceholderProperties = {
			endIndex,
			itemSize: this.stat.getLatestSize(),
			dataCount,
			placeholderSize,
		}
	}

	/** Check cover situation and decide where to render more contents. */
	checkUnCoveredSituation(startIndex: number, endIndex: number, dataCount: number, scrollDirection: 'start' | 'end' | null): UnCoveredSituation | null {
		let scrollerSize = this.doa.getClientSize(this.scroller)
		let sliderSize = this.doa.getClientSize(this.slider)
		let scrolled = this.doa.getScrolled(this.scroller)
		let sliderStart = this.cachedSliderStartPosition - scrolled
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

		// Has less than 1/4 rest at start
		else if (-sliderStart * 4 < sliderSize - scrollerSize) {
			if (scrollDirection === 'start' && startIndex > 0) {
				return 'quarterly-start'
			}
		}

		// Has less than 1/4 rest at end
		else if ((sliderEnd - scrollerSize) * 4 < sliderSize - scrollerSize) {
			if (scrollDirection === 'end' && endIndex < dataCount) {
				return 'quarterly-end'
			}
		}

		// No need to render more.
		return null
	}
}