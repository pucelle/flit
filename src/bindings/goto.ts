import {Binding, Component} from '@pucelle/lupos.js'
import {Popup} from '../components/popup'
import {DOMEvents} from '@pucelle/ff'
import {Router} from '../components'


/** 
 * A `:goto` binding will goto target location path using router after clicking bound element.
 * Note update parameter `path` is path for closest router, may be path of sub router.
 * 
 * `:goto="closestRouterPath"`
 * `:goto=${closestRouterPath}`
 */
export class goto implements Binding {
	
	protected readonly el: HTMLElement
	protected path: string = ''
	protected asPopupPath: boolean = false

	constructor(el: Element) {
		this.el = el as HTMLElement
		DOMEvents.on(this.el, 'click', this.onClick, this)
	}

	update(path: string) {
		this.path = path
	}

	protected onClick() {
		this.findRouter()?.goto(this.path)
	}
	
	protected findRouter() {
		let router = findClosestRouter(this.el.parentElement!)
		if (!router) {
			console.error(`":goto" must be contained in "<Router>"!`)
		}

		return router
	}
}


/** 
 * A `:redirectTo` binding will redirect to target location path using router after clicking bound element.
 * Note update parameter `path` is path for closest router, may be path of sub router.
 * 
 * `:redirectTo="closestRouterPath"`
 * `:redirectTo=${closestRouterPath}`
 */
export class redirectTo extends goto{

	protected onClick() {
		this.findRouter()?.redirectTo(this.path)
	}
}


/** Get closest router by walking ancestor element. */
export function findClosestRouter(el: Element): Router | null {
	let parent: Element | null = el

	while (parent) {
		let com = Component.from(parent) as Component

		if (com && com instanceof Router) {
			return com
		}
		else if (com && com instanceof Popup) {
			parent = com.getTriggerElement()
		}
		else {
			parent = parent.parentElement
		}
	}

	return null
}
