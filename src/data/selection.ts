import {Observed} from '@pucelle/ff'


/** Handle selection. */
export class Selection<T = any> implements Observed {

	/** All selected data keys and mapped data items. */
	private readonly selected: Set<T> = new Set()

	/** Count of all data items. */
	private allData: ReadonlyArray<T> = []

	/** Last touched item, used to select a range of items by clicking `Shift + Click`. */
	private lastTouchedItem: T | null = null

	/** After data property updated, filter out selected not in data list. */
	applyData(data: T[]) {
		if (this.selected.size > 0) {
			let set = new Set(data)

			for (let item of [...this.selected]) {
				if (!set.has(item)) {
					this.selected.delete(item)
				}
			}
		}

		this.allData = data
	}

	/** Returns whether an item has been selected. */
	isSelected(item: T): boolean {
		return this.selected.has(item)
	}

	/** Get selected count. */
	getSelectedCount(): number {
		return this.selected.size
	}

	/** Get all data count. */
	getAllCount(): number {
		return this.allData.length
	}

	/** Whether selected at least one, but not all. */
	isPartlySelected(): boolean {
		let selectedCount = this.getSelectedCount()
		return selectedCount > 0 && selectedCount < this.getAllCount()
	}

	/** Whether selected all items. */
	isSelectedAll(): boolean {
		let selectedCount = this.getSelectedCount()
		return selectedCount > 0 && selectedCount === this.getAllCount()
	}

	/** Selected items. */
	select(...items: T[]) {
		for (let item of items) {
			this.selected.add(item)
		}

		this.lastTouchedItem = items[0]
	}

	/** Deselect items. */
	deselect(...items: T[]) {
		for (let item of items) {
			this.selected.delete(item)
		}

		this.lastTouchedItem = items[0]
	}

	/** Toggle select state of item. */
	toggleSelect(item: T) {
		if (this.isSelected(item)) {
			this.deselect(item)
		}
		else {
			this.select(item)
		}

		this.lastTouchedItem = item
	}

	/** Select or deselect a range if pressed shift key, otherwise select or deselect one. */
	selectByKeyEvent(item: T, event: KeyboardEvent) {
		if (event.shiftKey) {
			this.shiftSelect(item)
		}
		else {
			this.toggleSelect(item)
		}
	}

	/** Select or deselect a range, from last touched item to current item. */
	shiftSelect(item: T) {
		let startIndex = Math.max(this.lastTouchedItem ? this.getIndexOf(this.lastTouchedItem) : 0, 0)
		let endIndex = this.getIndexOf(item)

		if (endIndex >= 0) {
			if (startIndex > endIndex) {
				[startIndex, endIndex] = [endIndex, startIndex]
			}

			endIndex += 1

			if (this.isSelected(item)) {
				this.deselect(...this.allData.slice(startIndex, endIndex))
			}
			else {
				this.select(...this.allData.slice(startIndex, endIndex))
			}
		}
	}

	/** Get item index of all data. */
	protected getIndexOf(item: T): number {
		return this.allData.indexOf(item)
	}

	/** Select all items. */
	selectAll() {
		this.select(...this.allData)
	}

	/** Deselect all items. */
	deselectAll() {
		this.selected.clear()
	}

	/** Select all items if not, otherwise deselect all. */
	toggleSelectAll() {
		if (this.isSelectedAll()) {
			this.deselectAll()
		}
		else {
			this.selectAll()
		}
	}

	/** Clears all data. */
	clear() {
		this.allData = []
		this.selected.clear()
		this.lastTouchedItem = null
	}
}
