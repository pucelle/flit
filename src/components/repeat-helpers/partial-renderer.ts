import {untilUpdateComplete} from '@pucelle/ff'
import {locateVisibleIndex} from './visible-index-locator'
import {PartialRendererSizeStat} from './partial-renderer-size-stat'
import {DirectionalOverflowAccessor} from './directional-overflow-accessor'


/** Function for doing updating. */
type UpdateRenderingFn = () => void


/** Latest render state, values keep change after each time rendering. */
interface PartialRendererStates {

	/** Whether still in rendering. */
	rendering: boolean

	/** Latest scroller size. */
	scrollerSize: number

	/** 
	 * Latest end index when last time update and measure placeholder,
	 * thus, can avoid update placeholder when scrolling up.
	 */
	latestEndIndexForPlaceholderMeasuring: number

	/** Latest placeholder size. */
	placeholderSize: number

	/** Latest top/left position of slider, update it before or after every time rendered. */
	sliderStartPosition: number

	/** Latest bottom/right position of slider, update it before or after every time rendered. */
	sliderEndPosition: number

	/** 
	 * Latest `startIndex` property has changed and need to be applied.
	 * Soon need to re-render according to the new start index.
	 * Note it was initialized as `0`.
	 */
	startIndexNeededToApply: number | null

	/** Latest `endIndex` property has changed and need to be applied. */
	endIndexNeededToApply: number | null

	/** Latest `alignDirection` property has changed and need to be applied. */
	alignDirectionNeededToApply: 'start' | 'end' | null
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

	private readonly scroller: HTMLElement
	private readonly slider: HTMLElement
	private readonly repeat: HTMLElement
	private readonly placeholder: HTMLDivElement
	private readonly updateRendering: UpdateRenderingFn
	private coverageRate: number = 1
	private dataCount: number = 0
	
	/** Do rendered item size statistic, guess item size. */
	private readonly stat: PartialRendererSizeStat = new PartialRendererSizeStat()

	/** Help to get and set based on overflow direction. */
	private readonly doa: DirectionalOverflowAccessor

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

	/** Cache render state values, and use them for later rendering. */
	private readonly state: PartialRendererStates = {
		rendering: false,
		scrollerSize: 0,
		latestEndIndexForPlaceholderMeasuring: 0,
		placeholderSize: 0,
		sliderStartPosition: 0,
		sliderEndPosition: 0,
		startIndexNeededToApply: 0,
		endIndexNeededToApply: null,
		alignDirectionNeededToApply: null,
	}

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
	}

	/** Set `coverageRate` property. */
	setCoverageRate(coverageRate: number) {
		if (coverageRate !== this.coverageRate) {
			this.coverageRate = coverageRate
		}
	}

	/** Set total data count before updating. */
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
	setRenderPart(startIndex: number, endIndex: number | null, alignDirection: 'start' | 'end' | null = null) {
		this.state.startIndexNeededToApply = startIndex
		this.state.endIndexNeededToApply = endIndex
		this.state.alignDirectionNeededToApply = alignDirection
	}

	/** Update from applying start index or updating data. */
	async update() {
		if (this.state.rendering) {
			return
		}


		//// Can only write dom properties now.
		this.state.rendering = true

		// Adjust scroll position by specified indices.
		if (this.state.startIndexNeededToApply !== null) {
			this.updateWithNewIndices()
			this.state.startIndexNeededToApply = null
			this.state.endIndexNeededToApply = null
			this.state.alignDirectionNeededToApply = null
		}

		// Data changed, try persist indices, especially start index and scroll position.
		else {
			this.updateWithStartIndexPersist()
		}

		let haveNotMeasured = this.stat.getAverageSize() === 0
		if (!haveNotMeasured) {
			this.updatePlaceholderSizeProgressively()
		}


		//// Can only read dom properties now.

		await untilUpdateComplete()
		this.collectStateAfterRendered()
		this.state.rendering = false


		// Update again after known size.
		if (haveNotMeasured && this.stat.getAverageSize() > 0) {
			this.updateCoverage()
		}
	}

	/** Update when start index specified and need to apply. */
	private updateWithNewIndices() {
		this.setIndices(this.state.startIndexNeededToApply!, this.state.endIndexNeededToApply)
		this.setAlignDirection(this.state.alignDirectionNeededToApply ?? 'start')
		this.updateRendering()
		this.resetPositions(false)
	}

	/** Update data normally, and try to keep indices and scroll position. */
	private updateWithStartIndexPersist() {
		let oldStartIndex = this.startIndex
		let oldAlignDirection = this.alignDirection

		// Update indices only if exceeded range.
		if (this.endIndex > this.dataCount) {
			this.setIndices(this.startIndex)
		}
		
		this.setAlignDirection('start')
		this.updateRendering()
		
		// If start index has not changed, needs to persist the scroll position.
		if (oldStartIndex === this.startIndex) {

			// Rendered things may change, should not persist end scroll position.
			// Here we try to toggle to persist start scroll position.
			if (oldAlignDirection === 'end') {
				this.setSliderPosition(this.state.sliderStartPosition)
			}
		}

		// If start index has changed, reset positions.
		else {
			this.resetPositions(false)
		}
	}

	/** Update start and end indices before rendering. */
	private setIndices(newStartIndex: number, newEndIndex: number | null = null) {

		// At least render `100 * coverageRate`.
		let scrollerSize = Math.max(this.state.scrollerSize, 100)
		let renderCount = this.stat.getSafeRenderCount(this.coverageRate, scrollerSize)

		newStartIndex = Math.min(newStartIndex, this.dataCount - renderCount)
		newStartIndex = Math.max(0, newStartIndex)

		newEndIndex = newEndIndex ?? newStartIndex + renderCount
		newEndIndex = Math.min(newEndIndex, this.dataCount)

		this.startIndex = newStartIndex
		this.endIndex = newEndIndex
	}

	/** 
	 * Set latest `alignDirection`.
	 * Normally should do it before update rendering.
	 */
	private setAlignDirection(direction: 'start' | 'end') {
		this.alignDirection = direction
	}

	/** 
	 * Reset slider and scroll position, make first item appear in the start edge.
	 * `alignDirection` must have been updated.
	 * `indicesFromScrollOffset` specified as `true` if current indices is calculated from current scroll offset.
	 */
	private resetPositions(indicesFromScrollOffset: boolean) {
		let newPosition: number

		if (this.alignDirection === 'start') {
			newPosition = this.stat.getAverageSize() * this.startIndex
		}
		else {
			newPosition = this.stat.getAverageSize() * this.endIndex + this.state.scrollerSize
		}
		
		this.setSliderPosition(newPosition)

		if (!indicesFromScrollOffset) {

			// Align scroller start with slider start.
			if (this.alignDirection === 'start') {
				this.doa.setScrollOffset(this.scroller, newPosition)
			}

			// Align scroller end with slider end.
			else {
				this.doa.setScrollOffset(this.scroller, newPosition - this.state.scrollerSize)
			}
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
			this.doa.setEndPosition(this.slider, this.state.scrollerSize - position + 'px')
		}

		if (this.alignDirection === 'start') {
			this.state.sliderStartPosition = position
		}
		else {
			this.state.sliderEndPosition = position
		}
	}

	/** 
	 * Update height/width of placeholder progressive.
	 * When scrolling down, and will render more items in the end, update size.
	 * No need to update when scrolling up.
	 */
	private updatePlaceholderSizeProgressively() {
		let expanded = this.endIndex > this.state.latestEndIndexForPlaceholderMeasuring
		let placeholderSize: number

		if (!expanded) {
			return
		}

		let averageSize = this.stat.getAverageSize()
		
		if (this.alignDirection === 'start') {
			placeholderSize = averageSize * (this.dataCount - this.startIndex) + this.state.sliderStartPosition
		}
		else {
			placeholderSize = averageSize * (this.dataCount - this.endIndex) + this.state.sliderEndPosition
		}

		this.setPlaceholderSize(placeholderSize)
		this.state.latestEndIndexForPlaceholderMeasuring = this.endIndex
	}

	/** Set placeholder size. */
	private setPlaceholderSize(size: number) {
		this.doa.setSize(this.placeholder, size)
		this.state.placeholderSize = size
	}

	/** Every time after render complete, update state data.  */
	private collectStateAfterRendered() {
		let scrollerSize = this.doa.getClientSize(this.scroller)
		let sliderSize = this.doa.getClientSize(this.slider)

		this.state.scrollerSize = scrollerSize

		if (this.alignDirection === 'start') {
			this.state.sliderEndPosition = this.state.sliderStartPosition + sliderSize
		}
		else {
			this.state.sliderStartPosition = this.state.sliderEndPosition - sliderSize
		}

		this.stat.update(this.startIndex, this.endIndex, sliderSize)
	}

	/** 
	 * Check whether rendered result can cover scroll viewport,
	 * and update if can't, and will also persist content continuous if possible.
	 */
	async updateCoverage() {
		if (this.state.rendering) {
			return
		}

		// Reach start and end edge.
		if (this.startIndex === 0 && this.endIndex === this.dataCount) {
			return
		}


		//// Can only read dom properties now.

		this.state.rendering = true
		
		let unCoveredDirection = this.checkUnCoveredDirection()
		let position: number | null = null
	
		if (unCoveredDirection === 'end' || unCoveredDirection === 'start') {
			let visibleIndex = this.locateVisibleIndex(unCoveredDirection === 'end' ? 'start' : 'end')

			// Scrolling down.
			if (unCoveredDirection === 'end') {
				let oldStartIndex = this.startIndex
				let newStartIndex = visibleIndex
		
				this.setIndices(newStartIndex)

				// Locate to the start position of the first element.
				let elIndex = this.startIndex - oldStartIndex
				let el = this.repeat.children[elIndex] as HTMLElement

				position = this.state.sliderStartPosition + this.doa.getOffset(el)
			}

			// Scrolling up.
			else {
				let oldStartIndex = this.startIndex
				let newEndIndex = visibleIndex
				let newStartIndex = this.startIndex - this.endIndex + newEndIndex

				this.setIndices(newStartIndex, newEndIndex)

				// Locate to the end position of the last element.
				let elIndex = this.endIndex - oldStartIndex - 1
				let el = this.repeat.children[elIndex] as HTMLElement

				position = this.state.sliderStartPosition + this.doa.getOffset(el) + this.doa.getClientSize(el)
			}
		}
	

		//// Can only write dom properties now.
		
		// No intersection, reset indices by current scroll position.
		if (unCoveredDirection === 'break') {
			this.updatePersistScrollPosition()
		}

		// Can't cover and need to render more items.
		else if (unCoveredDirection === 'end' || unCoveredDirection === 'start') {
			this.updateBySliderPosition(unCoveredDirection === 'end' ? 'start' : 'end', position!)
		}

		this.updatePlaceholderSizeProgressively()


		//// Can only read dom properties below.

		await untilUpdateComplete()

		if (unCoveredDirection !== null) {
			this.collectStateAfterRendered()
			this.checkEdgeCases()
		}

		this.state.rendering = false
	}

	/** Locate start or end index at which the item is visible in viewport. */
	locateVisibleIndex(direction: 'start' | 'end'): number {
		let visibleIndex = locateVisibleIndex(
			this.scroller,
			this.repeat.children as ArrayLike<Element> as ArrayLike<HTMLElement>,
			this.doa,
			this.state.sliderStartPosition,
			direction
		)

		return visibleIndex + this.startIndex
	}

	/** Check cover direction and decide where to render more contents. */
	private checkUnCoveredDirection(): 'start' | 'end' | 'break' | null {
		let scrollerSize = this.doa.getClientSize(this.scroller)
		let scrolled = this.doa.getScrollPosition(this.scroller)
		let sliderStart = this.state.sliderStartPosition - scrolled
		let sliderEnd = sliderStart + this.doa.getClientSize(this.slider)
		let unexpectedScrollStart = scrolled === 0 && this.startIndex > 0

		let unexpectedScrollEnd = scrolled + this.doa.getClientSize(this.scroller) === this.doa.getScrollSize(this.scroller)
			&& this.endIndex < this.dataCount

		// No intersection, reset indices by current scroll position.
		let hasNoIntersection = sliderEnd < 0 || sliderStart > scrollerSize
		if (hasNoIntersection) {
			return 'break'
		}

		// Can't cover and need to render more items at bottom/right.
		else if (sliderEnd < scrollerSize || unexpectedScrollEnd) {
			return 'end'
		}

		// Can't cover and need to render more items at top/left.
		else if (sliderStart > 0 || unexpectedScrollStart) {
			return 'start'
		}

		// No need to render more.
		else {
			return null
		}
	}

	/** Reset indices by current scroll position. */
	private updatePersistScrollPosition() {
		this.resetIndicesByCurrentPosition()
		this.setAlignDirection('start')
		this.updateRendering()
		this.resetPositions(true)
	}

	/** Reset indices by current scroll position. */
	private resetIndicesByCurrentPosition() {
		let itemSize = this.stat.getAverageSize()
		let scrolled = this.doa.getScrollPosition(this.scroller)
		let newStartIndex = itemSize > 0 ? Math.floor(scrolled / itemSize) : 0

		this.setIndices(newStartIndex)
	}

	/** Update by specified slider position. */
	private updateBySliderPosition(direction: 'start' | 'end', position: number) {
		this.setAlignDirection(direction)
		this.updateRendering()
		this.setSliderPosition(position)
	}

	/** After render complete, do more check for edge cases. */
	protected checkEdgeCases() {
		
		// When reach start index but may not reach scroll start.
		if (this.startIndex === 0 && this.alignDirection === 'end') {

			// E.g., `sliderStartPosition` is `10`,
			// means have 10px higher than start,
			// reset to start position 0 cause this 10px get removed,
			// And we need to scroll up (element down) for 10px.
			this.scroller.scrollTop -= this.state.sliderStartPosition
			this.state.sliderEndPosition -= this.state.sliderStartPosition
			this.state.sliderStartPosition = 0
			this.setAlignDirection('start')
			this.setSliderPosition(0)
		}

		// When reach scroll index but not start index.
		else if (this.startIndex > 0 && this.state.sliderStartPosition <= 0) {
			let newPosition = this.stat.getAverageSize() * this.startIndex
			let moreSize = newPosition - this.state.sliderStartPosition

			this.scroller.scrollTop += moreSize
			this.setPlaceholderSize(this.state.placeholderSize + moreSize)
			this.setAlignDirection('start')
			this.setSliderPosition(newPosition)
		}

		// When reach end index but not scroll end.
		else if (this.endIndex === this.dataCount) {
			this.setPlaceholderSize(this.state.sliderEndPosition)
		}

		// When reach scroll end but not end index.
		// Note `scrollTop` value may be float, but two heights are int.
		else if (this.endIndex < this.dataCount
			&& this.scroller.scrollTop + this.scroller.clientHeight >= this.scroller.scrollHeight
		) {
			let moreSize = this.stat.getAverageSize() * (this.dataCount - this.endIndex)
			this.setPlaceholderSize(this.state.placeholderSize + moreSize)
		}
	}
}