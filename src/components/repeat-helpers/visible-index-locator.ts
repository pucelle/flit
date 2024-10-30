import {ListUtils} from '@pucelle/ff'
import {DirectionalOverflowAccessor} from './directional-overflow-accessor'


/** 
 * Locate the first or last element in els that is visible.
 * Returned range is `0 ~ list.length - 1`, and at least 0.
 */
export function locateVisibleIndex(
	scroller: HTMLElement,
	els: ArrayLike<HTMLElement>,
	doa: DirectionalOverflowAccessor,
	sliderStartPosition: number,
	direction: 'start' | 'end'
): number {
	let scrollerSize = doa.getClientSize(scroller)
	let scrolled = doa.getScrollPosition(scroller)
	let locateLast = direction === 'end' ? -1 : 1
	let translated = sliderStartPosition - scrolled

	let index = ListUtils.quickBinaryFindInsertIndex(els, function(el) {
		let start = doa.getOffset(el) + translated
		let size = doa.getClientSize(el)
		let end = start + size

		// Above, move right.
		if (end < 0) {
			return -1
		}

		// Below, move left.
		else if (start > scrollerSize) {
			return 1
		}

		// Move to right if `locateLast` is `1`.
		else {
			return locateLast
		}
	})

	// If locate to `els.length`, minus.
	if (index > 0 && index === els.length) {
		index--
	}

	return index
}
