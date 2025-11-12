import {computed, Observed} from '@pucelle/lupos'
import {ListUtils} from '@pucelle/ff'


export interface StoreOptions<T> {

	/** A filter function to filter data items. */
	filter: ((item: T) => boolean) | null

	/** Order rule, can include several column keys and direction. */
	orderRule: ListUtils.OrderRule<T> | null

	/** Full data before filtering or ordering. */
	data: T[]
}


/** `Store` can be used to cache data items while support ordering and filtering. */
export class Store<T = any> implements StoreOptions<T>, Observed {
	
	filter: ((item: T) => boolean) | null = null
	orderRule: ListUtils.OrderRule<T> | null = null
	sorter: ((a: T, b: T) => number) | null = null
	data: T[] = []

	constructor(options: Partial<StoreOptions<T>> = {}) {
		Object.assign(this, options)
	}

	/** Set new order rule. */
	setOrder(
		by: ListUtils.OrderKey<T> | ListUtils.OrderFunction<T> | null,
		direction: ListUtils.OrderDirection | null = null,
		numeric: boolean = false,
		ignoreCase: boolean = false
	) {
		if (!by || direction === null) {
			this.orderRule = null
		}
		else {
			this.orderRule = {
				by,
				direction: direction!,
				numeric,
				ignoreCase,
			}
		}
	}

	/** 
	 * Set common sorter to compare two items.
	 * Use it when `setOrder` can't satisfy your requirement.
	 */
	setSorter(sorter: ((a: T, b: T) => number) | null) {
		this.sorter = sorter
	}

	/** To do data items ordering. */
	@computed
	get order(): ListUtils.Order<T> | null {
		if (this.orderRule !== null) {
			return new ListUtils.Order(this.orderRule)
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
		
		if (this.order) {
			if (this.filter) {
				this.order.sort(data)
			}
			else {
				data = this.order.toSorted(data)
			}
		}
		else if (this.sorter) {
			data = data.toSorted(this.sorter)
		}

		return data
	}

	/** Clears all data, order, filter. */
	clear() {
		this.data = []
		this.orderRule = null
		this.filter = null
	}
}
