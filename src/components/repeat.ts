import {DOMScroll, TransitionEasingName, computed, untilComplete} from '@pucelle/ff'
import {Component, html, RenderResult} from '@pucelle/lupos.js'
import {locateVisibleIndex} from './repeat-helpers/visible-index-locator'
import {DirectionalOverflowAccessor} from './repeat-helpers/directional-overflow-accessor'


/** To render each item. */
export type RepeatRenderFn<T> = (item: T, index: number) => RenderResult


/** 
 * `<Repeat>` creates repetitive contents by a `renderFn` and an iterable data.
 * it works just like a `<for>...` block, but gives more controllable based on component.
 */
export class Repeat<T = any, E = any> extends Component<E> {

	/** Current data list to repeat. */
	data: T[] = []

	/** Render function to generate render result by each item. */
	renderFn!: RepeatRenderFn<T>

	/** 
	 * Specify or auto-detect overflow direction.
	 * - If not specified, try to detect from scroller element.
	 * - If specified, scroller element's scroll direction but keep consistent with it.
	 * 
	 * Normally you should leave this property as default value,
	 * But if scroller element has overflow set in both directions,
	 * you must specify this property explicitly.
	 */
	overflowDirection: HVDirection | null = null

	
	/** 
	 * Help to read and write element's scrolling properties.
	 * Use it only when required.
	 */
	@computed get doa(): DirectionalOverflowAccessor {
		return new DirectionalOverflowAccessor(this.overflowDirection)
	}

	/** 
	 * Scroller element.
	 * It refreshes after re-connected.
	 */
	@computed get scroller(): HTMLElement {
		return this.el.parentElement!
	}


	protected render() {
		return html`<lupos:for ${this.data}>${this.renderFn}</lupos:for>`
	}

	/** Locate start or end index at which the item is visible in viewport. */
	locateVisibleIndex(direction: 'start' | 'end'): number {
		let visibleIndex = locateVisibleIndex(
			this.scroller,
			this.el.children as ArrayLike<Element> as ArrayLike<HTMLElement>,
			this.doa,
			direction
		)

		return visibleIndex
	}

	/** 
	 * Scroll the closest viewport, make the element at this index to be scrolled to the topmost
	 * or leftmost of the whole scroll viewport.
	 * Returns a promise, be resolved after scroll transition end, by whether scrolled.
	 * 
	 * @param gap Reserve little distance from the element's edge away from scroll viewport edge,
	 *     default value is `0`.
	 * @param duration Transition duration, default value is `0`.
	 * @param easing Transition easing, default value is `0`.
	 * 
	 * To use this, you should ensure this component is wrapped by a scroll
	 * container, which has set `overflow: scroll / auto`,
	 * and `renderFn` must render an unique element.
	 */
	async scrollIndexToStart(index: number, gap?: number, duration?: number, easing?: TransitionEasingName): Promise<boolean> {
		await untilComplete()

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
	 * 
	 * @param gap Reserve little distance from the element's edge away from scroll viewport edge,
	 *     default value is `0`.
	 * @param duration Transition duration, default value is `0`.
	 * @param easing Transition easing, default value is `0`.
	 * 
	 * To use this, you should ensure this component is wrapped by a scroll
	 * container, which has set `overflow: scroll / auto`,
	 * and `renderFn` must render an unique element.
	 */
	async scrollIndexToView(index: number, gap?: number, duration?: number, easing?: TransitionEasingName): Promise<boolean> {
		await untilComplete()

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