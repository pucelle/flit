import {barrierDOMReading, barrierDOMWriting, ResizeWatcher} from '@pucelle/ff'
import {DirectionalOverflowAccessor} from './directional-overflow-accessor'
import {LiveMeasurement} from './live-measurement'
import {DOMEvents, untilFirstPaintCompleted} from '@pucelle/lupos'
import {PartialRenderer} from './partial-renderer'


/**
 * What a live renderer do:
 *
 * When initialize or update from applying start index:
 * - Update indices.
 * - Update placeholder height and scroll position.
 * - Cause scroll event dispatched
 * - Validate scroll viewport coverage and re-render if required.
 * 
 * When scrolling up or down / left or right:
 * - Validate scroll viewport coverage and adjust `startIndex`
 *   or `endIndex` a little if not fully covered.
 */
export class LiveRenderer extends PartialRenderer {

	declare measurement: LiveMeasurement
	declare readonly frontPlaceholder: null

	/** 
	 * Whether partial rendering content as follower,
	 * so the partial renderer only renders by current scroll position,
	 * and will never cause scroll position change.
	 */
	readonly asFollower: boolean

	/** If provided and not 0, will use it forever and never read scroller size. */
	private directScrollSize: number = 0

	constructor(
		scroller: HTMLElement,
		slider: HTMLElement,
		repeat: HTMLElement,
		placeholder: HTMLDivElement | null,
		asFollower: boolean,
		doa: DirectionalOverflowAccessor,
		updateCallback: () => void
	) {
		super(scroller, slider, repeat, null, placeholder, doa, updateCallback)
		this.asFollower = asFollower
	}

	protected override initMeasurement() {
		return new LiveMeasurement(this.scroller, this.slider, this.doa)
	}

	/** Set `preEndPositions` before updating. */
	setPreEndPositions(positions: number[] | null) {
		this.measurement.setPreEndPositions(positions)
	}

	override async connect() {
		DOMEvents.on(this.scroller, 'scroll', this.onScrollerScroll, this, {passive: true})
		await untilFirstPaintCompleted()

		ResizeWatcher.watch(this.slider, this.onSliderSizeUpdated, this)

		if (!this.directScrollSize) {
			await this.readScrollerSize()
			ResizeWatcher.watch(this.scroller, this.readScrollerSize, this)
		}
	}

	override async disconnect() {

		// For restoring scroll position later.
		if (!this.asFollower) {
			await barrierDOMReading()
			this.setRenderIndices('start', this.locateVisibleIndex('start'))
		}

		DOMEvents.off(this.scroller, 'scroll', this.onScrollerScroll, this)
		ResizeWatcher.unwatch(this.slider, this.onSliderSizeUpdated, this)

		if (!this.directScrollSize) {
			ResizeWatcher.unwatch(this.scroller, this.readScrollerSize, this)
		}
	}

	/** If provided and not 0, will use it and not read scroller size. */
	setDirectScrollSize(size: number) {
		this.directScrollSize = size
		this.measurement.setScrollerSize(size)
	}

	protected override async resetPositions(
		resetScroll: boolean,
		alignToStartIndex: number = this.startIndex,
		alignToEndIndex: number = this.endIndex
	) {
		// top or bottom position.
		let newSliderPosition = this.measurement.calcScrollPosition(this.alignAt === 'start' ? this.startIndex : this.endIndex, this.alignAt)
		
		await this.setPosition(newSliderPosition)

		// We'd better not break continuous range here, or drag scroll thumb
		// you will find scroll thumb jump when item size is not stable.
		//this.measurement.breakContinuousRenderRange()

		if (resetScroll && !this.asFollower) {
			alignToStartIndex = Math.min(Math.max(alignToStartIndex, this.startIndex), this.endIndex - 1)
			alignToEndIndex = Math.max(Math.min(alignToEndIndex, this.endIndex), this.startIndex)
	
			// Align scroller start with slider start.
			let scrollPosition = this.measurement.calcScrollPosition(
				this.alignAt === 'start' ? alignToStartIndex : alignToEndIndex,
				this.alignAt
			)

			// Align scroller end with slider end.
			if (this.alignAt === 'end') {
				scrollPosition -= this.measurement.scrollerSize
			}

			await barrierDOMWriting()
			this.doa.setScrolled(this.scroller, scrollPosition)
		}
	}

	protected override async setPosition(position: number) {
		await barrierDOMWriting()

		if (this.alignAt === 'start') {
			this.doa.setStartPosition(this.slider, position + 'px')
			this.doa.setEndPosition(this.slider, 'auto')
		}
		else {
			this.doa.setStartPosition(this.slider, 'auto')
			this.doa.setEndPosition(this.slider, this.measurement.scrollerSize - position + 'px')
		}
	}

	protected override async updateBackPlaceholderSize() {
		if (!this.backPlaceholder) {
			return
		}
		
		let shouldUpdate = this.measurement.shouldUpdateOnlyPlaceholderSize(this.endIndex, this.dataCount)
		if (!shouldUpdate) {
			return
		}

		let placeholderSize = this.measurement.calcOnlyPlaceholderSize(this.dataCount)
		await this.setBackPlaceholderSize(placeholderSize)
	}

	protected override async setBackPlaceholderSize(size: number) {
		if (!this.backPlaceholder) {
			return
		}
		
		await barrierDOMWriting()
		this.doa.setSize(this.backPlaceholder, size)
		this.measurement.cachePlaceholderProperties(this.startIndex, this.endIndex, this.dataCount, size)
	}

	protected override async afterMeasured() {

		// When reach start index but may not reach scroll start.
		if (this.startIndex === 0) {

			// E.g., `sliderStartPosition` is `10`,
			// means have 10px higher than start,
			// reset to start position 0 cause this 10px get removed,
			// And we need to scroll up (element down) for 10px.
			let moreSize = -this.measurement.sliderProperties.startOffset
			
			if (moreSize !== 0) {
				await barrierDOMReading()
				let scrolled = this.doa.getScrolled(this.scroller) + moreSize

				await barrierDOMWriting()
				this.doa.setScrolled(this.scroller, scrolled)
				this.alignAt = 'start'
				await this.setPosition(0)
			}
		}

		// When reach scroll start but not start index.
		else if (this.measurement.sliderProperties.startOffset <= 0) {

			// Guess size of items before, and add missing size of current rendering.
			let newPosition = this.measurement.calcScrollPosition(this.startIndex, 'start')
			let moreSize = newPosition - this.measurement.sliderProperties.startOffset
			let scrolled = this.doa.getScrolled(this.scroller) + moreSize

			await barrierDOMWriting()
			this.doa.setScrolled(this.scroller, scrolled)

			await this.setBackPlaceholderSize(this.measurement.placeholderProperties.frontSize + moreSize)

			this.alignAt = 'start'
			await this.setPosition(newPosition)
		}

		// When reach end index but not scroll end.
		if (this.endIndex === this.dataCount) {

			// Placeholder size is too large and should be shrink.
			if (this.measurement.placeholderProperties.frontSize > this.measurement.sliderProperties.endOffset) {
				await this.setBackPlaceholderSize(this.measurement.sliderProperties.endOffset)
			}
		}

		// When reach scroll end but not end index.
		// Note `scrollTop` value may be float, but two heights are int.
		else if (this.doa.getScrolled(this.scroller) + this.doa.getClientSize(this.scroller) >= this.doa.getScrollSize(this.scroller)) {
			let moreSize = this.measurement.calcScrollPosition(this.dataCount, 'end')
				- this.measurement.calcScrollPosition(this.endIndex, 'end')

			await this.setBackPlaceholderSize(this.measurement.placeholderProperties.frontSize + moreSize)
		}
	}

	/** Get new position for continuously update. */
	protected override async getContinuousPosition(oldStartIndex: number, alignAt: 'start' | 'end') {
		await barrierDOMReading()
		let position: number

		if (alignAt === 'start') {
			let elIndex = this.startIndex - oldStartIndex
			let el = this.repeat.children[elIndex] as HTMLElement

			if (el.localName === 'slot') {
				el = el.firstElementChild as HTMLElement
			}

			// If el located at start, it will move by slider padding top,
			// to keep it's position, should remove slider padding.
			position = this.measurement.sliderProperties.startOffset
				+ this.doa.getOuterOffset(el, this.slider)
				- this.doa.getStartPadding(this.slider)
		}

		// Scrolling up, render more at end.
		else {
			let elIndex = this.endIndex - oldStartIndex - 1
			let el = this.repeat.children[elIndex] as HTMLElement

			if (el.localName === 'slot') {
				el = el.firstElementChild as HTMLElement
			}

			await barrierDOMReading()

			// If el located at end, it will move up by slider padding bottom,
			// to keep it's position, should add slider bottom padding.
			position = this.measurement.sliderProperties.startOffset
				+ this.doa.getEndOuterPosition(el, this.slider)
				+ this.doa.getEndPadding(this.slider)
		}

		return position
	}
}