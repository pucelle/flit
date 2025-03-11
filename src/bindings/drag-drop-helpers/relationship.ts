import {Vector} from '@pucelle/ff'
import type {draggable} from '../draggable'
import type {droppable} from '../droppable'
import {DragDropMovement} from './movement'


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
	protected movement: DragDropMovement | null = null

	/** 
	 * May mouse enter in several drop areas, and start dragging,
	 * then we need to check which drop area should trigger enter.
	 */
	protected enteredDroppable: Set<droppable> = new Set()

	/** Current drop area. */
	protected activeDroppable: droppable | null = null
	
	/** When start dragging a draggable. */
	startDragging(drag: draggable) {
		this.dragging = drag
		let activeDroppable: droppable | undefined

		for (let drop of [...this.enteredDroppable]) {

			// May element was removed.
			if (!document.contains(drop.el)) {
				this.enteredDroppable.delete(drop)
			}

			else if (drop.name === drag.name) {
				activeDroppable = drop
				break
			}
		}

		if (!activeDroppable) {
			throw new Error(`Element with ':draggable' must be contained in a ':droppable' element!`)
		}

		activeDroppable.fireEnter(this.dragging)

		this.activeDroppable = activeDroppable
		this.movement = new DragDropMovement(this.dragging!, activeDroppable)
	}

	/** Translate dragging element to keep follows with mouse. */
	translateDraggingElement(moves: Vector) {
		if (this.movement) {
			this.movement.translateDraggingElement(moves)
		}
	}

	/** When dragging and enter a draggable. */
	enterDrag(drag: draggable) {
		if (this.canEnterToSwapWith(drag) && this.movement) {
			this.movement.onEnterDrag(drag)
		}
	}

	/** Whether dragging can swap with draggable. */
	protected canEnterToSwapWith(drag: draggable) {
		return this.dragging
			&& !this.dragging.slideOnly
			&& this.dragging.name === drag.name
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
		return this.dragging && this.dragging.name === drop.name
	}

	/** When dragging and leave a droppable. */
	leaveDrop(drop: droppable) {

		// Always in same drop for slide only mode.
		if (this.dragging?.slideOnly) {
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
