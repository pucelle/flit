import {DOMEvents} from '@pucelle/ff'
import {Binding, Part, PartCallbackParameterMask} from '@pucelle/lupos.js'
import {GlobalDragDropRelationship} from './drag-drop-helpers/relationship'
import {draggable} from './draggable'


export interface DroppableOptions<T> {

	/** `name` for droppable, can drop draggable to droppable only when name match. */
	name: string | string[]

	/** Whether can drop files on. */
	readonly fileDroppable: boolean

	/** Drop effect for file dropping. */
	readonly fileDropEffect: 'none' | 'copy' | 'link' | 'move'

	/** Add this class name after mouse enter, and remove it after mouse leave. */
	readonly enterClassName?: string

	/** 
	 * The align direction of child draggable elements.
	 * It indices in which direction an appended draggable element will align.
	 * It's default value is `vertical`.
	 */
	itemsAlignDirection?: HVDirection

	/** 
	 * Get called after mouse enter into a droppable area.
	 * If `fileDroppable`, will accept `DataTransfer` as drop data.
	 */
	onEnter?: (data: T, toIndex: number) => void

	/** 
	 * Get called after mouse leave from a droppable area.
	 * If `fileDroppable`, will accept `DataTransfer` as drop data.
	 */
	onLeave?: (data: T, toIndex: number) => void
}


const DefaultDroppableOptions: DroppableOptions<any> = {
	name: '',
	fileDroppable: false,
	fileDropEffect: 'copy',
}


/** 
 * Make current element droppable.
 * A `:droppable` element should normally contains several `:draggable`.
 * 
 * :droppable=${onDrop, ?options}
 * - onDrop: `(dropData, dragIndex) => void`, if `fileDroppable`, will accept `DataTransfer` as drop data.
 * - options: droppable options.
 */
export class droppable<T = any> implements Binding, Part {
	
	readonly el: HTMLElement
	readonly context: any

	options: DroppableOptions<T> = DefaultDroppableOptions

	private dropCallback!: (data: T, toIndex: number) => void
	private connected: boolean = false

	constructor(el: Element, context: any) {
		this.el = el as HTMLElement
		this.context = context
	}

	afterConnectCallback() {
		if (this.connected) {
			return
		}

		DOMEvents.on(this.el, 'mouseenter', this.onMouseEnter, this)

		if (this.options.fileDroppable) {
			DOMEvents.on(this.el, 'dragover', this.onDragOver, this)
			DOMEvents.on(this.el, 'dragenter', this.onDragEnter, this)
			DOMEvents.on(this.el, 'drop', this.onDrop, this)
		}

		this.connected = true
	}

	beforeDisconnectCallback(param: PartCallbackParameterMask | 0) {
		if ((param & PartCallbackParameterMask.MoveFromOwnStateChange) === 0) {
			return
		}

		DOMEvents.off(this.el, 'mouseenter', this.onMouseEnter, this)

		if (this.options.fileDroppable) {
			DOMEvents.off(this.el, 'dragover', this.onDragOver, this)
			DOMEvents.off(this.el, 'dragenter', this.onDragEnter, this)
			DOMEvents.off(this.el, 'drop', this.onDrop, this)
		}

		this.connected = false
	}

	update(ondrop: (data: T, toIndex: number) => void, options: Partial<DroppableOptions<T>> = {}) {
		this.dropCallback = ondrop
		this.options = {...DefaultDroppableOptions, ...options}
	}

	private onMouseEnter() {
		GlobalDragDropRelationship.enterDrop(this)
		DOMEvents.once(this.el, 'mouseleave', this.onMouseLeave, this)
	}

	private onDragEnter(e: DragEvent) {
		if (!this.isFileItemExisting(e)) {
			return
		}

		if (this.options.enterClassName) {
			this.el.classList.add(this.options.enterClassName)
		}

		if (this.options.onEnter) {
			this.options.onEnter(e.dataTransfer as T, 0)
		}

		DOMEvents.once(this.el, 'dragleave', this.onDragLeave, this)
	}

	private isFileItemExisting(e: DragEvent): boolean {
		if (!e.dataTransfer?.items) {
			return false
		}
		
		for (let item of e.dataTransfer.items) {
			if (item.kind === 'file') {
				return true
			}
		}

		return false
	}

	private onDragOver(e: DragEvent) {

		// Allow files drop here.
		if (this.isFileItemExisting(e)) {
			e.preventDefault()
			e.dataTransfer!.dropEffect = this.options.fileDropEffect
		}
	}

	private onDragLeave(e: DragEvent) {
		if (this.options.enterClassName) {
			this.el.classList.remove(this.options.enterClassName)
		}

		if (this.options.onLeave) {
			this.options.onLeave(e.dataTransfer as T, 0)
		}
	}

	private onDrop(e: DragEvent) {

		// Prevent file from being opened.
		e.preventDefault()

		this.dropCallback.call(this.context, e.dataTransfer as T, 0)
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

	/** 
	 * After draggable drop to current droppable.
	 * `insertIndex` indicates at which index should insert into on 'reorder' mode.
	 */
	fireDrop(dragging: draggable<T>, insertIndex: number) {
		this.dropCallback.call(this.context, dragging.data as T, insertIndex)
	}
}
