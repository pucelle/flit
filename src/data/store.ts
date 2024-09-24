import {computed, ListUtils, Observed} from '@pucelle/ff'


export interface StoreOptions<T> {

	/** A filter function to filter data items. */
	filter: ((item: T) => boolean) | null

	/** Order rule, can include several column keys and direction. */
	orders: ListUtils.OrderRule<T>[] | null

	/** Additional order direction overlay with order. */
	orderDirection: ListUtils.OrderDirection

	/** Full data before filtering or ordering. */
	data: T[]
}


/**
 * Used to cache data items and support selection, ordering and filtering.
 * Normally use it as a part of table component.
 */
export class Store<T = any> implements StoreOptions<T>, Observed {

	constructor(options: Partial<StoreOptions<T>>) {
		Object.assign(this, options)
	}

	
	filter: ((item: T) => boolean) | null = null
	orders: ListUtils.OrderRule<T>[] | null = null
	orderDirection: ListUtils.OrderDirection = 'asc'
	data: T[] = []


	/** To do data items ordering. */
	@computed get listOrder(): ListUtils.Order<T> | null {
		if (this.orders) {
			return new ListUtils.Order(...this.orders as any)
		}
		else {
			return null
		}
	}

	/** Get current data, after filtered and ordered. */
	@computed get currentData(): T[] {
		let data = this.data

		if (this.filter) {
			data = data.filter(this.filter)
		}
		
		if (this.listOrder) {
			this.listOrder.sort(data, this.orderDirection)
		}

		return data
	}

	/** Clears all data, order, filter. */
	clear() {
		this.data = []
		this.orders = null
		this.filter = null
	}
}
