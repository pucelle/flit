import {PartialRendererSizeStat} from './partial-renderer-size-stat'
import {DirectionalOverflowAccessor} from './directional-overflow-accessor'


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

	/** Read new scroller size. */
	readScrollerSize() {
		this.cachedScrollerSize = this.doa.getClientSize(this.scroller)
	}

	/** Get item size. */
	getItemSize(): number {
		return this.stat.getLatestSize()
	}

	/** 
	 * Get safe render count of items to render.
	 * `itemSize` can either be latest size or average size.
	 */
	getSafeRenderCount(itemSize: number, reservedPixels: number): number {
		if (this.cachedScrollerSize === 0) {
			return 1
		}

		if (itemSize === 0) {
			return 1
		}

		// Because normally can scroll twice per frame.
		let totalSize = this.cachedScrollerSize + reservedPixels

		return Math.ceil(totalSize / itemSize)
	}

	/** Calc new slider position by start and end indices. */
	calcSliderPositionByIndices(startIndex: number, endIndex: number, alignDirection: 'start' | 'end') {
		if (alignDirection === 'start') {
			return this.getItemSize() * startIndex
		}
		else {
			return this.getItemSize() * endIndex + this.cachedScrollerSize
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

		// Avoid force render when hidden.
		if (renderCount > 0 && renderSize > 0) {
			this.stat.update(renderCount, renderSize)
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
		let itemSize = this.getItemSize()
		let placeholderSize: number
		
		if (alignDirection === 'start') {
			placeholderSize = itemSize * (dataCount - startIndex) + this.cachedSliderStartPosition
		}
		else {
			placeholderSize = itemSize * (dataCount - endIndex) + this.cachedSliderEndPosition
		}

		return placeholderSize
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
		else if (sliderStart > 0 || unexpectedScrollStart) {
			return 'start'
		}

		// Can't cover and need to render more items at bottom/right.
		else if (sliderEnd < scrollerSize || unexpectedScrollEnd) {
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