/** 
 * Binary find from a already sorted from lower to upper list,
 * find a index to insert the new value.
 * Returned index betweens `0 ~ list length`.
 * Note when some equal values exist, the returned index prefers upper.
 */
export function binaryFindInsertIndexWithAdditionSize(sorted: number[], additionalSizeOfEach: number, toInsert: number): number {
	if (sorted.length === 0) {
		return 0
	}

	if (sorted[0] + additionalSizeOfEach > toInsert) {
		return 0
	}

	if (sorted[sorted.length - 1] + additionalSizeOfEach * sorted.length <= toInsert) {
		return sorted.length
	}

	let start = 0
	let end = sorted.length - 1

	while (start + 1 < end) {
		let center = Math.floor((end + start) / 2)
		let centerValue = sorted[center] + additionalSizeOfEach * (center + 1)

		if (centerValue <= toInsert) {
			start = center
		}
		else {
			end = center
		}
	}

	// Value at start index always <= `value`, and value at end index always > `value`.
	return end
}
