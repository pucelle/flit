import {Coord, DOMUtils, HVDirection, ScrollUtils} from '@pucelle/ff'
import {DraggableBase} from '../draggable'
import {droppable} from '../droppable'
import {EdgeMovementTimer} from '../../components/rect-selection-helpers/edge-movement-timer'


/** To handle draggable element movements. */
export class DragMovement {
	
	/** Dragging draggable. */
	protected readonly dragging: DraggableBase

	/** Dragging element. */
	protected readonly draggingEl: HTMLElement

	/** Keeps original style text for dragging element and restore it after dragging end. */
	protected readonly startStyleText: string | null = null

	/** Dragging element translate. */
	protected translate: Coord = {x: 0, y: 0}

	/** Scroll wrapper. */
	protected scroller: HTMLElement | null = null

	/** Scroll direction. */
	protected scrollDirection: HVDirection | null = null

	/** Scroll position. */
	protected scrollerPosition: number = 0

	/** To do timer after mouse leaves edge. */
	protected edgeTimer: EdgeMovementTimer | null = null

	constructor(
		dragging: DraggableBase,
		draggingEl: HTMLElement,
		applyDraggingStyle: boolean,
		mousePosition: Coord
	) {
		this.dragging = dragging
		this.draggingEl = draggingEl

		if (applyDraggingStyle && dragging.mode === 'order') {
			this.startStyleText = this.draggingEl.style.cssText
		}

		this.setBaseDraggingStyle(mousePosition)

		if (applyDraggingStyle) {
			this.setAdditionalDraggingStyle()
		}

		if (dragging.options.canCauseScrolling) {
			this.initScroller()
		}
	}

	/** Apply mouse position to dragging followed. */
	protected setBaseDraggingStyle(mousePosition: Coord) {
		document.body.style.cursor = 'grabbing'
		document.body.style.userSelect = 'none'
		
		let elMarginVector = {
			x: DOMUtils.getNumericStyleValue(this.draggingEl, 'marginLeft'),
			y: DOMUtils.getNumericStyleValue(this.draggingEl, 'marginTop'),
		}

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
		let wrapperAndDirection = ScrollUtils.findClosestCSSScrollWrapper(this.dragging.el)

		if (wrapperAndDirection) {
			this.scroller = wrapperAndDirection.wrapper
			this.scrollDirection = wrapperAndDirection.direction

			this.scrollerPosition = this.scrollDirection === 'vertical' ? this.scroller.scrollTop
				: this.scrollDirection === 'horizontal' ? this.scroller.scrollLeft
				: 0

			this.edgeTimer = new EdgeMovementTimer(this.scroller, {padding: 0})
			this.edgeTimer.onUpdate = this.onEdgeTimerUpdate.bind(this)
		}
	}

	/** When mouse enter draggable. */
	onEnterDrag(_drag: DraggableBase) {}

	/** When mouse enter droppable. */
	onEnterDrop(_drop: droppable) {}
	
	/** When mouse leaves drop area. */
	onLeaveDrop(_drop: droppable) {}

	/** Translate dragging element follow mouse. */
	translateDraggingElement(moves: Coord, e: MouseEvent) {
		this.translate = moves
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

	protected onEdgeTimerUpdate(movements: Coord, frameTime: number) {
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

	/** End dragging and play drag end transition. */
	async endDragging() {
		this.clearDraggingStyle()
	}

	/** Clear dragging style for dragging element. */
	protected clearDraggingStyle() {
		document.body.style.cursor = ''
		document.body.style.userSelect = ''

		if (this.startStyleText) {
			this.draggingEl.style.cssText = this.startStyleText
			this.draggingEl.style.removeProperty('anchor-name')
		}
	}
}