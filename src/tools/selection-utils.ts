import {LowerIndexWithin} from './types'


/** 
 * Iterate indices by start and end index and within values.
 * Value at `endIndex` is not included.
 */
export function getRange(start: LowerIndexWithin, end: LowerIndexWithin): [number, number] {
	if (start.index > end.index
		|| start.index === end.index && !end.within
	) {
		[start, end] = [end, start]
	}

	let startIndex = start.index
	let endIndex = end.index

	if (end.within) {
		endIndex++
	}

	return [startIndex, endIndex]
}