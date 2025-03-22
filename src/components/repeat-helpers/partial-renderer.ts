import {AsyncTaskQueue, DOMEvents, ResizeWatcher, Timeout, untilUpdateComplete} from '@pucelle/ff'
import {locateVisibleIndex} from './visible-index-locator'
import {DirectionalOverflowAccessor} from './directional-overflow-accessor'
import {PartialRendererMeasurement} from './partial-renderer-measurement'


/** Function for doing updating. */
type UpdateRenderingFn = () => void


interface NeedToApply {

	/** 
	 * Latest `startIndex` property has changed and need to be applied.
	 * Soon need to re-render according to the new start index.
	 * Note it was initialized as `0`.
	 * When `alignDirection=start`, it must exist.
	 */
	startIndex: number | undefined

	/** 
	 * Latest `endIndex` property has changed and need to be applied.
	 * When `alignDirection=end`, it must exist.
	 */
	endIndex: number | undefined

	/** Latest `alignDirection` property has changed and need to be applied. */
	alignDirection: 'start' | 'end'

	/** 
	 * If is `true`, will try to persist current scroll position,
	 * by adjusting `startIndex` or `endIndex`.
	 */
	tryAdjustToPersistScrollPosition: boolean
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
	private needToApply: NeedToApply | null = {
		startIndex: 0,
		endIndex: undefined,
		alignDirection: 'start',
		tryAdjustToPersistScrollPosition: false,
	}

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

		// Wait for 1 frames.
		this.quarterlyUpdateTimeout = new Timeout(this.updateQuarterly.bind(this), 17)
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
	setRenderIndices(
		startIndex: number | undefined,
		endIndex: number | undefined = undefined,
		alignDirection: 'start' | 'end' = 'start',
		tryAdjustToPersistScrollPosition: boolean = false
	) {
		this.needToApply = {
			startIndex,
			endIndex,
			alignDirection,
			tryAdjustToPersistScrollPosition,
		}
	}

	/** After component that use this partial renderer get connected. */
	async connect() {
		DOMEvents.on(this.scroller, 'scroll', this.onScrollerScroll, this, {passive: true})
		
		await untilUpdateComplete()
		this.readScrollerSize()
		ResizeWatcher.watch(this.scroller, this.readScrollerSize, this)
	}

	/** After component that use this partial renderer will get disconnected. */
	disconnect() {

		// For restoring scroll position.
		this.setRenderIndices(this.locateVisibleIndex('start'))

		this.quarterlyUpdateTimeout.cancel()
		DOMEvents.off(this.scroller, 'scroll', this.onScrollerScroll, this)
		ResizeWatcher.unwatch(this.scroller)
	}

	/** On scroller scroll event. */
	private onScrollerScroll() {
		this.updateLatestScrollProperties()
		this.checkCoverage()
	}

	/** Update and cache latest scroll position and direction. */
	private updateLatestScrollProperties() {
		let scrolled = this.doa.getScrolled(this.scroller)
		let scrollDirection = scrolled >= this.latestScrollPosition ? 'end' : 'start'
		this.latestScrollPosition = scrolled
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

		let hasMeasured = this.measurement.getItemSize() > 0
		let continuouslyUpdated: boolean = false

		// Adjust scroll position by specified indices.
		if (this.needToApply) {
			continuouslyUpdated = await this.updateWithApplyingIndices(hasMeasured)
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

		if (!continuouslyUpdated) {
			await untilUpdateComplete()

			this.measurement.measureAfterRendered(this.startIndex, this.endIndex, this.alignDirection)
			this.checkEdgeCasesAfterMeasured()
		}

		completeRendering()


		// If item size become smaller much, may cause can't fully covered.
		await this.checkCoverage()
	}

	/** Update when start index specified and need to apply. */
	private async updateWithApplyingIndices(hasMeasured: boolean): Promise<boolean> {
		let {startIndex, endIndex, alignDirection, tryAdjustToPersistScrollPosition: tryAdjustToPersist} = this.needToApply!
		let renderCount = this.endIndex - this.startIndex
	
		// Adjust index and persist continuous.
		if (tryAdjustToPersist && renderCount > 0) {
			let startVisibleIndex = this.locateVisibleIndex('start')
			let endVisibleIndex = this.locateVisibleIndex('end')
			let canPersist = false

			if (alignDirection === 'start') {
				let renderCountToPersist = Math.max(endVisibleIndex, startIndex! + 1) - Math.min(startVisibleIndex, startIndex!)
				if (renderCountToPersist <= renderCount) {
					startIndex = Math.min(startVisibleIndex, startIndex!)
					endIndex = startIndex + renderCount
					canPersist = true
				}

				// Try keep most intersection.
				else if (startIndex! > endVisibleIndex) {
					endIndex = Math.max(endVisibleIndex, startIndex! + 1)
					startIndex = endIndex - renderCount
				}
			}
			else {
				let renderCountToPersist = Math.max(endVisibleIndex, endIndex!) - Math.min(startVisibleIndex, endIndex!)
				if (renderCountToPersist <= renderCount) {
					endIndex = Math.max(endVisibleIndex, endIndex!)
					startIndex = endIndex - renderCount
					canPersist = true
				}

				// Try keep most intersection.
				else if (endIndex! < startVisibleIndex) {
					startIndex = endIndex! - 1
					endIndex = startIndex + renderCount
				}
			}

			if (canPersist) {
				await this.updateContinuously(alignDirection, startIndex!, endIndex)
				return true
			}
		}

		// Reset scroll position, but will align item with index viewport edge.
		this.setIndices(startIndex, endIndex)
		this.setAlignDirection(alignDirection ?? 'start')
		this.updateRendering()
		this.resetPositions(hasMeasured, tryAdjustToPersist ? undefined : startIndex, tryAdjustToPersist ? undefined : endIndex)

		return false
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
	private setIndices(newStartIndex: number | undefined, newEndIndex: number | undefined = undefined) {
		let itemSize = this.measurement.getItemSize()
		let renderCount = this.measurement.getSafeRenderCount(itemSize, this.reservedPixels)

		if (newStartIndex === undefined) {
			newStartIndex = newEndIndex! - renderCount
		}

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
	 * 
	 * If `startIndex` and `endIndex` specified, will adjust scroll position to align them.
	 */
	private resetPositions(needRestScrollOffset: boolean, startIndex: number = this.startIndex, endIndex: number = this.endIndex) {
		let newSliderPosition = this.measurement.calcSliderPositionByIndices(this.startIndex, this.endIndex, this.alignDirection)
		this.setSliderPosition(newSliderPosition)
		this.measurement.breakContinuousRenderRange()

		if (needRestScrollOffset) {
			startIndex = Math.max(startIndex, this.startIndex)
			endIndex = Math.min(endIndex, this.endIndex)
	
			// Align scroller start with slider start.
			let scrollPosition = this.measurement.calcSliderPositionByIndices(startIndex, endIndex, this.alignDirection)

			// Align scroller end with slider end.
			if (this.alignDirection === 'end') {
				scrollPosition -= this.measurement.cachedScrollerSize
			}

			this.doa.setScrolled(this.scroller, scrollPosition)
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
	 * Update height/width of placeholder progressive before next time rendering.
	 * When scrolling down, and will render more items in the end, update size.
	 * No need to update when scrolling up.
	 */
	private updatePlaceholderSizeProgressively() {
		let shouldUpdate = this.measurement.shouldUpdatePlaceholderSize(this.startIndex, this.endIndex, this.dataCount)
		if (!shouldUpdate) {
			return
		}

		let placeholderSize = this.measurement.calcPlaceholderSize(this.startIndex, this.endIndex, this.dataCount, this.alignDirection)
		this.setPlaceholderSize(placeholderSize)
	}

	/** Set placeholder size. */
	private setPlaceholderSize(size: number) {
		this.doa.setSize(this.placeholder, size)
		this.measurement.cachePlaceholderProperties(this.endIndex, this.dataCount, size)
	}

	/** After update complete, and after `measureAfterRendered`, do more check for edge cases. */
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

		// When reach scroll index but not start index.
		else if (this.startIndex > 0 && this.measurement.cachedSliderStartPosition <= 0) {

			// Guess size of items before, and add missing size of current rendering.
			let newPosition = this.measurement.getItemSize() * this.startIndex
			let moreSize = newPosition - this.measurement.cachedSliderStartPosition

			this.scroller.scrollTop += moreSize
			this.setPlaceholderSize(this.measurement.cachedPlaceholderProperties.placeholderSize + moreSize)
			this.setAlignDirection('start')
			this.setSliderPosition(newPosition)
		}

		// When reach end index but not scroll end.
		if (this.endIndex === this.dataCount) {
			this.setPlaceholderSize(this.measurement.cachedSliderEndPosition)
		}

		// When reach scroll end but not end index.
		// Note `scrollTop` value may be float, but two heights are int.
		else if (this.endIndex < this.dataCount
			&& this.scroller.scrollTop + this.scroller.clientHeight >= this.scroller.scrollHeight
		) {
			let moreSize = this.measurement.getItemSize() * (this.dataCount - this.endIndex)
			this.setPlaceholderSize(this.measurement.cachedPlaceholderProperties.placeholderSize + moreSize)
		}
	}

	/** 
	 * Check whether rendered result can cover scroll viewport,
	 * and update if can't, and will also persist content continuous if possible.
	 */
	private async checkCoverage() {
		this.quarterlyUpdateTimeout.cancel()

		// Reach both start and end edge.
		if (this.startIndex === 0 && this.endIndex === this.dataCount) {
			return
		}


		//// Can only read dom properties now.

		// Which direction is un-covered.
		let unCoveredSituation = this.measurement.checkUnCoveredSituation(this.startIndex, this.endIndex, this.dataCount, this.latestScrollDirection)
		if (unCoveredSituation === null) {
			return
		}

		let completeRendering = await this.renderQueue.request()

		// Update and try to keep same element with same position.
		if (unCoveredSituation === 'end' || unCoveredSituation === 'start') {
			let alignDirection: 'start' | 'end' = unCoveredSituation === 'end' ? 'start' : 'end'
			let visibleIndex = this.locateVisibleIndex(alignDirection)
			let newStartIndex: number
			let newEndIndex: number | undefined = undefined

			// Scrolling down, render more at end.
			if (alignDirection === 'start') {
				newStartIndex = visibleIndex
			}

			// Scrolling up, render more at end.
			else {
				newEndIndex = visibleIndex
				newStartIndex = this.startIndex - this.endIndex + newEndIndex
			}

			await this.updateContinuously(alignDirection, newStartIndex, newEndIndex)
		}

		// Rerender to get closer to next un-covered after idle.
		else if (unCoveredSituation === 'quarterly-start' || unCoveredSituation === 'quarterly-end') {
			this.quarterlyUpdateTimeout.reset()
		}

		// No intersection, reset indices by current scroll position.
		else if (unCoveredSituation === 'break') {

			//// Read complete, now can only write.

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
	private async updateContinuously(
		alignDirection: 'start' | 'end',
		newStartIndex: number,
		newEndIndex: number | undefined
	) {

		//// Can only read dom properties below.

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
		else if (alignDirection === 'start') {
			// Rendered item count changed much, not rendering progressively.
			if (this.startIndex < oldStartIndex) {
				needReset = true
			}

			// Locate to the start position of the first element.
			else if (this.startIndex !== oldStartIndex) {
				let elIndex = this.startIndex - oldStartIndex
				let el = this.repeat.children[elIndex] as HTMLElement

				// If el located at start, it will move by slider padding top,
				// to keep it's position, should remove slider padding.
				position = this.measurement.cachedSliderStartPosition
					+ this.doa.getOuterOffset(el)
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

				// If el located at end, it will move up by slider padding bottom,
				// to keep it's position, should add slider bottom padding.
				position = this.measurement.cachedSliderStartPosition
					+ this.doa.getEndOuterOffset(el)
					+ this.doa.getEndPadding(this.slider)
			}
		}


		//// Read complete, now can only write.


		// Totally reset scroll position.
		if (needReset) {
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
		let alignDirection: 'start' | 'end' = scrollDirection === 'end' ? 'start' : 'end'
		let visibleIndex = this.locateVisibleIndex(alignDirection)
		let newStartIndex: number
		let newEndIndex: number | undefined = undefined

		// Scrolling down, render more at end.
		if (alignDirection === 'start') {
			let oldStartIndex = this.startIndex
			newStartIndex = Math.floor((oldStartIndex  + visibleIndex * 2) / 3)
		}

		// Scrolling up, render more at end.
		else {
			let oldEndIndex = this.endIndex

			newEndIndex = Math.floor((oldEndIndex  + visibleIndex * 2) / 3)
			newStartIndex = this.startIndex - this.endIndex + newEndIndex
		}

		await this.updateContinuously(alignDirection, newStartIndex, newEndIndex)

		completeRendering()
	}

	/** 
	 * Locate start or after end index at which the item is visible in viewport.
	 * Must after update complete.
	 */
	locateVisibleIndex(direction: 'start' | 'end', minimumRatio: number = 0): number {
		let visibleIndex = locateVisibleIndex(
			this.scroller,
			this.repeat.children as ArrayLike<Element> as ArrayLike<HTMLElement>,
			this.doa,
			this.measurement.cachedSliderStartPosition,
			direction,
			minimumRatio
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
		let scrolled = this.doa.getScrolled(this.scroller)
		let newStartIndex = itemSize > 0 ? Math.floor(scrolled / itemSize) : 0

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