import {Binding, Part, PartCallbackParameterMask, RenderResultRenderer} from '@pucelle/lupos.js'
import {DOMEvents, Point, WebTransitionEasingName} from '@pucelle/ff'
import {GlobalDragDropRelationship} from './drag-drop-helpers/relationship'
import {registerDraggable} from './drag-drop-helpers/all-draggable'
import {droppable} from './droppable'


export interface DraggableOptions {
	
	/** 
	 * If `as-sibling` by default, will move droppable elements to give a space to
	 * indicate draggable element's position after dropping.
	 * Can't 
	 */
	readonly mode: 'reorder' | 'nest'

	/** `name` for draggable, can drop to droppable only when name match. */
	name: string

	/** 
	 * By default, dragging will be started if drag start from the element bounded.
	 * By specifying `filterSelector`, can limit from only the element match this selector.
	 */
	matchSelector?: string

	/** The class name to apply when start dragging. */
	draggingClassName?: string

	/** Which style value should be persisted, like width, height. */
	persistStyleProperties?: (string & keyof CSSStyleDeclaration)[]

	/** Transition duration when playing dragging movement, in milliseconds. */
	transitionDuration?: number

	/** Transition easing when playing dragging movement. */
	transitionEasing?: WebTransitionEasingName

	/** 
	 * Whether can slider only in x/y axis.
	 * If specifies as `true`, means can only swap with dragging element siblings.
	 */
	slideOnly?: boolean

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
	mode: 'reorder',
	slideOnly: false,
	canCauseScrolling: false,
}


/** 
 * Make current element draggable.
 * :draggable=${data, index, ?options}
 * - `data`: Data item to identify current dragging item.
 * - `index`: Data item index within it's siblings, required for `reorder` mode.
 * - `options` Draggable options.
 */
export class draggable<T = any> implements Binding, Part {

	readonly el: HTMLElement
	readonly context: any

	options: DraggableOptions = DefaultDraggableOptions

	/** Data can be passed to droppable. */
	data: T | null = null

	/** Data item index within it's siblings. */
	index: number = -1

	private connected: boolean = false
	private inHanding: boolean = false
	private inDragging: boolean = false
	private startPosition: Point | null = null

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

	update(data: T, index: number, options: Partial<DraggableOptions> = {}) {
		this.data = data
		this.index = index
		this.options = {...DefaultDraggableOptions, ...options}
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
		this.startPosition = DOMEvents.getClientPosition(e)
	
		DOMEvents.on(document, 'mousemove', this.onMouseMove, this)
		DOMEvents.on(document, 'mouseup', this.onMouseUp, this)
	}

	private onMouseMove(e: MouseEvent) {
		let currentPosition = DOMEvents.getClientPosition(e)
		let moves = currentPosition.diff(this.startPosition!)

		if (!this.inDragging && moves.getLength() > 5) {
			this.options.onStart?.call(this.context, e)

			// Prevent dragging this time.
			if (e.defaultPrevented) {
				this.endDragging()
			}
			else {
				GlobalDragDropRelationship.startDragging(this, e)
				this.startPosition = currentPosition
				this.inDragging = true
				moves.reset()	
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