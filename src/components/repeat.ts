import {DOMScroll, PerFrameTransitionEasingName, computed} from '@pucelle/ff'
import {Component, html, RenderResult} from '@pucelle/lupos.js'
import {locateVisibleIndex} from './repeat-helpers/visible-index-locator'
import {DirectionalOverflowAccessor} from './repeat-helpers/directional-overflow-accessor'


/** To render each item. */
export type RepeatRenderFn<T> = (item: T, index: number) => RenderResult


/** 
 * `<Repeat>` creates repetitive contents by a `renderFn` and an iterable data.
 * it works just like a `<for>...` block, but gives more controllable based on component.
 */
export class Repeat<T = any, E = {}> extends Component<E> {

	/** Current data list to repeat. */
	data: T[] = []

	/** Render function to generate render result by each item. */
	renderFn!: RepeatRenderFn<T>

	/** 
	 * Specify or auto-detect overflow direction.
	 * Is `vertical` by default.
	 */
	overflowDirection: HVDirection = 'vertical'

	/** 
	 * A CSS selector to select scroller element.
	 * If not provided, use `parentNode` as scroller.
	 */
	scrollerSelector: string | null = null

	
	/** 
	 * Help to read and write element's scrolling properties.
	 * Use it only when required.
	 */
	@computed
	get doa(): DirectionalOverflowAccessor {
		return new DirectionalOverflowAccessor(this.overflowDirection)
	}

	/** 
	 * Scroller element.
	 * It refreshes after re-connected.
	 */
	@computed
	get scroller(): HTMLElement {
		return this.scrollerSelector !== null
			? this.el.closest(this.scrollerSelector) ?? this.el.parentElement!
			: this.el.parentElement!
	}


	protected render() {
		return html`<lu:for ${this.data}>${this.renderFn}</lu:for>`
	}

	/** 
	 * Locate start or end index at which the item is visible in viewport.
	 * Will read dom properties, must after update complete.
	 */
	locateVisibleIndex(direction: 'start' | 'end'): number {
		let visibleIndex = locateVisibleIndex(
			this.scroller,
			this.el.children as ArrayLike<Element> as ArrayLike<HTMLElement>,
			this.doa,
			0,
			direction
		)

		return visibleIndex
	}

	/** 
	 * Scroll the closest viewport, make the element at this index to be scrolled to the topmost
	 * or leftmost of the whole scroll viewport.
	 * Returns a promise, be resolved after scroll transition end, by whether scrolled.
	 * Will read dom properties, must after update complete.
	 */
	async scrollIndexToStart(index: number, gap?: number, duration?: number, easing?: PerFrameTransitionEasingName): Promise<boolean> {
		let scroller = this.el.parentElement!
		if (!scroller) {
			return false
		}

		let el = this.el.children[index] as HTMLElement | undefined
		if (!el) {
			return false
		}

		return DOMScroll.scrollToStart(el, this.overflowDirection, gap, duration, easing)
	}

	/** 
	 * Scroll the closest viewport for minimum, make the element at this index to be scrolled into viewport.
	 * Returns a promise, be resolved after scroll transition end, by whether scrolled.
	 * Will read dom properties, must after update complete.
	 */
	async scrollIndexToView(index: number, gap?: number, duration?: number, easing?: PerFrameTransitionEasingName): Promise<boolean> {
		let scroller = this.el.parentElement!
		if (!scroller) {
			return false
		}

		let el = this.el.children[index] as HTMLElement | undefined
		if (!el) {
			return false
		}

		return DOMScroll.scrollToView(el as HTMLElement, this.overflowDirection, gap, duration, easing)
	}
}