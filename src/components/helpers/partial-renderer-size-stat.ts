import {RecursiveVariance} from '@pucelle/ff'


export class PartialRendererSizeStat {

	/** Do rendered item size statistic, guess rendered item size. */
	private readonly rv: RecursiveVariance = new RecursiveVariance()

	/** After every time rendered, update indices and sizes. */
	update(startIndex: number, endIndex: number, renderedSize: number) {
		if (endIndex === startIndex) {
			return
		}

		let size = renderedSize / (endIndex - startIndex)
		this.rv.update(size)
	}

	/** Get average item size. */
	getAverageSize(): number {
		return this.rv.average
	}

	/** Get a suggested count of items to render. */
	getSuggestedRenderCount(rate: number, scrollerSize: number): number {
		if (scrollerSize === 0) {
			return 1
		}

		let safeSize = this.rv.average - 2 * this.rv.variance ** 0.5
		if (safeSize === 0) {
			return 1
		}

		return Math.ceil(scrollerSize / safeSize * rate)
	}
}