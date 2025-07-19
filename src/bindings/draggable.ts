import {Binding, Part, PartCallbackParameterMask, RenderResultRenderer, WebTransitionEasingName} from '@pucelle/lupos.js'
import {Coord, EventUtils} from '@pucelle/ff'
import {DOMEvents} from '@pucelle/lupos'
import {GlobalDragDropRelationship} from './drag-drop-helpers/relationship'
import {registerDraggable} from './drag-drop-helpers/all-draggable'
import {droppable} from './droppable'


export interface DraggableOptions {
	
	/** `name` for draggable, can drop to droppable only when name match. */
	name: string

	/** 
	 * By default, dragging will be started if drag start from the element bounded.
	 * By specifying `matchSelector`, can limit from only the element match this selector.
	 */
	matchSelector?: string

	/** The class name to apply after start dragging. */
	draggingClassName?: string

	/** Which style value should be persisted, like width, height. */
	persistStyleProperties?: (string & keyof CSSStyleDeclaration)[]

	/** Transition duration when playing dragging movement, in milliseconds. */
	transitionDuration?: number

	/** Transition easing when playing dragging movement. */
	transitionEasing?: WebTransitionEasingName

	/** Can cause nearest scroller to scroll when touch edges of scroll area. */
	canCauseScrolling?: boolean

	/** 
	 * Generate an element to follow mouse after start dragging.
	 * The returned content may extend `<Popup>` or not, not limit it much.
	 */
	followElementRenderer?: RenderResultRenderer

	/** 
	 * On dragging start.
	 * If prevent default of `e`, will stop dragging action.
	 */
	onStart?: (e: MouseEvent) => void

	/** 
	 * On dragging end.
	 * If dragging canceled, `drop` is null.
	 */
	onEnd?: (drop: droppable | null) => void
}

const DefaultDraggableOptions: DraggableOptions = {
	name: '',
	canCauseScrolling: false,
}



/** 
 * Base class of `draggable` and `orderable`.
 */
export abstract class DraggableBase<T = any> implements Part {

	abstract readonly mode: string

	readonly el: HTMLElement
	readonly context: any

	/** Draggable options. */
	options: DraggableOptions = DefaultDraggableOptions

	/** Data can be passed to droppable. */
	data: T | null = null

	private connected: boolean = false
	private inHanding: boolean = false
	private inDragging: boolean = false
	private startPosition: DOMPoint | null = null

	constructor(el: Element, context: any) {
		this.el = el as HTMLElement
		this.context = context
	}

	afterConnectCallback() {
		if (this.connected) {
			return
		}

		registerDraggable(this)

		// Use mouse event to handle `reorder` dragging.
		DOMEvents.on(this.el, 'mousedown', this.onMouseDown, this)
		DOMEvents.on(this.el, 'mouseenter', this.onMouseEnter, this)

		this.el.setAttribute('draggable', 'false')
		this.connected = true
	}

	beforeDisconnectCallback(param: PartCallbackParameterMask | 0) {
		if ((param & PartCallbackParameterMask.MoveFromOwnStateChange) === 0) {
			return
		}

		DOMEvents.off(this.el, 'mousedown', this.onMouseDown, this)
		DOMEvents.off(this.el, 'mouseenter', this.onMouseEnter, this)

		this.endDragging()
		this.el.removeAttribute('draggable')
		this.connected = false
	}

	private onMouseDown(e: MouseEvent) {

		// If have `matchSelector` and not match, ignore.
		if (this.options.matchSelector) {
			let target = e.target as Element
			if (!target.closest(this.options.matchSelector)) {
				return
			}
		}

		e.preventDefault()

		this.inHanding = true
		this.inDragging = false
		this.startPosition = EventUtils.getClientPosition(e)
	
		DOMEvents.on(document, 'mousemove', this.onMouseMove, this)
		DOMEvents.on(document, 'mouseup', this.onMouseUp, this)
	}

	private onMouseMove(e: MouseEvent) {
		let currentPosition = EventUtils.getClientPosition(e)

		let moves: Coord = {
			x: currentPosition.x - this.startPosition!.x,
			y: currentPosition.y - this.startPosition!.y,
		}

		let movesLength = Math.sqrt(moves.x ** 2 + moves.y ** 2)

		if (!this.inDragging && movesLength > 5) {
			this.options.onStart?.call(this.context, e)

			// Prevent dragging this time.
			if (e.defaultPrevented) {
				this.endDragging()
			}
			else {
				GlobalDragDropRelationship.startDragging(this, e)
				this.startPosition = currentPosition
				this.inDragging = true

				moves.x = 0
				moves.y = 0
			}
		}
		
		if (this.inDragging) {
			GlobalDragDropRelationship.translateDraggingElement(moves, e)
		}
	}

	private onMouseUp() {
		this.endDragging()
	}

	private endDragging() {
		if (this.inHanding) {
			DOMEvents.off(document, 'mousemove', this.onMouseMove, this)
			DOMEvents.off(document, 'mouseup', this.onMouseUp, this)
			this.inHanding = false
		}

		if (this.inDragging) {
			let activeDroppable = GlobalDragDropRelationship.activeDrop
			GlobalDragDropRelationship.endDragging()

			if (this.options.draggingClassName) {
				this.el.classList.remove(this.options.draggingClassName)
			}

			this.options.onEnd?.call(this.context, activeDroppable)
		}
	}

	private onMouseEnter() {
		GlobalDragDropRelationship.enterDrag(this)
	}
}


/** 
 * Make current element draggable.
 * :draggable=${data, ?options}
 * - `data`: Data item to identify current dragging item.
 * - `options` Draggable options.
 */
export class draggable<T = any> extends DraggableBase<T> implements Binding, Part {

	readonly mode: string = 'nest'
	
	update(data: T, options: Partial<DraggableOptions> = {}) {
		this.data = data
		this.options = {...DefaultDraggableOptions, ...options}
	}
}

