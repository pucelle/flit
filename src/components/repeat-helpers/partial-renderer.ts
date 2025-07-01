import {AsyncTaskQueue, DOMEvents, ResizeWatcher, untilUpdateComplete} from '@pucelle/ff'
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
	tryPersistScrollPosition: boolean
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

	/** 
	 * Whether partial rendering content as follower,
	 * so the partial renderer only renders by current scroll position,
	 * and will never cause scroll position change.
	 */
	readonly asFollower: boolean

	/** Do rendered items measurement. */
	readonly measurement: PartialRendererMeasurement

	/** Help to get and set based on overflow direction. */
	readonly doa: DirectionalOverflowAccessor

	/** How many pixels to reserve to reduce update frequency when scrolling. */
	private reservedPixels: number = 200

	/** Total data count. */
	private dataCount: number = 0

	/** Enqueue rendering. */
	private renderQueue: AsyncTaskQueue = new AsyncTaskQueue()

	/** Indices and align direction that need to apply. */
	private needToApply: NeedToApply | null = {
		startIndex: 0,
		endIndex: undefined,
		alignDirection: 'start',
		tryPersistScrollPosition: false,
	}

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
		asFollower: boolean,
		doa: DirectionalOverflowAccessor,
		updateRendering: UpdateRenderingFn
	) {
		this.scroller = scroller
		this.slider = slider
		this.repeat = repeat
		this.placeholder = placeholder
		this.asFollower = asFollower
		this.doa = doa
		this.updateRendering = updateRendering

		this.measurement = new PartialRendererMeasurement(scroller, slider, doa)
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

	/** Set total data count before updating. */
	setDataCount(dataCount: number) {
		this.dataCount = dataCount
	}

	/** Set `preEndPositions` before updating. */
	setPreEndPositions(positions: number[] | null) {
		this.measurement.setPreEndPositions(positions)
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
	 */
	setRenderIndices(
		startIndex: number | undefined,
		endIndex: number | undefined = undefined,
		alignDirection: 'start' | 'end' = 'start',
		tryPersistScrollPosition: boolean = false
	) {
		this.needToApply = {
			startIndex,
			endIndex,
			alignDirection,
			tryPersistScrollPosition,
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

		// For restoring scroll position later.
		if (!this.asFollower) {
			this.setRenderIndices(this.locateVisibleIndex('start'))
		}

		DOMEvents.off(this.scroller, 'scroll', this.onScrollerScroll, this)
		ResizeWatcher.unwatch(this.scroller, this.readScrollerSize, this)
	}

	/** On scroller scroll event. */
	private onScrollerScroll() {
		this.checkCoverage()
	}

	/** Read new scroller size. */
	private readScrollerSize() {
		this.measurement.readScrollerSize()
	}

	/** Update from applying start index or updating data. */
	async update() {
		await this.renderQueue.enqueue(() => this.doNormalUpdate())

		// If item size become smaller much, may cause can't fully covered.
		await this.checkCoverage()
	}

	private async doNormalUpdate() {

		//// Can only write dom properties now.

		let hasMeasuredBefore = this.measurement.hasMeasured()
		let continuouslyUpdated: boolean = false
		let needToApply = this.needToApply

		// Adjust scroll position by specified indices.
		if (needToApply) {
			continuouslyUpdated = await this.updateByApplyingIndices(needToApply)

			if (needToApply === this.needToApply) {
				this.needToApply = null
			}
		}

		// Data changed, try persist start index and scroll position.
		else {
			this.updateWithStartIndexPersist()
		}

		if (hasMeasuredBefore) {
			this.updatePlaceholderSizeProgressively()
		}


		//// Can only read dom properties now.

		if (!continuouslyUpdated) {
			await untilUpdateComplete()

			this.measurement.measureAfterRendered(this.startIndex, this.endIndex, this.alignDirection)

			// If newly measured, and render from a specified index, re-render after measured.
			if (needToApply && !hasMeasuredBefore && needToApply.startIndex) {

				// Muse update placeholder size firstly, or may can't set scroll position correctly.
				this.updatePlaceholderSizeProgressively()

				await this.updateByApplyingIndices(needToApply)
				this.measurement.measureAfterRendered(this.startIndex, this.endIndex, this.alignDirection)
			}

			this.checkEdgeCasesAfterMeasured()
		}
	}

	/** Update when start index specified and need to apply. */
	private async updateByApplyingIndices(needToApply: NeedToApply): Promise<boolean> {
		let {startIndex, endIndex, alignDirection, tryPersistScrollPosition} = needToApply
		let hasMeasured = this.measurement.hasMeasured()
		let renderCount = this.endIndex - this.startIndex
	
		// Adjust index and persist continuous.
		if (tryPersistScrollPosition && renderCount > 0) {
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

		this.resetPositions(
			hasMeasured,
			tryPersistScrollPosition ? undefined : startIndex,
			tryPersistScrollPosition ? undefined : endIndex
		)

		return false
	}

	/** Update data normally, and try to keep indices and scroll position. */
	private updateWithStartIndexPersist() {
		let canPersist = true

		// Can't persist old index and position.
		if (this.endIndex > this.dataCount) {
			canPersist = false
		}
		
		// Required, may data count increase or decrease.
		this.setIndices(this.startIndex)

		this.setAlignDirection('start')
		this.updateRendering()

		if (!canPersist) {
			this.resetPositions(true)
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
	private resetPositions(needResetScrollOffset: boolean, alignToStartIndex: number = this.startIndex, alignToEndIndex: number = this.endIndex) {
		let newSliderPosition = this.measurement.calcSliderPositionByIndex(this.alignDirection === 'start' ? this.startIndex : this.endIndex, this.alignDirection)
		this.setSliderPosition(newSliderPosition)
		this.measurement.breakContinuousRenderRange()

		if (needResetScrollOffset && !this.asFollower) {
			alignToStartIndex = Math.max(alignToStartIndex, this.startIndex)
			alignToEndIndex = Math.min(alignToEndIndex, this.endIndex)
	
			// Align scroller start with slider start.
			let scrollPosition = this.measurement.calcSliderPositionByIndex(this.alignDirection === 'start' ? alignToStartIndex : alignToEndIndex, this.alignDirection)

			// Align scroller end with slider end.
			if (this.alignDirection === 'end') {
				scrollPosition -= this.measurement.scrollerSize
			}

			this.doa.setScrolled(this.scroller, scrollPosition)
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
			this.doa.setEndPosition(this.slider, this.measurement.scrollerSize - position + 'px')
		}

		let index = this.alignDirection === 'start' ? this.startIndex : this.endIndex
		this.measurement.cacheSliderPosition(index, position, this.alignDirection)
	}

	/** 
	 * Update height/width of placeholder progressive before next time rendering.
	 * When scrolling down, and will render more items in the end, update size.
	 * No need to update when scrolling up.
	 */
	private updatePlaceholderSizeProgressively() {
		if (!this.placeholder) {
			return
		}

		let shouldUpdate = this.measurement.shouldUpdatePlaceholderSize(this.endIndex, this.dataCount)
		if (!shouldUpdate) {
			return
		}

		let placeholderSize = this.measurement.calcPlaceholderSize(this.dataCount)
		this.setPlaceholderSize(placeholderSize)
	}

	/** Set placeholder size. */
	private setPlaceholderSize(size: number) {
		if (!this.placeholder) {
			return
		}
		
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
			let moreSize = -this.measurement.latestSliderPositionProperties.startPosition
			this.doa.setScrolled(this.scroller, this.doa.getScrolled(this.scroller) + moreSize)
			this.setAlignDirection('start')
			this.setSliderPosition(0)

			// Should also update `sliderEndPosition`,
			// but it will not be used before next update.
		}

		// When reach scroll index but not start index.
		else if (this.startIndex > 0 && this.measurement.latestSliderPositionProperties.startPosition <= 0) {

			// Guess size of items before, and add missing size of current rendering.
			let newPosition = this.measurement.calcSliderPositionByIndex(this.startIndex, 'start')
			let moreSize = newPosition - this.measurement.latestSliderPositionProperties.startPosition

			this.doa.setScrolled(this.scroller, this.doa.getScrolled(this.scroller) + moreSize)
			this.setPlaceholderSize(this.measurement.latestPlaceholderProperties.placeholderSize + moreSize)
			this.setAlignDirection('start')
			this.setSliderPosition(newPosition)
		}

		// When reach end index but not scroll end.
		if (this.endIndex === this.dataCount) {
			this.setPlaceholderSize(this.measurement.latestSliderPositionProperties.endPosition)
		}

		// When reach scroll end but not end index.
		// Note `scrollTop` value may be float, but two heights are int.
		else if (this.endIndex < this.dataCount
			&& this.doa.getScrolled(this.scroller) + this.doa.getClientSize(this.scroller)
				>= this.doa.getScrollSize(this.scroller)
		) {
			let moreSize = this.measurement.calcSliderPositionByIndex(this.dataCount, 'end')
				- this.measurement.calcSliderPositionByIndex(this.endIndex, 'end')

			this.setPlaceholderSize(this.measurement.latestPlaceholderProperties.placeholderSize + moreSize)
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


		//// Can only read dom properties now.

		// Which direction is un-covered.
		let unCoveredSituation = this.measurement.checkUnCoveredSituation(this.startIndex, this.endIndex, this.dataCount)
		if (unCoveredSituation === null) {
			return
		}

		await this.renderQueue.enqueue(() => this.doCoverageUpdate(unCoveredSituation))
	}

	private async doCoverageUpdate(unCoveredSituation: UnCoveredSituation) {

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
				position = this.measurement.latestSliderPositionProperties.startPosition
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
				position = this.measurement.latestSliderPositionProperties.startPosition
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

	/** 
	 * Locate start or after end index at which the item is visible in viewport.
	 * Must after update complete.
	 */
	locateVisibleIndex(direction: 'start' | 'end', minimumRatio: number = 0): number {
		let visibleIndex = locateVisibleIndex(
			this.scroller,
			this.repeat.children as ArrayLike<Element> as ArrayLike<HTMLElement>,
			this.doa,
			this.measurement.latestSliderPositionProperties.startPosition,
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
		let newStartIndex = this.measurement.calcStartIndexByScrolled()
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