/** Rect box size and location, all properties are writable. */
export type Rect = {-readonly [key in keyof ClientRect]: number }


/** Trim text by removing `\r\n\t`. */
export function trim(text: string) {
	return text.replace(/^[\r\n\t]+|[\r\n\t]+$/g, '')
}


/**
 * Find the closest index in a sorted array in where to insert new item.
 * Returned index betweens `0 - array.length`, and if `array[index]` exist, `fn(array[index]) >= 0`.
 * @param array The sorted array.
 * @param fn The function to accept item in array as argument and returns `-1` to move left, `1` to move right.
 */
export function binaryFindIndexToInsert<T>(array: ArrayLike<T>, fn: (item: T) => (0 | -1 | 1)): number {
	if (array.length === 0) {
		return 0
	}

	let result = fn(array[0])
	if (result === 0 || result === -1) {
		return 0
	}
	if (array.length === 1) {
		return 1
	}

	result = fn(array[array.length - 1])
	if (result === 0) {
		return array.length - 1
	}
	if (result === 1) {
		return array.length
	}

	let start = 0
	let end = array.length - 1

	while (end - start > 1) {
		let center = Math.floor((end + start) / 2)
		let result = fn(array[center])

		if (result === 0) {
			return center
		}
		else if (result === -1) {
			end = center
		}
		else {
			start = center
		}
	}

	return end
}


/** Repeat value for count times. */
export function repeatForTimes<T>(value: T, count: number): T[] {
	let values: T[] = []

	for (let i = 0; i < count; i++) {
		values.push(value)
	}

	return values
}


/** Resolves until next frame. */
export function untilNextFrame() {
	return new Promise(resolve => {
		requestAnimationFrame(resolve)
	})
}


/** Resolves until CPU is idle or next frame. */
export function untilIdle() {
	return new Promise(resolve => {
		if (requestIdleCallback) {
			requestIdleCallback(resolve)
		}
		else {
			setTimeout(resolve, 0)
		}
	})
}


/** 
 * Locate the first element in els that is is visible inside container.
 * @container Container to check visible inside.
 * @param els Element list to check.
 */
export function locateFirstVisibleIndex(container: Element, els: ArrayLike<Element>): number {
	return locateVisibleIndex(container, els, false)
}


/** 
 * Locate the last element in els that is is visible inside container.
 * @container Container to check visible inside.
 * @param els Element list to check.
 */
export function locateLastVisibleIndex(container: Element, els: ArrayLike<Element>): number {
	return locateVisibleIndex(container, els, true)
}


function locateVisibleIndex(container: Element, els: ArrayLike<Element>, isLast: boolean): number {
	let containerRect = container.getBoundingClientRect()

	let index = binaryFindIndexToInsert(els, (el) => {
		let rect = el.getBoundingClientRect()
		if (rect.bottom <= containerRect.top) {
			return 1
		}
		else if (rect.top >= containerRect.bottom) {
			return -1
		}
		else {
			// If find last, prefer move to right.
			return isLast ? 1 : -1
		}
	})

	if (isLast && index > 0) {
		index -= 1
	}

	return index
}


/** Get count of elements before current node. */
export function getElementCountBefore(node: Element | CharacterData): number {
	let offset = 0

	while (node.previousElementSibling) {
		node = node.previousElementSibling
		offset += 1
	}

	return offset
}



/** Get an rect object just like `getBoundingClientRect`, but writtable. */
export function getRect(el: Element): Rect {
	let rect = el.getBoundingClientRect()

	return {
		top: rect.top,
		right: rect.right,
		bottom: rect.bottom,
		left: rect.left,
		width: rect.width,
		height: rect.height,
	}
}