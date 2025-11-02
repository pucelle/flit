import {barrierDOMReading, barrierDOMWriting, ResizeWatcher, sleep} from '@pucelle/ff'
import {locateVisibleIndex} from './index-locator'
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

	/** 
	 * Whether partial rendering content as follower,
	 * so the partial renderer only renders by current scroll position,
	 * and will never cause scroll position change.
	 */
	readonly asFollower: boolean

	/** If provided and not 0, will use it and not read scroller size. */
	private directScrollSize: number = 0

	/** If slider size updating come from own updating, prevent it. */
	private preventingSliderSizeUpdate: boolean = true

	constructor(
		scroller: HTMLElement,
		slider: HTMLElement,
		repeat: HTMLElement,
		placeholder: HTMLDivElement | null,
		asFollower: boolean,
		doa: DirectionalOverflowAccessor,
		updateCallback: () => void
	) {
		super(scroller, slider, repeat, placeholder, null, doa, updateCallback)
		this.asFollower = asFollower
	}

	protected override initMeasurement() {
		return new LiveMeasurement(this.scroller, this.slider, this.doa)
	}

	/** Set `preEndPositions` before updating. */
	setPreEndPositions(positions: number[] | null) {
		this.measurement.setPreEndPositions(positions)
	}

	/** After component that use this renderer get connected. */
	override async connect() {
		DOMEvents.on(this.scroller, 'scroll', this.onScrollerScroll, this, {passive: true})
		await untilFirstPaintCompleted()

		if (!this.directScrollSize) {
			await this.readScrollerSize()
			ResizeWatcher.watch(this.scroller, this.readScrollerSize, this)
		}

		ResizeWatcher.watch(this.slider, this.onSliderSizeUpdated, this)
	}

	/** After component that use this renderer will get disconnected. */
	override async disconnect() {

		// For restoring scroll position later.
		if (!this.asFollower) {
			await barrierDOMReading()
			this.setRenderIndices('start', this.locateVisibleIndex('start'))
		}

		DOMEvents.off(this.scroller, 'scroll', this.onScrollerScroll, this)

		if (!this.directScrollSize) {
			ResizeWatcher.unwatch(this.scroller, this.readScrollerSize, this)
		}

		ResizeWatcher.unwatch(this.slider, this.onSliderSizeUpdated, this)
	}

	/** On scroller scroll event. */
	private async onScrollerScroll() {
		await this.checkCoverage()
	}

	/** If provided and not 0, will use it and not read scroller size. */
	setDirectScrollSize(size: number) {
		this.directScrollSize = size
		this.measurement.setScrollerSize(size)
	}

	/** Read new scroller size. */
	private async readScrollerSize() {
		await this.measurement.readScrollerSize()
	}

	/** 
	 * When slider size updated,
	 * it should either ignore if update come from inside,
	 * or check coverage and re-measure item-size if update come from outside.
	 */
	private async onSliderSizeUpdated() {
		if (!this.preventingSliderSizeUpdate) {

			// Break continuous render range.
			this.measurement.breakContinuousRenderRange()

			// Re-measure item size.
			await this.measurement.measureAfterRendered(this.startIndex, this.endIndex)

			// Finally check coverage.
			await this.checkCoverage()
		}
	}

	/** Calls `updateCallback`. */
	protected override async updateRendering() {
		await barrierDOMWriting()
		this.updateCallback()

		this.preventingSliderSizeUpdate = true
		await sleep(0)
		this.preventingSliderSizeUpdate = false
	}

	/** Update from applying start index or updating data. */
	override async update() {

		// Don't want to force re-layout before first time paint.
		await untilFirstPaintCompleted()

		// Can only run only one updating each time.
		await this.renderQueue.enqueue(() => this.doNormalUpdate())

		// If item size become smaller much, may cause can't fully covered.
		await this.checkCoverage()
	}

	/** 
	 * Reset slider and scroll position, make first item appear in the start edge.
	 * `alignAt` must have been updated.
	 * 
	 * `resetScroll`: specifies as `false` if current indices is calculated from current scroll offset,
	 * 	  or for the first time rendering.
	 * 
	 * If `resetScroll` is `true`, will adjust scroll offset and align to the element
	 * specified by `alignToStartIndex`, `alignToEndIndex` are specified.
	 */
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

	/** Update data normally, and try to keep indices and scroll position. */
	protected override async updateWithStartIndexPersist() {
		let canPersist = true

		// Can't persist old index and position.
		if (this.endIndex > this.dataCount) {
			canPersist = false
		}
		
		// Required, may data count increase or decrease.
		this.setIndices(this.startIndex)
		this.alignAt = 'start'

		await this.updateRendering()

		if (!canPersist) {
			await this.resetPositions(true)
		}
	}

	/** 
	 * Update slider position after setting new indices.
	 * The position is the slider start/end edge (depend on align direction)
	 * relative to scroller start.
	 */
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

	/** 
	 * Update height/width of placeholder progressive before next time rendering.
	 * When scrolling down, and will render more items in the end, update size.
	 * No need to update when scrolling up.
	 */
	protected override async updateBackPlaceholderSize() {
		if (!this.frontPlaceholder) {
			return
		}
		
		let shouldUpdate = this.measurement.shouldUpdateOnlyPlaceholderSize(this.endIndex, this.dataCount)
		if (!shouldUpdate) {
			return
		}

		let placeholderSize = this.measurement.calcOnlyPlaceholderSize(this.dataCount)
		await this.setBackPlaceholderSize(placeholderSize)
	}

	/** Set placeholder size. */
	protected override async setBackPlaceholderSize(size: number) {
		if (!this.frontPlaceholder) {
			return
		}
		
		await barrierDOMWriting()
		this.doa.setSize(this.frontPlaceholder, size)
		this.measurement.cachePlaceholderProperties(this.startIndex, this.endIndex, this.dataCount, size)
	}

	/** After update complete, and after `measureAfterRendered`, do more check for edge cases. */
	protected override async checkEdgeCasesAfterMeasured() {

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

	/** 
	 * Check whether rendered result can cover scroll viewport,
	 * and update if can't, and will also persist content continuous if possible.
	 */
	protected override async checkCoverage() {

		// Reach both start and end edge.
		if (this.startIndex === 0 && this.endIndex === this.dataCount) {
			return
		}

		// Can only run only one updating each time.
		await this.renderQueue.enqueue(() => this.doCoverageUpdate())
	}

	protected override async doCoverageUpdate() {

		// Which direction is un-covered.
		let unCoveredSituation = await this.measurement.checkUnCoveredDirectionWithEdgeCases(this.startIndex, this.endIndex, this.dataCount)
		if (unCoveredSituation === null) {
			return
		}

		// Update and try to keep same element with same position.
		if (unCoveredSituation === 'end' || unCoveredSituation === 'start') {
			await barrierDOMReading()

			let alignAt: 'start' | 'end' = unCoveredSituation === 'end' ? 'start' : 'end'
			let visibleIndex = this.locateVisibleIndex(alignAt)
			let newStartIndex: number
			let newEndIndex: number | undefined = undefined

			// Scrolling down, render more at end.
			if (alignAt === 'start') {
				newStartIndex = visibleIndex
				newEndIndex = newStartIndex + this.endIndex - this.startIndex

				// First item may be very large and can't skip it, but we must render more at end.
				if (newEndIndex === this.endIndex) {
					newEndIndex++
				}
			}

			// Scrolling up, render more at end.
			else {
				newEndIndex = visibleIndex
				newStartIndex = this.startIndex - this.endIndex + newEndIndex

				// Last item may be very large and can't skip it, but we must render more at start.
				if (newStartIndex === this.startIndex) {
					newStartIndex--
				}
			}

			await this.updateContinuously(alignAt, newStartIndex, newEndIndex)
		}

		// No intersection, reset indices by current scroll position.
		else if (unCoveredSituation === 'break') {
			await this.updatePersistScrollPosition()
			await this.updateBackPlaceholderSize()
			await this.measurement.measureAfterRendered(this.startIndex, this.endIndex)
			await this.checkEdgeCasesAfterMeasured()
		}
	}

	/** Update and make render content continuous. */
	protected override async updateContinuously(
		alignAt: 'start' | 'end',
		newStartIndex: number,
		newEndIndex: number | undefined
	) {
		// If edge index has not changed, no need to reset position, then its `null`.
		let position: number | null = null

		// Failed to do continuous updating, must re-render totally by current indices.
		let needReset = false
		let oldStartIndex = this.startIndex
		let oldEndIndex = this.endIndex

		this.setIndices(newStartIndex, newEndIndex)

		// Has no intersection.
		if (Math.min(this.endIndex, oldEndIndex) - Math.max(this.startIndex, oldStartIndex) <= 0) {
			needReset = true
		}

		// Scrolling down, render more at end.
		else if (alignAt === 'start') {
			
			// Rendered item count changed much, not rendering progressively.
			if (this.startIndex < oldStartIndex) {
				needReset = true
			}

			// Locate to the start position of the first element.
			else if (this.startIndex !== oldStartIndex) {
				let elIndex = this.startIndex - oldStartIndex
				let el = this.repeat.children[elIndex] as HTMLElement

				if (el.localName === 'slot') {
					el = el.firstElementChild as HTMLElement
				}

				await barrierDOMReading()

				// If el located at start, it will move by slider padding top,
				// to keep it's position, should remove slider padding.
				position = this.measurement.sliderProperties.startOffset
					+ this.doa.getOuterOffset(el, this.slider)
					- this.doa.getStartPadding(this.slider)
			}
		}

		// Scrolling up, render more at end.
		else {
			
			// Rendered item count changed much, not rendering progressively.
			if (this.endIndex < oldStartIndex + 1 || this.endIndex > oldEndIndex) {
				needReset = true
			}

			// Locate to the end position of the last element.
			else if (this.endIndex !== oldEndIndex) {
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
		}

		// Totally reset scroll position.
		if (needReset) {
			await this.updateByNewIndices()
		}
		
		// Update continuously.
		else {
			await this.updateBySliderPosition(alignAt, position!)
		}

		await this.updateBackPlaceholderSize()
		await this.measurement.measureAfterRendered(this.startIndex, this.endIndex)
		await this.checkEdgeCasesAfterMeasured()
	}

	/** Reset indices by current scroll position. */
	protected override async updatePersistScrollPosition() {
		let newStartIndex = await this.measurement.calcStartIndexByScrolled()
		this.setIndices(newStartIndex)
		this.alignAt = 'start'

		await this.updateRendering()
		await this.resetPositions(false)
	}

	/** Update by specified slider position. */
	protected override async updateBySliderPosition(direction: 'start' | 'end', position: number | null) {
		this.alignAt = direction
		await this.updateRendering()

		if (position !== null) {
			await this.setPosition(position)
		}
	}

	/** Reset scroll position by current indices. */
	protected override async updateByNewIndices() {
		this.alignAt = 'start'
		await this.updateRendering()
		await this.resetPositions(true)
	}

	/** 
	 * Locate start or after end index at which the item is visible in viewport.
	 * Note it's returned index can be `0~list.length`.
	 * Must after update complete.
	 */
	override locateVisibleIndex(direction: 'start' | 'end', minimumRatio: number = 0): number {
		let children: ArrayLike<Element> = this.repeat.children

		let visibleIndex = locateVisibleIndex(
			children as ArrayLike<HTMLElement>,
			this.slider,
			this.scroller,
			this.doa,
			this.measurement.sliderProperties.startOffset,
			direction,
			minimumRatio
		)

		return visibleIndex + this.startIndex
	}
}