import {PartCallbackParameterMask} from '@pucelle/lupos.js'
import {Repeat} from './repeat'
import {PartialRenderer} from './repeat-helpers/partial-renderer'
import {DOMEvents, LayoutWatcher, TransitionEasingName, effect, immediateWatch, untilUpdateComplete} from '@pucelle/ff'
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
	* - Set it small like `1.25` can render fewer contents each time, but update more frequently when scrolling.
    * - Set it large like `2` cause render more contents each time, but update less frequently when scrolling.
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
	placeholder: HTMLDivElement | null = null

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

	/** Update after data change. */
	update() {
		this.renderer!.update()
	}

	/** Update live data by new indices. */
	protected updateLiveData() {
		super.update()
	}

	protected render() {
		let liveData = this.data.slice(this.startIndex, this.endIndex)
		return html`<lupos:for ${liveData}>${this.renderFn}</lupos:for>`
	}

	locateVisibleIndex(direction: 'start' | 'end') {
		return super.locateVisibleIndex(direction) + this.startIndex
	}

	
	beforeDisconnectCallback(param: PartCallbackParameterMask): void {
		super.beforeDisconnectCallback(param)

		// If remove current element directly, remove placeholder also.
		if ((param & PartCallbackParameterMask.DirectNodeToMove) > 0) {
			this.placeholder!.remove()
			this.placeholder = null
		}
	}

	protected onConnected(this: LiveRepeat<any, {}>) {
		super.onConnected()
		this.initPlaceholderIfNot()
		DOMEvents.on(this.scroller!, 'scroll', this.checkCoverage, this, {passive: true})

		let unwatchScrollerSize = LayoutWatcher.watch(this.scroller!, 'size', this.checkCoverage.bind(this))
		this.once('will-disconnect', unwatchScrollerSize)
	}

	protected initPlaceholderIfNot() {
		if (this.placeholder) {
			return
		}

		this.placeholder = document.createElement('div')
		this.placeholder.style.cssText = 'position: absolute; left: 0; top: 0; width: 1px; visibility: hidden;'
		this.scroller!.prepend(this.placeholder)
	}

	protected onWillDisconnect() {
		super.onWillDisconnect()
		DOMEvents.off(this.scroller!, 'scroll', this.checkCoverage, this)
	}

	
	/** Init renderer when connected. */
	@immediateWatch('scroller', 'placeholder', 'overflowDirection')
	protected initRenderer(scroller: HTMLElement, placeholder: HTMLDivElement | null, overflowDirection: HVDirection | null) {
		this.renderer = new PartialRenderer(
			scroller!,
			this.el,
			placeholder!,
			overflowDirection,
			this.updateLiveData.bind(this)
		)
	}
	
	/** After `coverageRate` property change. */
	@effect
	protected applyCoverageRate() {
		this.renderer!.setCoverageRate(this.coverageRate)
	}

	/** After `data` property change. */
	@effect
	protected applyDataChange() {
		this.renderer!.setDataCount(this.data.length)
		this.willUpdate()
	}


	/** Check whether current rendering can cover scroll viewport. */
	protected checkCoverage() {
		this.renderer!.updateCoverage()
	}

	async scrollIndexToStart(index: number, gap?: number, duration?: number, easing?: TransitionEasingName): Promise<boolean> {
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

	async scrollIndexToView(index: number, gap?: number, duration?: number, easing?: TransitionEasingName): Promise<boolean> {
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
