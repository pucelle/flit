import {ListUtils} from '@pucelle/ff'
import {DirectionalOverflowAccessor} from './directional-overflow-accessor'


/** 
 * Locate the first or last element in els that is visible.
 * Returned range is `0 ~ list.length`.
 */
export function locateVisibleIndex(
	scroller: HTMLElement,
	els: ArrayLike<HTMLElement>,
	doa: DirectionalOverflowAccessor,
	direction: 'start' | 'end'
): number {
	let scrollerSize = doa.getClientSize(scroller)
	let scrolled = doa.getScrollPosition(scroller)
	let locateLast = direction === 'end' ? 1 : -1

	return ListUtils.quickBinaryFindInsertIndex(els, function(el) {
		let start = doa.getOffset(el) - scrolled
		let size = doa.getClientSize(el)
		let end = start + size

		// Fully above.
		if (end < 0) {
			return 1
		}

		// Fully below.
		else if (start > scrollerSize) {
			return -1
		}

		// Move to right if `locateLast` is `1`.
		else {
			return locateLast
		}
	})
}
