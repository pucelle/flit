import {computed, Observed} from 'lupos'
import {ListItem} from '../list'


/** It help to control key navigation inside a tree-like list data. */
export class ListDataNavigator<T = any> implements Observed {

	private data: ReadonlyArray<ListItem<T>> = []
	private expanded: ReadonlyArray<T> = []

	/** 
	 * Navigation path, include active item of each depth level.
	 * Should every time validate items because may add new items quietly.
	 */
	private path: {item: ListItem<T>, index: number}[] = []

	/** Correct and get currently active item. */
	@computed
	get current(): ListItem<T> | undefined {
		this.correctPath()
		return this.getCurrent()
	}

	/** 
	 * Update data and expanded state.
	 * No need to watch them deeply, will correct path each time.
	 */
	update(data: ListItem<T>[], expanded: T[]) {
		this.data = data
		this.expanded = expanded
	}

	/** Correct path by current data and expanded. */
	private correctPath() {
		let items: ReadonlyArray<ListItem<T>> = this.data

		for (let i = 0; i < this.path.length; i++) {
			let {item, index} = this.path[i]

			if (index >= items.length || items[index] !== item) {
				index = items.indexOf(item)
			}

			if (index === -1) {
				this.path = this.path.slice(0, i)
				break
			}

			// Include current item, but not descendants.
			if (!this.expanded.includes(item.value!)) {
				this.path = this.path.slice(0, i + 1)
				break
			}

			if (!item.children) {
				break
			}

			items = item.children
		}
	}

	/** Get currently active item. */
	private getCurrent(): ListItem<T> | undefined {
		if (this.path.length > 0) {
			return this.path[this.path.length - 1].item
		}

		return undefined
	}

	/** Get siblings of currently active item. */
	private getCurrentSiblings(): ReadonlyArray<ListItem<T>> {
		if (this.path.length > 1) {
			return this.path[this.path.length - 2].item.children!
		}

		return this.data
	}

	/** Move up. */
	moveUp() {
		this.correctPath()

		if (this.path.length === 0) {
			this.path = [{
				index: this.data.length - 1,
				item: this.data[this.data.length - 1],
			}]
			return
		}

		let lastPath = this.path[this.path.length - 1]
		let siblings = this.getCurrentSiblings()

		// Moves to parent bottom.
		if (lastPath.index === 0) {
			lastPath.index = siblings.length - 1
			lastPath.item = siblings[siblings.length - 1]
		}

		// Moves upward.
		else {
			lastPath.index--
			lastPath.item = siblings[lastPath.index]
		}
	}

	/** Move down. */
	moveDown() {
		this.correctPath()

		if (this.path.length === 0) {
			this.path = [{
				index: 0,
				item: this.data[0],
			}]
			return
		}

		let lastPath = this.path[this.path.length - 1]
		let siblings = this.getCurrentSiblings()

		// Moves to parent top.
		if (lastPath.index === siblings.length - 1) {
			lastPath.index = 0
			lastPath.item = siblings[0]
		}

		// Move downward.
		else {
			lastPath.index++
			lastPath.item = siblings[lastPath.index]
		}
	}

	/** Move left. */
	moveLeft() {
		this.correctPath()

		if (this.path.length > 0) {
			this.path.pop()
		}
		else {
			this.path = [{
				index: 0,
				item: this.data[0],
			}]
		}
	}

	/** Move down. */
	moveRight() {
		this.correctPath()

		if (this.path.length === 0) {
			this.path = [{
				index: 0,
				item: this.data[0],
			}]
		}
		else {
			let item = this.getCurrent()!
			if (item.children && item.children.length > 0) {
				this.path.push({
					index: 0,
					item: item.children[0],
				})
			}
		}
	}

	/** Clear navigation. */
	clear() {
		this.path = []
	}
}