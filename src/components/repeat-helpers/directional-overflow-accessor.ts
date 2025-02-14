/** It get and set overflow value by current overflow direction. */
export class DirectionalOverflowAccessor {

	private direction: HVDirection | null = null

	constructor(d: HVDirection | null = null) {
		this.direction = d
	}

	setDirection(d: HVDirection | null = null) {
		this.direction = d
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

	/** Offset value is not affected by scroll position. */
	getOffset(el: HTMLElement): number {
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
}