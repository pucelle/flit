import {DOMEvents, DOMUtils, Vector} from '@pucelle/ff'
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

	/** Rendered or cloned follow element. */
	private followElement: HTMLElement | null = null
	
	/** 
	 * Current drop area.
	 * Readonly outside.
	 */
	activeDrop: droppable | null = null

	/** When start dragging a draggable. */
	async startDragging(dragging: draggable, e: MouseEvent) {
		this.dragging = dragging

		let activeDrop: droppable | null = null

		for (let drop of [...this.enteredDroppable]) {

			// May element was removed.
			if (!document.contains(drop.el)) {
				this.enteredDroppable.delete(drop)
			}

			else if (drop.options.name === dragging.options.name
				|| Array.isArray(dragging.options.name) && dragging.options.name.includes(drop.options.name)
			) {
				activeDrop = drop
				break
			}
		}

		activeDrop?.fireEnter(this.dragging)

		this.activeDrop = activeDrop

		if (this.dragging.options.mode === 'reorder') {
			this.movement = new DragDropMovement(this.dragging!, activeDrop)
		}
		else {
			let followElCloned = !this.dragging.options.followElementRenderer
			let followEl: HTMLElement | null = null
			let position = DOMEvents.getPagePosition(e)

			if (this.dragging.options.followElementRenderer) {
				let rendered = this.followElementRendered = render(this.dragging.options.followElementRenderer)
				await rendered.connectManually()

				followEl = rendered.el.firstElementChild as HTMLElement | null
					?? this.dragging!.el.cloneNode(true) as HTMLElement
			}
			else {
				followEl = this.dragging!.el.cloneNode(true) as HTMLElement
			}

			if (dragging.options.draggingClassName) {
				followEl.classList.add(dragging.options.draggingClassName)
			}

			if (dragging.options.persistStyleProperties) {
				for (let styleName of dragging.options.persistStyleProperties) {
					followEl.style.setProperty(styleName, DOMUtils.getStyleValue(this.dragging!.el, styleName))
				}
			}

			document.body.append(followEl)
			this.followElement = followEl
			this.movement = new DragOnlyMovement(this.dragging!, followEl, followElCloned, position)
		}
	}

	/** Translate dragging element to keep follows with mouse. */
	translateDraggingElement(moves: Vector, e: MouseEvent) {
		this.movement?.translateDraggingElement(moves, e)
	}

	/** When dragging and enter a draggable. */
	enterDrag(drag: draggable) {
		if (this.canEnterToSwapWith(drag)) {
			this.movement?.onEnterDrag(drag)
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
	enterDrop(dropping: droppable) {
		this.enteredDroppable.add(dropping)

		if (this.canDropTo(dropping)) {
			dropping.fireEnter(this.dragging!)
			this.activeDrop = dropping
			this.movement?.onEnterDrop(dropping)
		}
	}

	/** Whether dragging can drop to a droppable. */
	private canDropTo(drop: droppable) {
		return this.dragging
			&& (
				this.dragging.options.name === drop.options.name
				|| Array.isArray(this.dragging.options.name) && this.dragging.options.name.includes(drop.options.name)
			)
			&& this.dragging.el !== drop.el
	}

	/** When dragging and leave a droppable. */
	leaveDrop(dropping: droppable) {

		// Always in same drop for slide only mode.
		if (this.dragging?.options.slideOnly) {
			return
		}
		
		this.enteredDroppable.delete(dropping)

		if (this.activeDrop === dropping) {
			dropping.fireLeave(this.dragging!)
			this.activeDrop = null
			this.movement?.onLeaveDrop(dropping)
		}
	}

	/** When release dragging. */
	endDragging() {
		if (!this.dragging) {
			return
		}

		let dragging = this.dragging
		let movement = this.movement
		let activeDrop = this.activeDrop

		if (activeDrop) {
			this.leaveDrop(activeDrop)
		}

		movement?.endDragging().then(() => {
			if (movement.canDrop()) {
				activeDrop?.fireDrop(dragging, movement.getInsertIndex())
			}
		})

		this.dragging = null
		this.movement = null
		this.activeDrop = null

		if (this.followElementRendered) {
			this.followElementRendered.remove()
			this.followElementRendered = null
		}

		if (this.followElement) {
			this.followElement.remove()
		}
	}
}

export const GlobalDragDropRelationship = new DragDropRelationship()
