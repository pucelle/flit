import {PartCallbackParameterMask} from '@pucelle/lupos.js'
import {Repeat} from './repeat'
import {PartialRenderer} from './repeat-helpers/partial-renderer'
import {PerFrameTransitionEasingName, effect, untilUpdateComplete} from '@pucelle/ff'
import {html} from '@pucelle/lupos.js'


/** 
 * Compare with `<Repeat>`, `<LiveRepeat>` can render partial items in the scroll viewport,
 * and update rendered partial items follow user scrolling.
 * 
 * Some style restrictions you need to know:
 * - `<LiveRepeat>` must be contained in a scroller element with `overflow: auto / scroll`.
 * - `<LiveRepeat>` must be the only child of the scroller element.
 * - `<LiveRepeat>` must in `absolute` position.
 * - `<LiveRepeat>` must have no margin, but can have padding set.
 * - The scroller element must not in `static` position.
 */
export class LiveRepeat<T = any, E = {}> extends Repeat<T, E> {

	/**
	* How many pixels to reserve to reduce update frequency when scrolling.
	* On Windows, scroll for 100px each time.
	* So `200px` is a reasonable value.
	* For larger area scrolling, you may set this value to `500~600`.
	*/
	reservedPixels: number = 200

	/** 
	 * Placeholder element, sibling of slider.
	 * Since here it renders only partial content,
	 * slider element has no enough size to expand scrolling area,
	 * so use this placeholder to expand scrolling area to full size.
	 */
	protected placeholder: HTMLDivElement | null = null

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

	/** Apply `reservedPixels` property to renderer. */
	@effect
	protected applyReservedPixels() {
		this.renderer!.setReservedPixels(this.reservedPixels)
	}

	/** Apply `data` count to renderer. */
	@effect
	protected applyDataCount() {
		this.renderer!.setDataCount(this.data.length)
		this.willUpdate()
	}

	/** Update after data change. */
	update() {
		if (!this.connected) {
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
		super.update()
	}

	protected render() {
		return html`<lu:for ${this.liveData}>${this.renderFn}</lu:for>`
	}

	beforeDisconnectCallback(param: PartCallbackParameterMask): void {
		super.beforeDisconnectCallback(param)

		// If remove current component from parent, remove placeholder also.
		if ((param & PartCallbackParameterMask.MoveFromOwnStateChange) > 0) {
			this.placeholder!.remove()
			this.placeholder = null
			this.renderer = null
		}
	}

	protected onConnected(this: LiveRepeat<any, {}>) {
		super.onConnected()

		this.initPlaceholder()
		this.initRenderer()

		this.renderer!.connect()
	}

	protected initPlaceholder() {
		if (this.placeholder) {
			return
		}

		this.placeholder = document.createElement('div')
		this.placeholder.style.cssText = 'position: absolute; left: 0; top: 0; width: 1px; visibility: hidden;'
		this.scroller!.prepend(this.placeholder)
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
			this.placeholder!,
			this.doa,
			this.updateLiveData.bind(this)
		)
	}
	
	protected onWillDisconnect() {
		super.onWillDisconnect()
		this.renderer!.disconnect()
	}

	/** Check whether item at specified index is rendered. */
	isIndexRendered(index: number): boolean {
		return index >= this.startIndex && index < this.endIndex
	}

	getStartVisibleIndex(fullyVisible: boolean = false): number {
		return this.startIndex + super.getStartVisibleIndex(fullyVisible)
	}

	getEndVisibleIndex(fullyVisible: boolean = false): number {
		return this.startIndex + super.getEndVisibleIndex(fullyVisible)
	}

	/** 
	 * Set start visible index of rendered items.
	 * The data item of this index will be renderer at the topmost or leftmost of the viewport.
	 * You can safely call this before update complete, no additional rendering will cost.
	 */
	setStartVisibleIndex(startIndex: number) {
		this.renderer!.setRenderIndices(startIndex)
		this.willUpdate()
	}

	async scrollIndexToStart(index: number, gap?: number, duration?: number, easing?: PerFrameTransitionEasingName): Promise<boolean> {
		// No need to worry about coverage, set scroll position cause scroll event emitted.

		if (!this.isIndexRendered(index)) {
			let renderCount = this.endIndex - this.startIndex
			let startIndex: number
			let scrollingDown = index > this.startIndex

			if (scrollingDown) {
				let transitionCount = 0
				if (duration) {
					transitionCount = Math.floor(this.reservedPixels / this.renderer!.measurement.getItemSize())
				}

				startIndex = Math.max(index - transitionCount, 0)
			}
			else {
				startIndex = index
			}

			let endIndex = startIndex + renderCount
			this.renderer!.setRenderIndices(startIndex, endIndex, scrollingDown ? 'start' : 'end')

			this.willUpdate()
			await untilUpdateComplete()
		}

		return super.scrollIndexToStart(index - this.startIndex, gap, duration, easing)
	}

	async scrollIndexToView(index: number, gap?: number, duration?: number, easing?: PerFrameTransitionEasingName): Promise<boolean> {
		if (!this.isIndexRendered(index)) {
			let renderCount = this.endIndex - this.startIndex
			let startIndex: number
			let scrollingDown = index > this.startIndex

			// Item at index will be finally located at bottom edge of scroller.
			if (scrollingDown) {
				startIndex = Math.max(index - renderCount + 1, 0)
			}
			else {
				startIndex = index
			}

			let endIndex = startIndex + renderCount
			this.renderer!.setRenderIndices(startIndex, endIndex, scrollingDown ? 'start' : 'end')

			this.willUpdate()
			await untilUpdateComplete()
		}

		return super.scrollIndexToView(index - this.startIndex, gap, duration, easing)
	}
}
