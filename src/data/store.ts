import {computed, ListUtils, Observed} from '@pucelle/ff'


export interface StoreOptions<T> {

	/** A filter function to filter data items. */
	filter: ((item: T) => boolean) | null

	/** Order rule, can include several column keys and direction. */
	order: ListUtils.OrderRule<T> | null

	/** Full data before filtering or ordering. */
	data: T[]
}


/**
 * Used to cache data items and support selection, ordering and filtering.
 * Normally use it as a part of table component.
 */
export class Store<T = any> implements StoreOptions<T>, Observed {
	
	filter: ((item: T) => boolean) | null = null
	order: ListUtils.OrderRule<T> | null = null
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
			this.order = null
		}
		else {
			this.order = {
				by,
				direction: direction!,
				numeric,
				ignoreCase,
			}
		}
	}

	/** To do data items ordering. */
	@computed
	get listOrder(): ListUtils.Order<T> | null {
		if (this.order !== null) {
			return new ListUtils.Order(this.order)
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
		
		if (this.listOrder) {
			if (this.filter) {
				this.listOrder.sort(data)
			}
			else {
				data = this.listOrder.toSorted(data)
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
