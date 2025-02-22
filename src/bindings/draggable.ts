import {Binding, Part, PartCallbackParameterMask} from '@pucelle/lupos.js'
import {DOMEvents, WebTransitionEasingName} from '@pucelle/ff'
import {GlobalDragDropRelationship} from './drag-drop-helpers/relationship'


export interface DraggableOptions {

	/** `name` for draggable, can drop to droppable only when name match. */
	name?: string
	
	/** Transition duration in milliseconds. */
	transitionDuration?: number

	/** Transition easing. */
	transitionEasing?: WebTransitionEasingName
}


/** 
 * Make current element draggable.
 * :draggable=${data, index, options}
 * - `data`: Data item to identify current dragging item.
 * - `index`: Data item index within it's siblings, normally the for loop index.
 * - `options` Draggable options.
 */
export class draggable<T = any> implements Binding, Part {

	readonly el: HTMLElement

	/** Can only drop to same named droppable. */
	name: string = ''

	/** Transition duration in milliseconds. */
	transitionDuration: number | undefined

	/** Transition easing. */
	transitionEasing: WebTransitionEasingName | undefined

	/** Data can be passed to droppable. */
	data: T | null = null

	/** Data item index within it's siblings. */
	index: number = -1

	private connected: boolean = false

	constructor(el: Element) {
		this.el = el as HTMLElement
	}

	afterConnectCallback() {
		if (this.connected) {
			return
		}

		DOMEvents.on(this.el, 'mousedown', this.onMouseDown, this)
		DOMEvents.on(this.el, 'mouseenter', this.onMouseEnter, this)
		
		// To avoid image dragging handled be HTML5 drag & drop
		this.el.setAttribute('draggable', 'false')

		this.connected = true
	}

	beforeDisconnectCallback(param: PartCallbackParameterMask | 0) {
		if ((param & PartCallbackParameterMask.MoveFromOwnStateChange) === 0) {
			return
		}

		DOMEvents.off(this.el, 'mousedown', this.onMouseDown, this)
		DOMEvents.off(this.el, 'mouseenter', this.onMouseEnter, this)
		this.el.removeAttribute('draggable')
		this.connected = false
	}

	update(data: T, index: number, options: DraggableOptions = {}) {
		this.data = data
		this.index = index
		this.name = options.name || ''
		this.transitionDuration = options.transitionDuration
		this.transitionEasing = options.transitionEasing

	}

	private onMouseDown(e: MouseEvent) {
		e.preventDefault()

		let isDragging = false
		let startX = e.clientX
		let startY = e.clientY

		let onMouseMove = (e: MouseEvent) => {
			if (!isDragging && (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5)) {
				GlobalDragDropRelationship.startDragging(this)
				isDragging = true
			}
			
			if (isDragging) {
				let moveX = e.clientX - startX
				let moveY = e.clientY - startY
				GlobalDragDropRelationship.translateDraggingElement(moveX, moveY)
			}
		}

		let onMouseUp = async () => {
			DOMEvents.off(document, 'mousemove', onMouseMove as (e: Event) => void)

			if (isDragging) {
				GlobalDragDropRelationship.endDragging()
			}
		}

		DOMEvents.on(document, 'mousemove', onMouseMove as (e: Event) => void)
		DOMEvents.once(document, 'mouseup', onMouseUp)
	}

	private onMouseEnter() {
		GlobalDragDropRelationship.enterDrag(this)
	}
}