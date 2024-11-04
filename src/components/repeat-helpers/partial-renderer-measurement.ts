import {PartialRendererSizeStat} from './partial-renderer-size-stat'
import {DirectionalOverflowAccessor} from './directional-overflow-accessor'


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
	
	/** 
	 * Latest end index when last time measure placeholder,
	 * thus, can avoid update placeholder when scrolling up.
	 */
	private latestEndIndexWhenPlaceholderMeasuring: number = 0

	/** Latest average item size when last time measure placeholder. */
	private latestAverageItemSizeWhenPlaceholderMeasuring: number = -1

	/** 
	 * Latest scroller size.
	 * Readonly outside.
	 */
	scrollerSize: number = 0

	/** 
	 * Latest placeholder size.
	 * Readonly outside.
	 */
	cachedPlaceholderSize: number = 0

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
		this.scrollerSize = this.doa.getClientSize(this.scroller)
	}

	/** Get average item size. */
	getAverageSize(): number {
		return this.stat.getAverageSize()
	}

	/** Whether have measured item size. */
	hasMeasuredItemSize(): boolean {
		return this.getAverageSize() > 0
	}

	/** Get safe render count of items to render. */
	getSafeRenderCount(coverageRate: number): number {

		// Will at least render additional 200px.
		let renderCount = this.stat.getSafeRenderCount(coverageRate, this.scrollerSize)

		return renderCount
	}

	/** Calc new slider position by start and end indices. */
	calcSliderPositionByIndices(startIndex: number, endIndex: number, alignDirection: 'start' | 'end') {
		if (alignDirection === 'start') {
			return this.getAverageSize() * startIndex
		}
		else {
			return this.getAverageSize() * endIndex + this.scrollerSize
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

	/** 
	 * Whether should update placeholder size.
	 * When scrolling down, and will render more items in the end, need to update.
	 * When scrolling up, no need to update.
	 */
	shouldUpdatePlaceholderSize(endIndex: number): boolean {
		let expanded = endIndex > this.latestEndIndexWhenPlaceholderMeasuring
		let sizeChangedMuch = Math.abs(this.getAverageSize() - this.latestAverageItemSizeWhenPlaceholderMeasuring) > 1

		return expanded && sizeChangedMuch
	}

	/** 
	 * Update height/width of placeholder progressive.
	 * When scrolling down, and will render more items in the end, update size.
	 * No need to update when scrolling up.
	 */
	calcPlaceholderSizeByIndices(startIndex: number, endIndex: number, dataCount: number, alignDirection: 'start' | 'end') {
		let averageSize = this.getAverageSize()
		let placeholderSize: number
		
		if (alignDirection === 'start') {
			placeholderSize = averageSize * (dataCount - startIndex) + this.cachedSliderStartPosition
		}
		else {
			placeholderSize = averageSize * (dataCount - endIndex) + this.cachedSliderEndPosition
		}

		this.latestEndIndexWhenPlaceholderMeasuring = endIndex
		this.latestAverageItemSizeWhenPlaceholderMeasuring = this.getAverageSize()

		return placeholderSize
	}

	/** Set placeholder size. */
	cachePlaceholderSize(size: number) {
		this.cachedPlaceholderSize = size
	}

	/** Every time after render complete, do measurement.  */
	measureAfterRendered(startIndex: number, endIndex: number, alignDirection: 'start' | 'end') {
		let sliderSize = this.doa.getClientSize(this.slider)

		if (alignDirection === 'start') {
			this.cachedSliderEndPosition = this.cachedSliderStartPosition + sliderSize
		}
		else {
			this.cachedSliderStartPosition = this.cachedSliderEndPosition - sliderSize
		}

		this.stat.update(endIndex - startIndex, sliderSize)
	}

	/** Check cover direction and decide where to render more contents. */
	checkUnCoveredDirection(startIndex: number, endIndex: number, dataCount: number): 'start' | 'end' | 'break' | null {
		let scrollerSize = this.doa.getClientSize(this.scroller)
		let scrolled = this.doa.getScrollPosition(this.scroller)
		let sliderStart = this.cachedSliderStartPosition - scrolled
		let sliderEnd = sliderStart + this.doa.getClientSize(this.slider)
		let unexpectedScrollStart = scrolled === 0 && startIndex > 0

		let unexpectedScrollEnd = scrolled + this.doa.getClientSize(this.scroller) === this.doa.getScrollSize(this.scroller)
			&& endIndex < dataCount

		// No intersection, reset indices by current scroll position.
		let hasNoIntersection = sliderEnd < 0 || sliderStart > scrollerSize
		if (hasNoIntersection) {
			return 'break'
		}

		// Can't cover and need to render more items at bottom/right.
		else if (sliderEnd < scrollerSize || unexpectedScrollEnd) {
			return 'end'
		}

		// Can't cover and need to render more items at top/left.
		else if (sliderStart > 0 || unexpectedScrollStart) {
			return 'start'
		}

		// No need to render more.
		else {
			return null
		}
	}
}