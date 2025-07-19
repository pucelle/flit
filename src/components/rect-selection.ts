import {Box, Coord, EventUtils, HVDirection, NumberUtils, ScrollUtils} from '@pucelle/ff'
import {Component, css, html, RenderResult} from '@pucelle/lupos.js'
import {EdgeMovementTimer} from './rect-selection-helpers/edge-movement-timer'
import {DOMEvents} from '@pucelle/lupos'


export interface RectSelectionEvents {

	/** 
	 * After started to rect selecting.
	 * `startOffset` is the offset position
	 * relative to scroller, it's not affected by scrolled value.
	 */
	'select-started': (startOffset: DOMPoint, e: MouseEvent) => void

	/** 
	 * After selection range change.
	 * `endOffset` and `startOffset` are the offset position
	 * relative to scroller, they are not affected by scrolled value.
	 */
	'select-update': (endOffset: DOMPoint, startOffset: DOMPoint) => void

	/** After ended selecting. */
	'select-ended': (e: MouseEvent) => void
}


/** 
 * Handle rect selection, especially it can cause
 * scrolling of parent scroller to select more items.
 * 
 * It children are partial rendered, you can specify a `data-index` for it.
 * 
 * You should put this component into a scrollable element.
 */
export class RectSelection extends Component<RectSelectionEvents> {

	static style = css`
		.rect-selection{
			position: absolute;
			border: 1px solid var(--primary-color);
			background: color-mix(in srgb, var(--primary-color) 10%, transparent);
			margin-bottom: -100px;
			margin-right: -100px;
		}
	`


	/** Minimum move to trigger selection. */
	minimumMove: number = 10

	/** 
	 * Especially for touch events, finger may can't strictly touch viewport edge,
	 * so if still have some pixels away from edge, would recognize it as reached.
	 */
	edgePadding: number = 0

	/** 
	 * If specified, and select start from element match this selector,
	 * will not start selection.
	 */
	ignoreSelector: string | null = null

	/** Parent scroller. */
	protected scroller: HTMLElement| null = null

	/** Rect of scroller. */
	protected scrollerRect: DOMRect | null = null

	/** Scroll offset of scroller. */
	protected scrollerPosition: number = 0

	/** Scroll height of scroller. */
	protected scrollerScrollSize: number = 0

	/** Mouse down event. */
	protected startEvent: MouseEvent | null = null

	/** Start client point, add scroll position of scroller. */
	protected startScrollPoint: DOMPoint | null = null

	/** End client point, add scroll position of scroller. */
	protected endScrollPoint: DOMPoint | null = null

	/** Scroll direction. */
	protected scrollDirection: HVDirection | null = null

	/** To do timer after mouse leaves edge. */
	protected edgeTimer: EdgeMovementTimer | null = null

	/** Whether started selecting. */
	protected inSelecting: boolean = false

	protected onConnected() {
		this.scroller = this.el.parentElement

		if (this.scroller) {
			DOMEvents.on(this.scroller, 'mousedown', this.onMouseDown, this)
		}
	}

	protected onMouseDown(e: MouseEvent) {
		if (this.shouldIgnoreStartEvent(e)) {
			return
		}
		
		let scrollDirection = ScrollUtils.getSizedOverflowDirection(this.scroller!)
		this.scrollDirection = scrollDirection

		this.scrollerRect = this.scroller!.getBoundingClientRect()

		this.scrollerPosition = scrollDirection === 'vertical' ? this.scroller!.scrollTop
			: scrollDirection === 'horizontal' ? this.scroller!.scrollLeft
			: 0

		let point = EventUtils.getClientPosition(e)
		this.startScrollPoint = this.clientPointToLocal(point)

		this.edgeTimer = new EdgeMovementTimer(this.scroller!, {padding: this.edgePadding})
		this.edgeTimer.onUpdate = this.onEdgeTimerUpdate.bind(this)

		this.startEvent = e

		DOMEvents.on(document, 'mousemove', this.onMouseMove, this)
		DOMEvents.on(document, 'mouseup', this.onMouseUp, this)
	}

	protected shouldIgnoreStartEvent(e: MouseEvent): boolean {
		if (!this.ignoreSelector) {
			return false
		}

		let target = e.target as Element
		let ignoreMatch = target.closest(this.ignoreSelector)
		if (ignoreMatch) {
			return true
		}

		return false
	}

	/** `point` is based on client origin. */
	protected clientPointToLocal(point: DOMPoint): DOMPoint {
		point.x -= this.scrollerRect!.x
		point.y -= this.scrollerRect!.y

		// Limit within local range.
		point.x = NumberUtils.clamp(point.x, 0, this.scrollerRect!.width)
		point.y = NumberUtils.clamp(point.y, 0, this.scrollerRect!.height)
	
		if (this.scrollDirection === 'vertical') {
			point.y += this.scrollerPosition
		}
		else if (this.scrollDirection === 'horizontal') {
			point.x += this.scrollerPosition
		}

		return point
	}

	protected onMouseMove(e: MouseEvent) {
		this.edgeTimer!.updateEvent(e)

		let point = EventUtils.getClientPosition(e)
		this.endScrollPoint = this.clientPointToLocal(point)

		if (!this.inSelecting) {
			let moves: Coord = {
				x: this.endScrollPoint.x - this.startScrollPoint!.x,
				y: this.endScrollPoint.y - this.startScrollPoint!.y,
			}

			let movesLength = Math.sqrt(moves.x ** 2 + moves.y ** 2)
			if (movesLength > this.minimumMove) {
				this.startSelection()
			}
		}

		if (this.inSelecting) {
			this.fire('select-update', this.endScrollPoint, this.startScrollPoint!)
		}
	}

	protected startSelection() {

		// If not clear selection, will select all texts of rect range.
		getSelection()?.empty()

		this.inSelecting = true
		this.scroller!.style.setProperty('pointer-events', 'none')
		this.scroller!.style.setProperty('user-select', 'none')

		this.startEvent!.preventDefault()
		this.fire('select-started', this.startScrollPoint!, this.startEvent!)
	}

	protected onMouseUp(e: MouseEvent) {
		this.endSelection(e)
	}

	protected onEdgeTimerUpdate(movements: Coord, frameTime: number) {
		if (!this.inSelecting) {
			return
		}

		if (this.scrollDirection === 'vertical') {
			if (movements.y !== 0) {
				let clientSize = this.scroller!.clientHeight

				this.scrollerScrollSize = this.scroller!.scrollHeight

				let scrollPosition = this.scrollerPosition + this.getIncrementalMovement(movements.y, frameTime)
				scrollPosition = Math.max(scrollPosition, 0)
				scrollPosition = Math.min(scrollPosition, this.scrollerScrollSize - clientSize)

				if (scrollPosition !== this.scrollerPosition) {
					this.scrollerPosition = scrollPosition

					if (movements.y < 0) {
						this.endScrollPoint!.y = scrollPosition
					}
					else {
						this.endScrollPoint!.y = scrollPosition + clientSize
					}

					this.scroller!.scrollTop = scrollPosition
					this.fire('select-update', this.endScrollPoint!, this.startScrollPoint!)
				}
			}
		}
		else if (this.scrollDirection === 'horizontal') {
			if (movements.x !== 0) {
				let clientSize = this.scroller!.clientWidth

				this.scrollerScrollSize = this.scroller!.scrollWidth

				let scrollPosition = this.scrollerPosition + this.getIncrementalMovement(movements.x, frameTime)
				scrollPosition = Math.max(scrollPosition, 0)
				scrollPosition = Math.min(scrollPosition, this.scrollerScrollSize - clientSize)

				if (scrollPosition !== this.scrollerPosition) {
					this.scrollerPosition = scrollPosition
					
					if (movements.x < 0) {
						this.endScrollPoint!.x = scrollPosition
					}
					else {
						this.endScrollPoint!.x = scrollPosition + clientSize
					}

					this.scroller!.scrollLeft = scrollPosition
					this.fire('select-update', this.endScrollPoint!, this.startScrollPoint!)
				}
			}
		}
	}

	protected getIncrementalMovement(move: number, frameTime: number) {

		// Equals every frame moves by `move`.
		return move * frameTime / 16.66
	}

	protected endSelection(e: MouseEvent) {
		let inSelecting = this.inSelecting

		this.inSelecting = false
		this.edgeTimer?.end()
		this.edgeTimer = null
		this.startScrollPoint = null
		this.endScrollPoint = null
		this.startEvent = null

		this.scroller!.style.setProperty('pointer-events', '')
		this.scroller!.style.setProperty('user-select', '')	

		DOMEvents.off(document, 'mousemove', this.onMouseMove, this)
		DOMEvents.off(document, 'mouseup', this.onMouseUp, this)

		if (inSelecting) {
			this.fire('select-ended', e)
		}
	}

	protected render(): RenderResult {
		let style: Record<string, string> = {}

		if (this.inSelecting) {
			let box = this.getRectBox()
			
			style = {
				left: box.x + 'px',
				top: box.y + 'px',
				width: box.width + 'px',
				height: box.height + 'px',
			}
		}

		return html`
			<template class="rect-selection"
				?hidden=${!this.inSelecting}
				:style=${style}
			></template>
		`
	}

	protected getRectBox(): Box {
		let box = Box.fromCoords(this.startScrollPoint!, this.endScrollPoint!)!
		let scrollerBox = Box.fromLike(this.scrollerRect!).translateSelf(-this.scrollerRect!.x, -this.scrollerRect!.y).expandSelf(10)

		if (this.scrollDirection === 'vertical') {
			scrollerBox.translateSelf(0, this.scrollerPosition)
		}
		else if (this.scrollDirection === 'horizontal') {
			scrollerBox.translateSelf(this.scrollerPosition, 0)
		}

		box.intersectSelf(scrollerBox)

		return box
	}
}