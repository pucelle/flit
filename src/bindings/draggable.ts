import {Binding, Part, PartCallbackParameterMask, RenderResultRenderer} from '@pucelle/lupos.js'
import {DOMEvents, WebTransitionEasingName} from '@pucelle/ff'
import {GlobalDragDropRelationship} from './drag-drop-helpers/relationship'
import {registerDraggable} from './drag-drop-helpers/all-draggable'
import {droppable} from './droppable'


export interface DraggableOptions {
	
	/** 
	 * If `as-sibling` by default, will move droppable elements to give a space to
	 * indicate draggable element's position after dropping.
	 */
	mode: 'reorder' | 'nest'

	/** `name` for draggable, can drop to droppable only when name match. */
	name: string

	/** The class name to apply when start dragging. */
	draggingClassName?: string

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

	options: DraggableOptions = DefaultDraggableOptions

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

	update(data: T, index: number, options: DraggableOptions) {
		this.data = data
		this.index = index
		this.options = {...DefaultDraggableOptions, ...options}
	}

	private onMouseDown(e: MouseEvent) {
		e.preventDefault()

		let isDragging = false
		let startPosition = DOMEvents.getClientPosition(e)
	
		let onMouseMove = (e: MouseEvent) => {
			let currentPosition = DOMEvents.getClientPosition(e)
			let moves = currentPosition.diff(startPosition)

			if (!isDragging && moves.getLength() > 5) {
				GlobalDragDropRelationship.startDragging(this, e)
				startPosition = currentPosition
				moves.reset()
				isDragging = true

				if (this.options.draggingClassName) {
					this.el.classList.add(this.options.draggingClassName)
				}
			}
			
			if (isDragging) {
				GlobalDragDropRelationship.translateDraggingElement(moves, e)
			}
		}

		let onMouseUp = async () => {
			DOMEvents.off(document, 'mousemove', onMouseMove as (e: Event) => void)

			if (isDragging) {
				let activeDroppable = GlobalDragDropRelationship.activeDroppable
				GlobalDragDropRelationship.endDragging()

				if (this.options.draggingClassName) {
					this.el.classList.remove(this.options.draggingClassName)
				}

				this.options.onEnd?.(activeDroppable)
			}
		}

		DOMEvents.on(document, 'mousemove', onMouseMove as (e: Event) => void)
		DOMEvents.once(document, 'mouseup', onMouseUp)
	}

	private onMouseEnter() {
		GlobalDragDropRelationship.enterDrag(this)
	}
}