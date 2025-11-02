import {PartialSizeStat} from './partial-size-stat'
import {DirectionalOverflowAccessor} from './directional-overflow-accessor'
import {barrierDOMReading} from '@pucelle/ff'


export type UnCoveredDirection =
	'start'		// Not fully covered at start
	| 'end'		// Not fully covered at end
	| 'break'	// Have no intersection, ust re-render totally by current scroll position.


interface LatestSliderPositionProperties {

	/** 
	 * The initial slider offset position relative to whole scroll content,
	 * Only affected by contents before slider.
	 */
	initialOffset: number

	/** Latest start index when last time updating. */
	startIndex: number

	/** Latest end index when last time updating. */
	endIndex: number

	/** 
	 * Latest offset position of visible part relative to scroller.
	 * update it before or after every time rendered.
	 * Readonly outside.
	 */
	startOffset: number

	/** 
	 * Latest offset position of visible part relative to scroller,
	 * update it before or after every time rendered.
	 * Readonly outside.
	 */
	endOffset: number
}


interface LatestPlaceholderProperties {

	/** Latest front placeholder size when last time cache placeholder. */
	frontSize: number

	/** Latest front placeholder size when last time cache placeholder. */
	backSize: number
}


/** 
 * Indicates a continuous render range, which can help
 * to calc item size more preciously.
 */
interface ContinuousRenderRange {
	startIndex: number
	endIndex: number
	startPosition: number
	endPosition: number
}


/**
 * It help to do measurement for PartialRenderer,
 * and cache latest render result for it.
 * And help to assist next time rendering.
 */
export class PartialMeasurement {

	protected readonly scroller: HTMLElement
	protected readonly slider: HTMLElement

	/** Do rendered item size statistic, guess item size. */
	protected readonly stat: PartialSizeStat = new PartialSizeStat()

	/** Help to get and set based on overflow direction. */
	protected readonly doa: DirectionalOverflowAccessor

	/** Indicates a continuous render range to make it more precisely to compute item size. */
	protected continuousRenderRange: ContinuousRenderRange | null = null

	/** Initial item size, now valid after measured. */
	protected guessedItemSize: number = 0

	/** 
	 * Latest scroller size.
	 * Readonly outside.
	 */
	scrollerSize: number = 0

	/** 
	 * Latest placeholder properties when last time measure placeholder.
	 * Thus, can use previous size to do continuously updating.
	 */
	placeholderProperties: LatestPlaceholderProperties = {
		frontSize: 0,
		backSize: 0,
	}

	/** 
	 * Latest slider position properties use when last time updating,
	 * thus, can reuse it to do continuous layout measurement.
	 */
	sliderProperties: LatestSliderPositionProperties = {
		initialOffset: 0,
		startIndex: 0,
		endIndex: 0,
		startOffset: 0,
		endOffset: 0,
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
	protected getItemSize(): number {
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

	/** If re-render from a new index, call this. */
	breakContinuousRenderRange() {
		this.continuousRenderRange = null
	}

	/** Calc scroll position by specified index and aligning at start or end. */
	calcScrollPosition(index: number, alignAt: 'start' | 'end'): number {
		if (alignAt === 'start') {
			return this.getItemSize() * index + this.sliderProperties.initialOffset
		}
		else {
			return this.getItemSize() * index + this.scrollerSize + this.sliderProperties.initialOffset
		}
	}

	/** Calc new start index by current scrolled position. */
	async calcStartIndexByScrolled(): Promise<number> {
		await barrierDOMReading()
		
		let scrolled = this.doa.getScrolled(this.scroller)
		let sliderInitialOffset = this.doa.getOffset(this.slider, this.scroller)
		let itemSize = this.getItemSize()
		let startIndex = itemSize > 0 ? Math.floor((scrolled - sliderInitialOffset) / itemSize) : 0

		return startIndex
	}

	/** Every time after update complete, do measurement. */
	async measureAfterRendered(startIndex: number, endIndex: number) {
		await barrierDOMReading()

		let sliderInnerSize = this.doa.getInnerSize(this.slider)
		let sliderClientSize = this.doa.getClientSize(this.slider)
		let paddingSize = sliderClientSize - sliderInnerSize

		this.updateSliderProperties(startIndex, endIndex, sliderClientSize)

		if (this.continuousRenderRange) {
			if (startIndex <= this.continuousRenderRange.startIndex) {
				this.continuousRenderRange.startIndex = startIndex
				this.continuousRenderRange.startPosition = this.sliderProperties.startOffset
			}

			if (endIndex >= this.continuousRenderRange.endIndex) {
				this.continuousRenderRange.endIndex = endIndex
				this.continuousRenderRange.endPosition = this.sliderProperties.endOffset
			}
		}
		else {
			this.continuousRenderRange = {
				startIndex,
				endIndex,
				startPosition: this.sliderProperties.startOffset,
				endPosition: this.sliderProperties.endOffset
			}
		}

		let renderCount = this.continuousRenderRange.endIndex - this.continuousRenderRange.startIndex
		let renderSize = this.continuousRenderRange.endPosition - this.continuousRenderRange.startPosition - paddingSize

		// Avoid update when hidden.
		if (renderCount > 0 && renderSize > 0) {
			this.stat.update(renderCount, renderSize)
		}
	}

	/** Update current slider positions. */
	protected updateSliderProperties(startIndex: number, endIndex: number, sliderClientSize: number) {
		this.sliderProperties.initialOffset = this.doa.getOffset(this.slider, this.scroller)

		this.sliderProperties.startIndex = startIndex
		this.sliderProperties.endIndex = endIndex

		this.sliderProperties.startOffset = this.placeholderProperties.frontSize
		this.sliderProperties.endOffset = this.sliderProperties.startOffset + sliderClientSize
	}

	/** Calculate a rough front placeholder sizes. */
	getFrontPlaceholderSize(startIndex: number): number {
		let itemSize = this.getItemSize()
		return itemSize * startIndex
	}

	/** Calculate a rough back placeholder sizes. */
	getBackPlaceholderSize(endIndex: number, dataCount: number): number {
		let itemSize = this.getItemSize()
		return itemSize * (dataCount - endIndex)
	}

	/** Set front placeholder size to limit it in range. */
	setFrontPlaceholderSize(frontSize: number, startIndex: number) {
		let front = this.getFrontPlaceholderSize(startIndex)
		frontSize = Math.max(Math.min(frontSize, front / 2), front * 2)

		this.placeholderProperties.frontSize = frontSize
	}

	/** Set back placeholder size to limit it in range. */
	setBackPlaceholderSize(backSize: number, endIndex: number, dataCount: number) {
		let back = this.getBackPlaceholderSize(endIndex, dataCount)
		backSize = Math.max(Math.min(backSize, back / 2), back * 2)

		this.placeholderProperties.backSize = backSize
	}

	/** Check cover situation and decide where to render more contents. */
	async checkUnCoveredDirection(): Promise<UnCoveredDirection | null> {
		await barrierDOMReading()

		let scrollerSize = this.doa.getClientSize(this.scroller)
		let sliderSize = this.doa.getClientSize(this.slider)
		let scrolled = this.doa.getScrolled(this.scroller)
		let sliderStart = this.sliderProperties.startOffset - scrolled
		let sliderEnd = sliderStart + sliderSize
	
		// No intersection, reset indices by current scroll position.
		let hasNoIntersection = sliderEnd < 0 || sliderStart > scrollerSize
		if (hasNoIntersection) {
			return 'break'
		}

		// Can't cover and need to render more items at top/left.
		else if (sliderStart - 1 > 0) {
			return 'start'
		}

		// Can't cover and need to render more items at bottom/right.
		else if (sliderEnd + 1 < scrollerSize) {
			return 'end'
		}

		// No need to render more.
		return null
	}
}