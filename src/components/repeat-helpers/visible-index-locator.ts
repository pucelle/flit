import {ListUtils} from '@pucelle/ff'
import {DirectionalOverflowAccessor} from './directional-overflow-accessor'


/** 
 * Locate the first or after the last element in els that is at least partial visible.
 * `minimumRatio` specifies the size of visible part relative to full size,
 * only when intersection rate greater the element get recognized as visible.
 * Returned range is `0 ~ list.length`.
 */
export function locateVisibleIndex(
	scroller: HTMLElement,
	els: ArrayLike<HTMLElement>,
	doa: DirectionalOverflowAccessor,
	sliderStartPosition: number,
	direction: 'start' | 'end',
	minimumRatio: number = 0
): number {
	let scrollerSize = doa.getClientSize(scroller)
	let scrolled = doa.getScrolled(scroller)
	let preferFlag = direction === 'end' ? -1 : 1

	// Turn slider origin to scroller origin.
	let translated = sliderStartPosition - scrolled

	let index = ListUtils.quickBinaryFindInsertIndex(els, function(el) {
		let start = doa.getOffset(el) + translated
		let size = doa.getOffsetSize(el)
		let end = start + size
		let ratio = (Math.min(end, scrollerSize) - Math.max(start, 0)) / Math.min(size, scrollerSize)

		if (ratio <= minimumRatio) {
			
			// Above, move right.
			if (start < 0) {
				return -1
			}

			// Below, move left.
			else {
				return 1
			}
		}

		// Move to right if `locateLast` is `1`.
		else {
			return preferFlag
		}
	})

	return index
}


/** 
 * Locate the element in els that is in specified offset position.
 * May returns value in range `0~els.length-1`.
 */
export function locateVisibleIndexAtOffset(
	scroller: HTMLElement,
	els: ArrayLike<HTMLElement>,
	doa: DirectionalOverflowAccessor,
	sliderStartPosition: number,
	offset: number,
	preferUpper: boolean
): number {
	let scrolled = doa.getScrolled(scroller)

	// In scroller origin.
	let position = offset - scrolled

	// Turn slider origin to scroller origin.
	let translated = sliderStartPosition - scrolled

	function flag(el: HTMLElement) {
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
	}

	let index = ListUtils.quickBinaryFindInsertIndex(els, flag)
	if (index === els.length) {
		index = els.length - 1
	}

	// Move to left when in the space between two.
	if (!preferUpper && index > 0 && flag(els[index]) === 1) {
		index--
	}

	return index
}
