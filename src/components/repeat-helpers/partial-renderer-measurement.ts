import {PartialRendererSizeStat} from './partial-renderer-size-stat'
import {DirectionalOverflowAccessor} from './directional-overflow-accessor'


export type UnCoveredSituation =
	'start'				// Not fully covered at start
	| 'end'				// Not fully covered at end
	| 'quarterly-start'	// Has less than 1/4 rest at start
	| 'quarterly-end'	// Has less than 1/4 rest at end
	| 'break'			// Have no intersection, ust re-render totally by current scroll position.
	| 'reset'			// Failed to do continuous updating, must re-render totally by current indices.


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

	/** Latest data count when last time measure placeholder. */
	private latestDataCountWhenPlaceholderMeasuring: number = -1

	/** Whether item size should be balanced. */
	private itemSizeBalanced: boolean = true

	/** 
	 * Latest scroller size.
	 * Readonly outside.
	 */
	cachedScrollerSize: number = 0

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
		this.cachedScrollerSize = this.doa.getClientSize(this.scroller)
	}

	/** Set `itemSizeBalanced` property. */
	setItemSizeBalanced(itemSizeBalanced: boolean) {
		this.itemSizeBalanced = itemSizeBalanced
	}

	/** Get item size. */
	getItemSize(): number {
		return this.itemSizeBalanced ? this.stat.getLatestSize() : this.stat.getAverageSize()
	}

	/** Whether have measured item size. */
	hasMeasuredItemSize(): boolean {
		return this.getItemSize() > 0
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

	/** Every time after render complete, do measurement. */
	measureAfterRendered(startIndex: number, endIndex: number, alignDirection: 'start' | 'end') {
		let sliderInnerSize = this.doa.getInnerSize(this.slider)
		let sliderClientSize = this.doa.getClientSize(this.slider)

		if (alignDirection === 'start') {
			this.cachedSliderEndPosition = this.cachedSliderStartPosition + sliderClientSize
		}
		else {
			this.cachedSliderStartPosition = this.cachedSliderEndPosition - sliderClientSize
		}

		this.stat.update(endIndex - startIndex, sliderInnerSize)
	}

	/** 
	 * Whether should update placeholder size.
	 * When scrolling down, need to update.
	 * When item size changed much, need to update.
	 */
	shouldUpdatePlaceholderSize(endIndex: number, dataCount: number): boolean {
		if (dataCount !== this.latestDataCountWhenPlaceholderMeasuring) {
			return true
		}

		let expanded = endIndex > this.latestEndIndexWhenPlaceholderMeasuring
		if (expanded) {
			return true
		}

		let sizeChangedMuch = Math.abs(this.getItemSize() - this.latestAverageItemSizeWhenPlaceholderMeasuring) > 1
		if (sizeChangedMuch) {
			return true
		}

		return false
	}

	/** 
	 * Update height/width of placeholder progressive.
	 * When scrolling down, and will render more items in the end, update size.
	 * No need to update when scrolling up.
	 */
	calcPlaceholderSizeByIndices(startIndex: number, endIndex: number, dataCount: number, alignDirection: 'start' | 'end') {
		let averageSize = this.getItemSize()
		let placeholderSize: number
		
		if (alignDirection === 'start') {
			placeholderSize = averageSize * (dataCount - startIndex) + this.cachedSliderStartPosition
		}
		else {
			placeholderSize = averageSize * (dataCount - endIndex) + this.cachedSliderEndPosition
		}

		this.latestEndIndexWhenPlaceholderMeasuring = endIndex
		this.latestAverageItemSizeWhenPlaceholderMeasuring = this.getItemSize()
		this.latestDataCountWhenPlaceholderMeasuring = dataCount

		return placeholderSize
	}

	/** Set placeholder size. */
	cachePlaceholderSize(size: number) {
		this.cachedPlaceholderSize = size
	}

	/** Check cover situation and decide where to render more contents. */
	checkUnCoveredSituation(startIndex: number, endIndex: number, dataCount: number): UnCoveredSituation | null {
		let scrollerSize = this.doa.getClientSize(this.scroller)
		let sliderSize = this.doa.getClientSize(this.slider)
		let scrolled = this.doa.getScrollPosition(this.scroller)
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
			return 'quarterly-start'
		}

		// Has less than 1/4 rest at end
		else if ((sliderEnd - scrollerSize) * 4 < sliderSize - scrollerSize) {
			return 'quarterly-end'
		}

		// No need to render more.
		else {
			return null
		}
	}
}