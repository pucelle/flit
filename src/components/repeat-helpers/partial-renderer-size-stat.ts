import {RecursiveAverage} from '@pucelle/ff'


export class PartialRendererSizeStat {


	/** Latest rendered item size. */
	private latestSize: number = 0

	/** To do average stat. */
	private averageStat: RecursiveAverage = new RecursiveAverage()

	/** Clear all stat data. */
	reset() {
		this.averageStat = new RecursiveAverage()
		this.latestSize = 0
	}

	/** After every time rendered, update indices and sizes. */
	update(count: number, renderedSize: number) {
		if (count === 0 || renderedSize === 0) {
			return
		}

		let size = renderedSize / count
		this.latestSize = size
		this.averageStat.update(size)
	}

	/** Get latest item size. */
	getLatestSize(): number {
		return this.latestSize
	}

	/** Get average item size. */
	getAverageSize(): number {
		return this.averageStat.average
	}
}