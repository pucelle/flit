import {defineBinding, Binding, on, getComponent, BindingResult} from '@pucelle/flit'
import {Popup} from '../components/popup'
import {Router} from '../components/router'


export interface GoToOptions {

	/** If `asPopupPath` is `true`, can update current path and also keep last rendering. */
	asPopupPath?: boolean

	/** Specifies router, if omit, will detect router in ancestor nodes. */
	router?: Router
}


/** 
 * A `:goto` binding will goto a target location path after clicking binded element.
 * 
 * `:goto="relativeURL"`
 * `:goto=${relativeURL}`
 */
export class GotoBinding implements Binding<string>{
	
	protected readonly el: HTMLElement
	protected router: Router | null = null
	protected value: string = ''
	protected asPopupPath: boolean = false

	constructor(el: Element) {
		this.el = el as HTMLElement
		on(this.el, 'click', this.onClick, this)
	}

	update(value: string, options: GoToOptions = {}) {
		this.value = value
		this.asPopupPath = options.asPopupPath ?? false
		this.router = options.router ?? null
	}

	protected onClick() {
		this.ensureRouter()
		this.router!.goto(this.value, this.asPopupPath)
	}

	protected ensureRouter() {
		if (!this.router) {
			this.router = getClosestRouter(this.el.parentElement!)
			if (!this.router) {
				throw new Error(`":goto" must be contained in a extended component of "Router"`)
			}
		}
	}

	remove() {}
}


/** 
 * A `goto` binding will goto a target location path after clicking binded element.
 * 
 * `goto(path)`
 * `goto(path, asPopupPath)`
 */
export const goTo = defineBinding('goto', GotoBinding) as (path: string, options?: GoToOptions) => BindingResult


export class RedirectToBinding extends GotoBinding{

	protected onClick() {
		this.ensureRouter()
		this.router!.redirectTo(this.value, this.asPopupPath)
	}
}

/** 
 * A `recirectTo` binding will redirect a target location path after clicking binded element.
 * 
 * `recirectTo(path)`
 * `recirectTo(path, asPopupPath)`
 */
export const recirectTo = defineBinding('redirectTo', GotoBinding) as (path: string, options?: GoToOptions) => BindingResult


/** Get closest router by walking ancestor element. */
export function getClosestRouter(el: Element): Router | null {
	let parent: Element | null = el

	while (parent && parent instanceof HTMLElement) {
		if (parent.localName.includes('-')) {
			let com = getComponent(parent)

			if (com instanceof Router) {
				return com
			}
			else if (com instanceof Popup) {
				parent = com.getTriggerElement()
			}
			else {
				parent = parent.parentElement
			}
		}
		else {
			parent = parent.parentElement
		}
	}

	return null
}
