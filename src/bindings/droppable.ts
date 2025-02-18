import {DOMEvents} from '@pucelle/ff'
import {Binding, Part, PartCallbackParameterMask} from '@pucelle/lupos.js'
import {GlobalDragDropRelationship} from './drag-drop-helpers/relationship'
import {draggable} from './draggable'


export interface DroppableOptions<T> {

	/** `name` for droppable, can drop draggable to droppable only when name match. */
	name?: string

	/** Add this class name after mouse enter, and remove it after mouse leave. */
	enterClassName?: string

	/** 
	 * The align direction of child draggable elements.
	 * It indices in which direction an appended draggable element will align.
	 * It's default value is `vertical`.
	 */
	itemsAlignDirection?: HVDirection

	/** Get called after mouse enter into a droppable area. */
	onEnter?: (data: T, toIndex: number) => void

	/** Get called after mouse leave from a droppable area. */
	onLeave?: (data: T, toIndex: number) => void
}


/** 
 * Make current element droppable.
 * A `:droppable` element should normally contains several `:draggable`.
 * 
 * :draggable=${onDrop, options}
 * - onDrop: `(dropData, dragIndex) => void`
 * - options: droppable options.
 */
export class droppable<T = any> implements Binding, Part {
	
	readonly el: HTMLElement
	
	/** Allows only same-named draggable drop to current. */
	name: string = ''

	/** Get align direction of child draggable elements. */
	itemsAlignDirection: HVDirection | undefined

	private onDrop!: (data: T, toIndex: number) => void
	private options: DroppableOptions<T> = {}
	private connected: boolean = false

	constructor(el: Element) {
		this.el = el as HTMLElement
	}

	afterConnectCallback() {
		if (this.connected) {
			return
		}

		DOMEvents.on(this.el, 'mouseenter', this.onMouseEnter, this)
		
		// To avoid image dragging handled be HTML5 drag & drop
		this.el.setAttribute('draggable', 'false')

		this.connected = true
	}

	beforeDisconnectCallback(param: PartCallbackParameterMask | 0) {
		if ((param & PartCallbackParameterMask.MoveFromOwnStateChange) === 0) {
			return
		}

		DOMEvents.off(this.el, 'mouseenter', this.onMouseEnter, this)
		this.connected = false
	}

	update(ondrop: (data: T, toIndex: number) => void, options: DroppableOptions<T> = {}) {
		this.onDrop = ondrop

		this.name = options.name || ''
		this.itemsAlignDirection = options.itemsAlignDirection
		this.options = options
	}

	private onMouseEnter() {
		GlobalDragDropRelationship.enterDrop(this)
		DOMEvents.once(this.el, 'mouseleave', this.onMouseLeave as any, this)
	}

	/** After draggable enter current droppable. */
	fireEnter(dragging: draggable<T>) {
		if (this.options.enterClassName) {
			this.el.classList.add(this.options.enterClassName)
		}

		if (this.options.onEnter) {
			this.options.onEnter(dragging.data as T, dragging.index)
		}
	}

	private onMouseLeave() {
		GlobalDragDropRelationship.leaveDrop(this)
	}

	/** After draggable leave current droppable. */
	fireLeave(dragging: draggable<T>) {
		if (this.options.enterClassName) {
			this.el.classList.remove(this.options.enterClassName)
		}

		if (this.options.onLeave) {
			this.options.onLeave(dragging.data as T, dragging.index)
		}
	}

	/** After draggable drop to current droppable. */
	fireDrop(dragging: draggable<T>, toIndex: number) {
		if (this.onDrop) {
			this.onDrop(dragging.data as T, toIndex)
		}
	}
}
