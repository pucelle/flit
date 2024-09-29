import {defineBinding, Binding, on, once, off} from '@pucelle/flit'
import {animateTo, getRect, stopAnimation, Rect, getStyleValue, isPlayingAnimation, getOuterWidth, getOuterHeight} from '@pucelle/ff'
import {theme} from '../style/theme'


export interface DraggableOptions {

	/** `name` for dragabble, can drop to droppable only when name match. */
	readonly name?: string
}

export interface DroppableOptions<T> {

	/** `name` for droppable, can drop draggable to droppable only when name match. */
	readonly name?: string

	/** Called after mouse entered into a droppable area. */
	onenter?: (data: T, toIndex: number) => void

	/** Called after mouse was just leaved from a droppable area. */
	onleave?: (data: T, toIndex: number) => void
}

type Draggable = DraggableBinding<any>
type Droppable = DroppableBinding<any>


export class DraggableBinding<T> implements Binding<T> {

	readonly el: HTMLElement

	/** Can drop to droppable only when name match. */
	name: string = ''

	/** Data can be passed to droppable. */
	data: T | null = null

	/** Data index. */
	index: number = -1

	constructor(el: Element) {
		this.el = el as HTMLElement

		// To avoid image dragging handled be HTML5 drag & drop
		this.el.setAttribute('draggable', 'false')

		on(this.el, 'mousedown', this.onMouseDown as any, this)
		on(this.el, 'mouseenter', this.onMouseEnter, this)
	}

	update(data: T, index: number, options: DraggableOptions = {}) {
		this.data = data
		this.index = index
		this.name = options.name || ''
	}

	protected onMouseDown(e: MouseEvent) {
		e.preventDefault()

		let isDragging = false
		let startX = e.clientX
		let startY = e.clientY

		let onMouseMove = (e: MouseEvent) => {
			if (!isDragging && (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5)) {
				manager.startDragging(this)
				isDragging = true
			}
			
			if (isDragging) {
				let moveX = e.clientX - startX
				let moveY = e.clientY - startY
				manager.translateDraggingElement(moveX, moveY)
			}
		}

		let onMouseUp = async () => {
			off(document, 'mousemove', onMouseMove as (e: Event) => void)

			if (isDragging) {
				manager.endDragging()
			}
		}

		on(document, 'mousemove', onMouseMove as (e: Event) => void)
		once(document, 'mouseup', onMouseUp)
	}

	protected onMouseEnter() {
		manager.enterDraggable(this)
	}

	remove() {
		off(this.el, 'mousedown', this.onMouseDown as (e: Event) => void, this)
		off(this.el, 'mouseenter', this.onMouseEnter, this)
	}
}

/** 
 * Make current element draggable.
 * @param data Data can be passed to same name droppable.
 * @param index Data index.
 * @param options Draggable options.
 */
export const draggable = defineBinding('draggable', DraggableBinding) as (data: any, index: number, options?: DraggableOptions) => void


export class DroppableBinding<T> implements Binding<(data: T, index: number) => void> {
	
	readonly el: HTMLElement
	
	/** Allows draggable drop only when name match. */
	name: string = ''

	protected onenter: ((data: T, toIndex: number) => void) | null = null
	protected onleave: ((data: T, toIndex: number) => void) | null = null
	protected ondrop!: (data: T, toIndex: number, fromIndex: number) => void

	constructor(el: Element) {
		this.el = el as HTMLElement
		on(this.el, 'mouseenter', this.onMouseEnter as any, this)
	}

	update(ondrop: (data: T, toIndex: number, fromIndex: number) => void, options: DroppableOptions<T> = {}) {
		this.ondrop = ondrop

		this.name = options.name || ''
		this.onenter = options.onenter || null
		this.onleave = options.onleave || null
	}

	protected onMouseEnter() {
		manager.enterDroppable(this)
		once(this.el, 'mouseleave', this.onMouseLeave as any, this)
	}

	/** Triggers dragging element enter current droppable. */
	emitEnter(dragging: Draggable) {
		if (this.onenter) {
			this.onenter(dragging.data as T, dragging.index)
		}
	}

	protected onMouseLeave() {
		manager.leaveDroppable(this)
	}

	/** Triggers dragging element leave current droppable. */
	emitLeave(dragging: Draggable) {
		if (this.onleave) {
			this.onleave(dragging.data as T, dragging.index)
		}
	}

	/** Triggers dragging element drop to current droppable. */
	emitDrop(dragging: Draggable, toIndex: number) {
		if (this.ondrop) {
			this.ondrop(dragging.data as T, toIndex, dragging.index)
		}
	}

	remove() {
		off(this.el, 'mouseenter', this.onMouseEnter as any, this)
	}
}

/** 
 * Make current element droppable.
 * @param data Data can be passed to same name droppable.
 * @param index Data index.
 * @param options Droppable options.
 */
export const droppable = defineBinding('droppable', DroppableBinding) as
	<T>(ondrop: (data: T, toIndex: number, fromInde: number) => void, options?: DroppableOptions<T>) => void


/** 
 * Global manager to relate current dragging and it's droppable. 
 *   When start dragging, check it's related drop area.
 *   When dragging element enters another draggable element, relate them and adjust position using `mover`.
 *   When dragging element enters one drop area, give additional space for it.
 *   When dragging element leaves one drop area, remove space that belongs to it.
 */
class DragDropRelationshipManager {

	protected dragging: Draggable | null = null
	protected mover: Mover | null = null

	/** 
	 * May mouse enter in several drop areas, and start dragging,
	 * then we need to check which drop area should trigger enter.
	 */
	protected enterDrops: Set<Droppable> = new Set()

	/** Current drop area. */
	protected activeDropArea: Droppable | null = null
	
	/** When start dragging a draggable. */
	startDragging(dragging: Draggable) {
		this.dragging = dragging
		let activeDropArea: Droppable | undefined

		for (let drop of [...this.enterDrops]) {

			// May element was removed.
			if (!document.contains(drop.el)) {
				this.enterDrops.delete(drop)
			}

			else if (drop.name === dragging.name) {
				activeDropArea = drop
				break
			}
		}

		if (!activeDropArea) {
			throw new Error(`Element with ':draggable' must be contained in a ':droppable' elemenet`)
		}

		activeDropArea.emitEnter(this.dragging)

		this.activeDropArea = activeDropArea
		this.mover = new Mover(this.dragging!, activeDropArea)
	}

	/** Translate dragging element to keep follows with mouse. */
	translateDraggingElement(x: number, y: number) {
		if (this.mover) {
			this.mover.translateDraggingElement(x, y)
		}
	}

	/** When dragging and enter a draggable. */
	enterDraggable(enter: Draggable) {
		if (this.canSwapWith(enter) && this.mover) {
			this.mover.onEnterDraggable(enter)
		}
	}

	/** Whether dragging can swap with draggable. */
	protected canSwapWith(drag: Draggable) {
		return this.dragging && this.dragging.name === drag.name && this.dragging !== drag
	}

	/** When dragging and enter a droppable. */
	enterDroppable(drop: Droppable) {
		this.enterDrops.add(drop)

		if (this.canDropTo(drop)) {
			drop.emitEnter(this.dragging!)
			this.activeDropArea = drop
			this.mover!.onEnterDroppable(drop)
		}
	}

	/** Whether dragging can drop to a droppable. */
	protected canDropTo(droppable: Droppable) {
		return this.dragging && this.dragging.name === droppable.name
	}

	/** When dragging and leave a droppable. */
	leaveDroppable(drop: Droppable) {
		this.enterDrops.delete(drop)

		if (this.activeDropArea === drop) {
			drop.emitLeave(this.dragging!)
			this.activeDropArea = null
			this.mover!.onLeaveDroppable(drop)
		}
	}

	/** When release dragging. */
	endDragging() {
		let mover = this.mover!
		let dragging = this.dragging!
		let lastActiveDroppable = this.activeDropArea!

		mover.playEndDraggingAnimation().then(() => {
			if (mover.willSwapElements()) {
				lastActiveDroppable.emitDrop(dragging, mover.getSwapIndex())
			}
		})
		
		this.dragging = null
		this.mover = null
		this.activeDropArea = null
	}
}

const manager = new DragDropRelationshipManager()



/** 
 * To handle dragging movements, includes:
 *   When moved out of the droppable it's inside: All elements below moved up
 *   When moved in a new droppable: Add a padding as space to contain
 *   When moved between silbings: Moving items betweens them up or down, include the mouse enter sibling.
 *   When moved into a already moved sibling: Fallback movements that not betweens them, include the mouse enter sibling.
 */
class Mover {
	
	/** Dragging draggable. */
	protected readonly dragging: Draggable

	/** Dragging element. */
	protected readonly el: HTMLElement

	/** Dragging element rect. */
	protected readonly rect: Rect

	/** Where the dragging come from. */
	protected readonly startDropArea: Droppable

	/** `true` means after `el` removed, followed elements will move and take it's place. */
	protected readonly autoLayout: boolean

	/** Dragging element translate. */
	protected readonly translate: [number, number] = [0, 0]

	/** Keeps orignal style text for dragging element and restore it after end dragging. */
	protected readonly startStyleText: string = ''

	/** Elements that moves to right (never moves to left) in visually, compare to their auto layout position. */
	protected readonly movedElements: Set<HTMLElement> = new Set()

	/** Elements that were actually translated, different with `movedElements` depends on `autoLayout`. */
	protected readonly translatedElements: Set<HTMLElement> = new Set()

	/** Dragging element width includes margin. */
	protected readonly outerWidth!: number

	/** Dragging element height includes margin. */
	protected readonly outerHeight!: number

	/** Dragging element siblings align direction. */
	protected direction: 'x' | 'y' = 'y'

	/** After mouse enter a drop area, we should insert a placeholder that having same size with dragging element into. */
	protected placeholder!: HTMLElement

	/** Currently mouse entered draggable. */
	protected dragTo: Draggable | null = null

	/** Rect of `dragTo`. */
	protected dragToRect: Rect | null = null

	/** Indicates the index of where to insert dragging element in the current drop area if drop right now. */
	protected dragToIndex: number = -1

	/** 
	 * Currently mouse entered drop area.
	 * Term `droppable` is a little hard to understand, so use `drop area` instead.
	 */
	protected activeDropArea: Droppable | null = null

	constructor(drag: Draggable, drop: Droppable) {
		this.dragging = drag
		this.el = drag.el
		this.startDropArea = this.activeDropArea = drop

		this.rect = getRect(this.el)
		this.autoLayout = getStyleValue(this.el, 'position') !== 'absolute'

		// Didn't consider about margin collapse.
		this.outerWidth = getOuterWidth(this.el)
		this.outerHeight = getOuterHeight(this.el)

		this.initializeDirection()
		this.initializePlaceholder()
		this.insertPlaceholder(drop, false)

		this.startStyleText = this.el.style.cssText
		this.setStartDraggingStyle()
	}

	protected initializeDirection() {
		if (this.el.nextElementSibling || this.el.previousElementSibling) {
			let nextRect = getRect(this.el.nextElementSibling || this.el.previousElementSibling!)

			if (Math.abs(nextRect.left - this.rect.left) > Math.abs(nextRect.top - this.rect.top)) {
				this.direction = 'x'
			}
			else {
				this.direction = 'y'
			}
		}
	}
	
	/** Set dragging style for dragging element. */
	protected setStartDraggingStyle() {
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
		this.el.style.boxShadow = `0 0 ${theme.popupShadowBlurRadius}px #888`
		this.el.style.pointerEvents = 'none'
		this.el.style.opacity = '1'
		this.el.style.willChange = 'transform'
	}

	/** Create a placeholder having same size with dragging element and insert into drop element. */
	protected initializePlaceholder() {
		this.placeholder = this.dragging.el.cloneNode() as HTMLElement
		this.placeholder.style.visibility = 'hidden'

		if (this.direction === 'x') {
			this.placeholder.style.width = this.rect.width + 'px'
		}
		else {
			this.placeholder.style.height = this.rect.height + 'px'
		}
	}

	protected insertPlaceholder(drop: Droppable, playAnimation: boolean) {
		let isDraggingInStartArea = this.startDropArea === drop
		if (isDraggingInStartArea) {
			for (let el of this.getSiblingsAfter(this.el as HTMLElement)) {
				this.moveElement(el, 1, playAnimation)
			}
		}

		drop.el.append(this.placeholder)
	}

	/** Get sibling elements after `fromEl`. */
	protected getSiblingsAfter(fromEl: HTMLElement): HTMLElement[] {
		let els: HTMLElement[] = []

		for (let el = fromEl.nextElementSibling as HTMLElement; el; el = el.nextElementSibling as HTMLElement) {
			els.push(el)
		}

		return els
	}

	/** 
	 * Moves one element based on a move direction to giver space for dragging item.
	 * @param moveDirection `1` to move right, `0` to keep still.
	 */
	protected moveElement(el: HTMLElement, moveDirection: 1 | 0, playAnimation: boolean) {
		if (el === this.el) {
			return
		}

		let movePx = this.direction === 'x' ? this.outerWidth : this.outerHeight
		let translateDirection = moveDirection

		// in not in `autoLayout` mode, element will not affect the position of it's followed sibling elements,
		// So we make `moveDirection` -= 1 to keep balance.
		//   0: No translate needed.
		//  -1: Translate to left to fix empty after dragging element removed.
		if (!this.autoLayout && this.el.compareDocumentPosition(el) === el.DOCUMENT_POSITION_FOLLOWING) {
			translateDirection -= 1
		}

		let transform = translateDirection !== 0
			? `translate${this.direction!.toUpperCase()}(${translateDirection * movePx}px)`
			: ''

		if (playAnimation) {
			animateTo(el, {transform})
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

	/** When mouse enter droppable. */
	onEnterDroppable(drop: Droppable) {
		this.insertPlaceholder(drop, true)
		this.activeDropArea = drop
	}
	
	/** When mouse enter draggable. */
	onEnterDraggable(dragEnter: Draggable) {
		if (!this.activeDropArea) {
			return
		}

		// May cause enter or leave events triggered acciedently if is playing animation.
		if (isPlayingAnimation(dragEnter.el)) {
			return
		}

		let willMoveElements = new Set([dragEnter.el, ...this.getSiblingsAfter(dragEnter.el)])
		willMoveElements.delete(this.el)

		// When the dragged into element has been moved, dragged into it again means that it's movement will be restored.
		if (this.movedElements.has(dragEnter.el)) {
			willMoveElements.delete(dragEnter.el)
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

		this.dragTo = dragEnter
		this.dragToRect = getRect(dragEnter.el)
		this.dragToIndex = this.generateDraggedToIndex(dragEnter, willMoveElements.has(dragEnter.el))
	}

	protected generateDraggedToIndex(drag: Draggable, beenMoved: boolean): number {
		let isInSameDropArea = this.startDropArea === this.activeDropArea
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

	/** Translate dragging element. */
	translateDraggingElement(x: number, y: number) {
		this.translate[0] = x
		this.translate[1] = y
		this.el.style.transform = `translate(${x}px, ${y}px)`
	}

	/** Whether drag & drop completed and will swap elements. */
	willSwapElements(): boolean {
		return !!(this.dragTo || this.activeDropArea && this.startDropArea !== this.activeDropArea)
	}

	/** Returns the index of inserting index into drop area. */
	getSwapIndex(): number {
		return this.dragToIndex
	}

	/** When mouse leaves drop area. */
	onLeaveDroppable(drop: Droppable) {
		if (drop !== this.activeDropArea) {
			return
		}

		for (let el of this.movedElements) {
			this.moveElement(el, 0, true)
		}

		this.activeDropArea = null
		this.dragTo = null
		this.dragToRect = null
		this.dragToIndex = -1
	}

	/** Play drag end end transition. */
	async playEndDraggingAnimation() {
		// Animate dragging elemenet to drop area.
		if (this.willSwapElements()) {
			await this.animateDraggingElementToDropArea()
			this.el.style.transform = ''
		}

		// Animate dragging elemenet to it's original position.
		else {
			// When moves dragging element outside.
			if (this.activeDropArea !== this.startDropArea) {
				this.moveSiblingsToGiveSpace(true)
			}

			await animateTo(this.el, {transform: ''})
		}

		this.restoreMovedElements(false)
		this.clearDraggingStyle()
	}

	/** Animate dragging elemenet to where it dropped. */
	protected async animateDraggingElementToDropArea() {
		let fromRect = getRect(this.el)
		let toRect = this.dragToRect || getRect(this.placeholder!)

		let x = toRect.left - fromRect.left + this.translate[0]
		let y = toRect.top - fromRect.top + this.translate[1]

		if (this.direction === 'x') {
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

		await animateTo(this.el, {transform})
	}

	/** Move next silbling elements to give space for dragging elemenet. */
	protected moveSiblingsToGiveSpace(playAnimation: boolean) {
		for (let el of this.getSiblingsAfter(this.el)) {
			this.moveElement(el, 1, playAnimation)
		}
	}

	/** Restore all moved and also translated elements. */
	protected restoreMovedElements(playAnimation: boolean) {
		for (let el of this.translatedElements) {
			if (playAnimation) {
				animateTo(el, {transform: ''})
			}
			else {
				stopAnimation(el)
				el.style.transform = ''
			}
		}

		// Set a new set would be faster, but it's not performance sensitive here.
		this.movedElements.clear()
		this.translatedElements.clear()

		this.placeholder.remove()
	}

	/** Clear dragging style for dragging element. */
	protected clearDraggingStyle() {
		document.body.style.cursor = ''
		document.body.style.userSelect = ''

		this.el.style.cssText = this.startStyleText
	}
}