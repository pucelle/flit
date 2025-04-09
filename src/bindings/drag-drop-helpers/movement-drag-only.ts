import {DOMUtils, Point, Vector} from '@pucelle/ff'
import type {draggable} from '../draggable'
import {droppable} from '../droppable'


/** To handle dragging element movements */
export class DragOnlyMovement {
	
	/** Dragging draggable. */
	protected readonly dragging: draggable

	/** Dragging element. */
	protected readonly draggingEl: HTMLElement

	/** Dragging element translate. */
	protected readonly translate: Vector = new Vector()

	/** Keeps original style text for dragging element and restore it after dragging end. */
	protected readonly startStyleText: string = ''

	constructor(drag: draggable, draggingEl: HTMLElement, mousePosition: Point) {
		this.dragging = drag
		this.draggingEl = draggingEl
		this.startStyleText = this.draggingEl.style.cssText
		this.setDraggingStyle(mousePosition)
	}

	/** Set dragging style for dragging element. */
	protected setDraggingStyle(mousePosition: Point) {
		let elMarginVector = new Vector(
			DOMUtils.getNumericStyleValue(this.draggingEl, 'marginLeft'),
			DOMUtils.getNumericStyleValue(this.draggingEl, 'marginTop')
		)

		document.body.style.cursor = 'grabbing'
		document.body.style.userSelect = 'none'
		
		if (this.draggingEl.localName !== 'tr') {
			this.draggingEl.style.position = 'fixed'
		}
		
		this.draggingEl.style.zIndex = '9999'
		this.draggingEl.style.left = mousePosition.x - elMarginVector.x + 'px'
		this.draggingEl.style.top = mousePosition.y - elMarginVector.y + 'px'
		this.draggingEl.style.boxShadow = `0 0 var(--popup-shadow-blur-radius) var(--popup-shadow-color)`
		this.draggingEl.style.pointerEvents = 'none'
		this.draggingEl.style.willChange = 'transform'
	}

	/** When mouse enter droppable. */
	onEnterDrop(_drop: droppable) {}
	
	/** When mouse enter draggable. */
	onEnterDrag(_drag: draggable) {}

	/** When mouse leaves drop area. */
	onLeaveDrop(_drop: droppable) {}

	/** Translate dragging element follow mouse. */
	translateDraggingElement(moves: Vector) {
		this.translate.copyFrom(moves)
		this.draggingEl.style.transform = `translate(${moves.x}px, ${moves.y}px)`
	}

	/** Whether drag & drop completed and will swap elements. */
	willSwapElements(): boolean {
		return false
	}

	/** Returns the index of inserting index into drop area. */
	getSwapIndex(): number {
		return -1
	}

	/** Play drag end end transition. */
	async playEndDraggingTransition() {
		this.clearDraggingStyle()
	}

	/** Clear dragging style for dragging element. */
	protected clearDraggingStyle() {
		document.body.style.cursor = ''
		document.body.style.userSelect = ''

		this.draggingEl.style.cssText = this.startStyleText
	}
}