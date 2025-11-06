import {MiniHeap} from "@pucelle/lupos"

export class PartialSizeStat {

	/** Latest rendered item size. */
	private averageSize: number = 0

	/** Cache item sizes, sort from lower to upper. */
	private heap: MiniHeap<number> = new MiniHeap((a, b) => a - b)

	/** Clear all stat data. */
	reset() {
		this.averageSize = 0
	}

	/** After every time rendered, update indices and sizes. */
	updateRange(count: number, renderedSize: number) {
		if (count === 0 || renderedSize === 0) {
			return
		}

		let size = renderedSize / count

		// Mix with old size, to make sure it doesn't change too much.
		if (this.averageSize > 0) {
			size = size * 0.5 + this.averageSize * 0.5
		}

		this.averageSize = size
	}

	/** Update for each newly rendered item sizes. */
	updateEach(itemSizes: number[]) {
		let heapSize = this.heap.size

		for (let size of itemSizes) {
			this.heap.add(size)
			heapSize++
			
			if (heapSize > 100) {
				let index1 = Math.floor(Math.random() * heapSize / 2)
				let index2 = heapSize - index1

				// Remove larger index, then smaller.
				this.heap.removeAt(index2)
				this.heap.removeAt(index1)

				heapSize -= 2
			}
		}
	}

	/** Get latest item size. */
	getAverageSize(): number {
		return this.averageSize
	}

	/** Get median item size. */
	getMedianSize(): number {
		let size = this.heap.size
		if (size === 0) {
			return 0
		}

		return this.heap.getAt(Math.floor(this.heap.size / 2))
	}
}