import {ScrollUtils} from '@pucelle/ff'
import {untilUpdateComplete} from '@pucelle/lupos'
import {Binding, Part} from '@pucelle/lupos.js'


/**
 * `:scrollPersist` helps to persist scroll position of bound element
 * after it disconnected, and restore it after gets re-connected.
 * 
 * If `direction` is not specified, will try detect itself.
 */
export class scrollPersist implements Binding, Part {

	private readonly el: HTMLMediaElement
	private position: number | null = null
	private direction: 'horizontal' | 'vertical' | 'none' | null = null

	constructor(el: Element) {
		this.el = el as HTMLMediaElement
	}

	afterConnectCallback() {
		if (this.direction === null) {
			untilUpdateComplete().then(this.readScrollDirection.bind(this))
		}
		else if (this.position !== null) {
			if (this.direction === 'horizontal') {
				this.el.scrollLeft = this.position
			}
			else if (this.direction === 'vertical') {
				this.el.scrollTop = this.position
			}
		}
	}

	private readScrollDirection() {
		this.direction = ScrollUtils.getCSSOverflowDirection(this.el) ?? 'none'
	}

	beforeDisconnectCallback(): Promise<void> | void {
		if (this.direction === 'horizontal') {
			this.position = this.el.scrollLeft
		}
		else if (this.direction === 'vertical') {
			this.position = this.el.scrollTop
		}
	}

	update(direction: 'horizontal' | 'vertical' | 'none' | null = null) {
		this.direction = direction
	}
}
