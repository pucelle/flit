import {storage} from '@pucelle/ff'
import {RemoteStore} from '../../data/remote-store'
import {Store} from '../../data/store'
import {Table} from '../table'


/** Can get from a table, the result can be used to restore table state. */
export interface TableStateOptions {

	/** Caches filter. Default value is `false`. */
	filter?: boolean

	/** Caches order column and direction. Default value is `false`. */
	order?: boolean

	/** Caches start index. Default value is `false`. */
	visibleIndex?: boolean

	/** 
	 * Caches data of store.
	 * Specifies this to `true` when you use one store to cache different data.
	 * Default value is `false`.
	 */
	data?: boolean

	/** 
	 * Caches whole store.
	 * Specifies this to `true` when you use different store to cache different data.
	 * Default value is `false`.
	 */
	store?: boolean

	/** 
	 * Customized data is an object, it will be poped-up after restore.
	 * Uses a `{}` as default if not specified.
	 */
	customized?: object

	/** 
	 * If specifies as `true`, will cache state into local storage.
	 * Only available when all the properties can be serialized to JSON.
	 */
	toStorage?: boolean
}


/** Can get from a table, the result can be used to restore table state. */
interface TableState {
	storeFilter?: ((item: any) => boolean) | string | null
	visibleIndex?: number
	orderName?: string | null
	orderDirection?: '' | 'asc' | 'desc'
	data?: Map<any, any> | any[]
	store?: Store | RemoteStore
	customized?: object | undefined
}


const DefaultTableStateOptions: TableStateOptions = {
	filter: false,
	order: false,
	visibleIndex: false,
	data: false,
	store: false,
	customized: {},
}


export class TableStateCacher {

	private readonly storagePrefix: string = 'table_state_'
	private readonly table: Table
	private readonly cacheMap: Map<string, TableState> = new Map()

	constructor (table: Table) {
		this.table = table
	}

	/** Checks whether caches table state in specified name. */
	has(name: string) {
		return this.cacheMap.has(name) || storage.get(this.storagePrefix + name)
	}

	/** Cache current table state. */
	cache(name: string, options: TableStateOptions) {
		let state = this.getState(options)
		
		if (options.toStorage) {
			try {
				storage.set(this.storagePrefix + name, state)
			}
			catch (err) {
				console.error(`Can't serialize table cache data!`, state, err)
			}
		}

		this.cacheMap.set(name, state)
	}

	private getState(options: TableStateOptions): TableState {
		let table = this.table
		let store = this.table.store as Store | RemoteStore
		let state: TableState = {}

		options = {...DefaultTableStateOptions, ...options}

		if (options.filter) {
			state.storeFilter = store.getFilter()
		}

		if (options.order) {
			state.orderName = table.getOrderName()
			state.orderDirection = table.getOrderDirection()
		}

		if (options.visibleIndex) {
			state.visibleIndex = table.getFirstVisibleIndex()
		}

		if (options.data) {
			state.data = store instanceof RemoteStore ? store.getCache() : store.getFullData()
		}

		if (options.store) {
			state.store = store
		}

		state.customized = options.customized

		return state
	}

	/** 
	 * Restore table state by it's cached name.
	 * Returns customized data with `{}` as default value if restored successfully,
	 * Returns `undefined` if have no cache to restore.
	 * Will clear the cache after restored.
	 */
	restore(name: string): object | undefined {
		let table = this.table
		let store = this.table.store as Store | RemoteStore

		let state = this.cacheMap.get(name)
		if (!state) {
			state = storage.get(this.storagePrefix + name)
			if (!state) {
				return undefined
			}
		}

		if (state.storeFilter !== undefined) {
			store.setFilter(state.storeFilter as any)
		}

		if (state.orderName !== undefined && state.orderDirection !== undefined) {
			table.setOrder(state.orderName, state.orderDirection)
		}

		if (state.visibleIndex !== undefined) {
			table.setFirstVisibleIndex(state.visibleIndex)
		}

		if (state.data !== undefined) {
			if (store instanceof RemoteStore) {
				store.setCache(state.data as any)
			} 
			else {
				store.setFullData(state.data as any)
			}
		}

		if (state.store) {
			table.store = store
		}
		
		store.sync()
		this.clear(name)

		return state.customized
	}

	/** Clear cache with specified name. */
	clear(name: string) {
		this.cacheMap.delete(name)
		storage.delete(this.storagePrefix + name)
	}
}