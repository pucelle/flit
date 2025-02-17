import {DOMUtils} from '@pucelle/ff'


/** It get and set overflow value by current overflow direction. */
export class DirectionalOverflowAccessor {

	private direction: HVDirection | null = null

	constructor(d: HVDirection | null = null) {
		this.direction = d
	}

	setDirection(d: HVDirection | null = null) {
		this.direction = d
	}

	getStartPadding(el: HTMLElement) {
		if (this.direction === 'vertical') {
			return DOMUtils.getNumericStyleValue(el, 'paddingTop')
		}
		else if (this.direction === 'horizontal') {
			return DOMUtils.getNumericStyleValue(el, 'paddingLeft')
		}
		else {
			return 0
		}
	}

	getEndPadding(el: HTMLElement) {
		if (this.direction === 'vertical') {
			return DOMUtils.getNumericStyleValue(el, 'paddingBottom')
		}
		else if (this.direction === 'horizontal') {
			return DOMUtils.getNumericStyleValue(el, 'paddingRight')
		}
		else {
			return 0
		}
	}

	setStartPosition(el: HTMLElement, value: string) {
		if (this.direction === 'vertical') {
			el.style.top = value
		}
		else if (this.direction === 'horizontal') {
			el.style.left = value
		}
	}

	setEndPosition(el: HTMLElement, value: string) {
		if (this.direction === 'vertical') {
			el.style.bottom = value
		}
		else if (this.direction === 'horizontal') {
			el.style.right = value
		}
	}

	getScrollPosition(el: Element) {
		if (this.direction === 'vertical') {
			return el.scrollTop
		}
		else if (this.direction === 'horizontal') {
			return el.scrollLeft
		}
		else {
			return 0
		}
	}

	setScrollPosition(el: Element, position: number) {
		if (this.direction === 'vertical') {
			el.scrollTop = position
		}
		else if (this.direction === 'horizontal') {
			el.scrollLeft = position
		}
	}

	setSize(el: HTMLElement, size: number) {
		if (this.direction === 'vertical') {
			el.style.height = size + 'px'
		}
		else if (this.direction === 'horizontal') {
			el.style.width = size + 'px'
		}
	}

	/** Inner size not include padding, border, scroll bar size. */
	getInnerSize(el: HTMLElement): number {
		return this.getClientSize(el) - this.getStartPadding(el) - this.getEndPadding(el)
	}

	/** Client size not include border, scroll bar size. */
	getClientSize(el: Element): number {
		if (this.direction === 'vertical') {
			return el.clientHeight
		}
		else if (this.direction === 'horizontal') {
			return el.clientWidth
		}
		else {
			return 0
		}
	}

	/** Client size include padding, border, scroll bar size. */
	getOffsetSize(el: HTMLElement): number {
		if (this.direction === 'vertical') {
			return el.offsetHeight
		}
		else if (this.direction === 'horizontal') {
			return el.offsetWidth
		}
		else {
			return 0
		}
	}

	/** Include container padding, and content margin. */
	getScrollSize(el: Element): number {
		if (this.direction === 'vertical') {
			return el.scrollHeight
		}
		else if (this.direction === 'horizontal') {
			return el.scrollWidth
		}
		else {
			return 0
		}
	}

	/** Get size consider margin. */
	getOuterSize(el: Element): number {
		if (this.direction === 'vertical') {
			return el.clientHeight
		}
		else if (this.direction === 'horizontal') {
			return el.clientWidth
		}
		else {
			return 0
		}
	}

	/** Offset value is not affected by scroll position. */
	getOffsetPosition(el: HTMLElement): number {
		if (this.direction === 'vertical') {
			return el.offsetTop
		}
		else if (this.direction === 'horizontal') {
			return el.offsetLeft
		}
		else {
			return 0
		}
	}

	/** 
	 * Get offset position consider margin value.
	 * Offset value is not affected by scroll position.
	 */
	getOuterOffsetPosition(el: HTMLElement): number {
		if (this.direction === 'vertical') {
			return el.offsetTop - DOMUtils.getNumericStyleValue(el, 'marginTop')
		}
		else if (this.direction === 'horizontal') {
			return el.offsetLeft - DOMUtils.getNumericStyleValue(el, 'marginLeft')
		}
		else {
			return 0
		}
	}

	/** 
	 * Get end offset position consider margin value.
	 * Offset value is not affected by scroll position.
	 */
	getEndOuterOffsetPosition(el: HTMLElement): number {
		if (this.direction === 'vertical') {
			return el.offsetTop + el.offsetHeight + DOMUtils.getNumericStyleValue(el, 'marginBottom')
		}
		else if (this.direction === 'horizontal') {
			return el.offsetLeft + el.offsetWidth + DOMUtils.getNumericStyleValue(el, 'marginRight')
		}
		else {
			return 0
		}
	}
}