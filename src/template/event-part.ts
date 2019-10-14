import {Part} from './types'
import {Component, getComponent, onComponentCreatedAt, Context} from '../component'
import {on} from '../libs/dom-event'


/**
 * `<div @click=${...}>` to register event on element.
 * `<com @event=${...}>` to register event on component.
 * `<com @@event=${...}>` to register event always on element.
 */
export class EventPart implements Part {

	private el: Element
	private name: string
	private handler!: (...args: any) => void
	private context: Context
	private isComEvent: boolean

	constructor(el: Element, name: string, handler: (...args: any) => void, context: Context) {
		this.el = el
		this.name = name[0] === '@' ? name.slice(1) : name
		this.context = context
		this.isComEvent = el.localName.includes('-') && name[0] !== '@'

		this.update(handler)
		this.bindListener()
	}

	update(handler: (...args: any) => void) {
		if (typeof handler !== 'function') {
			throw new Error(`Failed to register listener at "<${this.el.localName} @${this.name}='${handler}'">, listener is not a function`)
		}

		// Should here compare handler `toString` result and not update if they are the same?
		// This sames required, because it's frequently to meet handlers like `() => ...`.
		// But the truth is that we must update the handler,
		// because the scoped variables that called in these handlers may changed.
		this.handler = handler
	}

	private bindListener() {
		if (this.isComEvent) {
			let com = getComponent(this.el as HTMLElement)
			if (com) {
				this.bindComListener(com)
			}
			else {
				onComponentCreatedAt(this.el as HTMLElement, this.bindComListener.bind(this))
			}
		}
		else {
			on(this.el, this.name, this.triggerHandler, this)
		}
	}

	private bindComListener(com: Component) {
		com.on(this.name, this.triggerHandler, this)
	}

	private triggerHandler(...args: any[]) {
		this.handler.call(this.context, ...args)
	}

	// If element was removed, it implies that the component was removed too.
	// No need to off listener.
	remove() {}
}