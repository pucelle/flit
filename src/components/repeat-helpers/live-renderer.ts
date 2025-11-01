import {AsyncTaskQueue, barrierDOMReading, barrierDOMWriting, ResizeWatcher, sleep} from '@pucelle/ff'
import {locateVisibleIndex} from './index-locator'
import {DirectionalOverflowAccessor} from './directional-overflow-accessor'
import {LiveRendererMeasurement} from './live-renderer-measurement'
import {DOMEvents, untilFirstPaintCompleted} from '@pucelle/lupos'


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
	tryPersistContinuous: boolean
}


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
 * - Update scroll direction.
 * - Validate scroll viewport coverage and adjust `startIndex` or `endIndex` a little if not fully covered.
 */
export class LiveRenderer {

	readonly scroller: HTMLElement
	readonly slider: HTMLElement
	readonly repeat: HTMLElement
	readonly placeholder: HTMLDivElement | null
	readonly updateCallback: () => void

	/** 
	 * Whether partial rendering content as follower,
	 * so the partial renderer only renders by current scroll position,
	 * and will never cause scroll position change.
	 */
	readonly asFollower: boolean

	/** Do rendered items measurement. */
	readonly measurement: LiveRendererMeasurement

	/** Help to get and set based on overflow direction. */
	readonly doa: DirectionalOverflowAccessor

	/** How many pixels to reserve to reduce update frequency when scrolling. */
	reservedPixels: number = 200

	/** Total data count. */
	dataCount: number = 0

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

	/** Enqueue rendering. */
	private renderQueue: AsyncTaskQueue = new AsyncTaskQueue()

	/** Indices and align direction that need to apply. */
	private needToApply: NeedToApply | null = {
		startIndex: 0,
		endIndex: undefined,
		alignDirection: 'start',
		tryPersistContinuous: false,
	}

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
		this.scroller = scroller
		this.slider = slider
		this.repeat = repeat
		this.placeholder = placeholder
		this.asFollower = asFollower
		this.doa = doa
		this.updateCallback = updateCallback
		this.measurement = new LiveRendererMeasurement(scroller, slider, doa)
	}


	/** Set `preEndPositions` before updating. */
	setPreEndPositions(positions: number[] | null) {
		this.measurement.setPreEndPositions(positions)
	}

	/** If provided and not 0, will use it and not read scroller size. */
	setScrollSize(size: number) {
		this.directScrollSize = size
		this.measurement.setScrollerSize(size)
	}

	/** 
	 * Guess an item size for first-time paint,
	 * and avoid it checking for item-size and render twice.
	 */
	setGuessedItemSize(size: number) {
		this.measurement.setGuessedItemSize(size)
	}

	/** 
	 * Set start and end index of live data range,
	 * and align direction to indicate how render part align with scroll viewport.
	 * 
	 * `startIndex` and `endIndex` may be adjusted, but would include original index range.
	 * 
	 * Set `alignDirection` to `start` will cause item at `startIndex`
	 * been located at the start edge of scroll viewport,
	 * thus `startIndex` must be provided.
	 * This is also the default action.
	 * 
	 * Set `alignDirection` to `end` will cause item at `endIndex`
	 * been located at the end edge of scroll viewport,
	 * thus `endIndex` must be provided.
	 * 
	 * If `tryPersistContinuous` is true, will try to adjust render indices a little
	 * to persist continuous rendering result, but still ensure to render required elements.
	 */
	setRenderIndices(
		startIndex: number | undefined,
		endIndex: number | undefined = undefined,
		alignDirection: 'start' | 'end' = 'start',
		tryPersistContinuous: boolean = false
	) {
		this.needToApply = {
			startIndex,
			endIndex,
			alignDirection,
			tryPersistContinuous,
		}
	}

	/** After component that use this renderer get connected. */
	async connect() {
		DOMEvents.on(this.scroller, 'scroll', this.onScrollerScroll, this, {passive: true})
		await untilFirstPaintCompleted()

		if (!this.directScrollSize) {
			await this.readScrollerSize()
			ResizeWatcher.watch(this.scroller, this.readScrollerSize, this)
		}

		ResizeWatcher.watch(this.slider, this.onSliderSizeUpdated, this)
	}

	/** After component that use this renderer will get disconnected. */
	async disconnect() {

		// For restoring scroll position later.
		if (!this.asFollower) {
			await barrierDOMReading()
			this.setRenderIndices(this.locateVisibleIndex('start'))
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
			await this.measurement.measureAfterRendered(this.startIndex, this.endIndex, this.alignDirection)

			// Finally check coverage.
			await this.checkCoverage()
		}
	}

	/** Calls `updateCallback`. */
	private async updateRendering() {
		await barrierDOMWriting()
		this.updateCallback()

		this.preventingSliderSizeUpdate = true
		await sleep(0)
		this.preventingSliderSizeUpdate = false
	}

	/** Update from applying start index or updating data. */
	async update() {

		// Don't want to force re-layout before first time paint.
		await untilFirstPaintCompleted()

		// Can only run only one updating each time.
		await this.renderQueue.enqueue(() => this.doNormalUpdate())

		// If item size become smaller much, may cause can't fully covered.
		await this.checkCoverage()
	}

	private async doNormalUpdate() {
		let hasMeasuredBefore = this.measurement.hasMeasured()
		let continuouslyUpdated: boolean = false
		let needToApply = this.needToApply

		// Adjust scroll position by specified indices.
		if (needToApply) {
			this.needToApply = null

			// `continuouslyUpdated` means did `measureAfterRendered`.
			continuouslyUpdated = await this.updateByApplyingIndices(needToApply)
		}

		// Data changed, try persist start index and scroll position.
		else {
			await this.updateWithStartIndexPersist()
		}

		if (!continuouslyUpdated) {
			await this.measurement.measureAfterRendered(this.startIndex, this.endIndex, this.alignDirection)

			// Must update placeholder size firstly, or may can't set scroll position correctly.
			await this.setPlaceholderSizeProgressively()

			// If newly measured, and render from a non-zero index, re-render after measured.
			if (needToApply && !hasMeasuredBefore && needToApply.startIndex) {
				await this.updateByApplyingIndices(needToApply)
				await this.measurement.measureAfterRendered(this.startIndex, this.endIndex, this.alignDirection)
			}

			// If has not measured, no need to check, will soon update again by coverage checking.
			if (hasMeasuredBefore) {
				await this.checkEdgeCasesAfterMeasured()
			}
		}
	}

	/** Update when start index specified and need to apply. */
	private async updateByApplyingIndices(needToApply: NeedToApply): Promise<boolean> {
		let {startIndex, endIndex, alignDirection, tryPersistContinuous} = needToApply
		let hasMeasured = this.measurement.hasMeasured()
		let renderCount = this.endIndex - this.startIndex

		// Adjust index and persist continuous.
		if (tryPersistContinuous && renderCount > 0) {
			await barrierDOMReading()
	
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
		this.alignDirection = alignDirection ?? 'start'

		await this.updateRendering()

		await this.resetPositions(
			hasMeasured,
			tryPersistContinuous ? undefined : startIndex,
			tryPersistContinuous ? undefined : endIndex
		)

		return false
	}

	/** Update data normally, and try to keep indices and scroll position. */
	private async updateWithStartIndexPersist() {
		let canPersist = true

		// Can't persist old index and position.
		if (this.endIndex > this.dataCount) {
			canPersist = false
		}
		
		// Required, may data count increase or decrease.
		this.setIndices(this.startIndex)
		this.alignDirection = 'start'

		await this.updateRendering()

		if (!canPersist) {
			await this.resetPositions(true)
		}
	}

	/** Update start and end indices before rendering. */
	private setIndices(newStartIndex: number | undefined, newEndIndex: number | undefined = undefined) {
		let currentRenderCount = this.endIndex - this.startIndex
		let renderCount = this.measurement.getSafeRenderCount(this.reservedPixels, currentRenderCount)

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
	 * `needResetScrollOffset`: specifies as `false` if current indices is calculated from current scroll offset,
	 * 	  or for the first time rendering.
	 * 
	 * If `needResetScrollOffset` is `true`, will adjust scroll offset and align to the element
	 * specified by `alignToStartIndex`, `alignToEndIndex` are specified.
	 */
	private async resetPositions(needResetScrollOffset: boolean, alignToStartIndex: number = this.startIndex, alignToEndIndex: number = this.endIndex) {
		let newSliderPosition = this.measurement.calcSliderPositionByIndex(this.alignDirection === 'start' ? this.startIndex : this.endIndex, this.alignDirection)
		
		await this.setSliderPosition(newSliderPosition)

		// We'd better not break continuous range here, or drag scroll thumb
		// you will find scroll thumb jump when item size is not stable.
		//this.measurement.breakContinuousRenderRange()

		if (needResetScrollOffset && !this.asFollower) {
			alignToStartIndex = Math.min(Math.max(alignToStartIndex, this.startIndex), this.endIndex - 1)
			alignToEndIndex = Math.max(Math.min(alignToEndIndex, this.endIndex), this.startIndex)
	
			// Align scroller start with slider start.
			let scrollPosition = this.measurement.calcSliderPositionByIndex(
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

	/** 
	 * Update slider position after setting new indices.
	 * The position is the slider start/end edge (depend on align direction)
	 * relative to scroller start.
	 */
	private async setSliderPosition(position: number) {
		await barrierDOMWriting()

		if (this.alignDirection === 'start') {
			this.doa.setStartPosition(this.slider, position + 'px')
			this.doa.setEndPosition(this.slider, 'auto')
		}
		else {
			this.doa.setStartPosition(this.slider, 'auto')
			this.doa.setEndPosition(this.slider, this.measurement.scrollerSize - position + 'px')
		}

		let index = this.alignDirection === 'start' ? this.startIndex : this.endIndex
		this.measurement.cacheSliderPosition(this.alignDirection, index, position)
	}

	/** 
	 * Update height/width of placeholder progressive before next time rendering.
	 * When scrolling down, and will render more items in the end, update size.
	 * No need to update when scrolling up.
	 */
	private async setPlaceholderSizeProgressively() {
		if (!this.placeholder) {
			return
		}
		
		let shouldUpdate = this.measurement.shouldUpdatePlaceholderSize(this.endIndex, this.dataCount)
		if (!shouldUpdate) {
			return
		}

		let placeholderSize = this.measurement.calcPlaceholderSize(this.dataCount)
		await this.setPlaceholderSize(placeholderSize)
	}

	/** Set placeholder size. */
	private async setPlaceholderSize(size: number) {
		if (!this.placeholder) {
			return
		}
		
		await barrierDOMWriting()
		this.doa.setSize(this.placeholder, size)
		this.measurement.cachePlaceholderProperties(this.endIndex, this.dataCount, size)
	}

	/** After update complete, and after `measureAfterRendered`, do more check for edge cases. */
	private async checkEdgeCasesAfterMeasured() {

		// When reach start index but may not reach scroll start.
		if (this.startIndex === 0) {

			// E.g., `sliderStartPosition` is `10`,
			// means have 10px higher than start,
			// reset to start position 0 cause this 10px get removed,
			// And we need to scroll up (element down) for 10px.
			let moreSize = -this.measurement.latestSliderProperties.startPosition
			
			if (moreSize !== 0) {
				await barrierDOMReading()
				let scrolled = this.doa.getScrolled(this.scroller) + moreSize

				await barrierDOMWriting()
				this.doa.setScrolled(this.scroller, scrolled)
				this.alignDirection = 'start'
				await this.setSliderPosition(0)
			}

			// Should also update `sliderEndPosition`,
			// but it will not be used before next update.
		}

		// When reach scroll index but not start index.
		else if (this.measurement.latestSliderProperties.startPosition <= 0) {

			// Guess size of items before, and add missing size of current rendering.
			let newPosition = this.measurement.calcSliderPositionByIndex(this.startIndex, 'start')
			let moreSize = newPosition - this.measurement.latestSliderProperties.startPosition
			let scrolled = this.doa.getScrolled(this.scroller) + moreSize

			await barrierDOMWriting()
			this.doa.setScrolled(this.scroller, scrolled)

			await this.setPlaceholderSize(this.measurement.latestPlaceholderProperties.placeholderSize + moreSize)

			this.alignDirection = 'start'
			await this.setSliderPosition(newPosition)
		}

		// When reach end index but not scroll end.
		if (this.endIndex === this.dataCount) {

			// Placeholder size is too large and should be shrink.
			if (this.measurement.latestPlaceholderProperties.placeholderSize > this.measurement.latestSliderProperties.endPosition) {
				await this.setPlaceholderSize(this.measurement.latestSliderProperties.endPosition)
			}
		}

		// When reach scroll end but not end index.
		// Note `scrollTop` value may be float, but two heights are int.
		else if (this.doa.getScrolled(this.scroller) + this.doa.getClientSize(this.scroller) >= this.doa.getScrollSize(this.scroller)) {
			let moreSize = this.measurement.calcSliderPositionByIndex(this.dataCount, 'end')
				- this.measurement.calcSliderPositionByIndex(this.endIndex, 'end')

			await this.setPlaceholderSize(this.measurement.latestPlaceholderProperties.placeholderSize + moreSize)
		}
	}

	/** 
	 * Check whether rendered result can cover scroll viewport,
	 * and update if can't, and will also persist content continuous if possible.
	 */
	private async checkCoverage() {

		// Reach both start and end edge.
		if (this.startIndex === 0 && this.endIndex === this.dataCount) {
			return
		}

		// Can only run only one updating each time.
		await this.renderQueue.enqueue(() => this.updateByCoverage())
	}

	private async updateByCoverage() {

		// Which direction is un-covered.
		let unCoveredSituation = await this.measurement.checkUnCoveredSituation(this.startIndex, this.endIndex, this.dataCount)
		if (unCoveredSituation === null) {
			return
		}

		// Update and try to keep same element with same position.
		if (unCoveredSituation === 'end' || unCoveredSituation === 'start') {
			await barrierDOMReading()

			let alignDirection: 'start' | 'end' = unCoveredSituation === 'end' ? 'start' : 'end'
			let visibleIndex = this.locateVisibleIndex(alignDirection)
			let newStartIndex: number
			let newEndIndex: number | undefined = undefined

			// Scrolling down, render more at end.
			if (alignDirection === 'start') {
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

			await this.updateContinuously(alignDirection, newStartIndex, newEndIndex)
		}

		// No intersection, reset indices by current scroll position.
		else if (unCoveredSituation === 'break') {
			await this.updatePersistScrollPosition()
			await this.setPlaceholderSizeProgressively()
			await this.measurement.measureAfterRendered(this.startIndex, this.endIndex, this.alignDirection)
			await this.checkEdgeCasesAfterMeasured()
		}
	}

	/** Update and make render content continuous. */
	private async updateContinuously(
		alignDirection: 'start' | 'end',
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
		else if (alignDirection === 'start') {
			
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
				position = this.measurement.latestSliderProperties.startPosition
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

				if (el.localName === 'slot') {
					el = el.firstElementChild as HTMLElement
				}
	
				await barrierDOMReading()

				// If el located at end, it will move up by slider padding bottom,
				// to keep it's position, should add slider bottom padding.
				position = this.measurement.latestSliderProperties.startPosition
					+ this.doa.getEndOuterOffset(el)
					+ this.doa.getEndPadding(this.slider)
			}
		}

		// Totally reset scroll position.
		if (needReset) {
			await this.updateByNewIndices()
		}
		
		// Update continuously.
		else {
			await this.updateBySliderPosition(alignDirection, position!)
		}

		await this.setPlaceholderSizeProgressively()
		await this.measurement.measureAfterRendered(this.startIndex, this.endIndex, this.alignDirection)
		await this.checkEdgeCasesAfterMeasured()
	}

	/** Reset indices by current scroll position. */
	private async updatePersistScrollPosition() {
		let newStartIndex = this.measurement.calcStartIndexByScrolled()
		this.setIndices(newStartIndex)
		this.alignDirection = 'start'

		await this.updateRendering()
		await this.resetPositions(false)
	}

	/** Update by specified slider position. */
	private async updateBySliderPosition(direction: 'start' | 'end', position: number | null) {
		this.alignDirection = direction
		await this.updateRendering()

		if (position !== null) {
			await this.setSliderPosition(position)
		}
	}

	/** Reset scroll position by current indices. */
	private async updateByNewIndices() {
		this.alignDirection = 'start'
		await this.updateRendering()
		await this.resetPositions(true)
	}

	/** 
	 * Locate start or after end index at which the item is visible in viewport.
	 * Note it's returned index can be `0~list.length`.
	 * Must after update complete.
	 */
	locateVisibleIndex(direction: 'start' | 'end', minimumRatio: number = 0): number {
		let children: ArrayLike<Element> = this.repeat.children

		let visibleIndex = locateVisibleIndex(
			this.scroller,
			children as ArrayLike<HTMLElement>,
			this.doa,
			this.measurement.latestSliderProperties.startPosition,
			direction,
			minimumRatio
		)

		return visibleIndex + this.startIndex
	}
}