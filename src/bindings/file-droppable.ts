import {DOMEvents} from '@pucelle/ff'
import {Binding, Part, PartCallbackParameterMask} from '@pucelle/lupos.js'


export interface FileDroppableOptions {

	/** Add this class name after mouse enter, and remove it after mouse leave. */
	enterClassName?: string

	/** Get called after mouse enter into a droppable area. */
	onEnter?: (data: DataTransfer | null) => void

	/** Get called after mouse leave from a droppable area. */
	onLeave?: (data: DataTransfer | null) => void
}


/** 
 * Make can drop files on current element.
 * A `:fileDroppable` element should normally contains several `:draggable`.
 * 
 * :fileDroppable=${onDrop, ?options}
 * - onDrop: `(dropData, dragIndex) => void`
 * - options: file droppable options.
 */
export class fileDroppable implements Binding, Part {
	
	readonly el: HTMLElement
	readonly context: any

	options: FileDroppableOptions = {}

	private dropCallback!: (data: DataTransfer | null) => void
	private connected: boolean = false

	constructor(el: Element, context: any) {
		this.el = el as HTMLElement
		this.context = context
	}

	afterConnectCallback() {
		if (this.connected) {
			return
		}

		DOMEvents.on(this.el, 'dragover', this.onDragOver, this)
		DOMEvents.on(this.el, 'dragenter', this.onDragEnter, this)
		DOMEvents.on(this.el, 'drop', this.onDrop, this)
		this.connected = true
	}

	beforeDisconnectCallback(param: PartCallbackParameterMask | 0) {
		if ((param & PartCallbackParameterMask.MoveFromOwnStateChange) === 0) {
			return
		}

		DOMEvents.off(this.el, 'dragenter', this.onDragEnter, this)
		this.connected = false
	}

	update(dropCallback: (data: DataTransfer | null) => void, options: FileDroppableOptions) {
		this.dropCallback = dropCallback
		this.options = {...options}
	}

	private onDragOver(e: DragEvent) {

		// Allow files dragged in.
		e.preventDefault()
	}

	private onDragEnter(e: DragEvent) {
		if (this.options.enterClassName) {
			this.el.classList.add(this.options.enterClassName)
		}

		if (this.options.onEnter) {
			this.options.onEnter(e.dataTransfer)
		}

		DOMEvents.once(this.el, 'dragleave', this.onDragLeave, this)
	}

	private onDragLeave(e: DragEvent) {
		if (this.options.enterClassName) {
			this.el.classList.remove(this.options.enterClassName)
		}

		if (this.options.onLeave) {
			this.options.onLeave(e.dataTransfer)
		}
	}

	private onDrop(e: DragEvent) {

		// Prevent file from being opened.
		e.preventDefault()

		this.dropCallback.call(this.context, e.dataTransfer)
	}
}
