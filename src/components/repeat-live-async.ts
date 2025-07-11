import {effect, watch} from '@pucelle/lupos'
import {LiveRepeat} from './repeat-live'
import {PageDataCountGetter, PageDataGetter, PageDataLoader} from '../data'


export interface AsyncLiveRepeatEvents {

	/** 
	 * Fired after every time all the live data becomes fresh,
	 * and all immediate data has been replaced to real data.
	 */
	'freshly-updated': () => void
}


/** 
 * Compare with `<LiveRepeat>`,
 * `<AsyncLiveRepeat>` can render remote data which was splitted to pages.
 */
export class AsyncLiveRepeat<T = any, E = {}> extends LiveRepeat<T | null, E & AsyncLiveRepeatEvents> {

	/** 
	 * If specified `pageSize` larger than `0`, will load each page data one by one.
	 * benefit for HTTP cache.
	 * If omit as `0`, load data by indices that only required.
	 * 
	 * E.g., set `pageSize` to `10`, need data indices `5~15`,
	 * will load page data `0~10` and `10~20`.
	 */
	pageSize: number = 0

	/** Total data count getter, required. */
	dataCountGetter!: PageDataCountGetter

	/** Page data getter to get each page of remote data items, required. */
	pageDataGetter!: PageDataGetter<T>

	/** Count of pages which will preload. */
	preloadPageCount: number = 0

	/** Page loader to load each page of data. */
	dataLoader!: PageDataLoader<T>

	private needsUpdateDataCount: boolean = true

	/** Live data, rendering part of all the data. */
	get liveData(): (T | null)[] {
		return this.dataLoader.getImmediateData(this.startIndex, this.endIndex)
	}

	/** Do nothing because `data` is not used as data source any more. */
	@effect
	protected applyDataCount() {}

	/** Apply preload page count to page loader. */
	@effect
	protected applyPreloadPageCount() {
		this.dataLoader.setPreloadPageCount(this.preloadPageCount)
	}

	/** Need to reload data after loader change.  */
	@watch('dataLoader')
	protected onDataLoaderChange() {
		this.reload()
	}

	protected onConnected(): void {
		super.onConnected()

		if (this.needsUpdateDataCount) {
			this.needsUpdateDataCount = false
			this.updateDataCount()
		}
	}

	/** Apply data count to renderer. */
	protected async updateDataCount() {
		let dataCount = await this.dataLoader.getDataCount()
		this.renderer!.setDataCount(dataCount)
		this.willUpdate()
	}

	protected async onUpdated(this: AsyncLiveRepeat) {
		super.onUpdated()
		
		let dataFresh = this.dataLoader.isRangeFresh(this.startIndex, this.endIndex)
		if (dataFresh) {
			this.fire('freshly-updated')
		}
		else {
			await this.dataLoader.getFreshData(this.startIndex, this.endIndex)
			this.willUpdate()
		}
	}

	/** 
	 * Reload all data, include data count.
	 * Scroll position will be persisted.
	 */ 
	reload() {
		this.dataLoader.clear()

		if (this.connected) {
			this.updateDataCount()
			this.willUpdate()
		}
		else {
			this.needsUpdateDataCount = true
		}
	}
}
