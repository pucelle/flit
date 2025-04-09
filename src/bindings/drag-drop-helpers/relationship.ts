import {DOMEvents, Vector} from '@pucelle/ff'
import type {draggable} from '../draggable'
import type {droppable} from '../droppable'
import {DragDropMovement} from './movement-drag-drop'
import {DragOnlyMovement} from './movement-drag-only'
import {render} from '@pucelle/lupos.js'


/** 
 * Global manager to relate current dragging and it's droppable. 
 *   When start dragging, check it's related drop area.
 *   When dragging element enters another draggable element, relate them and adjust position using `mover`.
 *   When dragging element enters one drop area, give additional space for it.
 *   When dragging element leaves one drop area, remove space that belongs to it.
 */
class DragDropRelationship {

	/** Currently dragging draggable. */
	protected dragging: draggable | null = null

	/** Help to manage movement. */
	protected movement: DragOnlyMovement | DragDropMovement | null = null

	/** 
	 * May mouse enter in several drop areas, and start dragging,
	 * then we need to check which drop area should trigger enter.
	 */
	protected enteredDroppable: Set<droppable> = new Set()

	/** Current drop area. */
	protected activeDroppable: droppable | null = null
	
	/** When start dragging a draggable. */
	startDragging(drag: draggable, e: MouseEvent) {
		this.dragging = drag
		let activeDroppable: droppable | undefined

		for (let drop of [...this.enteredDroppable]) {

			// May element was removed.
			if (!document.contains(drop.el)) {
				this.enteredDroppable.delete(drop)
			}

			else if (drop.options.name === drag.options.name) {
				activeDroppable = drop
				break
			}
		}

		if (!activeDroppable) {
			throw new Error(`Element with ':draggable' must be contained in a ':droppable' element!`)
		}

		activeDroppable.fireEnter(this.dragging)

		this.activeDroppable = activeDroppable

		if (this.dragging.options.mode === 'reorder') {
			this.movement = new DragDropMovement(this.dragging!, activeDroppable)
		}
		else if (this.dragging.options.followElementRenderer) {
			let rendered = render(this.dragging.options.followElementRenderer)
			let el = rendered.el
			let position = DOMEvents.getPagePosition(e)

			this.movement = new DragOnlyMovement(this.dragging!, el, position)
		}
		else {
			let position = DOMEvents.getPagePosition(e)
			this.movement = new DragOnlyMovement(this.dragging!, this.dragging!.el, position)
		}
	}

	/** Translate dragging element to keep follows with mouse. */
	translateDraggingElement(moves: Vector) {
		this.movement!.translateDraggingElement(moves)
	}

	/** When dragging and enter a draggable. */
	enterDrag(drag: draggable) {
		if (this.canEnterToSwapWith(drag)) {
			this.movement!.onEnterDrag(drag)
		}
	}

	/** Whether dragging can swap with draggable. */
	protected canEnterToSwapWith(drag: draggable) {
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
			this.activeDroppable = drop
			this.movement!.onEnterDrop(drop)
		}
	}

	/** Whether dragging can drop to a droppable. */
	protected canDropTo(drop: droppable) {
		return this.dragging && this.dragging.options.name === drop.options.name
	}

	/** When dragging and leave a droppable. */
	leaveDrop(drop: droppable) {

		// Always in same drop for slide only mode.
		if (this.dragging?.options.slideOnly) {
			return
		}
		
		this.enteredDroppable.delete(drop)

		if (this.activeDroppable === drop) {
			drop.fireLeave(this.dragging!)
			this.activeDroppable = null
			this.movement!.onLeaveDrop(drop)
		}
	}

	/** When release dragging. */
	endDragging() {
		let mover = this.movement!
		let dragging = this.dragging!
		let lastActiveDroppable = this.activeDroppable!

		mover.playEndDraggingTransition().then(() => {
			if (mover.willSwapElements()) {
				lastActiveDroppable.fireDrop(dragging, mover.getSwapIndex())
			}
		})
		
		this.dragging = null
		this.movement = null
		this.activeDroppable = null
	}
}

export const GlobalDragDropRelationship = new DragDropRelationship()
