import {PartialRendererSizeStat} from './partial-renderer-size-stat'
import {DirectionalOverflowAccessor} from './directional-overflow-accessor'
import {barrierDOMReading, ValueListUtils} from '@pucelle/ff'


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
export class LiveRendererMeasurement {

	private readonly scroller: HTMLElement
	private readonly slider: HTMLElement

	/** Do rendered item size statistic, guess item size. */
	private readonly stat: PartialRendererSizeStat = new PartialRendererSizeStat()

	/** Help to get and set based on overflow direction. */
	private readonly doa: DirectionalOverflowAccessor

	/** Indicates a continuous render range to make it more precisely to compute item size. */
	private continuousRenderRange: ContinuousRenderRange | null = null
	
	/** 
	 * If provided, it specifies the suggested end position of each item,
	 * to indicate the base size of each item.
	 * The size has no need to represent real size,
	 * only represents the mutable part would be enough.
	 * Which means: can ignores shared paddings or margins.
	 */
	private preEndPositions: number[] | null = null

	/** Initial item size, now valid after measured. */
	private guessedItemSize: number = 0

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
	latestSliderProperties: LatestSliderPositionProperties = {
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
	}

	/** Set new slider position. */
	cacheSliderPosition(alignDirection: 'start' | 'end', index: number, position: number) {
		if (alignDirection === 'start') {
			this.latestSliderProperties.startIndex = index
			this.latestSliderProperties.startPosition = position
		}
		else {
			this.latestSliderProperties.endIndex = index
			this.latestSliderProperties.endPosition = position
		}
	}

	/** Read new scroller size. */
	async readScrollerSize() {
		await barrierDOMReading()
		this.scrollerSize = this.doa.getClientSize(this.scroller)
	}

	/** Directly set but not read scroller size. */
	setScrollerSize(size: number) {
		this.scrollerSize = size
	}

	/** 
	 * Guess an item size for first-time paint,
	 * and avoid it checking for item-size and render twice when initialization.
	 */
	setGuessedItemSize(size: number) {
		this.guessedItemSize = size
	}

	/* Whether has measured. */
	hasMeasured(): boolean {
		return this.stat.getLatestSize() > 0
	}

	/** Get item size. */
	private getItemSize(): number {
		return this.stat.getLatestSize() || this.guessedItemSize
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
			if (alignDirection === 'start') {
				let start = startOrEndIndex > 0 ? this.preEndPositions[startOrEndIndex - 1] : 0
				return start
			}
			else {
				let end = startOrEndIndex > 0 ? this.preEndPositions[startOrEndIndex - 1] : 0
				return end
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
			let startIndex = ValueListUtils.binaryFindInsertIndex(this.preEndPositions, scrolled)
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
	async measureAfterRendered(startIndex: number, endIndex: number, alignDirection: 'start' | 'end') {
		await barrierDOMReading()

		let sliderInnerSize = this.doa.getInnerSize(this.slider)
		let sliderClientSize = this.doa.getClientSize(this.slider)
		let paddingSize = sliderClientSize - sliderInnerSize
		let properties = this.latestSliderProperties

		// Measure for unknown end position.
		if (alignDirection === 'start') {
			properties.endIndex = endIndex
			properties.endPosition = properties.startPosition + sliderClientSize
		}
		else {
			properties.startIndex = startIndex
			properties.startPosition = properties.endPosition - sliderClientSize
		}

		if (this.continuousRenderRange) {
			if (startIndex <= this.continuousRenderRange.startIndex) {
				this.continuousRenderRange.startIndex = startIndex
				this.continuousRenderRange.startPosition = properties.startPosition
			}

			if (endIndex >= this.continuousRenderRange.endIndex) {
				this.continuousRenderRange.endIndex = endIndex
				this.continuousRenderRange.endPosition = properties.endPosition
			}
		}
		else {
			this.continuousRenderRange = {
				startIndex,
				endIndex,
				startPosition: properties.startPosition,
				endPosition: properties.endPosition
			}
		}

		let renderCount = this.continuousRenderRange.endIndex - this.continuousRenderRange.startIndex
		let renderSize = this.continuousRenderRange.endPosition - this.continuousRenderRange.startPosition - paddingSize

		// Avoid update when hidden.
		if (renderCount > 0 && renderSize > 0) {
			this.stat.update(renderCount, renderSize)
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

		// Normally a line appears.
		let newItemSize = this.getItemSize()
		if (Math.abs(newItemSize - this.latestPlaceholderProperties.itemSize) > 10) {
			return true
		}

		// When scrolling up, no need to update.
		let scrollingDown = endIndex > this.latestPlaceholderProperties.endIndex
		if (!scrollingDown) {
			return false
		}

		let newPlaceholderSize = this.calcPlaceholderSize(dataCount)
		let guessSizeAfterEnd = newPlaceholderSize - this.latestSliderProperties.endPosition
		let currentSizeAfterEnd = this.latestPlaceholderProperties.placeholderSize - this.latestSliderProperties.endPosition
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
			return end
		}

		let itemSize = this.getItemSize()
		let positionProperties = this.latestSliderProperties

		// Can reuse previous measured end slider position properties.
		if (positionProperties.endIndex <= dataCount
			&& positionProperties.endIndex > 0
			&& positionProperties.endPosition > 0
		) {
			return this.latestSliderProperties.endPosition + itemSize * (dataCount - positionProperties.endIndex)
		}

		// Can reuse previous measured start slider position properties.
		if (positionProperties.startIndex <= dataCount
			&& positionProperties.startIndex > 0
			&& positionProperties.startPosition > 0
		) {
			return this.latestSliderProperties.startPosition + itemSize * (dataCount - positionProperties.startIndex)
		}

		return itemSize * dataCount
	}

	/** Cache placeholder size and other properties. */
	cachePlaceholderProperties(endIndex: number, dataCount: number, placeholderSize: number) {
		this.latestPlaceholderProperties = {
			endIndex,
			itemSize: this.getItemSize(),
			dataCount,
			placeholderSize,
		}
	}

	/** Check cover situation and decide where to render more contents. */
	async checkUnCoveredSituation(startIndex: number, endIndex: number, dataCount: number): Promise<UnCoveredSituation | null> {
		await barrierDOMReading()

		let scrollerSize = this.doa.getClientSize(this.scroller)
		let sliderSize = this.doa.getClientSize(this.slider)
		let scrolled = this.doa.getScrolled(this.scroller)
		let sliderStart = this.latestSliderProperties.startPosition - scrolled
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