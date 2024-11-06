import {RecursiveVariance} from '@pucelle/ff'


export class PartialRendererSizeStat {

	/** Do rendered item size statistic, guess rendered item size. */
	private rv: RecursiveVariance = new RecursiveVariance()

	/** Clear all stat data. */
	reset() {
		this.rv = new RecursiveVariance()
	}

	/** After every time rendered, update indices and sizes. */
	update(count: number, renderedSize: number) {
		if (count === 0) {
			return
		}

		let size = renderedSize / count
		this.rv.update(size)
	}

	/** Get average item size. */
	getAverageSize(): number {
		return this.rv.average
	}

	/** Get a safe size, match 95% confidence of Gaussian Distribution. */
	getSafeSize(varianceRate: number = 0) {
		return this.rv.average + varianceRate * this.rv.variance ** 0.5
	}

	/** Get a safe count of items to render. */
	getSafeRenderCount(coverageRate: number, scrollerSize: number, varianceRate: number = -2): number {
		if (scrollerSize === 0) {
			return 1
		}

		let safeSize = this.getSafeSize(varianceRate)
		if (safeSize === 0) {
			return 1
		}

		// At least render additional 200px.
		// Because normally can scroll twice per frame.
		let totalSize = Math.max(scrollerSize * coverageRate, scrollerSize + 200)

		return Math.ceil(totalSize / safeSize)
	}
}