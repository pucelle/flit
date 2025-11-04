import {AsyncTaskQueue, barrierDOMReading, barrierDOMWriting, ResizeWatcher} from '@pucelle/ff'
import {locateVisibleIndex} from './index-locator'
import {DirectionalOverflowAccessor} from './directional-overflow-accessor'
import {PartialMeasurement} from './partial-measurement'
import {DOMEvents, untilFirstPaintCompleted} from '@pucelle/lupos'


export interface NeedToApply {

	/** 
	 * Latest `startIndex` property has changed and need to be applied.
	 * Soon need to re-render according to the new start index.
	 * Note it was initialized as `0`.
	 * When `alignDirection=start`, it must exist.
	 */
	startIndex: number | undefined

	/** Latest `alignDirection` property has changed and need to be applied. */
	alignDirection: 'start' | 'end'

	/** 
	 * Latest `endIndex` property has changed and need to be applied.
	 * When `alignDirection=end`, it must exist.
	 */
	endIndex: number | undefined

	/** 
	 * If is `true`, will try to persist current scroll position,
	 * by adjusting `startIndex` or `endIndex`.
	 */
	tryPersistContinuous: boolean

	/** Whether will reset scroll position, normally it's true. */
	resetScroll: boolean
}


/** Need to validate it's offset position after measured. */
export interface NeedToAlign {
	el: HTMLElement

	/** Offset relative to scroller. */
	offset: number
}


/**
 * What a visible renderer do:
 *
 * When initialize or update from applying start index:
 * - Update indices.
 * - Update placeholder height and scroll position.
 * - Cause scroll event dispatched
 * 
 * When scrolling up or down / left or right:
 * - Validate placeholder intersection ratio and adjust `startIndex`
 *   or `endIndex` a little if not fully covered.
 */
export class PartialRenderer {

	readonly scroller: HTMLElement
	readonly slider: HTMLElement
	readonly repeat: HTMLElement
	readonly frontPlaceholder: HTMLDivElement | null
	readonly backPlaceholder: HTMLDivElement | null
	readonly updateCallback: () => void
	readonly onUpdatedCallback: () => void

	/** Do rendered items measurement. */
	readonly measurement: PartialMeasurement

	/** Help to get and set based on overflow direction. */
	readonly doa: DirectionalOverflowAccessor

	/** How many pixels to reserve to reduce update frequency when scrolling. */
	reservedPixels: number = 200

	/** Total data count. */
	dataCount: number = 0

	/** 
	 * Latest align direction.
	 * If `start`, `sliderStartPosition` is prepared immediately, and `sliderEndPosition` is prepared after rendered.
	 * Otherwise `sliderEndPosition` is prepared immediately, and `sliderStartPosition` is prepared after rendered.
	 * Readonly outside.
	 */
	alignDirection: 'start' | 'end' = 'start'

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

	/** Enqueue rendering. */
	protected renderQueue: AsyncTaskQueue = new AsyncTaskQueue()

	/** Whether are checking coverage. */
	protected throttlingCoverageCheck: boolean = false

	/** If slider size updating come from own updating, prevent it. */
	protected throttlingSliderSizeUpdate: boolean = true

	/** Indices and align direction that need to apply. */
	protected needToApply: NeedToApply | null = {
		startIndex: 0,
		endIndex: undefined,
		alignDirection: 'start',
		tryPersistContinuous: false,
		resetScroll: true,
	}

	/** If need to align element in same position. */
	protected needToAlign: NeedToAlign | null = null
	protected readScrollerSizePromise: Promise<void> | null = null

	constructor(
		scroller: HTMLElement,
		slider: HTMLElement,
		repeat: HTMLElement,
		frontPlaceholder: HTMLDivElement | null,
		backPlaceholder: HTMLDivElement | null,
		doa: DirectionalOverflowAccessor,
		updateCallback: () => void,
		onUpdatedCallback: () => void
	) {
		this.scroller = scroller
		this.slider = slider
		this.repeat = repeat
		this.frontPlaceholder = frontPlaceholder
		this.backPlaceholder = backPlaceholder
		this.doa = doa
		this.updateCallback = updateCallback
		this.onUpdatedCallback = onUpdatedCallback
		this.measurement = this.initMeasurement()
	}

	protected initMeasurement() {
		return new PartialMeasurement(this.scroller, this.slider, this.doa)
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
	 * If `tryPersistContinuous` is true, will try to adjust render indices a little
	 * to persist continuous rendering result, but still ensure to render required elements.
	 */
	setRenderIndices(
		alignDirection: 'start' | 'end',
		startIndex: number | undefined,
		endIndex: number | undefined = undefined,
		tryPersistContinuous: boolean = false,
		resetScroll: boolean = true
	) {
		this.needToApply = {
			alignDirection,
			startIndex,
			endIndex,
			tryPersistContinuous,
			resetScroll,
		}
	}

	/** 
	 * Locate start or after end index at which the item is visible in viewport.
	 * Note it's returned index can be `0~list.length`.
	 * Must after update complete.
	 */
	locateVisibleIndex(direction: 'start' | 'end', minimumRatio: number = 0): number {
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

	/** After component that use this renderer get connected. */
	async connect() {
		DOMEvents.on(this.scroller, 'scroll', this.onScrollerScroll, this, {passive: true})
		await untilFirstPaintCompleted()

		ResizeWatcher.watch(this.slider, this.onSliderSizeUpdated, this)

		this.readScrollerSizePromise = this.readScrollerSize()
		ResizeWatcher.watch(this.scroller, this.readScrollerSize, this)
	}
	
	/** After component that use this renderer will get disconnected. */
	disconnect() {
		DOMEvents.off(this.scroller, 'scroll', this.onScrollerScroll, this)
		ResizeWatcher.unwatch(this.slider, this.onSliderSizeUpdated, this)
		ResizeWatcher.unwatch(this.scroller, this.readScrollerSize, this)
	}

	/** On scroller scroll event. */
	protected async onScrollerScroll() {
		await this.checkCoverage()
	}

	/** Read new scroller size. */
	protected async readScrollerSize() {
		await this.measurement.readScrollerSize()
	}

	/** 
	 * When slider size updated,
	 * it should either ignore if update come from inside,
	 * or check coverage and re-measure item-size if update come from outside.
	 */
	protected async onSliderSizeUpdated(entry: ResizeObserverEntry) {
		if (!this.throttlingSliderSizeUpdate && entry.contentRect.width > 0 && entry.contentRect.height > 0) {

			// Break continuous render range.
			this.measurement.breakContinuousRenderRange()

			// Re-measure item size.
			await this.measurement.measureAfterRendered(this.startIndex, this.endIndex)

			// Finally check coverage.
			await this.checkCoverage()
		}
	}

	/** Calls `updateCallback`. */
	protected async updateRendering() {
		await barrierDOMWriting()
		this.updateCallback()
	}

	/** Update from applying start index or just update data. */
	async update() {

		// Avoid following codes run later than `connect()`.
		await untilFirstPaintCompleted()

		// Must wait for scroller size read.
		await this.readScrollerSizePromise

		// Can only run only one updating each time.
		await this.renderQueue.enqueue(() => this.doNormalUpdate())

		// If item size become smaller much, may cause can't fully covered.
		await this.checkCoverage()
	}

	/** Update after index applied, or data updated. */
	protected async doNormalUpdate() {
		let hasMeasuredBefore = this.measurement.hasMeasured()
		let needToApply = this.needToApply

		// Adjust scroll position by specified indices.
		if (needToApply) {

			// `continuouslyUpdated` means did `measureAfterRendered`.
			await this.updateByApplying(needToApply)
			this.needToApply = null
		}

		// Data changed, try persist start index and scroll position.
		else {
			await this.updateWithStartIndexPersist()
		}

		// May not measured yet.
		if (hasMeasuredBefore) {
			await this.updateRestPlaceholderSize()
		}

		await this.measurement.measureAfterRendered(this.startIndex, this.endIndex)

		// If newly measured, and render from a non-zero index, re-render after measured.
		// Otherwise should at least update placeholder size.
		if (!hasMeasuredBefore) {
			if (needToApply?.startIndex) {
				await this.updateByApplying(needToApply)
				await this.updateRestPlaceholderSize()
				await this.measurement.measureAfterRendered(this.startIndex, this.endIndex)
			}
			else {
				await this.updateRestPlaceholderSize()
			}
		}

		// If has not measured, no need to check, will soon update again by coverage checking.
		else {
			await this.afterMeasured()
		}

		this.onUpdatedCallback()
	}

	/** Update when start index specified and need to apply. */
	protected async updateByApplying(needToApply: NeedToApply) {
		let {startIndex, endIndex, alignDirection, tryPersistContinuous} = needToApply
		let hasMeasured = this.measurement.hasMeasured()
		let renderCount = this.endIndex - this.startIndex
		let canPersistContinuous = false

		// Adjust index and persist continuous.
		if (tryPersistContinuous && renderCount > 0) {
			await barrierDOMReading()
	
			let startVisibleIndex = this.locateVisibleIndex('start')
			let endVisibleIndex = this.locateVisibleIndex('end')

			if (alignDirection === 'start') {

				// Try persist visible part.
				let renderCountToPersist = Math.max(endVisibleIndex, startIndex! + 1) - Math.min(startVisibleIndex, startIndex!)
				if (renderCountToPersist <= renderCount) {
					startIndex = Math.min(startVisibleIndex, startIndex!)
					endIndex = startIndex + renderCount
					canPersistContinuous = true
				}

				// Try keep most intersection.
				else if (startIndex! > endVisibleIndex) {
					endIndex = Math.max(endVisibleIndex, startIndex! + 1)
					startIndex = endIndex - renderCount
				}
			}
			else {

				// Try persist visible part.
				let renderCountToPersist = Math.max(endVisibleIndex, endIndex!) - Math.min(startVisibleIndex, endIndex!)
				if (renderCountToPersist <= renderCount) {
					endIndex = Math.max(endVisibleIndex, endIndex!)
					startIndex = endIndex - renderCount
					canPersistContinuous = true
				}

				// Try keep most intersection.
				else if (endIndex! < startVisibleIndex) {
					startIndex = endIndex! - 1
					endIndex = startIndex + renderCount
				}
			}
		}

		// Update continuously.
		if (canPersistContinuous) {
			await this.updateContinuously(alignDirection, startIndex!, endIndex)
		}

		// Reset scroll position, but will align item with index viewport edge.
		else {
			this.setIndices(startIndex, endIndex)
			this.alignDirection = alignDirection ?? 'start'

			await this.updateRendering()

			await this.resetPositions(
				hasMeasured,
				tryPersistContinuous ? undefined : startIndex,
				tryPersistContinuous ? undefined : endIndex
			)
		}
	}

	/** Update data normally, and try to keep indices and scroll position. */
	protected async updateWithStartIndexPersist() {
		let canPersist = true

		// Can't persist old index and position.
		if (this.endIndex > this.dataCount) {
			canPersist = false
		}
		
		// Required, may data count increase or decrease.
		this.setIndices(this.startIndex)
		this.alignDirection = 'start'

		await this.updateRendering()

		// Reset scroll position when can't persist continuous.
		if (!canPersist) {
			await this.resetPositions(true)
		}
	}

	/** Update start and end indices before rendering. */
	protected setIndices(newStartIndex: number | undefined, newEndIndex: number | undefined = undefined) {
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
	 * `resetScroll`: specifies as `false` if current indices is not calculated from
	 *   current scroll offset, Then will adjust scroll offset and align to `alignToStartIndex`.
	 */
	protected async resetPositions(
		resetScroll: boolean,
		alignToStartIndex: number = this.startIndex,
		alignToEndIndex: number = this.endIndex
	) {
		let frontSize = this.measurement.getNormalFrontPlaceholderSize(this.startIndex)
		await this.setPosition(frontSize)

		// Break continuous render range.
		this.measurement.breakContinuousRenderRange()

		// Scroll to align to specified index.
		if (resetScroll) {
			alignToStartIndex = Math.min(Math.max(alignToStartIndex, this.startIndex), this.endIndex - 1)
			alignToEndIndex = Math.max(Math.min(alignToEndIndex, this.endIndex), this.startIndex)

			let scrollPosition = this.measurement.calcScrollPosition(alignToStartIndex, this.alignDirection)
			await barrierDOMWriting()
			this.doa.setScrolled(this.scroller, scrollPosition)
		}
	}

	/** Update position of rendered result after setting new indices. */
	protected async setPosition(position: number) {
		this.measurement.setFrontPlaceholderSize(position)

		if (this.frontPlaceholder) {
			await barrierDOMWriting()
			this.doa.setSize(this.frontPlaceholder, position)
		}
	}

	/** Update size of placeholder progressive before next time rendering. */
	protected async updateRestPlaceholderSize() {
		if (!this.backPlaceholder) {
			return
		}

		let backSize = this.measurement.getNormalBackPlaceholderSize(this.endIndex, this.dataCount)

		// Update back size only when have at least 50% difference.
		await barrierDOMWriting()
		this.doa.setSize(this.backPlaceholder, backSize)
		this.measurement.setBackPlaceholderSize(backSize)
	}

	/** After update complete, and after `measureAfterRendered`, do more check or do element alignment. */
	protected async afterMeasured() {
		await this.doAlignAdjustment()
	}

	/** Do element alignment by adjusting scroll offset. */
	protected async doAlignAdjustment() {
		if (this.needToAlign) {
			await barrierDOMReading()
			let scrolled = this.doa.getScrolled(this.scroller)
			let newOffset = this.doa.getOffset(this.needToAlign.el, this.scroller)

			if (Math.abs(newOffset - this.needToAlign.offset) > 3) {
				scrolled += newOffset - this.needToAlign.offset

				await barrierDOMReading()
				this.doa.setScrolled(this.scroller, scrolled)
			}

			this.needToAlign = null
		}
	}

	/** 
	 * Check whether rendered result can cover scroll viewport,
	 * and update if can't, and will also persist content continuous if possible.
	 */
	protected async checkCoverage() {
		if (this.throttlingCoverageCheck) {
			return
		}

		// Reach both start and end edge.
		if (this.startIndex === 0 && this.endIndex === this.dataCount) {
			return
		}

		this.throttlingCoverageCheck = true

		// Can only run only one updating each time.
		await this.renderQueue.enqueue(() => this.doCoverageUpdate())
		this.throttlingCoverageCheck = false
	}

	protected async doCoverageUpdate() {

		// Which direction is un-covered.
		let unCoveredSituation = await this.measurement.checkUnCoveredDirection()
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
			let currentRenderCount = this.endIndex - this.startIndex
			let renderCount = this.measurement.getSafeRenderCount(this.reservedPixels, currentRenderCount)

			// Scrolling down, render more at end.
			if (alignDirection === 'start') {
				newStartIndex = visibleIndex
				newEndIndex = newStartIndex + renderCount

				// First item may be very large and can't skip it, but we must render more at end.
				if (newEndIndex === this.endIndex) {
					newEndIndex++
				}
			}

			// Scrolling up, render more at end.
			else {
				newEndIndex = visibleIndex
				newStartIndex = newEndIndex - renderCount

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
		}
		
		await this.updateRestPlaceholderSize()
		await this.measurement.measureAfterRendered(this.startIndex, this.endIndex)
		await this.afterMeasured()

		this.onUpdatedCallback
	}

	/** Update and make render content continuous. */
	protected async updateContinuously(
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
				position = await this.getContinuousPosition(oldStartIndex, alignDirection)
			}
		}

		// Scrolling up, render more at start.
		else {
			
			// Rendered item count changed much, not rendering progressively.
			if (this.endIndex < oldStartIndex + 1 || this.endIndex > oldEndIndex) {
				needReset = true
			}

			// Locate to the end position of the last element.
			else if (this.endIndex !== oldEndIndex) {
				position = await this.getContinuousPosition(oldStartIndex, alignDirection)
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
	}

	/** Get new position for continuously update. */
	protected async getContinuousPosition(oldStartIndex: number, _alignDirection: 'start' | 'end') {
		let position: number

		// Can directly know the new position.
		if (this.startIndex >= oldStartIndex) {
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

		// Can't know the new position, just guess it.
		else {
			position = this.measurement.sliderProperties.startOffset
				+ (this.startIndex - oldStartIndex) * this.measurement.getItemSize()
			
			// Fix position to make sure it doesn't have more that 50% difference than normal.
			position = this.measurement.fixFrontPlaceholderSize(position, this.startIndex)

			await this.fillNeedToAlign(this.repeat.children[0] as HTMLElement)
		}
	
		return position
	}

	/** Fill `needToAlign` property. */
	protected async fillNeedToAlign(el: HTMLElement) {
		if (el.localName === 'slot') {
			el = el.firstElementChild as HTMLElement
		}

		await barrierDOMReading()

		// To re-align element after measured.
		this.needToAlign = {
			el,
			offset: this.doa.getOffset(el, this.scroller),
		}
	}

	/** Reset indices by current scroll position. */
	protected async updatePersistScrollPosition() {
		let newStartIndex = await this.measurement.calcStartIndexByScrolled()
		this.setIndices(newStartIndex)
		this.alignDirection = 'start'

		await this.updateRendering()
		await this.resetPositions(false)
	}

	/** Reset scroll position by current indices. */
	protected async updateByNewIndices() {
		this.alignDirection = 'start'
		await this.updateRendering()
		await this.resetPositions(true)
	}

	/** Update by specified slider position. */
	protected async updateBySliderPosition(direction: 'start' | 'end', position: number | null) {
		this.alignDirection = direction
		await this.updateRendering()

		if (position !== null) {
			await this.setPosition(position)
		}
	}
}