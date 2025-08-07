import {Binding} from '@pucelle/lupos.js'
import {DOMEvents} from '@pucelle/lupos'
import {Router} from '../components'


/** 
 * A `:goto` binding will goto target location path using router after clicking bound element.
 * Note update parameter `path` is path for closest router, may be path of sub router.
 * 
 * `:goto="routerPath"`
 * `:goto=${routerPath}`
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
		let router = Router.fromClosest(this.el.parentElement!)
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

