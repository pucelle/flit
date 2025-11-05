import {effect, promiseWithResolves} from '@pucelle/lupos'
import {Repeat, RepeatRenderFn} from './repeat'
import {html, PartCallbackParameterMask, PerFrameTransitionEasingName} from '@pucelle/lupos.js'
import {PartialRenderer} from './repeat-helpers/partial-renderer'
import {LowerIndexWithin} from '../tools'
import {locateVisibleIndexAtOffset} from './repeat-helpers/index-locator'


interface PartialRepeatEvents {

	/** After partial updated, */
	'partial-updated': () => void
}


/** 
 * This component will render partial repeat contents only within viewport.
 * But not like `<LiveRepeat>`, it doesn't manage the whole content of scroller,
 * and can be used to render part of the scrolling contents.
 * 
 * This makes it more flexible, but it's not as efficient as `<LiveRepeat>`,
 * and may cause additional re-layout to adjust scroll position when scrolling up,
 * especially when item sizes are different from each other.
 */
export class PartialRepeat<T = any, E = {}> extends Repeat<T, E & PartialRepeatEvents> {

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
		return this.renderer!.alignDirection
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
	override async update() {

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

	protected override onConnected(this: PartialRepeat<any, {}>) {
		super.onConnected()

		this.initPlaceholders()
		this.initRenderer()

		this.renderer!.connect()
	}

	override beforeDisconnectCallback(param: PartCallbackParameterMask) {
		super.beforeDisconnectCallback(param)
		
		if (this.renderer) {
			this.renderer!.disconnect()
		}

		// If remove current component from parent, remove placeholder also.
		if ((param & PartCallbackParameterMask.FromOwnStateChange) > 0) {
			if (this.frontPlaceholder) {
				this.frontPlaceholder.remove()
				this.frontPlaceholder = null
			}

			if (this.backPlaceholder) {
				this.backPlaceholder.remove()
				this.backPlaceholder = null
			}
		}
	}

	protected initPlaceholders() {
		if (this.backPlaceholder) {
			return
		}

		this.frontPlaceholder = document.createElement('div')
		this.frontPlaceholder.style.cssText = 'width: 100%; visibility: hidden;'

		this.backPlaceholder = document.createElement('div')
		this.backPlaceholder.style.cssText = 'width: 100%; visibility: hidden;'

		this.el.before(this.frontPlaceholder)
		this.el.after(this.backPlaceholder)
	}

	/** Init renderer when connected. */
	protected initRenderer() {
		if (this.renderer) {
			return
		}

		this.renderer = new PartialRenderer(
			this.scroller!,
			this.el,
			this.el,
			this.frontPlaceholder,
			this.backPlaceholder,
			this.doa,
			this.updateLiveData.bind(this),
			this.onPartialUpdated.bind(this)
		)

		this.renderer
	}

	/** After partial content updated. */
	protected onPartialUpdated(this: PartialRepeat) {
		this.fire('partial-updated')
	}

	/** Check whether item at specified index is rendered. */
	isIndexRendered(index: number): boolean {
		return index >= this.startIndex && index < this.endIndex
	}

	/** Get element at specified index. */
	override getElementAtIndex(index: number): HTMLElement | undefined {
		return this.el.children[index - this.startIndex] as HTMLElement | undefined
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
		await this.toRenderItemAtIndex(index, 'start')
		return super.scrollIndexToStart(index - this.startIndex, gap, duration, easing)
	}

	/** To ensure item at index get rendered. */
	async toRenderItemAtIndex(this: PartialRepeat, index: number, alignDirection: 'start' | 'end') {
		if (this.isIndexRendered(index)) {
			return
		}

		let startIndex: number | undefined
		let endIndex: number | undefined

		if (alignDirection === 'start') {
			startIndex = index
		}
		else {
			endIndex = index + 1
		}

		this.renderer!.setRenderIndices(alignDirection, startIndex, endIndex, true)
		this.willUpdate()

		// Until partial content updated.
		let {promise, resolve} = promiseWithResolves()
		this.once('partial-updated', resolve)
		await promise
	}

	override async scrollIndexToView(index: number, gap?: number, duration?: number, easing?: PerFrameTransitionEasingName): Promise<boolean> {
		let alignDirection: 'start' | 'end' = index >= this.startIndex ? 'start' : 'end'
		await this.toRenderItemAtIndex(index, alignDirection)

		return super.scrollIndexToView(index - this.startIndex, gap, duration, easing)
	}
}