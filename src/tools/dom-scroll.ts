import {PerFrameTransition, PerFrameTransitionEasingName} from "lupos.html"


type HVDirection = 'horizontal' | 'vertical'


/** Cache the element and the transition playing. */
const RunningScrollTransitions: WeakMap<Element, PerFrameTransition> = /*#__PURE__*/new WeakMap()


/**
 * Scroll scrollbar in specified direction of closest scroll wrapper,
 * for minimal distance to make element to become fully visible.
 * @param scrollDirection `horizontal` | `vertical` | `null`, if is null, will detect scroll direction.
 * @param gap Reserve a little distance from the element's edge away from scroll viewport edge, default value is `0`.
 * @param duration Transition duration, default value is `0`.
 * @param easing Transition easing, default value is `0`.
 * 
 * Returns a promise which will be resolved by whether scrolled.
 */
export async function scrollToView(
	el: HTMLElement,
	scrollDirection: HVDirection | null = null,
	gap: number = 0,
	duration: number = 0,
	easing: PerFrameTransitionEasingName = 'ease-out'
): Promise<boolean> {
	let wrapperAndDirection = findClosestSizedScrollWrapper(el)
	if (!wrapperAndDirection) {
		return false
	}

	let {wrapper, direction: wrapperDirection} = wrapperAndDirection
	scrollDirection = scrollDirection ?? wrapperDirection

	if (!scrollDirection) {
		return false
	}

	RunningScrollTransitions.get(wrapper)?.cancel()

	if (scrollDirection === 'vertical') {
		let oldScrollY = wrapper.scrollTop
		let newScrollY: number | null = null
		let offsetY = getUnScrolledOffset(el, wrapper, scrollDirection)

		// Needs to scroll for pxs to top edges align.
		let startOffset = offsetY - gap - oldScrollY

		// Needs to scroll for pxs to bottom edges align.
		let endOffset = offsetY + el.offsetHeight + gap - wrapper.clientHeight - oldScrollY

		// Needs to scroll up.
		if (startOffset < 0 && endOffset < 0) {
			newScrollY = Math.max(startOffset, endOffset) + oldScrollY
		}
		// Needs to scroll down.
		else if (endOffset > 0 && startOffset > 0) {
			newScrollY = Math.min(endOffset, startOffset) + oldScrollY
		}

		if (newScrollY !== null && newScrollY !== oldScrollY) {
			if (duration) {
				let transition = new PerFrameTransition({
					duration,
					easing,
				})

				transition.playBetween(
					oldScrollY,
					newScrollY,
					(value: number) => {
						wrapper!.scrollTop = value
					}
				)

				RunningScrollTransitions.set(wrapper, transition)
				return transition.untilEnd()
			}
			else {
				wrapper.scrollTop = newScrollY
			}

			return true
		}

		return false
	}

	if (scrollDirection === 'horizontal') {
		let oldScrollX = wrapper.scrollLeft
		let newScrollX: number | null = null
		let offsetX = getUnScrolledOffset(el, wrapper, scrollDirection)
		let startOffset = offsetX - gap - oldScrollX
		let endOffset = offsetX + el.offsetWidth + gap - wrapper.clientWidth - oldScrollX

		if (startOffset < 0 && endOffset < 0 || el.offsetWidth > wrapper.clientWidth) {
			newScrollX = Math.max(0, offsetX - gap)
		}
		else if (endOffset > 0 && startOffset > 0) {
			newScrollX = Math.min(wrapper.scrollWidth, offsetX + el.offsetWidth + gap) - wrapper.clientWidth
		}

		if (newScrollX !== null && newScrollX !== oldScrollX) {
			if (duration) {
				let transition = new PerFrameTransition({
					duration,
					easing,
				})

				transition.playBetween(
					oldScrollX,
					newScrollX,
					(value: number) => {
						wrapper!.scrollLeft = value
					}
				)

				RunningScrollTransitions.set(wrapper, transition)
				return transition.untilEnd()
			}
			else {
				wrapper.scrollLeft = newScrollX
			}

			return true
		}
	}

	return false
}


/**
 * Scroll closest scrollbar to make element in the top most or left most of the scroll viewport.
 * @param scrollDirection `horizontal` | `vertical` | `null`, if is null, will detect scroll direction.
 * @param gap Reserve a little distance from the element's edge away from scroll viewport edge, default value is `0`.
 * @param duration Transition duration, default value is `0`.
 * @param easing Transition easing, default value is `0`.

 * Returns a promise which will be resolved by whether scrolled.
 */
export async function scrollToStart(
	el: HTMLElement,
	scrollDirection: HVDirection | null = null,
	gap: number = 0,
	duration: number = 0,
	easing: PerFrameTransitionEasingName = 'ease-out'
): Promise<boolean> {
	let wrapperAndDirection = findClosestSizedScrollWrapper(el)
	if (!wrapperAndDirection) {
		return false
	}

	let {wrapper, direction: wrapperDirection} = wrapperAndDirection
	scrollDirection = scrollDirection ?? wrapperDirection

	if (!scrollDirection) {
		return false
	}

	if (RunningScrollTransitions.has(el)) {
		RunningScrollTransitions.get(el)!.cancel()
	}
	
	let offset = getUnScrolledOffset(el, wrapper, scrollDirection)
	let property: 'scrollLeft' | 'scrollTop' = scrollDirection === 'horizontal' ? 'scrollLeft' : 'scrollTop'
	let oldScroll = wrapper[property]
	let newScroll = Math.max(0, offset - gap)

	if (newScroll !== oldScroll) {
		if (duration) {
			let transition = new PerFrameTransition({
				duration,
				easing,
			})

			transition.playBetween(
				oldScroll,
				newScroll,
				(value: number) => {
					wrapper![property] = value
				}
			)

			RunningScrollTransitions.set(el, transition)

			return transition.untilEnd()
		}
		else {
			wrapper[property] = newScroll
		}

		return true
	}

	return false
}


/**
 * Scroll closest scrollbar to make element in the top most of the scroll viewport.
 * @param gap Reserve a little distance from the element's edge away from scroll viewport edge, default value is `0`.
 * @param duration Transition duration, default value is `0`.
 * @param easing Transition easing, default value is `0`.
 * 
 * Returns a promise which will be resolved by whether scrolled.
 */
export function scrollToTop(el: HTMLElement, gap: number = 0, duration: number = 0, easing: PerFrameTransitionEasingName = 'ease-out'): Promise<boolean> {
	return scrollToStart(el, 'vertical', gap, duration, easing)
}


/**
 * Scroll closest scrollbar to make element in the left most of the scroll viewport.
 * @param gap Reserve a little distance from the element's edge away from scroll viewport edge, default value is `0`.
 * @param duration Transition duration, default value is `0`.
 * @param easing Transition easing, default value is `0`.
 * 
 * Returns a promise which will be resolved by whether scrolled.
 */
export function scrollToLeft(el: HTMLElement, gap: number = 0, duration: number = 0, easing: PerFrameTransitionEasingName = 'ease-out'): Promise<boolean> {
	return scrollToStart(el, 'vertical', gap, duration, easing)
}



/**
 * Find the closest scroll wrapper, which is the closest ancestral element,
 * and it's contents get overflow.
 * Note this method returns `true` only when overflow happens.
 * Note this method read dom properties and may cause page re-layout.
 */
function findClosestSizedScrollWrapper(el: HTMLElement): {wrapper: HTMLElement, direction: HVDirection} | null {
	while (el) {
		let direction = getSizedOverflowDirection(el)
		if (direction !== null) {
			return {wrapper: el, direction}
		}

		el = el.parentElement!
	}

	return null
}


/** 
 * Get the overflow direction of scroll wrapper, may return `horizontal | vertical | null`.
 * Note this method can only test overflow direction when overflow happens.
 * Note this method read dom properties and may cause page re-layout.
 */
function getSizedOverflowDirection(wrapper: HTMLElement): HVDirection | null {
	let direction: HVDirection | null = null

	if (wrapper.scrollHeight > wrapper.clientHeight) {
		direction = 'vertical'
	}
	else if (wrapper.scrollWidth > wrapper.clientWidth) {
		direction = 'horizontal'
	}

	return direction
}


/**
 * Get element's offset position relative to wrapper element.
 * This value equals to the element's document position difference to wrapper element
 * without any scrolling affected.
 */
function getUnScrolledOffset(el: HTMLElement, wrapper: HTMLElement, direction: HVDirection): number {
	let property: 'offsetLeft' | 'offsetTop' = direction === 'horizontal' ? 'offsetLeft' : 'offsetTop'
	let parent = el
	let offset = 0

	// Accumulate offset values, until wrapper.
	while (parent) {
		offset += parent[property]
		parent = parent.offsetParent as HTMLElement

		// Out of range of wrapper.
		if (parent.contains(wrapper)) {
			if (parent === wrapper.offsetParent) {
				offset -= wrapper[property]
			}
			break
		}
	}

	return offset
}
