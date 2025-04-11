import {DOMEvents, Vector} from '@pucelle/ff'
import type {draggable} from '../draggable'
import type {droppable} from '../droppable'
import {DragDropMovement} from './movement-drag-drop'
import {DragOnlyMovement} from './movement-drag-only'
import {render, RenderedComponentLike} from '@pucelle/lupos.js'


/** Global manager to relate current dragging and it's droppable.  */
class DragDropRelationship {

	/** Currently dragging draggable. */
	private dragging: draggable | null = null

	/** Help to manage movement. */
	private movement: DragOnlyMovement | DragDropMovement | null = null

	/** 
	 * May mouse enter in several drop areas, and start dragging,
	 * then we need to check which drop area should trigger enter.
	 */
	private enteredDroppable: Set<droppable> = new Set()

	/** Rendered follow element. */
	private followElementRendered: RenderedComponentLike<any> | null = null

	/** Rendered follow element. */
	private followElementRenderedEl: HTMLElement | null = null
	
	/** 
	 * Current drop area.
	 * Readonly outside.
	 */
	activeDrop: droppable | null = null

	/** When start dragging a draggable. */
	async startDragging(drag: draggable, e: MouseEvent) {
		this.dragging = drag

		let activeDrop: droppable | null = null

		for (let drop of [...this.enteredDroppable]) {

			// May element was removed.
			if (!document.contains(drop.el)) {
				this.enteredDroppable.delete(drop)
			}

			else if (drop.options.name === drag.options.name) {
				activeDrop = drop
				break
			}
		}

		activeDrop?.fireEnter(this.dragging)

		this.activeDrop = activeDrop

		if (this.dragging.options.mode === 'reorder') {
			this.movement = new DragDropMovement(this.dragging!, activeDrop)
		}
		else if (this.dragging.options.followElementRenderer) {
			let rendered = this.followElementRendered = render(this.dragging.options.followElementRenderer)
			let position = DOMEvents.getPagePosition(e)

			await rendered.connectManually()
			let el = this.followElementRenderedEl = rendered.el.firstElementChild as HTMLElement
			document.body.append(el)
			
			this.movement = new DragOnlyMovement(this.dragging!, el, false, position)
		}
		else {
			let position = DOMEvents.getPagePosition(e)
			this.movement = new DragOnlyMovement(this.dragging!, this.dragging!.el, true, position)
		}
	}

	/** Translate dragging element to keep follows with mouse. */
	translateDraggingElement(moves: Vector, e: MouseEvent) {
		this.movement?.translateDraggingElement(moves, e)
	}

	/** When dragging and enter a draggable. */
	enterDrag(drag: draggable) {
		if (this.canEnterToSwapWith(drag)) {
			this.movement!.onEnterDrag(drag)
		}
	}

	/** Whether dragging can swap with draggable. */
	private canEnterToSwapWith(drag: draggable) {
		return this.dragging
			&& !this.dragging.options.slideOnly
			&& this.dragging.options.name === drag.options.name
			&& this.dragging !== drag
	}

	/** When dragging and enter a droppable. */
	enterDrop(drop: droppable) {
		this.enteredDroppable.add(drop)

		if (this.canDropTo(drop)) {
			drop.fireEnter(this.dragging!)
			this.activeDrop = drop
			this.movement!.onEnterDrop(drop)
		}
	}

	/** Whether dragging can drop to a droppable. */
	private canDropTo(drop: droppable) {
		return this.dragging && this.dragging.options.name === drop.options.name
	}

	/** When dragging and leave a droppable. */
	leaveDrop(drop: droppable) {

		// Always in same drop for slide only mode.
		if (this.dragging?.options.slideOnly) {
			return
		}
		
		this.enteredDroppable.delete(drop)

		if (this.activeDrop === drop) {
			drop.fireLeave(this.dragging!)
			this.activeDrop = null
			this.movement!.onLeaveDrop(drop)
		}
	}

	/** When release dragging. */
	endDragging() {
		let mover = this.movement!
		let dragging = this.dragging!
		let activeDrop = this.activeDrop

		if (activeDrop) {
			this.leaveDrop(activeDrop)
		}

		mover.endDragging().then(() => {
			if (mover.canDrop()) {
				activeDrop?.fireDrop(dragging, mover.getInsertIndex())
			}
		})

		this.dragging = null
		this.movement = null
		this.activeDrop = null

		if (this.followElementRendered) {
			this.followElementRendered.remove()
			this.followElementRendered = null
		}

		if (this.followElementRenderedEl) {
			this.followElementRenderedEl.remove()
		}
	}
}

export const GlobalDragDropRelationship = new DragDropRelationship()
