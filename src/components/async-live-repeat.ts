import {LiveRepeat} from './live-repeat'
import {ImmediateDataGetter, PageDataFetcher, RemotePageDataGetter} from './helpers/page-data-fetcher'
import {input} from '@pucelle/ff'


export interface LiveAsyncRepeatEvents {

	/** 
	 * Fired after every time all the live data becomes fresh,
	 * all immediate data was replaced to real data.
	 */
	'fresh-live-updated': () => void
}


/** 
 * Compare with `<LiveRepeat>`,
 * `<AsyncLiveRepeat>` can render remote data which was splitted to pages.
 */
export class AsyncLiveRepeat<T = any, E = any> extends LiveRepeat<T, E & LiveAsyncRepeatEvents> {

	/** If specified, can avoid duplicate items with same key exist in same time. */
	@input readonly key: keyof T | null = null

	/** Total data count getter, required. */
	@input readonly dataCountGetter!: number | Promise<number> | (() => (number | Promise<number>))

	/** Page data getter to get each page of remote data items, required. */
	@input readonly remotePageDataGetter!: RemotePageDataGetter<T>

	/** Page data getter to get temporary data items immediately. */
	@input readonly immediateDataGetter: ImmediateDataGetter<T> | null = null

	/** 
	 * If specified `pageCount` larger than `0`, will load each page data one by one.
	 * benefit for HTTP cache.
	 * If omit as `0`, load data by indices that only required.
	 * 
	 * E.g., set `pageCount` to `10`, need data indices `5~15`,
	 * will load page data `0~10` and `10~20`.
	 */
	@input readonly perPageCount: number = 0


	/** Caches loaded data. */
	protected dataGetter!: PageDataFetcher<T>

	/** Need to call `updateSliderPosition` after got `knownDataCount`. */
	protected needToUpdateSliderPositionAfterDataCountKnown: boolean = false

	/** Whether will update later. */
	protected willUpdateLater: boolean = false

	/** Whether will update data count later. */
	protected willUpdateDataCountLater: boolean = false

	/** Update version. */
	protected version: number = 0

	patch(dataOptions: any, templateFn: TemplateFn<T>, liveRepeatOptions?: LiveRepeatOptions, transitionOptions?: ContextualTransitionOptions) {
		this.dataCountGetter = dataOptions.dataCount
		this.templateFn = templateFn
		this.options.update(liveRepeatOptions)
		this.transition.updateOptions(transitionOptions)
		this.updatePreRendered()

		if (liveRepeatOptions?.renderCount) {
			this.processor.updateRenderCount(liveRepeatOptions.renderCount)
		}

		let firstTimeUpdate = !this.dataGetter
		if (firstTimeUpdate) {
			this.dataGetter = new PageDataFetcher(dataOptions.asyncDataGetter, dataOptions.immediateDataGetter)
			this.getDataCountThenUpdate()
		}
		else if (!this.willUpdateLater) {
			this.update()
		}
	}

	__updateImmediately() {
		if (!this.willUpdateLater) {
			this.processor.updateRendering(this.updateFromIndices.bind(this))
		}
	}

	protected checkCoverage() {
		if (!this.willUpdateLater) {
			super.checkCoverage()
		}
	}

	protected async getDataCountThenUpdate() {
		let dataCountConfig = this.dataCountGetter
		if (!dataCountConfig) {
			return
		}

		if (this.willUpdateDataCountLater) {
			return
		}

		this.willUpdateDataCountLater = true
		this.willUpdateLater = true

		// Wait a little while to see if more update data count requests come.
		await Promise.resolve()

		// If more requests comes when updating it, accept new.
		this.willUpdateDataCountLater = false
		let version = ++ this.version

		let dataCount: number | Promise<number>
		let knownDataCount = 0

		if (typeof dataCountConfig === 'function') {
			dataCount = dataCountConfig()
		}
		else {
			dataCount = dataCountConfig
		}
		
		if (dataCount instanceof Promise) {
			knownDataCount = await dataCount
		}
		else {
			knownDataCount = dataCount
		}

		if (version === this.version) {
			this.processor.updateDataCount(knownDataCount)
			this.update()
			this.willUpdateLater = false
		}
	}

	protected updateFromIndices(startIndex: number, endIndex: number, scrollDirection: 'up' | 'down' | null) {
		this.startIndex = startIndex
		this.endIndex = endIndex

		let items = this.dataGetter.getImmediateData(startIndex, endIndex)
		let fresh = !items.some(item => item === null || item === undefined)

		this.updateLiveData(items, scrollDirection)
		this.triggerLiveAsyncDataEvents(scrollDirection, fresh)

		if (!fresh) {
			let updateVersion = ++this.updateVersion

			this.dataGetter.getFreshData(startIndex, endIndex).then((data: T[]) => {
				if (updateVersion === this.updateVersion) {
					this.updateLiveData(data, scrollDirection)
					this.triggerLiveAsyncDataEvents(scrollDirection, true)
				}
			})
		}
	}

	protected updateLiveData(data: (T | null)[], scrollDirection: 'up' | 'down' | null) {
		if (this.key) {
			data = this.uniqueDataByKey(data)
		}

		data = data.map(observe)
		super.updateLiveData(data as T[], scrollDirection)
	}

	protected uniqueDataByKey(data: (T | null)[]): (T | null)[] {
		let set = new Set()
		
		return data.filter(item => {
			if (item) {
				let id = item[this.key!]
				if (set.has(id)) {
					return false
				}
				else {
					set.add(id)
				}
			}

			return true
		})
	}

	protected triggerLiveAsyncDataEvents(scrollDirection: 'up' | 'down' | null, fresh: boolean) {
		this.emit('liveDataUpdated', this.liveData, this.startIndex, scrollDirection, fresh)

		onRenderComplete(() => {
			this.emit('liveDataRendered', this.liveData, this.startIndex, scrollDirection, fresh)
		})
	}

	/** 
	 * Reload data count and refresh to get all needed data.
	 * Call this when data order column changed and you want to keep scroll position, e.g., after sorting. */ 
	reload() {
		this.getDataCountThenUpdate()
	}

	/** Resolved until `liveDataUpdated` triggered. */
	untilUpdated() {
		return new Promise(resolve => {
			this.once('liveDataUpdated', () => resolve())
		}) as Promise<void>
	}

	/** Resolved until `liveDataUpdated` triggered with fresh data. */
	untilFreshUpdated(this: LiveAsyncRepeatDirective) {
		return new Promise(resolve => {
			let listener = (_liveData: any, _startIndex: any, _scrollDirection: any, fresh: boolean) => {
				if (fresh) {
					this.off('liveDataUpdated', listener as any)
					resolve()
				}
			}

			this.once('liveDataUpdated', listener as any)
		}) as Promise<void>
	}

	/** Resolved until `liveDataRendered` triggered. */
	untilRendered() {
		return new Promise(resolve => {
			this.once('liveDataRendered', () => resolve())
		}) as Promise<void>
	}

	/** Resolved until `liveDataRendered` triggered with fresh data. */
	untilFreshRendered(this: LiveAsyncRepeatDirective) {
		return new Promise(resolve => {
			let listener = (_liveData: any, _startIndex: any, _scrollDirection: any, fresh: boolean) => {
				if (fresh) {
					this.off('liveDataRendered', listener as any)
					resolve()
				}
			}

			this.once('liveDataRendered', listener as any)
		}) as Promise<void>
	}
}
