import {ListUtils} from '@pucelle/ff'


/** Remote page data getter to get each page of remote data items. */
export type RemotePageDataGetter<T> = (startIndex: number, endIndex: number) => Promise<T[]> | T[]

/** Immediate page data getter to get temporary data items immediately. */
export type ImmediateDataGetter<T> = (index: number) => (T | null)[]


/** Help to fetch and cache remote data. */
export class PageDataFetcher<T> {

	private readonly remoteGetter: RemotePageDataGetter<T>
	private readonly immediateGetter: ImmediateDataGetter<T> | null
	private readonly perPageCount: number

	private cache: (T | T[] | undefined)[] = []
	private version: number = 0

	constructor(remoteGetter: RemotePageDataGetter<T>, immediateGetter: ImmediateDataGetter<T> | null = null, perPageCount: number = 0) {
		this.remoteGetter = remoteGetter
		this.immediateGetter = immediateGetter
		this.perPageCount = perPageCount
	}

	/** Get data items immediately. */
	getImmediateData(startIndex: number, endIndex: number): (T | null)[] {
		let data: (T | null)[] = []
		let count = endIndex - startIndex

		if (this.cache) {
			if (startIndex < this.cache.startIndex) {
				data.push(...ListUtils.repeatForTimes(null, Math.min(this.cache.startIndex - startIndex, count)))
			}

			// Shared part.
			data.push(...this.cache.items.slice(Math.max(this.cache.startIndex, startIndex), Math.min(this.cache.endIndex, endIndex)))

			if (endIndex > this.cache.endIndex) {
				data.push(...ListUtils.repeatForTimes(null, Math.max(endIndex - this.cache.endIndex, count)))
			}
		}
		else {
			data .push(...ListUtils.repeatForTimes(null, count))
		}

		return data
	}

	/** Get fresh data items. */
	async getFreshData(startIndex: number, endIndex: number): Promise<T[]> {
		let version = ++this.version
		let items = await this.remoteGetter(startIndex, endIndex)

		if (this.version === version) {
			this.cache = {
				startIndex,
				endIndex,
				items,
			}
		}

		return items
	}

	clear() {
		this.cache = []
	}
}