import {effect, immediateWatch} from '@pucelle/ff'
import {LiveRepeat} from './live-repeat'
import {PageDataCountGetter, PageDataGetter, PageDataLoader} from '../data'
import {html} from '@pucelle/lupos.js'


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


	private dataLoader!: PageDataLoader<T>
	private needsUpdateDataCount: boolean = true
	private version: number = 0

	/** Live data, rendering part of all the data. */
	get liveData(): (T | null)[] {
		return this.data
	}

	@immediateWatch('pageSize', 'dataCountGetter', 'pageDataGetter')
	protected initDataLoader(pageSize: number, dataCountGetter: PageDataCountGetter, pageDataGetter: PageDataGetter<T>) {
		this.dataLoader = new PageDataLoader(pageSize, dataCountGetter, pageDataGetter)
		this.needsUpdateDataCount = true
	}

	@effect
	protected applyPreloadPageCount() {
		this.dataLoader.setPreloadPageCount(this.preloadPageCount)
	}

	protected onConnected(): void {
		super.onConnected()

		if (this.needsUpdateDataCount) {
			this.needsUpdateDataCount = false
			this.updateDataCount()
		}
	}

	protected async updateDataCount() {
		let dataCount = await this.dataLoader.getDataCount()
		this.renderer!.setDataCount(dataCount)
	}

	protected async updateLiveData(this: AsyncLiveRepeat<any, {}>) {
		this.data = this.dataLoader.getImmediateData(this.startIndex, this.endIndex)

		let dataUnFresh = this.data.some(item => item === null)
		if (dataUnFresh) {
			let version = this.version
			let freshData = await this.dataLoader.getFreshData(this.startIndex, this.endIndex)

			if (version === this.version) {
				this.data = freshData
				this.fire('freshly-updated')
			}
		}
		else {
			this.fire('freshly-updated')
		}
	}

	protected render() {
		return html`<lu:for ${this.data}>${this.renderFn}</lu:for>`
	}

	/** 
	 * Reload all data, include data count.
	 * Scroll position will be persisted.
	 */ 
	reload() {
		this.dataLoader.clear()
		this.updateDataCount()
		this.needsUpdateDataCount = true
		this.willUpdate()
		this.version++
	}
}
