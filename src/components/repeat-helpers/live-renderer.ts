import {ResizeWatcher} from 'ff-kit'
import {DirectionalOverflowAccessor} from './directional-overflow-accessor'
import {LiveMeasurement} from './live-measurement'
import {barrierDOMReading, barrierDOMWriting, DOMEvents} from 'lupos'
import {PartialRenderer} from './partial-renderer'
import {Component} from 'lupos.html'


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
	declare readonly backPlaceholder: null

	/** 
	 * Whether partial rendering content as follower,
	 * so the partial renderer only renders by current scroll position,
	 * and will never cause scroll position change.
	 */
	readonly asFollower: boolean

	/** If provided and not 0, will use it forever and never read scroller size. */
	private directScrollSize: number = 0

	/** The only placeholder. */
	private onlyPlaceholder: HTMLDivElement | null

	constructor(
		scroller: HTMLElement,
		slider: HTMLElement,
		repeat: HTMLElement,
		context: Component,
		placeholder: HTMLDivElement | null,
		asFollower: boolean,
		doa: DirectionalOverflowAccessor,
		updateCallback: () => void
	) {
		super(scroller, slider, repeat, context, null, null, doa, updateCallback)
		this.onlyPlaceholder = placeholder
		this.asFollower = asFollower
	}

	protected override initMeasurement() {
		return new LiveMeasurement(this.scroller, this.slider, this.repeat, this.context, this.doa)
	}

	/** Set `preEndPositions` before updating. */
	setPreEndPositions(positions: number[] | null) {
		this.measurement.setPreEndPositions(positions)
	}

	override async connect() {
		if (this.connected) {
			return
		}

		this.connected = true

		DOMEvents.on(this.scroller, 'scroll', this.onScrollerScroll, this, {passive: true})
		ResizeWatcher.watch(this.slider, this.onSliderSizeUpdated, this)

		if (!this.directScrollSize) {
			await this.readScrollerSize()
			ResizeWatcher.watch(this.scroller, this.readScrollerSize, this)
		}
	}

	override disconnect() {
		if (!this.connected) {
			return
		}

		this.connected = false

		// For restoring scroll position later.
		// Here can't `barrierDOMReading`, or it delays node removing,
		// can cause element existing with it's toggling content at same time.
		if (!this.asFollower) {
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
		let newSliderPosition = this.measurement.calcScrollPosition(this.alignDirection === 'start' ? this.startIndex : this.endIndex, this.alignDirection)
		
		await this.setPosition(newSliderPosition)

		// Break continuous render range.
		this.measurement.breakContinuousRenderRange()

		if (resetScroll && !this.asFollower) {
			alignToStartIndex = Math.min(Math.max(alignToStartIndex, this.startIndex), this.endIndex - 1)
			alignToEndIndex = Math.max(Math.min(alignToEndIndex, this.endIndex), this.startIndex)
	
			// Align scroller start with slider start.
			let scrollPosition = this.measurement.calcScrollPosition(
				this.alignDirection === 'start' ? alignToStartIndex : alignToEndIndex,
				this.alignDirection
			)

			// Align scroller end with slider end.
			if (this.alignDirection === 'end') {
				scrollPosition -= this.measurement.scrollerSize
			}

			await barrierDOMWriting()
			this.doa.setScrolled(this.scroller, scrollPosition)
		}
	}

	protected override async setPosition(position: number) {
		await barrierDOMWriting()

		if (this.alignDirection === 'start') {
			this.doa.setStartPosition(this.slider, position + 'px')
			this.doa.setEndPosition(this.slider, 'auto')
		}
		else {
			this.doa.setStartPosition(this.slider, 'auto')
			this.doa.setEndPosition(this.slider, this.measurement.scrollerSize - position + 'px')
		}
	}

	protected override async updateRestPlaceholderSize() {
		if (!this.onlyPlaceholder) {
			return
		}

		// Not update when scrolling up.
		if (this.alignDirection === 'end') {
			return
		}
		
		// Calc back size by last time rendering result.
		let oldBackSize = this.measurement.placeholderProperties.backSize - this.measurement.sliderProperties.endOffset
		let fixedBackSize = this.measurement.fixBackPlaceholderSize(oldBackSize, this.measurement.indices.endIndex, this.dataCount)

		// Update back size only when have at least 50% difference.
		if (fixedBackSize !== oldBackSize) {
			await this.setOnlyPlaceholderSize(this.measurement.sliderProperties.endOffset + fixedBackSize)
		}
	}

	/** Set size for the only placeholder. */
	protected async setOnlyPlaceholderSize(size: number) {
		if (!this.onlyPlaceholder) {
			return
		}
		
		await barrierDOMWriting()
		this.doa.setSize(this.onlyPlaceholder, size)
		this.measurement.setOnlyPlaceholderSize(size)
	}

	protected override async afterMeasured() {

		// When reach start index but may not reach scroll start.
		if (this.startIndex === 0 && this.endIndex > 0) {
			this.alignDirection = 'start'
			await this.fillNeedToAlign(this.repeat.children[0] as HTMLElement)
			await this.setPosition(0)
			await this.alignByResettingScroll()
		}

		// Front placeholder is too much difference when scrolling up.
		else if (this.alignDirection === 'end') {
			let frontSize = this.measurement.sliderProperties.startOffset
			let fixedFrontSize = this.measurement.fixFrontPlaceholderSize(frontSize, this.startIndex)

			if (fixedFrontSize !== frontSize) {
				let newEndOffset = this.measurement.sliderProperties.endOffset + (fixedFrontSize - frontSize)
				await this.fillNeedToAlign(this.repeat.children[0] as HTMLElement)
				await this.setPosition(newEndOffset)
				await this.alignByResettingScroll()
			}
		}

		// When reach end index but not scroll end.
		if (this.endIndex === this.dataCount) {

			// Placeholder size should be keep consistent with end position.
			await this.setOnlyPlaceholderSize(this.measurement.sliderProperties.endOffset)
		}

		// When scrolling down, and reach scroll end but not end index.
		// This is very rare because we have updated placeholder size using previously measured.
		else if (this.alignDirection === 'start') {
			let oldBackSize = this.measurement.placeholderProperties.backSize - this.measurement.sliderProperties.endOffset
			if (oldBackSize < 0) {
				await this.updateRestPlaceholderSize()
			}
		}
	}

	/** Do element alignment by adjusting scroll offset. */
	protected async alignByResettingScroll() {
		if (!this.needToAlign) {
			return
		}

		await barrierDOMReading()
		let newOffset = this.doa.getOffset(this.needToAlign.el, this.scroller)
		let offsetDiff = newOffset - this.needToAlign.offset

		if (Math.abs(offsetDiff) > 5) {
			await barrierDOMWriting()
			let scrolled = this.doa.getScrolled(this.scroller)
			this.doa.setScrolled(this.scroller, scrolled + offsetDiff)
		}

		this.needToAlign = null
	}

	/** Get new position for continuously update. */
	protected override async getContinuousPosition(oldStartIndex: number, alignDirection: 'start' | 'end') {
		await barrierDOMReading()
		let position: number

		if (alignDirection === 'start') {
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