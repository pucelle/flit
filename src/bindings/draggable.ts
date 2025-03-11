import {Binding, Part, PartCallbackParameterMask} from '@pucelle/lupos.js'
import {DOMEvents, WebTransitionEasingName} from '@pucelle/ff'
import {GlobalDragDropRelationship} from './drag-drop-helpers/relationship'
import {registerDraggable} from './drag-drop-helpers/all-draggables'


export interface DraggableOptions {

	/** `name` for draggable, can drop to droppable only when name match. */
	name?: string
	
	/** Transition duration in milliseconds. */
	transitionDuration?: number

	/** Transition easing. */
	transitionEasing?: WebTransitionEasingName

	/** 
	 * Whether can slider only in x/y axis.
	 * If specifies as `true`, means can only swap with dragging element siblings.
	 */
	slideOnly?: boolean

	/** The class name to apply when start dragging. */
	className?: string
}


/** 
 * Make current element draggable.
 * :draggable=${data, index, ?options}
 * - `data`: Data item to identify current dragging item.
 * - `index`: Data item index within it's siblings, normally the for loop index.
 * - `options` Draggable options.
 */
export class draggable<T = any> implements Binding, Part, DraggableOptions {

	readonly el: HTMLElement

	name: string = ''
	transitionDuration: number | undefined
	transitionEasing: WebTransitionEasingName | undefined
	slideOnly: boolean = false
	className: string | undefined

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
		
		registerDraggable(this)
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
		this.slideOnly = options.slideOnly ?? false
		this.className = options.className
	}

	private onMouseDown(e: MouseEvent) {
		e.preventDefault()

		let isDragging = false
		let startPosition = DOMEvents.getClientPosition(e)
	
		let onMouseMove = (e: MouseEvent) => {
			let currentPosition = DOMEvents.getClientPosition(e)
			let moves = currentPosition.diff(startPosition)

			if (!isDragging && moves.getLength() > 5) {
				GlobalDragDropRelationship.startDragging(this)
				startPosition = currentPosition
				moves.reset()
				isDragging = true

				if (this.className) {
					this.el.classList.add(this.className)
				}
			}
			
			if (isDragging) {
				GlobalDragDropRelationship.translateDraggingElement(moves)
			}
		}

		let onMouseUp = async () => {
			DOMEvents.off(document, 'mousemove', onMouseMove as (e: Event) => void)

			if (isDragging) {
				GlobalDragDropRelationship.endDragging()

				if (this.className) {
					this.el.classList.remove(this.className)
				}
			}
		}

		DOMEvents.on(document, 'mousemove', onMouseMove as (e: Event) => void)
		DOMEvents.once(document, 'mouseup', onMouseUp)
	}

	private onMouseEnter() {
		GlobalDragDropRelationship.enterDrag(this)
	}
}