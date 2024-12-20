import {DOMUtils, WebTransition, WebTransitionKeyFrame} from '@pucelle/ff'
import type {draggable} from '../draggable'
import {droppable} from '../droppable'


/** 
 * To handle dragging movements, includes:
 *   When moved out of the droppable it's inside: All elements below moved up
 *   When moved in a new droppable: Add a padding as space to contain
 *   When moved between siblings: Moving items betweens them up or down, include the mouse enter sibling.
 *   When moved into a already moved sibling: Fallback movements that not betweens them, include the mouse enter sibling.
 */
export class DragDropMovement {
	
	/** Dragging draggable. */
	private readonly dragging: draggable

	/** Dragging element. */
	private readonly el: HTMLElement

	/** Dragging element rect. */
	private readonly rect: DOMRect

	/** Where the dragging come from. */
	private readonly startDrop: droppable

	/** `true` means after `el` removed, followed elements will move and take it's place. */
	private readonly autoLayout: boolean

	/** Dragging element translate. */
	private readonly translate: [number, number] = [0, 0]

	/** Keeps original style text for dragging element and restore it after dragging end. */
	private readonly startStyleText: string = ''

	/** Elements that moves to right (never moves to left) in visually, compare to their auto layout position. */
	private readonly movedElements: Set<HTMLElement> = new Set()

	/** Elements that were actually translated, different with `movedElements` depends on `autoLayout`. */
	private readonly translatedElements: Set<HTMLElement> = new Set()

	/** Dragging element width includes margin. */
	private readonly outerWidth!: number

	/** Dragging element height includes margin. */
	private readonly outerHeight!: number

	/** After mouse enter a drop area, we should insert a placeholder that having same size with dragging element into. */
	private placeholder!: HTMLElement

	/** Currently mouse entered draggable. */
	private dragTo: draggable | null = null

	/** Rect of `dragTo`. */
	private dragToRect: DOMRect | null = null

	/** Indicates the index of where to insert dragging element in the current drop area if drop right now. */
	private dragToIndex: number = -1

	/** 
	 * Currently mouse entered drop area.
	 * Term `droppable` is a little hard to understand, so use `drop area` instead.
	 */
	private activeDrop: droppable | null = null

	/** Dragging element siblings align direction. */
	private itemsAlignDirection: HVDirection = 'vertical'

	constructor(drag: draggable, drop: droppable) {
		this.dragging = drag
		this.el = drag.el
		this.startDrop = this.activeDrop = drop
		this.itemsAlignDirection = drop.itemsAlignDirection ?? 'vertical'

		this.rect = this.el.getBoundingClientRect()
		this.autoLayout = DOMUtils.getStyleValue(this.el, 'position') !== 'absolute'

		// Not consider about margin collapse.
		this.outerWidth = DOMUtils.getOuterWidth(this.el)
		this.outerHeight = DOMUtils.getOuterHeight(this.el)

		this.placeholder = this.initPlaceholder()
		this.insertPlaceholder(drop, false)

		this.startStyleText = this.el.style.cssText
		this.setDraggingStyle()
	}

	/** Set dragging style for dragging element. */
	private setDraggingStyle() {
		document.body.style.cursor = 'grabbing'
		document.body.style.userSelect = 'none'
		
		if (this.el.localName !== 'tr') {
			this.el.style.position = 'fixed'
		}
		
		this.el.style.zIndex = '9999'
		this.el.style.width = this.rect.width + 'px'
		this.el.style.height = this.rect.height + 'px'
		this.el.style.left = this.rect.left + 'px'
		this.el.style.top = this.rect.top + 'px'
		this.el.style.boxShadow = `0 0 var(--popup-shadow-blur-radius) var(--popup-shadow-color)`
		this.el.style.pointerEvents = 'none'
		this.el.style.opacity = '1'
		this.el.style.willChange = 'transform'
	}

	/** Create a placeholder having same size with dragging element and insert into drop element. */
	private initPlaceholder() {
		let placeholder = this.dragging.el.cloneNode() as HTMLElement
		placeholder.style.visibility = 'hidden'
		placeholder.style.width = this.rect.width + 'px'
		placeholder.style.height = this.rect.height + 'px'

		return placeholder
	}

	/** Insert placeholder to droppable. */
	private insertPlaceholder(drop: droppable, playTransition: boolean) {
		let draggingInSameArea = this.startDrop === drop

		// After dragging element become fixed, must move following siblings to persist their position.
		if (draggingInSameArea) {
			for (let el of this.walkSiblingsAfter(this.el)) {
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
		if (el === this.el) {
			return
		}

		let movePx = this.itemsAlignDirection === 'horizontal' ? this.outerWidth : this.outerHeight
		let translateDirection = moveDirection

		// in not in `autoLayout` mode, element will not affect the position of it's followed sibling elements,
		// So we make `moveDirection` -= 1 to keep balance.
		//   0: No translate needed.
		//  -1: Translate to left to fix empty after dragging element removed.
		if (!this.autoLayout && this.el.compareDocumentPosition(el) === el.DOCUMENT_POSITION_FOLLOWING) {
			translateDirection -= 1
		}

		let transformProperty = this.itemsAlignDirection === 'vertical' ? 'translateY' : 'translateX'

		let transform = translateDirection !== 0
			? `${transformProperty}(${translateDirection * movePx}px)`
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
			duration: this.dragging.transitionDuration ?? WebTransition.DefaultOptions.duration,
			easing: this.dragging.transitionEasing ?? WebTransition.DefaultOptions.easing,
		})
	
		el.style.pointerEvents = 'none'

		let finish = await transition.playTo(endFrame, true)
		if (finish) {
			el.style.pointerEvents = ''
		}
	}

	/** When mouse enter droppable. */
	onEnterDrop(drop: droppable) {
		this.insertPlaceholder(drop, true)
		this.activeDrop = drop
		this.itemsAlignDirection = drop.itemsAlignDirection ?? 'vertical'
	}
	
	/** When mouse enter draggable. */
	onEnterDrag(drag: draggable) {
		if (!this.activeDrop) {
			return
		}

		let willMoveElements = new Set([drag.el, ...this.walkSiblingsAfter(drag.el)])
		willMoveElements.delete(this.el)
		willMoveElements.delete(this.placeholder)

		// When the dragged into element has been moved, dragged into it again means that it's movement will be restored.
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

		this.dragTo = drag
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

	/** Translate dragging element follow mouse. */
	translateDraggingElement(x: number, y: number) {
		this.translate[0] = x
		this.translate[1] = y
		this.el.style.transform = `translate(${x}px, ${y}px)`
	}

	/** Whether drag & drop completed and will swap elements. */
	willSwapElements(): boolean {
		return !!(this.dragTo || this.activeDrop && this.startDrop !== this.activeDrop)
	}

	/** Returns the index of inserting index into drop area. */
	getSwapIndex(): number {
		return this.dragToIndex
	}

	/** When mouse leaves drop area. */
	onLeaveDrop(drop: droppable) {
		if (drop !== this.activeDrop) {
			return
		}

		for (let el of this.movedElements) {
			this.moveElement(el, 0, true)
		}

		this.activeDrop = null
		this.dragTo = null
		this.dragToRect = null
		this.dragToIndex = -1
	}

	/** Play drag end end transition. */
	async playEndDraggingTransition() {

		// Transition dragging element to drop area.
		if (this.willSwapElements()) {
			await this.transitionDraggingElementToDropArea()
			this.el.style.transform = ''
		}

		// Transition dragging element to it's original position.
		else {
			// When moves dragging element outside.
			if (this.activeDrop !== this.startDrop) {
				this.moveSiblingsToGiveSpace(true)
			}

			await this.playTransitionTo(this.el, {transform: 'none'})
		}

		this.restoreMovedElements(false)
		this.clearDraggingStyle()
	}

	/** Transition dragging element to where it dropped. */
	private async transitionDraggingElementToDropArea() {
		let fromRect = this.el.getBoundingClientRect()
		let toRect = this.dragToRect || this.placeholder!.getBoundingClientRect()

		let x = toRect.left - fromRect.left + this.translate[0]
		let y = toRect.top - fromRect.top + this.translate[1]

		if (this.itemsAlignDirection === 'horizontal') {

			// Move from left to right, align at right.
			if (this.dragging.index < this.dragToIndex) {
				x = toRect.right - fromRect.right + this.translate[0]
			}
		}
		else {
			// Move from top to bottom, align at bottom.
			if (this.dragging.index < this.dragToIndex) {
				y = toRect.bottom - fromRect.bottom + this.translate[1]
			}
		}

		let transform = `translate(${x}px, ${y}px)`

		await this.playTransitionTo(this.el, {transform})
	}

	/** Move next sibling element to give space for dragging element. */
	private moveSiblingsToGiveSpace(playTransition: boolean) {
		for (let el of this.walkSiblingsAfter(this.el)) {
			this.moveElement(el, 1, playTransition)
		}
	}

	/** Restore all moved and also translated elements. */
	private restoreMovedElements(playTransition: boolean) {
		for (let el of this.translatedElements) {
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

	/** Clear dragging style for dragging element. */
	private clearDraggingStyle() {
		document.body.style.cursor = ''
		document.body.style.userSelect = ''

		this.el.style.cssText = this.startStyleText
	}
}