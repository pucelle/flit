import {DOMScroll, DOMUtils, Point, Vector} from '@pucelle/ff'
import type {draggable} from '../draggable'
import {droppable} from '../droppable'
import {EdgeMovementTimer} from '../../components/rect-selection-helpers/edge-movement-timer'


/** To handle dragging element movements */
export class DragOnlyMovement {
	
	/** Dragging draggable. */
	protected readonly dragging: draggable

	/** Dragging element. */
	protected readonly draggingEl: HTMLElement

	/** Dragging element translate. */
	protected readonly translate: Vector = new Vector()

	/** Keeps original style text for dragging element and restore it after dragging end. */
	protected readonly startStyleText: string | null = null

	/** Scroll wrapper. */
	protected scroller: HTMLElement | null = null

	/** Scroll direction. */
	protected scrollDirection: HVDirection | null = null

	/** Scroll position. */
	protected scrollerPosition: number = 0

	/** To do timer after mouse leaves edge. */
	protected edgeTimer: EdgeMovementTimer | null = null

	constructor(
		drag: draggable,
		draggingEl: HTMLElement,
		applyDraggingStyle: boolean,
		mousePosition: Point
	) {
		this.dragging = drag
		this.draggingEl = draggingEl

		this.setBaseDraggingStyle(mousePosition)

		if (applyDraggingStyle) {
			this.startStyleText = this.draggingEl.style.cssText
			this.setAdditionalDraggingStyle()
		}

		if (drag.options.canCauseScrolling) {
			this.initScroller()
		}
	}

	/** Apply mouse position to dragging followed. */
	protected setBaseDraggingStyle(mousePosition: Point) {
		document.body.style.cursor = 'grabbing'
		document.body.style.userSelect = 'none'
		
		let elMarginVector = new Vector(
			DOMUtils.getNumericStyleValue(this.draggingEl, 'marginLeft'),
			DOMUtils.getNumericStyleValue(this.draggingEl, 'marginTop')
		)

		this.draggingEl.style.left = mousePosition.x - elMarginVector.x + 'px'
		this.draggingEl.style.top = mousePosition.y - elMarginVector.y + 'px'
	}

	/** Set dragging style for dragging element. */
	protected setAdditionalDraggingStyle() {
		if (this.draggingEl.localName !== 'tr') {
			this.draggingEl.style.position = 'fixed'
		}
		
		this.draggingEl.style.zIndex = '9999'
		this.draggingEl.style.boxShadow = `0 0 var(--popup-shadow-blur-radius) var(--popup-shadow-color)`
		this.draggingEl.style.pointerEvents = 'none'
		this.draggingEl.style.willChange = 'transform'
	}

	/** Init scroller if need. */
	protected initScroller() {
		this.scroller = DOMScroll.findClosestCSSScrollWrapper(this.dragging.el)

		if (this.scroller) {
			this.scrollDirection = DOMScroll.getCSSOverflowDirection(this.scroller)

			this.scrollerPosition = this.scrollDirection === 'vertical' ? this.scroller.scrollTop
				: this.scrollDirection === 'horizontal' ? this.scroller.scrollLeft
				: 0

			this.edgeTimer = new EdgeMovementTimer(this.scroller, {padding: 0})
			this.edgeTimer.onUpdate = this.onEdgeTimerUpdate.bind(this)
		}
	}

	/** When mouse enter droppable. */
	onEnterDrop(_drop: droppable) {}
	
	/** When mouse enter draggable. */
	onEnterDrag(_drag: draggable) {}

	/** When mouse leaves drop area. */
	onLeaveDrop(_drop: droppable) {}

	/** Translate dragging element follow mouse. */
	translateDraggingElement(moves: Vector, e: MouseEvent) {
		this.translate.copyFrom(moves)
		this.draggingEl.style.transform = `translate(${moves.x}px, ${moves.y}px)`
		this.edgeTimer?.updateEvent(e)
	}

	/** Whether can drop to currently active drop. */
	canDrop(): boolean {
		return true
	}

	/** Returns the index of the inserting index of drop area. */
	getInsertIndex(): number {
		return -1
	}

	protected onEdgeTimerUpdate(movements: Vector, frameTime: number) {
		if (!this.scroller) {
			return
		}

		if (this.scrollDirection === 'vertical') {
			if (movements.y !== 0) {
				let clientSize = this.scroller.clientHeight
				let scrollSize = this.scroller.scrollHeight
				let scrollPosition = this.scrollerPosition + this.getIncrementalMovement(movements.y, frameTime)

				scrollPosition = Math.max(scrollPosition, 0)
				scrollPosition = Math.min(scrollPosition, scrollSize - clientSize)

				if (scrollPosition !== this.scrollerPosition) {
					this.scrollerPosition = scrollPosition
					this.scroller.scrollTop = scrollPosition
				}
			}
		}
		else if (this.scrollDirection === 'horizontal') {
			if (movements.x !== 0) {
				let clientSize = this.scroller.clientWidth
				let scrollSize = this.scroller.scrollWidth
				let scrollPosition = this.scrollerPosition + this.getIncrementalMovement(movements.x, frameTime)
				
				scrollPosition = Math.max(scrollPosition, 0)
				scrollPosition = Math.min(scrollPosition, scrollSize - clientSize)

				if (scrollPosition !== this.scrollerPosition) {
					this.scrollerPosition = scrollPosition
					this.scroller.scrollLeft = scrollPosition
				}
			}
		}
	}

	protected getIncrementalMovement(move: number, frameTime: number) {

		// Equals every frame moves by `move`.
		return move * frameTime / 16.66
	}

	/** Play drag end end transition. */
	async playEndDraggingTransition() {
		this.clearDraggingStyle()
	}

	/** Clear dragging style for dragging element. */
	protected clearDraggingStyle() {
		document.body.style.cursor = ''
		document.body.style.userSelect = ''

		if (this.startStyleText) {
			this.draggingEl.style.cssText = this.startStyleText
		}
	}
}