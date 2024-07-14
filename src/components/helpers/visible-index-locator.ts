import {ListUtils} from '@pucelle/ff'
import {DirectionalAccessor} from './directional-accessor'


/** 
 * Locate the first or last element in els that is visible.
 * Returned range is `0 ~ list.length`.
 */
export function locateVisibleIndex(els: ArrayLike<HTMLElement>, da: DirectionalAccessor, scrollerSize: number, scrolled: number, locateLast: 1 | -1): number {
	return ListUtils.quickBinaryFindInsertIndex(els, function(el) {
		let start = da.getOffset(el) - scrolled
		let size = da.getOffsetSize(el)
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
