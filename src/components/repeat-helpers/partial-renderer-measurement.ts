import {PartialRendererSizeStat} from './partial-renderer-size-stat'
import {DirectionalOverflowAccessor} from './directional-overflow-accessor'
import {binaryFindInsertIndexWithAdditionSize} from './binary-find'


export type UnCoveredSituation =
	'start'				// Not fully covered at start
	| 'end'				// Not fully covered at end
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

interface LatestSliderPositionProperties {

	/** Latest start index when last time updating. */
	startIndex: number

	/** Latest end index when last time updating. */
	endIndex: number

	/** 
	 * Latest top/left position of slider, update it before or after every time rendered.
	 * Readonly outside.
	 */
	startPosition: number

	/** 
	 * Latest bottom/right position of slider, update it before or after every time rendered.
	 * Readonly outside.
	 */
	endPosition: number
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
	 * Latest scroller size.
	 * Readonly outside.
	 */
	scrollerSize: number = 0

	/** 
	 * Latest placeholder properties use when last time measure placeholder,
	 * thus, can avoid update placeholder when scrolling up.
	 */
	latestPlaceholderProperties: LatestPlaceholderProperties = {
		endIndex: 0,
		itemSize: 0,
		dataCount: 0,
		placeholderSize: 0,
	}

	/** 
	 * Latest slider position properties use when last time updating,
	 * thus, can reuse it to do continuous layout measurement.
	 */
	latestSliderPositionProperties: LatestSliderPositionProperties = {
		startIndex: 0,
		endIndex: 0,
		startPosition: 0,
		endPosition: 0,
	}

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
	cacheSliderPosition(index: number, position: number, alignDirection: 'start' | 'end') {
		if (alignDirection === 'start') {
			this.latestSliderPositionProperties.startIndex = index
			this.latestSliderPositionProperties.startPosition = position
		}
		else {
			this.latestSliderPositionProperties.endIndex = index
			this.latestSliderPositionProperties.endPosition = position
		}
	}

	/** Read new scroller size. */
	readScrollerSize() {
		this.scrollerSize = this.doa.getClientSize(this.scroller)
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
		if (this.scrollerSize === 0) {
			return 1
		}

		let itemSize = this.getItemSize()
		if (itemSize === 0) {
			return 1
		}

		// Because normally can scroll twice per frame.
		let totalSize = this.scrollerSize + reservedPixels
		let minimumCount = this.scrollerSize / itemSize
		let count = totalSize / itemSize

		if (Math.abs(count - proposed) < 0.5 && proposed > minimumCount) {
			return proposed
		}

		return Math.ceil(totalSize / itemSize)
	}

	/** Calc new slider position by start and end indices. */
	calcSliderPositionByIndex(startOrEndIndex: number, alignDirection: 'start' | 'end'): number {
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
				return this.getItemSize() * startOrEndIndex + this.scrollerSize
			}
		}
	}

	/** Calc new start index by current scrolled position. */
	calcStartIndexByScrolled(): number {
		let scrolled = this.doa.getScrolled(this.scroller)

		if (this.preEndPositions) {
			let preAdditionalSize = this.preAdditionalStat!.getLatestSize()
			let startIndex = binaryFindInsertIndexWithAdditionSize(this.preEndPositions, preAdditionalSize, scrolled)

			return startIndex
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

		// Measure for unknown end position.
		if (alignDirection === 'start') {
			this.latestSliderPositionProperties.endIndex = endIndex
			this.latestSliderPositionProperties.endPosition = this.latestSliderPositionProperties.startPosition + sliderClientSize
		}
		else {
			this.latestSliderPositionProperties.startIndex = startIndex
			this.latestSliderPositionProperties.startPosition = this.latestSliderPositionProperties.endPosition - sliderClientSize
		}

		if (this.continuousRenderRange) {
			if (startIndex <= this.continuousRenderRange.startIndex) {
				this.continuousRenderRange.startIndex = startIndex
				this.continuousRenderRange.startPosition = this.latestSliderPositionProperties.startPosition
			}

			if (endIndex >= this.continuousRenderRange.endIndex) {
				this.continuousRenderRange.endIndex = endIndex
				this.continuousRenderRange.endPosition = this.latestSliderPositionProperties.endPosition
			}
		}
		else {
			this.continuousRenderRange = {
				startIndex,
				endIndex,
				startPosition: this.latestSliderPositionProperties.startPosition,
				endPosition: this.latestSliderPositionProperties.endPosition
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
	shouldUpdatePlaceholderSize(endIndex: number, dataCount: number): boolean {

		// Data count get changed.
		if (dataCount !== this.latestPlaceholderProperties.dataCount) {
			return true
		}

		// When scrolling up, not update.
		let scrollingDown = endIndex > this.latestPlaceholderProperties.endIndex
		if (!scrollingDown) {
			return false
		}

		let newPlaceholderSize = this.calcPlaceholderSize(dataCount)
		let guessSizeAfterEnd = newPlaceholderSize - this.latestSliderPositionProperties.endPosition
		let currentSizeAfterEnd = this.latestPlaceholderProperties.placeholderSize - this.latestSliderPositionProperties.endPosition
		let sizeChangedMuch = Math.abs(guessSizeAfterEnd - currentSizeAfterEnd) / Math.max(guessSizeAfterEnd, currentSizeAfterEnd) > 0.333

		return sizeChangedMuch
	}

	/** 
	 * Calculate height/width of placeholder progressively.
	 * When scrolling down, and will render more items in the end, update size.
	 * No need to update when scrolling up.
	 */
	calcPlaceholderSize(dataCount: number) {
		if (this.preEndPositions) {
			let end = this.preEndPositions.length > 0 ? this.preEndPositions[this.preEndPositions.length - 1] : 0
			let additionalItemSize = this.preAdditionalStat!.getLatestSize()

			return end + additionalItemSize * dataCount
		}

		let itemSize = this.getItemSize()
		let positionProperties = this.latestSliderPositionProperties

		// Can reuse previous measured end slider position properties.
		if (positionProperties.endIndex <= dataCount
			&& positionProperties.endIndex > 0
			&& positionProperties.endPosition > 0
		) {
			return this.latestSliderPositionProperties.endPosition + itemSize * (dataCount - positionProperties.endIndex)
		}

		// Can reuse previous measured start slider position properties.
		if (positionProperties.startIndex <= dataCount
			&& positionProperties.startIndex > 0
			&& positionProperties.startPosition > 0
		) {
			return this.latestSliderPositionProperties.startPosition + itemSize * (dataCount - positionProperties.startIndex)
		}

		return itemSize * dataCount
	}

	/** Cache placeholder size and other properties. */
	cachePlaceholderProperties(endIndex: number, dataCount: number, placeholderSize: number) {
		this.latestPlaceholderProperties = {
			endIndex,
			itemSize: this.stat.getLatestSize(),
			dataCount,
			placeholderSize,
		}
	}

	/** Check cover situation and decide where to render more contents. */
	checkUnCoveredSituation(startIndex: number, endIndex: number, dataCount: number): UnCoveredSituation | null {
		let scrollerSize = this.doa.getClientSize(this.scroller)
		let sliderSize = this.doa.getClientSize(this.slider)
		let scrolled = this.doa.getScrolled(this.scroller)
		let sliderStart = this.latestSliderPositionProperties.startPosition - scrolled
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