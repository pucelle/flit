import {Component} from '../component'
import {DOMScroll, DependencyTracker, EditType, TransitionEasingName, UpdateQueue, getEditRecord, input} from '@pucelle/ff'
import {CompiledTemplateResult, Template} from '../template'


/** To render each item. */
export type RepeatRenderFn<T> = (item: T, index: number) => CompiledTemplateResult


/** 
 * `<Repeat>` creates repetitive contents by a `renderFn` and an iterable data.
 * it works just like a `<for>...` block, but gives more controlable based on component.
 */
export class Repeat<T = any, E = any> extends Component<E> {

	/** Current data list to repeat. */
	@input data: T[] = []

	/** Render function to generate template result by each item. */
	@input renderFn!: RepeatRenderFn<T>

	/** Old data last rendering used. */
	protected oldData: T[] = []

	/** Current rendered templates. */
	protected templates: Template[] = []

	protected updateRendering() {
		DependencyTracker.beginTrack(this.willUpdate, this)

		try {
			this.doUpdateRendering()
		}
		catch (err) {
			console.warn(err)
		}
		finally {
			DependencyTracker.endTrack()
		}
	}

	/** Update all the things here, can be overwritten. */
	protected doUpdateRendering() {
		this.updateData(this.data)
	}

	/** Update to new data items. */
	protected updateData(newData: T[]) {
		let oldData = this.oldData
		let oldTs = this.templates
		let editRecord = getEditRecord(oldData, newData, true)
		
		this.oldData = newData
		this.templates = []

		for (let record of editRecord) {
			let {type, nextOldIndex, fromIndex, toIndex} = record
			let nextOldT = this.getItemAtIndex(oldTs, nextOldIndex)
			let fromT = this.getItemAtIndex(oldTs, fromIndex)
			let newItem = toIndex >= 0 ? newData[toIndex] : null

			if (type === EditType.Leave) {
				this.reuseTemplate(fromT!, newItem!, toIndex)
			}
			else if (type === EditType.Move) {
				this.insertTemplateBefore(fromT!, nextOldT)
				this.reuseTemplate(fromT!, newItem!, toIndex)
			}
			else if (type === EditType.Modify) {
				this.reuseTemplate(fromT!, newItem!, toIndex)
			}
			else if (type === EditType.MoveModify) {
				this.insertTemplateBefore(fromT!, nextOldT)
				this.reuseTemplate(fromT!, newItem!, toIndex)
			}
			else if (type === EditType.Insert) {
				this.createTemplate(newItem!, toIndex, nextOldT!)
			}
			else if (type === EditType.Delete) {
				this.removeTemplate(fromT!)
			}
		}
	}

	private getItemAtIndex<T>(items: T[], index: number): T | null {
		if (index < items.length && index >= 0) {
			return items[index]
		}
		else {
			return null
		}
	}

	private createTemplate(item: T, index: number, nextOldT: Template | null) {
		let result = this.renderFn(item, index)
		let t = result.maker.make(null)

		this.insertTemplateBefore(t, nextOldT)
		t.update(result.values)
		t.callConnectCallback()
		this.templates.push(t)
	}

	private reuseTemplate(t: Template, item: T, index: number) {
		let result = this.renderFn(item, index)

		t.update(result.values)
		t.callConnectCallback()
		this.templates.push(t)
	}

	private removeTemplate(t: Template) {
		t.recycleNodes()
	}

	private insertTemplateBefore(t: Template, nextOldT: Template | null) {
		let position = nextOldT?.startInnerPosition || this.rootContentSlot.endOuterPosition
		t.insertNodesBefore(position)
	}

	/** 
	 * Set the start index of current rendered items,
	 * the item at this index will be scrolled to the top of scroll viewport.
	 * Returns a promise, which will be resolved by whether scrolled.
	 */
	async setStartIndex(index: number): Promise<boolean> {
		await UpdateQueue.untilComplete()

		let scroller = this.el.parentElement!
		if (!scroller) {
			return false
		}

		return this.scrollIndexToStart(index)
	}

	/** 
	 * Make rendered item at the specified index becomes fully visible by scrolling minimum distance in X/Y direction.
	 * - `gap`: Reserve a little distance from the element's edge away from scroll viewport edge.
	 * 
	 * Adjust immediately, so you will need to ensure elements have been rendered.
	 * Returns a promise, which will be resolved by whether scrolled.
	 */
	async scrollIndexToView(index: number, gap?: number, duration?: number, easing?: TransitionEasingName): Promise<boolean> {
		let el = this.templates[index]?.getFirstNode() as Node | null
		if (!el || el.nodeType !== 1) {
			return false
		}

		return DOMScroll.scrollToView(el as HTMLElement, gap, duration, easing)
	}

	/** 
	 * Make rendered item at the specified index located in the topest or left most of scroll viewport.
	 * - `gap`: Reserve a little distance from the element's edge away from scroll viewport edge.
	 * 
	 * Adjust immediately, so you will need to ensure elements have been rendered.
	 * Returns a promise, which will be resolved by whether scrolled.
	 */
	async scrollIndexToStart(index: number, gap?: number, duration?: number, easing?: TransitionEasingName): Promise<boolean> {
		let el = this.templates[index]?.getFirstNode() as Node | null
		if (!el || el.nodeType !== 1) {
			return false
		}

		return DOMScroll.scrollToStart(el as HTMLElement, gap, duration, easing)
	}
}