import {ListUtils} from '@pucelle/ff'
import {DirectionalOverflowAccessor} from './directional-overflow-accessor'


/** 
 * Locate the first or after the last element in els that is at least partial visible.
 * Returned range is `0 ~ list.length`.
 */
export function locateVisibleIndex(
	scroller: HTMLElement,
	els: ArrayLike<HTMLElement>,
	doa: DirectionalOverflowAccessor,
	sliderStartPosition: number,
	direction: 'start' | 'end',
	fullyVisible: boolean
): number {
	let scrollerSize = doa.getClientSize(scroller)
	let scrolled = doa.getScrollPosition(scroller)
	let locateLast = direction === 'end' ? -1 : 1
	let translated = sliderStartPosition - scrolled

	let index = ListUtils.quickBinaryFindInsertIndex(els, function(el) {
		let start = doa.getOffsetPosition(el) + translated
		let size = doa.getOffsetSize(el)
		let end = start + size

		// Above, move right.
		if (fullyVisible ? start < 0 : end < 0) {
			return -1
		}

		// Below, move left.
		else if (fullyVisible ? end > scrollerSize : start > scrollerSize) {
			return 1
		}

		// Move to right if `locateLast` is `1`.
		else {
			return locateLast
		}
	})

	return index
}
