import {effect, untilUpdateComplete} from '@pucelle/lupos'
import {Repeat, RepeatRenderFn} from './repeat'
import {html, PartCallbackParameterMask, PerFrameTransitionEasingName} from '@pucelle/lupos.js'
import {PartialRenderer} from './repeat-helpers/partial-renderer'
import {LowerIndexWithin} from '../tools'
import {locateVisibleIndexAtOffset} from './repeat-helpers/index-locator'


/** 
 * This component will render partial repeat contents only within viewport.
 * But not like `<PartialRepeat>`, it doesn't manage the whole scroller,
 * and can be used to render part of the scrolling contents.
 * 
 * This makes it more flexible, but it's not as efficient as `<PartialRepeat>`,
 * and may cause additional re-layout to adjust scroll position when scrolling up,
 * especially when item sizes are different from each other.
 */
export class PartialRepeat<T = any, E = {}> extends Repeat<T, E> {

	/** 
	 * Render function to generate render result by each item.
	 * The second `index` will accept live index.
	 */
	declare renderFn: RepeatRenderFn<T>

	/**
	* How many pixels to reserve to reduce update frequency when scrolling.
	* On Windows, scroll for 100px each time.
	* So `200px` is a reasonable value.
	* For faster scrolling, you may set this value to `500~600`.
	*/
	reservedPixels: number = 200

	/** 
	 * Guess an item size for first-time paint,
	 * and avoid it checking for item-size and render twice.
	 */
	guessedItemSize: number = 0

	/** Placeholder at front. */
	protected frontPlaceholder: HTMLDivElement | null = null

	/** Placeholder at back. */
	protected backPlaceholder: HTMLDivElement | null = null

	/** Partial content renderer. */
	protected renderer: PartialRenderer | null = null as any

	/** The start index of the first item. */
	get startIndex(): number {
		return this.renderer!.startIndex
	}

	/** The end slicing index of the live data. */
	get endIndex(): number {
		return this.renderer!.endIndex
	}

	/** Latest align direction. */
	get alignDirection(): 'start' | 'end' | null {
		return this.renderer!.alignAt
	}

	/** Live data, rendering part of all the data. */
	get liveData(): T[] {
		return this.data.slice(this.startIndex, this.endIndex)
	}

	/** Apply `guessedItemSize` property to renderer. */
	@effect
	protected applyGuessedItemSize() {
		this.renderer!.setGuessedItemSize(this.guessedItemSize)
	}

	/** Apply `reservedPixels` property to renderer. */
	@effect
	protected applyReservedPixels() {
		this.renderer!.reservedPixels = this.reservedPixels
	}

	/** Apply `data` count to renderer. */
	@effect
	protected applyDataCount() {
		this.renderer!.dataCount = this.data.length
		this.willUpdate()
	}

	/** Update after data change. */
	override update() {

		// `this.$needsUpdate` here is required.
		// component map disconnect and connect soon, so will be enqueued for multiple times.
		if (!this.connected || !this.$needsUpdate) {
			return
		}

		this.renderer!.update()

		// `updateLiveData` may not call `updateLiveData()` below.
		this.$needsUpdate = false
	}

	/** 
	 * Update live data by new indices.
	 * May be called for several times for each time updating.
	 */
	protected updateLiveData() {
		this.$needsUpdate = true
		super.update()
	}

	protected override render() {
		return html`<lu:for ${this.liveData}>${this.renderLiveFn.bind(this)}</lu:for>`
	}

	/** Replace local index to live index. */
	protected renderLiveFn(item: T, index: number) {
		return this.renderFn(item, this.startIndex + index)
	}

	override beforeDisconnectCallback(param: PartCallbackParameterMask): void {
		super.beforeDisconnectCallback(param)

		// If remove current component from parent, remove placeholder also.
		if (this.frontPlaceholder) {
			if ((param & PartCallbackParameterMask.MoveFromOwnStateChange) > 0) {
				this.frontPlaceholder.remove()
				this.frontPlaceholder = null
				this.renderer = null
			}
		}
	}

	protected override onConnected(this: PartialRepeat<any, {}>) {
		super.onConnected()

		this.initPlaceholder()
		this.initRenderer()

		this.renderer!.connect()
	}
	
	protected override onWillDisconnect() {
		super.onWillDisconnect()
		this.renderer!.disconnect()
	}

	protected initPlaceholder() {
		if (this.frontPlaceholder) {
			return
		}

		this.frontPlaceholder = document.createElement('div')
		this.frontPlaceholder.style.cssText = 'position: absolute; left: 0; top: 0; width: 1px; visibility: hidden;'
		this.scroller!.prepend(this.frontPlaceholder)
	}

	/** Init renderer when connected. */
	protected initRenderer() {
		if (this.renderer) {
			return
		}

		let scroller = this.scroller
		let slider = this.el

		while (slider.parentElement !== scroller) {
			slider = slider.parentElement!
		}

		this.renderer = new PartialRenderer(
			this.scroller!,
			slider,
			this.el,
			this.frontPlaceholder,
			this.backPlaceholder,
			this.doa,
			this.updateLiveData.bind(this)
		)
	}

	/** Check whether item at specified index is rendered. */
	isIndexRendered(index: number): boolean {
		return index >= this.startIndex && index < this.endIndex
	}

	/** 
	 * Get the element index at specified offset.
	 * The offset value is the offset position relative to scroller.
	 * it's not affected by scroll position.
	 * 
	 * Returned index in range `0~data.length`.
	 * 
	 * Note if content in target offset has not been rendered,
	 * e.g. it out of partial rendering range because of away from viewport much.
	 * Would can't get right index result.
	 */
	override getIndexAtOffset(offset: number): LowerIndexWithin {
		let indexAndWithin = locateVisibleIndexAtOffset(
			this.el.children as ArrayLike<Element> as ArrayLike<HTMLElement>,
			this.el,
			this.scroller,
			this.doa,
			this.renderer!.measurement.sliderProperties.startOffset,
			offset
		)

		indexAndWithin.index += this.startIndex
		
		return indexAndWithin
	}

	override getStartVisibleIndex(minimumRatio: number = 0): number {
		return this.renderer!.locateVisibleIndex('start', minimumRatio)
	}

	override getEndVisibleIndex(minimumRatio: number = 0): number {
		return this.renderer!.locateVisibleIndex('end', minimumRatio)
	}

	/** 
	 * Set start visible index of rendered items.
	 * The data item of this index will be renderer at the topmost or leftmost of the viewport.
	 * You can safely call this before update complete, no additional rendering will cost.
	 */
	setStartVisibleIndex(startIndex: number) {
		this.renderer!.setRenderIndices('start', startIndex)
		this.willUpdate()
	}

	override async scrollIndexToStart(index: number, gap?: number, duration?: number, easing?: PerFrameTransitionEasingName): Promise<boolean> {
		// No need to worry about coverage, set scroll position cause scroll event emitted.

		if (!this.isIndexRendered(index)) {
			await this.toRenderItemAtIndex(index, 'start')
		}

		return super.scrollIndexToStart(index - this.startIndex, gap, duration, easing)
	}

	/** To ensure item at index get rendered. */
	protected async toRenderItemAtIndex(index: number, alignDirection: 'start' | 'end') {
		let startIndex: number | undefined
		let endIndex: number | undefined
		let renderCount = this.endIndex - this.startIndex

		if (alignDirection === 'start') {
			startIndex = index
		}
		else {
			let endVisibleIndex = this.getEndVisibleIndex()

			// Can't persist continuous.
			if (endVisibleIndex - index > renderCount) {
				startIndex = index
			}
			else {
				endIndex = endVisibleIndex
			}
		}

		this.renderer!.setRenderIndices(alignDirection, startIndex, endIndex, true)
		this.willUpdate()

		// Wait for two loops, may check after first rendering and re-render.
		await untilUpdateComplete()
		await untilUpdateComplete()
	}

	override async scrollIndexToView(index: number, gap?: number, duration?: number, easing?: PerFrameTransitionEasingName): Promise<boolean> {
		if (!this.isIndexRendered(index)) {
			let alignDirection: 'start' | 'end' = index >= this.startIndex ? 'start' : 'end'
			await this.toRenderItemAtIndex(index, alignDirection)
		}

		return super.scrollIndexToView(index - this.startIndex, gap, duration, easing)
	}
}