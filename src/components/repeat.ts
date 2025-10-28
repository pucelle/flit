import {computed} from '@pucelle/lupos'
import {PerFrameTransitionEasingName, Component, html, RenderResult} from '@pucelle/lupos.js'
import {locateVisibleIndex, locateVisibleIndexAtOffset} from './repeat-helpers/visible-index-locator'
import {DirectionalOverflowAccessor} from './repeat-helpers/directional-overflow-accessor'
import {HVDirection} from '@pucelle/ff'
import {DOMScroll} from '../tools'


/** To render each item. */
export type RepeatRenderFn<T> = (item: T, index: number) => RenderResult


/** 
 * `<Repeat>` generates repetitive content using a `renderFn` and iterable data.
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
	 * Get the element index at specified offset.
	 * The offset value is the offset position relative to scroller,
	 * it's not affected by scroll position.
	 * 
	 * If `preferUpper` specifies as true (by default), and offset located at the
	 * margin between two elements, return the index of the larger one.
	 */
	getIndexAtOffset(offset: number, preferUpper: boolean = true): number {
		let index = locateVisibleIndexAtOffset(
			this.scroller,
			this.el.children as ArrayLike<Element> as ArrayLike<HTMLElement>,
			this.doa,
			0,
			offset,
			preferUpper
		)

		return index
	}

	/** Check whether item at specified index is visible. */
	isIndexVisible(index: number, minimumRatio: number = 0): boolean {
		return index >= this.getStartVisibleIndex(minimumRatio) && index <= this.getEndVisibleIndex(minimumRatio)
	}
	
	/** 
	 * Get the index of the first visible item.
	 * Note it's returned index can be `0~list.length`.
	 */
	getStartVisibleIndex(minimumRatio: number = 0): number {
		return locateVisibleIndex(
			this.scroller,
			this.el.children as ArrayLike<Element> as ArrayLike<HTMLElement>,
			this.doa,
			0,
			'start',
			minimumRatio
		)
	}

	/** 
	 * Get the index after the last visible item.
	 * Note it's returned index can be `0~list.length`.
	 */
	getEndVisibleIndex(minimumRatio: number = 0): number {
		return locateVisibleIndex(
			this.scroller,
			this.el.children as ArrayLike<Element> as ArrayLike<HTMLElement>,
			this.doa,
			0,
			'end',
			minimumRatio
		)
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