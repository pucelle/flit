import {Box, DOMUtils, Point, Vector, WebTransition, WebTransitionKeyFrame} from '@pucelle/ff'
import type {draggable} from '../draggable'
import {droppable} from '../droppable'
import {getDraggableByElement} from './all-draggable'
import {DragOnlyMovement} from './movement-drag-only'


/** To handle dragging element movements */
export class DragDropMovement extends DragOnlyMovement {

	/** `true` means after `el` removed, followed elements will move and take it's place. */
	private readonly autoLayout: boolean

	/** Elements that moves to right (never moves to left) in visually, compare to their auto layout position. */
	private readonly movedElements: Set<HTMLElement> = new Set()

	/** Elements that were actually translated, different with `movedElements` depends on `autoLayout`. */
	private readonly translatedElements: Set<HTMLElement> = new Set()

	/** Dragging element width includes margin. */
	private readonly outerWidth!: number

	/** Dragging element height includes margin. */
	private readonly outerHeight!: number

	/** After mouse enter a drop area, we should insert a placeholder that having same size with dragging element into. */
	private readonly placeholder!: HTMLElement
	
	/** Where the dragging come from. */
	private readonly startDrop: droppable

	/** Currently mouse entered draggable. */
	private draggingTo: draggable | null = null

	/** 
	 * Currently mouse entered drop area.
	 * Term `droppable` is a little hard to understand, so use `drop area` instead.
	 */
	private activeDrop: droppable | null = null


	/** Rect of `dragTo`. */
	private dragToRect: DOMRect | null = null

	/** Indicates the index of where to insert dragging element in the current drop area if drop right now. */
	private dragToIndex: number = -1

	/** Dragging element siblings align direction. */
	private itemsAlignDirection: HVDirection = 'vertical'

	/** Siblings, only prepare it when `sliderOnly`. */
	private slideOnlySiblings: draggable[] | null = null

	/** Recently entering sibling, only exist when `sliderOnly` */
	private slideOnlyEnteringSiblingData: draggable | null = null

	constructor(drag: draggable, drop: droppable) {
		let elRect = drag.el.getBoundingClientRect()

		super(
			drag,
			drag.el,
			Point.from(elRect)
		)

		this.startDrop = this.activeDrop = drop
		this.itemsAlignDirection = drop.options.itemsAlignDirection ?? 'vertical'
		this.autoLayout = DOMUtils.getStyleValue(this.draggingEl, 'position') !== 'absolute'

		// Not consider about margin collapse.
		this.outerWidth = DOMUtils.getOuterWidth(this.draggingEl)
		this.outerHeight = DOMUtils.getOuterHeight(this.draggingEl)

		this.prepareSiblings()

		this.placeholder = this.initPlaceholder(elRect)
		this.insertPlaceholder(drop, false)
	}

	protected setDraggingStyle(mousePosition: Point) {
		super.setDraggingStyle(mousePosition)

		let elRect = this.draggingEl.getBoundingClientRect()
		this.draggingEl.style.width = elRect.width + 'px'
		this.draggingEl.style.height = elRect.height + 'px'
	}

	private prepareSiblings() {
		if (!this.dragging.options.slideOnly) {
			return
		}

		let siblingEls = [...this.dragging.el.parentElement!.children]
			.filter(el => {
				return el !== this.dragging.el
					&& getDraggableByElement(el as HTMLElement)
			})

		this.slideOnlySiblings = siblingEls.map(el => getDraggableByElement(el as HTMLElement)!)
	}

	/** Create a placeholder having same size with dragging element and insert into drop element. */
	private initPlaceholder(elRect: DOMRect) {
		let placeholder = this.dragging.el.cloneNode() as HTMLElement
		placeholder.style.visibility = 'hidden'
		placeholder.style.width = elRect.width + 'px'
		placeholder.style.height = elRect.height + 'px'

		return placeholder
	}

	/** Insert placeholder to droppable. */
	private insertPlaceholder(drop: droppable, playTransition: boolean) {
		let draggingInSameArea = this.startDrop === drop

		// After dragging element become fixed, must move following siblings to persist their position.
		if (draggingInSameArea) {
			for (let el of this.walkSiblingsAfter(this.draggingEl)) {
				this.moveElement(el, 1, playTransition)
			}
		}

		// Add a placeholder to persist parent container size.
		drop.el.append(this.placeholder)
	}

	/** Walk for sibling elements after `fromEl`. */
	private *walkSiblingsAfter(fromEl: HTMLElement): Iterable<HTMLElement> {
		for (let el = fromEl.nextElementSibling as HTMLElement; el; el = el.nextElementSibling as HTMLElement) {
			yield el
		}
	}

	/** 
	 * Moves one element based on a move direction to giver space for dragging item.
	 * @param moveDirection `1` to move right or bottom, `0` to keep still.
	 */
	private moveElement(el: HTMLElement, moveDirection: 1 | 0, playTransition: boolean) {
		if (el === this.draggingEl) {
			return
		}

		let movePx = this.itemsAlignDirection === 'horizontal' ? this.outerWidth : this.outerHeight
		let translateDirection = moveDirection

		// in not in `autoLayout` mode, element will not affect the position of it's followed sibling elements,
		// So we make `moveDirection` -= 1 to keep balance.
		//   0: No translate needed.
		//  -1: Translate to left to fix empty after dragging element removed.
		if (!this.autoLayout && this.draggingEl.compareDocumentPosition(el) === el.DOCUMENT_POSITION_FOLLOWING) {
			translateDirection -= 1
		}

		let transformProperty = this.itemsAlignDirection === 'vertical' ? 'translateY' : 'translateX'
		let translatePixels = translateDirection * movePx

		let transform = translateDirection !== 0
			? `${transformProperty}(${translatePixels}px)`
			: 'none'

		if (playTransition) {
			this.playTransitionTo(el, {transform})
		}
		else {
			el.style.transform = transform
		}

		if (moveDirection) {
			this.movedElements.add(el)
		}
		else {
			this.movedElements.delete(el)
		}

		if (translateDirection) {
			this.translatedElements.add(el)
		}
		else {
			this.translatedElements.delete(el)
		}
	}

	/** Play movement transition. */
	private async playTransitionTo(el: HTMLElement, endFrame: WebTransitionKeyFrame) {
		let transition = new WebTransition(el, {
			duration: this.dragging.options.transitionDuration ?? WebTransition.DefaultOptions.duration,
			easing: this.dragging.options.transitionEasing ?? WebTransition.DefaultOptions.easing,
		})
	
		el.style.pointerEvents = 'none'

		let finish = await transition.playTo(endFrame, true)
		if (finish) {
			el.style.pointerEvents = ''
		}
	}

	onEnterDrop(drop: droppable) {
		this.activeDrop = drop
		this.itemsAlignDirection = drop.options.itemsAlignDirection ?? 'vertical'
		this.insertPlaceholder(drop, true)
	}
	
	onEnterDrag(drag: draggable) {
		if (!this.activeDrop) {
			return
		}

		let willMoveElements = new Set([drag.el, ...this.walkSiblingsAfter(drag.el)])
		willMoveElements.delete(this.draggingEl)
		willMoveElements.delete(this.placeholder)

		// When the dragged into element has been moved,
		// dragged into it again means that it's movement will be restored.
		if (this.movedElements.has(drag.el)) {
			willMoveElements.delete(drag.el)
		}

		// Keeps position.
		for (let el of this.movedElements) {
			if (!willMoveElements.has(el)) {
				this.moveElement(el, 0, true)
			}
		}

		// Moves right.
		for (let el of willMoveElements) {
			if (!this.movedElements.has(el)) {
				this.moveElement(el, 1, true)
			}
		}

		this.draggingTo = drag
		this.dragToRect = drag.el.getBoundingClientRect()
		this.dragToIndex = this.generateDraggedToIndex(drag, willMoveElements.has(drag.el))
	}

	private generateDraggedToIndex(drag: draggable, beenMoved: boolean): number {
		let isInSameDropArea = this.startDrop === this.activeDrop
		let index = drag.index

		// Assume we have:
		//	 group 1: 1 2 3
		//   group 2: 4 5 6

		if (isInSameDropArea) {

			// Drag 1 into 3
			if (index > this.dragging.index) {
				if (beenMoved) {

					// 2 [1] 3, returns index 3 - 1
					return index - 1
				}
				else {
					// 2 3 [1], returns index 3
					return index
				}
			}

			// Drag 3 into 1
			else {
				if (beenMoved) {
					// [3] 1 2, returns index 1
					return index
				}
				else {
					// 1 [3] 2, returns index 1 + 1
					return index + 1
				}
			}
		}

		// Drag 1 into 4
		else {
			if (beenMoved) {
				return index	// [1] 4 5 6, returns index of 4
			}
			else {
				return index + 1	// 4 [1] 5 6, returns index of 4 + 1
			}
		}
	}

	translateDraggingElement(moves: Vector) {
		this.translate.copyFrom(moves)

		if (this.dragging.options.slideOnly) {
			if (this.itemsAlignDirection === 'vertical') {
				this.draggingEl.style.transform = `translateY(${moves.y}px)`
			}
			else {
				this.draggingEl.style.transform = `translateX(${moves.x}px)`
			}
		}
		else {
			this.draggingEl.style.transform = `translate(${moves.x}px, ${moves.y}px)`
		}

		if (this.dragging.options.slideOnly) {
			this.testForEnteringSibling()
		}
	}

	/** Test which sibling get entered by current position. */
	private testForEnteringSibling() {
		let rect = Box.fromLike(this.draggingEl.getBoundingClientRect())
		let siblings = this.slideOnlySiblings!
		let found = false

		for (let sibling of siblings) {
			let siblingRect = Box.fromLike(sibling.el.getBoundingClientRect())

			if (rect.isIntersectWithAtHV(siblingRect, this.itemsAlignDirection)) {
				found = true				

				// Same entering sibling.
				if (sibling === this.slideOnlyEnteringSiblingData) {
					break
				}
					
				// Skip elements that are playing transition.
				let isPlayingTransition = DOMUtils.getStyleValue(sibling.el, 'pointerEvents') === 'none'
				if (isPlayingTransition) {
					break
				}
				
				this.onEnterDrag(sibling)
				this.slideOnlyEnteringSiblingData = sibling
				break
			}
		}

		if (!found) {
			this.slideOnlyEnteringSiblingData = null
		}
	}

	onLeaveDrop(drop: droppable) {
		if (drop !== this.activeDrop) {
			return
		}

		for (let el of this.movedElements) {
			this.moveElement(el, 0, true)
		}

		this.activeDrop = null
		this.draggingTo = null
		this.dragToRect = null
		this.dragToIndex = -1
	}

	willSwapElements(): boolean {
		return !!(this.draggingTo || this.activeDrop && this.startDrop !== this.activeDrop)
	}

	getSwapIndex(): number {
		return this.dragToIndex
	}

	async playEndDraggingTransition() {

		// Transition dragging element to drop area.
		if (this.willSwapElements()) {
			await this.transitionDraggingElementToDropArea()
			this.draggingEl.style.transform = ''
		}

		// Transition dragging element to it's original position.
		else {
			// When moves dragging element outside.
			if (this.activeDrop !== this.startDrop) {
				this.moveSiblingsToGiveSpace(true)
			}

			await this.playTransitionTo(this.draggingEl, {transform: 'none'})
		}

		this.restoreMovedElements(false)
		this.clearDraggingStyle()
	}

	/** Transition dragging element to where it dropped. */
	private async transitionDraggingElementToDropArea() {
		let fromRect = this.draggingEl.getBoundingClientRect()
		let toRect = this.dragToRect || this.placeholder!.getBoundingClientRect()

		let x = toRect.left - fromRect.left + this.translate.x
		let y = toRect.top - fromRect.top + this.translate.y

		if (this.itemsAlignDirection === 'horizontal') {

			// Move from left to right, align at right.
			if (this.dragging.index < this.dragToIndex) {
				x = toRect.right - fromRect.right + this.translate.x
			}

			if (this.dragging.options.slideOnly) {
				y = 0
			}
		}
		else {
			// Move from top to bottom, align at bottom.
			if (this.dragging.index < this.dragToIndex) {
				y = toRect.bottom - fromRect.bottom + this.translate.y
			}

			if (this.dragging.options.slideOnly) {
				x = 0
			}
		}

		let transform = `translate(${x}px, ${y}px)`

		await this.playTransitionTo(this.draggingEl, {transform})
	}

	/** Move next sibling element to give space for dragging element. */
	private moveSiblingsToGiveSpace(playTransition: boolean) {
		for (let el of this.walkSiblingsAfter(this.draggingEl)) {
			this.moveElement(el, 1, playTransition)
		}
	}

	/** Restore all moved and also translated elements. */
	private restoreMovedElements(playTransition: boolean) {
		for (let el of this.translatedElements.keys()) {
			if (playTransition) {
				this.playTransitionTo(el, {transform: 'none'})
			}
			else {
				el.style.transform = ''
			}
		}

		// Set a new set would be faster, but it's not performance sensitive here.
		this.movedElements.clear()
		this.translatedElements.clear()

		this.placeholder.remove()
	}
}