import {ListUtils} from '@pucelle/ff'


/** Page data count getter. */
export type PageDataCountGetter = () => (number | Promise<number>)

/** Page data getter. */
export type PageDataGetter<T> = (startIndex: number, endIndex: number) => Promise<Iterable<T>> | Iterable<T>


/** It helps to load and manage data of each pages. */
export class PageDataLoader<T> {

	protected readonly pageSize: number
	protected readonly countGetter: PageDataCountGetter
	protected readonly dataGetter: PageDataGetter<T>
	
	protected preloadPageCount: number
	protected cacheMap: Map<number, (T | null)[]> = new Map()
	protected requests: Map<number, Promise<any>> = new Map()
	protected knownDataCount: number | null = null

	constructor(pageSize: number, countGetter: PageDataCountGetter, dataGetter: PageDataGetter<T>, preloadPageCount: number = 0) {
		this.pageSize = pageSize
		this.countGetter = countGetter
		this.dataGetter = dataGetter
		this.preloadPageCount = preloadPageCount
	}

	/** Set `preloadPageCount`. */
	setPreloadPageCount(preloadPageCount: number) {
		this.preloadPageCount = preloadPageCount
	}

	/** Get item at specified index immediately. */
	getItem(index: number): T | null {
		let pageIndex = Math.floor(index / this.pageSize)	// 50 -> 0, 51 -> 1
		return this.cacheMap.get(pageIndex)?.[index - pageIndex * this.pageSize] ?? null
	}

	/** Set item at specified index. */
	setItem(index: number, item: T | null) {
		let pageIndex = Math.floor(index / this.pageSize)
		let toPage = this.cacheMap.get(pageIndex)

		if (!toPage) {
			this.cacheMap.set(pageIndex, toPage = [])
		}

		toPage[index - pageIndex * this.pageSize] = item
	}

	/** Get data count and also caches it. */
	async getDataCount(): Promise<number> {
		if (this.knownDataCount !== null) {
			return this.knownDataCount
		}

		let count = this.countGetter()

		if (count instanceof Promise) {
			this.knownDataCount = await count
		}
		else {
			this.knownDataCount = count
		}

		return this.knownDataCount
	}

	/** 
	 * Get data items immediately.
	 * If data items haven't been requested, use `null` as placeholder.
	 */
	getImmediateData(startIndex: number, endIndex: number): (T | null)[] {
		let startPageIndex = Math.floor(startIndex / this.pageSize)		// 49 -> 0, 50 -> 1
		let endPageIndex = Math.floor((endIndex - 1) / this.pageSize)	// 50 -> 0, 51 -> 1
		let items: (T | null)[] = []

		for (let i = startPageIndex; i <= endPageIndex; i++) {
			let pageItems = this.cacheMap.get(i)
			if (!pageItems) {
				pageItems = ListUtils.repeatForTimes(null, this.pageSize)
			}

			if (i === startPageIndex && i === endPageIndex) {
				items.push(...pageItems.slice(startIndex - startPageIndex * this.pageSize, endIndex - endPageIndex * this.pageSize))
			}
			else if (i === startPageIndex) {
				items.push(...pageItems.slice(startIndex - startPageIndex * this.pageSize))
			}
			else if (i === endPageIndex) {
				items.push(...pageItems.slice(0, endIndex - endPageIndex * this.pageSize))
			}
			else {
				items.push(...pageItems)
			}
		}

		this.preloadIfNeeded(endPageIndex + 1)

		return items
	}

	/** Get fresh data items. */
	async getFreshData(startIndex: number, endIndex: number): Promise<T[]> {
		let startPageIndex = Math.floor(startIndex / this.pageSize)		// 49 -> 0, 50 -> 1
		let endPageIndex = Math.floor((endIndex - 1) / this.pageSize)	// 50 -> 0, 51 -> 1
		let promises: Promise<void>[] = []

		for (let i = startPageIndex; i <= endPageIndex; i++) {
			promises.push(this.ensurePageData(i))
		}

		await Promise.all(promises)
		
		this.preloadIfNeeded(endPageIndex + 1)

		return this.getImmediateData(startIndex, endIndex) as T[]
	}

	/** Preload more pages of data. */
	protected async preloadIfNeeded(startPageIndex: number) {
		if (this.knownDataCount !== null && this.preloadPageCount > 0) {
			let endPageIndex = Math.ceil(this.knownDataCount / this.pageSize)	// 50 -> 1, 51 -> 2

			for (let i = startPageIndex; i < endPageIndex && i < startPageIndex + this.preloadPageCount; i++) {
				await this.ensurePageData(i)
			}
		}
	}

	/** Load page data if not yet. */
	protected async ensurePageData(pageIndex: number) {
		if (!this.cacheMap.has(pageIndex)) {
			await this.loadPageData(pageIndex)
		}
	}

	/** Load page data at specified page index. */
	protected async loadPageData(pageIndex: number) {

		// Avoid requesting repetitively.
		if (this.requests.has(pageIndex)) {
			return this.requests.get(pageIndex)!
		}

		let startIndex = pageIndex * this.pageSize
		let endIndex = (pageIndex + 1) * this.pageSize
		
		if (this.knownDataCount !== null) {
			endIndex = Math.min(endIndex, this.knownDataCount)
		}

		if (startIndex >= endIndex) {
			return
		}

		let promise = this.dataGetter(startIndex, endIndex)
		if (promise instanceof Promise) {
			this.requests.set(pageIndex, promise)

			let data = await promise
			if (data) {
				this.cacheMap.set(pageIndex, [...data])
			}

			this.requests.delete(pageIndex)
		}
		else {
			this.cacheMap.set(pageIndex, [...promise])
		}
	}

	/** Splice, remove some data items, and then insert some data items to cache data. */
	splice(index: number, removeCount: number, ...addItems: T[]) {
		let moveCount = addItems.length - removeCount
		this.moveDataItems(index, moveCount)

		for (let i = 0; i < addItems.length; i++) {
			this.setItem(index + i, addItems[i])
		}
	}

	/** 
	 * Moves data after insert or delete at specified index.
	 * `moveCount` can be either position or negative.
	 */
	protected moveDataItems(index: number, moveCount: number) {
		if (moveCount === 0) {
			return
		}

		let totalCount = this.knownDataCount
		if (totalCount === null) {
			let maxPageIndex = Math.max(...this.cacheMap.keys())
			totalCount = this.cacheMap.get(maxPageIndex)!.length + maxPageIndex * this.pageSize
		}

		// Move backward
		if (moveCount > 0) {
			for (let i = totalCount - 1; i >= index; i--) {
				this.moveDataItem(i, i + moveCount)
			}
		}

		// Move forward
		else {
			for (let i = index; i < totalCount; i++) {
				this.moveDataItem(i, i + moveCount)
			}
		}

		if (this.knownDataCount !== null) {
			this.knownDataCount += moveCount
		}
	}

	/** Move one data item from an index to target index. */
	protected moveDataItem(fromIndex: number, toIndex: number) {
		if (fromIndex === toIndex) {
			return
		}

		let fromItem = this.getItem(fromIndex)
		this.setItem(toIndex, fromItem)
	}

	/** Clear all data cache. */
	clear() {
		this.cacheMap = new Map()
		this.requests = new Map()
		this.knownDataCount = null
	}
}