import {AsyncTaskQueue, DOMEvents, ResizeEvents, Timeout, untilReadComplete, untilUpdateComplete} from '@pucelle/ff'
import {locateVisibleIndex} from './visible-index-locator'
import {DirectionalOverflowAccessor} from './directional-overflow-accessor'
import {PartialRendererMeasurement, UnCoveredSituation} from './partial-renderer-measurement'


/** Function for doing updating. */
type UpdateRenderingFn = () => void


interface NeedToApply {

	/** 
	 * Latest `startIndex` property has changed and need to be applied.
	 * Soon need to re-render according to the new start index.
	 * Note it was initialized as `0`.
	 */
	startIndex: number | null

	/** Latest `endIndex` property has changed and need to be applied. */
	endIndex: number | null

	/** Latest `alignDirection` property has changed and need to be applied. */
	alignDirection: 'start' | 'end' | null
}


/**
 * What a partial renderer do:
 *
 * When initialize or update from applying start index:
 * - Update indices.
 * - Update placeholder height and scroll position.
 * - Cause scroll event dispatched
 * - Validate scroll viewport coverage and re-render if required.
 * 
 * When scrolling up or down / left or right:
 * - Update scroll direction.
 * - Validate scroll viewport coverage and adjust `startIndex` or `endIndex` a little if not fully covered.
 */
export class PartialRenderer {

	readonly scroller: HTMLElement
	readonly slider: HTMLElement
	readonly repeat: HTMLElement
	readonly placeholder: HTMLDivElement
	readonly updateRendering: UpdateRenderingFn

	/** Do rendered items measurement. */
	readonly measurement: PartialRendererMeasurement

	/** Help to get and set based on overflow direction. */
	readonly doa: DirectionalOverflowAccessor

	private dataCount: number = 0
	
	/** How many pixels to reserve to reduce update frequency when scrolling. */
	private reservedPixels: number = 200

	/** Enqueue rendering. */
	private renderQueue: AsyncTaskQueue = new AsyncTaskQueue()

	/** Indices and align direction that need to apply. */
	private needToApply: NeedToApply | null = {startIndex: 0, endIndex: null, alignDirection: null}

	/** Cache latest scroll position. */
	private latestScrollPosition: number = 0
	
	/** Cache latest scroll direction. */
	private latestScrollDirection: 'start' | 'end' | null = null

	/** Timeout for quarterly update. */
	private quarterlyUpdateTimeout!: Timeout

	/** 
	 * The start index of the first item in the whole data.
	 * Readonly outside.
	 */
	startIndex: number = 0

	/**
	 * The end slicing index of the live data.
	 * Readonly outside.
	 */
	endIndex: number = 0

	/** 
	 * Latest align direction.
	 * If `start`, `sliderStartPosition` is prepared immediately, and `sliderEndPosition` is prepared after rendered.
	 * Otherwise `sliderEndPosition` is prepared immediately, and `sliderStartPosition` is prepared after rendered.
	 * Readonly outside.
	 */
	alignDirection: 'start' | 'end' = 'start'

	constructor(
		scroller: HTMLElement,
		slider: HTMLElement,
		repeat: HTMLElement,
		placeholder: HTMLDivElement,
		doa: DirectionalOverflowAccessor,
		updateRendering: UpdateRenderingFn
	) {
		this.scroller = scroller
		this.slider = slider
		this.repeat = repeat
		this.placeholder = placeholder
		this.doa = doa
		this.updateRendering = updateRendering

		this.measurement = new PartialRendererMeasurement(scroller, slider, doa)

		// Wait for 2 frames.
		this.quarterlyUpdateTimeout = new Timeout(this.updateQuarterly.bind(this), 33)
	}

	/** 
	 * Set latest `alignDirection`.
	 * Normally should do it before update rendering.
	 */
	private setAlignDirection(direction: 'start' | 'end') {
		this.alignDirection = direction
	}

	/** Set `reservedPixels` property. */
	setReservedPixels(reservedPixels: number) {
		this.reservedPixels = reservedPixels
	}

	/** Set measurement `itemSizeBalanced` property. */
	setItemSizeBalanced(itemSizeBalanced: boolean) {
		this.measurement.setItemSizeBalanced(itemSizeBalanced)
	}

	/** 
	 * Set total data count before updating.
	 * Not set data count will not update or enqueue update.
	 */
	setDataCount(dataCount: number) {
		this.dataCount = dataCount
	}

	/** 
	 * Set start and end index of live data range,
	 * and align direction to indicate how render part align with scroll viewport.
	 * 
	 * `startIndex` and `endIndex` may be adjusted, but would include original index range.
	 * 
	 * Set `alignDirection` to `start` will cause item at `startIndex`
	 * been located at the start edge of scroll viewport.
	 * This is also the default action.
	 * 
	 * Set `alignDirection` to `end` will cause item at `endIndex`
	 * been located at the end edge of scroll viewport.
	 */
	setRenderPart(startIndex: number, endIndex: number | null = null, alignDirection: 'start' | 'end' | null = null) {
		this.needToApply = {
			startIndex,
			endIndex: endIndex,
			alignDirection: alignDirection,
		}
	}

	/** After component use this partial renderer get connected. */
	async connect() {
		DOMEvents.on(this.scroller, 'scroll', this.onScrollerScroll, this, {passive: true})

		await untilUpdateComplete()
		this.readScrollerSize()
		ResizeEvents.on(this.scroller, this.readScrollerSize, this)
	}

	/** After component use this partial renderer will get disconnected. */
	disconnect() {
		this.quarterlyUpdateTimeout.cancel()
		DOMEvents.off(this.scroller, 'scroll', this.onScrollerScroll, this)
		ResizeEvents.off(this.scroller, this.readScrollerSize, this)
	}

	/** On scroller scroll event. */
	private onScrollerScroll() {
		this.updateLatestScrollProperties()
		this.updateCoverage()
	}

	/** Update and cache latest scroll position and direction. */
	private updateLatestScrollProperties() {
		let scrollPosition = this.doa.getScrollPosition(this.scroller)
		let scrollDirection = scrollPosition >= this.latestScrollPosition ? 'end' : 'start'
		this.latestScrollPosition = scrollPosition
		this.latestScrollDirection = scrollDirection as 'start' | 'end'
	}

	/** Read new scroller size. */
	private readScrollerSize() {
		this.measurement.readScrollerSize()
	}

	/** Update from applying start index or updating data. */
	async update() {
		this.quarterlyUpdateTimeout.cancel()
		let completeRendering = await this.renderQueue.request()


		//// Can only write dom properties now.

		let hasMeasured = this.measurement.hasMeasuredItemSize()
		let oldItemSize = this.measurement.getItemSize()
		let oldRenderedCount = this.endIndex - this.startIndex

		// Adjust scroll position by specified indices.
		if (this.needToApply) {
			this.updateWithNewIndices(hasMeasured)
			this.needToApply = null
		}

		// Data changed, try persist start index and scroll position.
		else {
			this.updateWithStartIndexPersist()
		}

		if (hasMeasured) {
			this.updatePlaceholderSizeProgressively()
		}


		//// Can only read dom properties now.

		await untilUpdateComplete()

		this.measurement.measureAfterRendered(this.startIndex, this.endIndex, this.alignDirection)
		this.checkEdgeCasesAfterMeasured()
		completeRendering()


		// If item size become smaller much, may cause can't fully cover.
		// If rendered fewer items, may also cause.
		// If newly measured item size, should update coverage.
		let newRenderedCount = this.endIndex - this.startIndex
		let newItemSize = this.measurement.getItemSize()

		if (newItemSize + 5 < oldItemSize
			|| newRenderedCount < oldRenderedCount
			|| !hasMeasured && this.measurement.hasMeasuredItemSize()
		) {
			await this.updateCoverage()
		}
	}

	/** Update when start index specified and need to apply. */
	private updateWithNewIndices(hasMeasured: boolean) {
		this.setIndices(this.needToApply!.startIndex!, this.needToApply!.endIndex)
		this.setAlignDirection(this.needToApply!.alignDirection ?? 'start')
		this.updateRendering()
		this.resetPositions(hasMeasured)
	}

	/** Update data normally, and try to keep indices and scroll position. */
	private updateWithStartIndexPersist() {
		let oldStartIndex = this.startIndex
		let oldAlignDirection = this.alignDirection

		// Required, may data count increase or decrease.
		this.setIndices(this.startIndex)

		this.setAlignDirection('start')
		this.updateRendering()
		
		// If start index has not changed, needs to persist the scroll position.
		if (oldStartIndex === this.startIndex) {

			// Rendered things may change, should not persist end scroll position.
			// Here we try to toggle to persist start scroll position.
			if (oldAlignDirection === 'end') {
				this.setSliderPosition(this.measurement.cachedSliderStartPosition)
			}
		}

		// If start index has changed, reset positions.
		else {
			this.resetPositions(true)
		}
	}

	/** Update start and end indices before rendering. */
	private setIndices(newStartIndex: number, newEndIndex: number | null = null) {
		let itemSize = this.measurement.getItemSize()
		let renderCount = this.measurement.getSafeRenderCount(itemSize, this.reservedPixels)

		newStartIndex = Math.min(newStartIndex, this.dataCount - renderCount)
		newStartIndex = Math.max(0, newStartIndex)

		newEndIndex = newEndIndex ?? newStartIndex + renderCount
		newEndIndex = Math.min(newEndIndex, this.dataCount)

		this.startIndex = newStartIndex
		this.endIndex = newEndIndex
	}

	/** 
	 * Reset slider and scroll position, make first item appear in the start edge.
	 * `alignDirection` must have been updated.
	 * 
	 * `needRestScrollOffset`: specifies as `false` if current indices is calculated from current scroll offset,
	 * 	  or for the first time rendering.
	 */
	private resetPositions(needRestScrollOffset: boolean) {
		let newPosition = this.measurement.calcSliderPositionByIndices(this.startIndex, this.endIndex, this.alignDirection)
		this.setSliderPosition(newPosition)

		if (needRestScrollOffset) {

			// Align scroller start with slider start.
			let scrollPosition = newPosition

			// Align scroller end with slider end.
			if (this.alignDirection === 'end') {
				scrollPosition -= this.measurement.cachedScrollerSize
			}

			this.doa.setScrollPosition(this.scroller, scrollPosition)
			this.latestScrollPosition = scrollPosition
			this.latestScrollDirection = null
		}
	}

	/** 
	 * Update slider position after setting new indices.
	 * The position is the slider start/end edge (depend on align direction)
	 * relative to scroller start.
	 */
	private setSliderPosition(position: number) {
		if (this.alignDirection === 'start') {
			this.doa.setStartPosition(this.slider, position + 'px')
			this.doa.setEndPosition(this.slider, 'auto')
		}
		else {
			this.doa.setStartPosition(this.slider, 'auto')
			this.doa.setEndPosition(this.slider, this.measurement.cachedScrollerSize - position + 'px')
		}

		this.measurement.cacheSliderPosition(position, this.alignDirection)
	}

	/** 
	 * Update height/width of placeholder progressive.
	 * When scrolling down, and will render more items in the end, update size.
	 * No need to update when scrolling up.
	 */
	private updatePlaceholderSizeProgressively() {
		let shouldUpdate = this.measurement.shouldUpdatePlaceholderSize(this.endIndex, this.dataCount)
		if (!shouldUpdate) {
			return
		}

		let placeholderSize = this.measurement.calcPlaceholderSizeByIndices(this.startIndex, this.endIndex, this.dataCount, this.alignDirection)
		
		// Changes few, no need to update.
		if (Math.abs(placeholderSize - this.measurement.cachedPlaceholderSize) < 10) {
			return
		}
		
		this.setPlaceholderSize(placeholderSize)
	}

	/** Set placeholder size. */
	private setPlaceholderSize(size: number) {
		this.doa.setSize(this.placeholder, size)
		this.measurement.cachePlaceholderSize(size)
	}

	/** After render complete, and after `measureAfterRendered`, do more check for edge cases. */
	private checkEdgeCasesAfterMeasured() {

		// When reach start index but may not reach scroll start.
		if (this.startIndex === 0) {

			// E.g., `sliderStartPosition` is `10`,
			// means have 10px higher than start,
			// reset to start position 0 cause this 10px get removed,
			// And we need to scroll up (element down) for 10px.
			this.scroller.scrollTop -= this.measurement.cachedSliderStartPosition

			this.setAlignDirection('start')
			this.setSliderPosition(0)

			// Should also update `sliderEndPosition`,
			// but it will not be used before next update.
		}

		// When reach end index but not scroll end.
		else if (this.endIndex === this.dataCount) {
			this.setPlaceholderSize(this.measurement.cachedSliderEndPosition)
		}

		// When reach scroll index but not start index.
		else if (this.startIndex > 0 && this.measurement.cachedSliderStartPosition <= 0) {
			let newPosition = this.measurement.getItemSize() * this.startIndex
			let moreSize = newPosition - this.measurement.cachedSliderStartPosition

			this.scroller.scrollTop += moreSize
			this.setPlaceholderSize(this.measurement.cachedPlaceholderSize + moreSize)
			this.setAlignDirection('start')
			this.setSliderPosition(newPosition)
		}

		// When reach scroll end but not end index.
		// Note `scrollTop` value may be float, but two heights are int.
		else if (this.endIndex < this.dataCount
			&& this.scroller.scrollTop + this.scroller.clientHeight >= this.scroller.scrollHeight
		) {
			let moreSize = this.measurement.getItemSize() * (this.dataCount - this.endIndex)
			this.setPlaceholderSize(this.measurement.cachedPlaceholderSize + moreSize)
		}
	}

	/** 
	 * Check whether rendered result can cover scroll viewport,
	 * and update if can't, and will also persist content continuous if possible.
	 */
	async updateCoverage() {
		this.quarterlyUpdateTimeout.cancel()

		// Reach both start and end edge.
		if (this.startIndex === 0 && this.endIndex === this.dataCount) {
			return
		}

		let completeRendering = await this.renderQueue.request()
		

		//// Can only read dom properties now.

		// Which direction is un-covered.
		let unCoveredSituation = this.measurement.checkUnCoveredSituation(this.startIndex, this.endIndex, this.dataCount)
	
	
		// Update and try to keep same element with same position.
		if (unCoveredSituation === 'end' || unCoveredSituation === 'start') {
			await this.updateContinuously(unCoveredSituation)
		}

		// Rerender to get closer to next un-covered after idle.
		else if (unCoveredSituation === 'quarterly-start' || unCoveredSituation === 'quarterly-end') {
			if (unCoveredSituation === 'quarterly-start' && this.latestScrollDirection === 'start'
				|| unCoveredSituation === 'quarterly-end' && this.latestScrollDirection === 'end'
			) {
				this.quarterlyUpdateTimeout.reset()
			}
		}

		// No intersection, reset indices by current scroll position.
		else if (unCoveredSituation === 'break') {

			//// Read complete, now can only write.
			await untilReadComplete()

			this.updatePersistScrollPosition()
			this.updatePlaceholderSizeProgressively()


			//// Write complete, now can only read dom properties below.
			await untilUpdateComplete()

			this.measurement.measureAfterRendered(this.startIndex, this.endIndex, this.alignDirection)
			this.checkEdgeCasesAfterMeasured()
		}

		completeRendering()
	}

	/** Update and make render content continuous. */
	private async updateContinuously(unCoveredSituation: Exclude<UnCoveredSituation, 'break'>) {
		let alignDirection: 'start' | 'end' = unCoveredSituation === 'end' || unCoveredSituation === 'quarterly-end' ? 'start' : 'end'
		let isQuarterly = unCoveredSituation === 'quarterly-start' || unCoveredSituation === 'quarterly-end'
		let visibleIndex = this.locateVisibleIndex(alignDirection)

		// If edge index has not changed, no need to reset position, then its `null`.
		let position: number | null = null
	
		// Scrolling down, render more at end.
		if (alignDirection === 'start') {
			let oldStartIndex = this.startIndex
			let newStartIndex = isQuarterly ? Math.floor((oldStartIndex  + visibleIndex * 2) / 3) : visibleIndex

			this.setIndices(newStartIndex)

			// Rendered item count changed much, not rendering progressively.
			if (this.startIndex < oldStartIndex) {
				unCoveredSituation = 'reset'
			}

			// Locate to the start position of the first element.
			else if (this.startIndex !== oldStartIndex) {
				let elIndex = this.startIndex - oldStartIndex
				let el = this.repeat.children[elIndex] as HTMLElement

				position = this.measurement.cachedSliderStartPosition + this.doa.getOuterOffsetPosition(el)
			}
		}

		// Scrolling up, render more at end.
		else {
			let oldStartIndex = this.startIndex
			let oldEndIndex = this.endIndex
			let newEndIndex = isQuarterly ? Math.floor((oldEndIndex  + visibleIndex * 2) / 3) : visibleIndex
			let newStartIndex = this.startIndex - this.endIndex + newEndIndex

			this.setIndices(newStartIndex)

			// Rendered item count changed much, not rendering progressively.
			if (this.endIndex < oldStartIndex + 1 || this.endIndex > oldEndIndex) {
				unCoveredSituation = 'reset'
			}

			// Locate to the end position of the last element.
			else if (this.endIndex !== oldEndIndex) {
				let elIndex = this.endIndex - oldStartIndex - 1
				let el = this.repeat.children[elIndex] as HTMLElement

				position = this.measurement.cachedSliderStartPosition + this.doa.getEndOuterOffsetPosition(el)
			}
		}


		//// Read complete, now can only write.
		await untilReadComplete()


		// Totally reset scroll position.
		if (unCoveredSituation === 'reset') {
			this.updateByNewIndices()
		}
		
		// Update continuously.
		else {
			this.updateBySliderPosition(alignDirection, position!)
		}

		this.updatePlaceholderSizeProgressively()


		//// Write complete, now can only read dom properties below.
		await untilUpdateComplete()

		this.measurement.measureAfterRendered(this.startIndex, this.endIndex, this.alignDirection)
		this.checkEdgeCasesAfterMeasured()
	}

	/** Update only a little after scrolling. */
	private async updateQuarterly() {
		let scrollDirection = this.latestScrollDirection
		if (scrollDirection === null) {
			return
		}

		let completeRendering = await this.renderQueue.request()

		let unCoveredSituation: UnCoveredSituation = scrollDirection === 'end' ? 'quarterly-end' : 'quarterly-start'
		await this.updateContinuously(unCoveredSituation)

		completeRendering()
	}

	/** Locate start or end index at which the item is visible in viewport. */
	locateVisibleIndex(direction: 'start' | 'end'): number {
		let visibleIndex = locateVisibleIndex(
			this.scroller,
			this.repeat.children as ArrayLike<Element> as ArrayLike<HTMLElement>,
			this.doa,
			this.measurement.cachedSliderStartPosition,
			direction
		)

		return visibleIndex + this.startIndex
	}

	/** Reset indices by current scroll position. */
	private updatePersistScrollPosition() {
		this.resetIndicesByCurrentPosition()
		this.setAlignDirection('start')
		this.updateRendering()
		this.resetPositions(false)
	}

	/** Reset indices by current scroll position. */
	private resetIndicesByCurrentPosition() {
		let itemSize = this.measurement.getItemSize()
		let scrollPosition = this.doa.getScrollPosition(this.scroller)
		let newStartIndex = itemSize > 0 ? Math.floor(scrollPosition / itemSize) : 0

		this.setIndices(newStartIndex)
	}

	/** Update by specified slider position. */
	private updateBySliderPosition(direction: 'start' | 'end', position: number | null) {
		this.setAlignDirection(direction)
		this.updateRendering()

		if (position !== null) {
			this.setSliderPosition(position)
		}
	}

	/** Reset scroll position by current indices. */
	private updateByNewIndices() {
		this.setAlignDirection('start')
		this.updateRendering()
		this.resetPositions(true)
	}
}