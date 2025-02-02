import {computed, ListUtils, Observed} from '@pucelle/ff'


export interface StoreOptions<T> {

	/** A filter function to filter data items. */
	filter: ((item: T) => boolean) | null

	/** Order rule, can include several column keys and direction. */
	order:keyof T | ListUtils.OrderRule<T> | null

	/** Additional order direction overlay with order. */
	orderDirection: ListUtils.OrderDirection | null

	/** Full data before filtering or ordering. */
	data: T[]
}


/**
 * Used to cache data items and support selection, ordering and filtering.
 * Normally use it as a part of table component.
 */
export class Store<T = any> implements StoreOptions<T>, Observed {
	
	filter: ((item: T) => boolean) | null = null
	order: keyof T | ListUtils.OrderRule<T> | null = null
	orderDirection: ListUtils.OrderDirection | null = null
	data: T[] = []

	constructor(options: Partial<StoreOptions<T>> = {}) {
		Object.assign(this, options)
	}

	/** To do data items ordering. */
	@computed
	get listOrder(): ListUtils.Order<T> | null {
		if (this.order !== null) {
			return new ListUtils.Order(this.order as ListUtils.OrderRule<T>)
		}
		else {
			return null
		}
	}

	/** Get current data, after filtered and ordered. */
	@computed
	get currentData(): T[] {
		let data = this.data

		if (this.filter) {
			data = data.filter(this.filter)
		}
		
		if (this.listOrder && this.orderDirection !== null) {
			if (this.filter) {
				this.listOrder.sort(data, this.orderDirection)
			}
			else {
				data = this.listOrder.toSorted(data, this.orderDirection)
			}
		}

		return data
	}

	/** Clears all data, order, filter. */
	clear() {
		this.data = []
		this.order = null
		this.filter = null
	}
}
