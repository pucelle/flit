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
	let scrolled = doa.getScrolled(scroller)
	let locateLast = direction === 'end' ? -1 : 1

	// Turn slider origin to scroller origin.
	let translated = sliderStartPosition - scrolled

	let index = ListUtils.quickBinaryFindInsertIndex(els, function(el) {
		let start = doa.getOffset(el) + translated
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


/** Locate the element in els that is in specified offset position. */
export function locateVisibleIndexAtOffset(
	scroller: HTMLElement,
	els: ArrayLike<HTMLElement>,
	doa: DirectionalOverflowAccessor,
	sliderStartPosition: number,
	offset: number
): number {
	let scrolled = doa.getScrolled(scroller)

	// In scroller origin.
	let position = offset - scrolled

	// Turn slider origin to scroller origin.
	let translated = sliderStartPosition - scrolled

	let index = ListUtils.quickBinaryFindLowerInsertIndex(els, function(el) {
		let start = doa.getOffset(el) + translated
		let size = doa.getOffsetSize(el)
		let end = start + size

		if (position < start) {
			return 1
		}

		else if (position > end) {
			return -1
		}

		else {
			return 0
		}
	})

	if (index === els.length) {
		index = -1
	}

	return index
}
