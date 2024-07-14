import {DOMScroll, UpdateQueue} from '@pucelle/ff'
import {locateVisibleIndex} from './visible-index-locator'
import {PartialRendererSizeStat} from './partial-renderer-size-stat'
import {DirectionalAccessor} from './directional-accessor'


/** Function for doing updating, resolved after render complete and can check computed styles. */
type UpdateDataCallback = (startIndex: number, endIndex: number, scrollDirection: 'start' | 'end' | null) => void


/** Latest render state, values keep change after each time rendering. */
interface RenderState {

	/** Whether in rendering. */
	rendering: boolean

	/** Latest scroller size. */
	scrollerSize: number

	/** 
	 * Latest end index when last time updating placeholder,
	 * thus, can avoid update placeholder when scrolling up.
	 */
	maxEndIndexForPlaceholder: number

	/** Latest placeholder size. */
	placeholderSize: number

	/** 
	 * Latest scroll direction.
	 * If is `end`, `sliderEndPosition` is prepared immediately, and `sliderStartPosition` is prepared after rendered.
	 * Otherwise `sliderStartPosition` is prepared immediately, and `sliderEndPosition` is prepared after rendered.
	 */
	scrollDirection: 'start' | 'end' | null,

	/** Latest top/left position of slider, update it before or after every time rendered. */
	sliderStartPosition: number

	/** Latest bottom/right position of slider, update it before or after every time rendered. */
	sliderEndPosition: number

	/** 
	 * Latest `startIndex` property has changed and need to be applied.
	 * Soon need to re-render according to the new start index.
	 * Note it was initialized as `true`.
	 */
	needToApplyStartIndex: boolean
}


/**
 * What a renderer do:
 *
 * When initializing or update from applied start index:
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
	private readonly palceholder: HTMLDivElement
	private readonly updateDataCallback: UpdateDataCallback
	private overflowDirection: HVDirection | null = null
	private renderCountRate: number = 1

	/** Do rendered item size statistic, guess item size. */
	private readonly ss: PartialRendererSizeStat = new PartialRendererSizeStat()

	/** Help to get and set based on overflow direction. */
	private readonly da: DirectionalAccessor

	/** 
	 * The start index of the first item in the whole data.
	 * Readonly outside.
	 */
	private startIndex: number = 0

	/**
	 * The end index of next position of last item in the whole data.
	 * Readonly outside.
	 */
	private endIndex: number = 0

	/** Current total data count. */
	private dataCount: number = 0
	
	/** Cache render state values, and use them for later rendering. */
	private readonly state: RenderState = {
		rendering: false,
		scrollerSize: 0,
		maxEndIndexForPlaceholder: 0,
		placeholderSize: 0,
		scrollDirection: null,
		sliderStartPosition: 0,
		sliderEndPosition: 0,
		needToApplyStartIndex: true,
	}

	constructor(scroller: HTMLElement,
		slider: HTMLElement,
		palceholder: HTMLDivElement,
		updateDataCallback: UpdateDataCallback,
		overflowDirection: HVDirection | null
	) {
		this.scroller = scroller
		this.slider = slider
		this.palceholder = palceholder
		this.overflowDirection = overflowDirection
		this.updateDataCallback = updateDataCallback
		this.da = new DirectionalAccessor(overflowDirection)
		
		// Avoid it cause reflow.
		UpdateQueue.onComplete(() => {
			this.initProperties()
		})
	}

	/** Validate css properties of several elements. */
	private initProperties() {
		let scrollerStyle = getComputedStyle(this.scroller)
		let sliderStyle = getComputedStyle(this.slider)
		
		if (scrollerStyle.position === 'static') {
			throw 'Must not set "position" property of scroller element out of "<LiveRepeat>" to "static"!'
		}

		if (sliderStyle.position !== 'absolute') {
			throw 'Must set "position" property of "<LiveRepeat>" element to "absolute"!'
		}

		if (this.overflowDirection === 'vertical') {
			let overflowY = scrollerStyle.overflowY === 'auto' || scrollerStyle.overflowY === 'scroll'
			if (!overflowY) {
				throw 'Must set "overflow-y" property of scroller element out of "<LiveRepeat>" to "scroll" or "auto"!'
			}
		}
		else if (this.overflowDirection === 'horizontal') {
			let overflowY = scrollerStyle.overflowX === 'auto' || scrollerStyle.overflowX === 'scroll'
			if (!overflowY) {
				throw 'Must set "overflow-x" property of scroller element out of "<LiveRepeat>" to "scroll" or "auto"!'
			}
		}
		else {
			this.overflowDirection = DOMScroll.getCSSOverflowDirection(this.scroller)
			this.da.setDirection(this.overflowDirection)
		}
	}

	/** Set `renderCountRate` property. */
	setRenderCountRate(renderCountRate: number) {
		if (renderCountRate !== this.renderCountRate) {
			this.renderCountRate = renderCountRate
			this.state.maxEndIndexForPlaceholder = 0
		}
	}

	/** Will make the rendered item at this index been located at the top/left of scroll viewport. */
	setStartIndex(index: number) {
		this.startIndex = index
		this.state.needToApplyStartIndex = true
	}

	/** Set total data count before updating. */
	setDataCount(dataCount: number) {
		this.dataCount = dataCount
	}

	/** Update from applying start index or updating data. */
	async updateRendering() {
		if (this.state.rendering) {
			return
		}


		//// Can only write dom properties below.
		this.state.rendering = true

		// Adjust scroll position to specified index.
		if (this.state.needToApplyStartIndex) {
			this.updateWithNewStartIndex()
			this.state.needToApplyStartIndex = false
		}

		// Try persist indices and scroll position.
		else {
			this.updatePersistIndicesAndPosition()
		}

		this.updatePlaceholderSize()


		//// Can only read dom properties below.

		await UpdateQueue.untilComplete()
		this.updateState()
		this.state.rendering = false


		// Re-check coverage.
		// this.updateCoverage()
	}

	/** Update when start index specified and need to apply. */
	private updateWithNewStartIndex() {
		this.updateIndices(this.startIndex)
		this.updateDataCallback(this.startIndex, this.endIndex, null)
		this.resetSliderPosition()
	}

	/** Update start and end indices before rendering. */
	private updateIndices(newStartIndex: number) {
		let renderCount = this.ss.getSuggestedRenderCount(this.renderCountRate, this.state.scrollerSize)

		newStartIndex = Math.min(newStartIndex, this.dataCount - renderCount)
		newStartIndex = Math.max(0, newStartIndex)

		let endIndex = newStartIndex + renderCount
		endIndex = Math.min(endIndex, this.dataCount)

		this.startIndex = newStartIndex
		this.endIndex = endIndex
	}

	/** Reset scroll position by current start index. */
	private resetSliderPosition() {
		let newPosition = this.ss.getAverageSize() * this.startIndex
		
		this.setSliderPosition('start', newPosition)
		this.resetScrollPosition()
	}

	/** Update slider position after set new indices. */
	private setSliderPosition(direction: 'start' | 'end', position: number) {
		if (direction === 'start') {
			this.da.setStartPosition(this.slider, position + 'px')
			this.da.setEndPosition(this.slider, 'auto')
		}
		else {
			this.da.setStartPosition(this.slider, 'auto')
			this.da.setEndPosition(this.slider, this.state.scrollerSize - position + 'px')
		}

		this.state.scrollDirection = direction

		if (direction === 'start') {
			this.state.sliderStartPosition = position
		}
		else {
			this.state.sliderEndPosition = position
		}
	}

	/** Update scroll position of `scroller` after set new slider position. */
	private resetScrollPosition() {
		this.da.setScrollPosition(this.scroller, this.state.sliderStartPosition)
	}

	/** Update data normally, and try to keep indices and scroll position. */
	private updatePersistIndicesAndPosition() {
		let oldStartIndex = this.startIndex

		// Update indices only if required.
		if (this.endIndex > this.dataCount) {
			this.updateIndices(this.startIndex)
		}
		
		this.updateDataCallback(this.startIndex, this.endIndex, null)
		
		// If start index is not changed, needs to keep the position of the item at this index.
		// Must reset it to top mode because may in bottom position mode.
		if (oldStartIndex === this.startIndex) {
			this.setSliderPosition('start', this.state.sliderStartPosition)
		}
		else {
			this.resetSliderPosition()
		}
	}

	/** 
	 * Update height/width of placeholder progressive.
	 * When scrolling down, and rendered more items at the end, update size.
	 * After reached scroll end position, not update placeholder size strictly.
	 * No need to update when scrolling up.
	 */
	private updatePlaceholderSize() {
		let scrollingDown = this.endIndex > this.state.maxEndIndexForPlaceholder
		let scrolledToEnd = this.endIndex === this.dataCount

		// If scrolled to end, placeholder only expand start part.
		if (scrolledToEnd) {
			let scrollSize: number

			if (this.state.scrollDirection === 'end') {
				scrollSize = this.state.sliderEndPosition
			}
			else {
				scrollSize = this.state.sliderStartPosition
			}

			this.setPlaceholderSize(scrollSize)
			this.state.maxEndIndexForPlaceholder = this.endIndex
		}
		else if (scrollingDown) {
			let scrollSize: number
			let averageSize = this.ss.getAverageSize()
			
			if (this.state.scrollDirection === 'end') {
				scrollSize = averageSize * (this.dataCount - this.endIndex) + this.state.sliderEndPosition
			}
			else {
				scrollSize = averageSize * (this.dataCount - this.startIndex) + this.state.sliderStartPosition
			}

			this.setPlaceholderSize(scrollSize)
			this.state.maxEndIndexForPlaceholder = this.endIndex
		}
	}

	/** Set placeholder size. */
	private setPlaceholderSize(size: number) {
		this.da.setSize(this.palceholder, size)
		this.state.placeholderSize = size
	}

	/** Every time after render complete, update state data.  */
	private updateState() {
		let sliderSize = this.da.getOffsetSize(this.slider)
		let scrollerSize = this.da.getClientSize(this.scroller)

		if (this.state.scrollDirection === 'end') {
			this.state.sliderStartPosition = this.state.sliderEndPosition - sliderSize
		}
		else {
			this.state.sliderEndPosition = this.state.sliderStartPosition + sliderSize
		}

		this.ss.update(this.startIndex, this.endIndex, sliderSize)
		this.state.scrollerSize = scrollerSize
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


		//// Can only read dom properties below.

		this.state.rendering = true
		
		let direction = this.getCoverDirection()
		let position: number | null = null
	
		if (direction === 'end' || direction === 'start') {
			let visibleIndex = this.locateVisibleIndex(direction)

			if (direction === 'end') {
				let oldStartIndex = this.startIndex
				let newStartIndex = visibleIndex
		
				this.updateIndices(newStartIndex)

				// Locate to the start position of the first element of next rendering.
				let elIndex = this.startIndex - oldStartIndex
				let el = this.slider.children[elIndex] as HTMLElement
				position = this.state.sliderStartPosition + this.da.getOffset(el)
			}
			else {
				let oldStartIndex = this.startIndex
				let newEndIndex = visibleIndex
				let newStartIndex = this.startIndex - this.endIndex + newEndIndex

				this.updateIndices(newStartIndex)

				// Ensure the `newEndIndex` is included.
				if (this.endIndex < newEndIndex) {
					this.endIndex = newEndIndex
				}

				// Locate to the end position of the last element of next rendering.
				let elIndex = this.endIndex - oldStartIndex - 1
				let el = this.slider.children[elIndex] as HTMLElement
				position = this.state.sliderStartPosition + this.da.getOffset(el) + this.da.getScrollSize(el)
			}
		}
	

		//// Can only write dom properties below.
		
		// No intersection, reset indices by current scroll position.
		if (direction === 'break') {
			this.updatePersistScrollPosition()
		}

		// Can't cover and need to render more items.
		else if (direction === 'end' || direction === 'start') {
			this.updateWithPosition(direction, position!)
		}

		this.updatePlaceholderSize()


		//// Can only read dom properties below.

		await UpdateQueue.untilComplete()

		if (direction !== null) {
			this.updateState()
			this.checkEdgeCases()
		}

		this.state.rendering = false
	}

	/** Locate start or end index at which the item is visible in viewport. */
	locateVisibleIndex(direction: 'start' | 'end'): number {
		let scrollerSize = this.da.getClientSize(this.scroller)
		let scrolled = this.da.getScrollPosition(this.scroller)

		let visibleIndex = locateVisibleIndex(
			this.slider.children as ArrayLike<Element> as ArrayLike<HTMLElement>,
			this.da,
			scrollerSize,
			scrolled,
			direction === 'end' ? 1 : -1
		)

		return this.startIndex + visibleIndex
	}

	/** Check cover direction and then decide where to render more contents. */
	private getCoverDirection(): 'start' | 'end' | 'break' | null {
		let scrollerSize = this.da.getClientSize(this.scroller)
		let scrolled = this.da.getScrollPosition(this.scroller)
		let sliderStart = this.da.getOffset(this.slider) - scrolled
		let sliderEnd = sliderStart + this.da.getOffsetSize(this.slider)
		let unexpectedScrollStart = scrolled === 0 && this.startIndex > 0

		let unexpectedScrollEnd = scrolled + this.da.getClientSize(this.scroller) === this.da.getScrollSize(this.scroller)
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
		this.resetIndices()
		this.updateDataCallback(this.startIndex, this.endIndex, null)
		this.resetSliderPosition()
	}

	/** Reset indices by current scroll position. */
	private resetIndices() {
		let itemSize = this.ss.getAverageSize()
		let scrolled = this.da.getScrollPosition(this.scroller)
		let newStartIndex = itemSize > 0 ? Math.floor(scrolled / itemSize) : 0

		this.updateIndices(newStartIndex)
	}

	/** Update with specified position. */
	private updateWithPosition(direction: 'start' | 'end', position: number) {
		this.updateDataCallback(this.startIndex, this.endIndex, null)
		this.setSliderPosition(direction, position)
	}

	/** After render complete, do more check for edge cases. */
	protected async checkEdgeCases() {
		
		// When reach start index but may not reach scroll start.
		if (this.startIndex === 0) {
			if (this.state.sliderStartPosition > 0) {
				let restSize = this.state.sliderStartPosition

				this.scroller.scrollTop -= restSize
				this.setPlaceholderSize(this.state.placeholderSize - restSize)
				this.setSliderPosition('start', 0)
			}
		}

		// When reach scroll index but not start index.
		else if (this.startIndex > 0) {
			if (this.state.sliderStartPosition <= 0) {
				let newPosition = this.ss.getAverageSize() * this.startIndex
				let moreSize = newPosition - this.state.sliderStartPosition

				this.scroller.scrollTop += moreSize
				this.setPlaceholderSize(this.state.placeholderSize + moreSize)
				this.setSliderPosition('start', newPosition)
			}
		}

		// No need to check end index and scroll end.
		// Because placeholder will help to maintain it.
	}
}