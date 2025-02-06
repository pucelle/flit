export class PartialRendererSizeStat {

	/** Latest rendered item size. */
	private itemSize: number = 0

	/** Clear all stat data. */
	reset() {
		this.itemSize = 0
	}

	/** After every time rendered, update indices and sizes. */
	update(count: number, renderedSize: number) {
		if (count === 0 || renderedSize === 0) {
			return
		}

		let size = renderedSize / count
		this.itemSize = size
	}

	/** Get average item size. */
	getItemSize(): number {
		return this.itemSize
	}

	/** Get a safe count of items to render. */
	getSafeRenderCount(coverageRate: number, scrollerSize: number): number {
		if (scrollerSize === 0) {
			return 1
		}

		if (this.itemSize === 0) {
			return 1
		}

		// At least render additional 200px.
		// Because normally can scroll twice per frame.
		let totalSize = Math.max(scrollerSize * coverageRate, scrollerSize + 200)

		return Math.ceil(totalSize / this.itemSize)
	}
}