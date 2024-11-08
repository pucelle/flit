import {Component, RenderResult} from '@pucelle/lupos.js'
import {computed, DOMEvents} from '@pucelle/ff'
import {getPathMatcher} from './router-helpers/path-match'
import {PathMatcher} from './router-helpers/path-matcher'


/** Options of each route. */
export interface RouteItem {

	/** 
	 * Path, can be a wild match string like `/user/:id`,
	 * or `*` to match some characters exclude `/`.
	 * Can also be a regexp.
	 */
	path: string | RegExp

	/** 
	 * If provided, will update `document.title` if associated route path match.
	 * For complex title, may choose to replace in route component.
	 */
	title?: string

	/** 
	 * Either be a template result 'html`...`',
	 * or a render function like '(params) => html`...`'.
	 * 
	 * If wanting to render sub routers, just render a sub `<Router>` here,
	 * passes `restPath` as it's path. Such as `/user/123/doc/456 `,
	 * after match `/user/:userId`, * rest path is `/doc/456`.
	 */
	render?: RenderResult | ((params: Record<string | number, string>, restPath: string) => RenderResult)

	/** If specified, and route path match, will redirect to this path. */
	redirect?: string
}

export interface RouterEvents {

	/** After push new state, note updating are not completed right now. */
	'push': (newState: RouterHistoryState, oldState: RouterHistoryState | null) => void

	/** After replace current state, note updating are not completed right now. */
	'replace': (newState: RouterHistoryState, oldState: RouterHistoryState | null) => void

	/** After push or replace current state, note updating are not completed right now. */
	'change': (newState: RouterHistoryState, oldState: RouterHistoryState | null) => void
}

/** Current history state. */
export interface RouterHistoryState {

	/** An unique auto increment id. */
	id: number

	/** State path, normally starts with `/`. */
	path: string
}


/** 
 * `<Router>` can be used as topmost container to contains everything that should be routed, 
 * it chooses to render depends on current path.
 * 
 * You will need initialize start path by `this.push(...)` or this.replace(...).
 * 
 * ```ts
 *   this.route('/user:id', ({id}) => {
 *     return html`User Id: ${id}`
 *   })
 * ```
 */
export class Router<E = {}> extends Component<RouterEvents & E> {

	/** 
	 * Current path, no matter normal path or popup path.
	 * If work as a sub router, it accepts rest path of outer router processed.
	 * If `path` is not get initialized, it will be initialized by pathname part of current uri.
	 */
	path: string = ''

	/** 
	 * Route match items.
	 * It's order is matters, will match each from front to end.
	 */
	routes: RouteItem[] = []

	/** Auto increment id. */
	protected incrementId: number = 0

	/** 
	 * Current history state.
	 * Readonly outside.
	 */
	protected state: RouterHistoryState | null = null

	/** All the route matchers. */
	@computed
	protected get matchers(): PathMatcher[] {
		return this.routes.map(route => {
			return getPathMatcher(route.path) 
		})
	}

	protected onConnected() {
		super.onConnected()

		if (!this.path) {
			this.path = location.pathname
		}

		let route = this.findRoute()
		if (route && route.redirect) {
			this.redirectTo(route.redirect)
		}

		DOMEvents.on(window, 'popstate', this.onWindowPopState as (e: Event) => void, this)
	}

	protected onWillDisconnect() {
		super.onWillDisconnect()
		DOMEvents.off(window, 'popstate', this.onWindowPopState as (e: Event) => void, this)
	}

	protected findRoute(): RouteItem | null {
		let index = this.findRouteIndex()
		if (index === -1) {
			return null
		} 

		return this.routes[index]
	}

	protected findRouteIndex(): number {
		return this.routes.findIndex((_r, index) => {
			let matcher = this.matchers[index]
			return matcher.test(this.path)
		})
	}

	protected render(): RenderResult {
		let index = this.findRouteIndex()
		let item = index === -1 ? null : this.routes[index]
		if (!item || !item.render) {
			return null
		}

		if (typeof item.render === 'function') {
			let matcher = this.matchers[index]
			let params = matcher.match(this.path)!

			return item.render(params, this.path.slice(params[0].length))
		}
		else {
			return item.render
		}
	}

	protected onWindowPopState(e: PopStateEvent) {
		if (!e.state) {
			return
		}

		this.handleRedirectToState(e.state)
	}

	/** Goto a new path and update render result, add a history state. */
	goto(this: Router, path: string) {
		if (path === this.path) {
			return
		}

		let state = {id: this.incrementId++, path}
		this.handleGotoState(state)
	}

	protected handleGotoState(this: Router, state: RouterHistoryState) {
		let oldState = this.state

		this.path = state.path
		this.state = state
		this.pushHistoryState(state)

		this.fire('push', this.state, oldState)
		this.fire('change', this.state, oldState)
	}

	protected pushHistoryState(state: RouterHistoryState) {
		let uri = state.path
		history.pushState(state, '', uri)
	}

	/** 
	 * Use this to push a history state separately without affecting rendering.
	 * So later can navigate back to this state.
	 */
	pushHistoryOnly(path: string) {
		let state = {id: this.incrementId++, path}
		this.pushHistoryState(state)
	}

	/** Redirect to a new path and update render result, replace current history state. */
	redirectTo(path: string) {
		if (path === this.path) {
			return
		}

		let state = {id: this.incrementId++, path}
		this.handleRedirectToState(state)
	}

	protected handleRedirectToState(this: Router, state: RouterHistoryState) {
		let oldState = this.state

		this.path = state.path
		this.state = state
		this.replaceHistoryState(state)

		this.fire('replace', state, oldState)
		this.fire('change', this.state, oldState)
	}

	protected replaceHistoryState(state: RouterHistoryState) {
		let uri = state.path
		history.replaceState(state, '', uri)
	}

	/** Test whether current path match specified route path. */
	test(routePath: string | RegExp): boolean {
		let matcher = new PathMatcher(routePath)
		return matcher.test(this.path)
	}
}
