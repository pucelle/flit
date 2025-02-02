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
 * - `<LiveRepeat>` must in `absolute` position
 * - The scroller element must not in `static` position.
 */
export class LiveRepeat<T = any, E = {}> extends Repeat<T, E> {

	/**
	* Rate of how many items to render compare with the minimum items that can cover scroll viewport.
	* - Set it small like `1.5` can render fewer contents each time, but update more frequently when scrolling.
    * - Set it large like `2` cause render more contents each time, but update less frequently when scrolling.
	* 
	* Note even set this value small, renderer will also render at least
	* additional `200px` to ensure scrolling smooth enough.
	* 
	* Must larger than `1`.
	*/
	coverageRate: number = 1.5


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

	/** Latest scroll direction. */
	get scrollDirection(): 'start' | 'end' | null {
		return this.renderer!.alignDirection
	}

	/** Live data, rendering part of all the data. */
	get liveData(): T[] {
		return this.data.slice(this.startIndex, this.endIndex)
	}

	/** Apply `coverageRate` property to renderer. */
	@effect
	protected applyCoverageRate() {
		this.renderer!.setCoverageRate(this.coverageRate)
	}

	/** Apply `data` count to renderer. */
	@effect
	protected applyDataCount() {
		this.renderer!.setDataCount(this.data.length)
		this.willUpdate()
	}

	/** Update after data change. */
	update() {
		this.renderer!.update()
		this.needsUpdate = false
	}

	/** Update live data by new indices. */
	protected updateLiveData() {

		// May update rendered data several times of each time partial renderer updating.
		this.needsUpdate = true

		super.update()
	}

	protected render() {
		return html`<lu:for ${this.liveData}>${this.renderFn}</lu:for>`
	}

	locateVisibleIndex(direction: 'start' | 'end') {
		return this.renderer!.locateVisibleIndex(direction)
	}

	beforeDisconnectCallback(param: PartCallbackParameterMask): void {
		super.beforeDisconnectCallback(param)

		// If remove current component from parent, remove placeholder also.
		if ((param & PartCallbackParameterMask.IsolateFromContext) > 0) {
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

	/** Check whether current rendering can cover scroll viewport. */
	protected checkCoverage() {
		this.renderer!.updateCoverage()
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
					transitionCount = Math.max(Math.floor((this.coverageRate - 1) / this.coverageRate * renderCount), 1)
				}

				startIndex = Math.max(index - transitionCount, 0)
			}
			else {
				startIndex = index
			}

			let endIndex = startIndex + renderCount
			this.renderer!.setRenderPart(startIndex, endIndex, scrollingDown ? 'start' : 'end')

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
			this.renderer!.setRenderPart(startIndex, endIndex, scrollingDown ? 'start' : 'end')

			this.willUpdate()
			await untilUpdateComplete()
		}

		return super.scrollIndexToView(index - this.startIndex, gap, duration, easing)
	}

	/** Get if item with specified index is rendered. */
	protected isIndexRendered(index: number) {
		return index >= this.startIndex && index < this.endIndex
	}
}
