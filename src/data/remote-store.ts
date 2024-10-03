import {computed, effect, immediateWatch, ListUtils, Observed} from '@pucelle/ff'
import {PageDataLoader} from './page-data-loader'


export interface RemoteStoreOptions<T> {

	/** Data item count in one page, decided by backend interface */
	pageSize: number

	/** How many pages of data to be preloaded. */
	preloadPageCount: number

	/** Current order key. */
	orderKey: keyof T | null

	/** Current order direction. */
	orderDirection: ListUtils.OrderDirection

	/** Search word to do data searching. */
	searchWord: string | null
}


/**
 * Compare to `Store`, `RemoteStore` loads data of one page each time.
 * And every time after data changed, it refreshes to reload data from server.
 * 
 * You should extend this class to implement dataCount and dataGetter,
 * and may implement ordering and filtering,
 */
export abstract class RemoteStore<T = any> implements RemoteStoreOptions<T>, Observed {

	pageSize: number = 1
	preloadPageCount: number = 0
	orderKey: keyof T | null = null
	orderDirection: ListUtils.OrderDirection = 'asc'
	searchWord: string | null = null

	
	constructor(options: Partial<RemoteStoreOptions<T>> = {}) {
		Object.assign(this, options)
	}

	@computed
	protected get dataLoader(): PageDataLoader<T> {
		return new PageDataLoader(this.pageSize, this.dataCountGetter.bind(this), this.pageDataGetter.bind(this))
	}

	@effect
	protected applyPreloadPageCount() {
		this.dataLoader.setPreloadPageCount(this.preloadPageCount)
	}

	/** Get total data count. */
	protected abstract dataCountGetter(): Promise<number> | number

	/** Get page data from start and end indices. */
	protected abstract pageDataGetter(startIndex: number, endIndex: number): Promise<Iterable<T>> | Iterable<T>

	/** Get data items immediately. */
	async getDataCount(): Promise<number> {
		return this.dataLoader.getDataCount()
	}

	/** Get data items immediately. */
	getImmediateData(startIndex: number, endIndex: number): (T | null)[] {
		return this.dataLoader.getImmediateData(startIndex, endIndex)
	}

	/** Get fresh data items. */
	async getFreshData(startIndex: number, endIndex: number): Promise<T[]> {
		return this.dataLoader.getFreshData(startIndex, endIndex)
	}
	
	/** Reload all data. */
	reload() {
		this.dataLoader.clear()
	}
}