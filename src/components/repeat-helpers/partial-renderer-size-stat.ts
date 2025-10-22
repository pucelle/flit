export class PartialRendererSizeStat {

	/** Latest rendered item size. */
	private latestSize: number = 0

	/** Clear all stat data. */
	reset() {
		this.latestSize = 0
	}

	/** After every time rendered, update indices and sizes. */
	update(count: number, renderedSize: number) {
		if (count === 0 || renderedSize === 0) {
			return
		}

		let size = renderedSize / count

		// Mix with old size, to make sure it doesn't change too much.
		if (this.latestSize > 0) {
			size = size * 0.5 + this.latestSize * 0.5
		}

		this.latestSize = size
	}

	/** Get latest item size. */
	getLatestSize(): number {
		return this.latestSize
	}
}