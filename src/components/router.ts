import {Component, RenderResult} from '@pucelle/lupos.js'
import {DOMEvents} from '@pucelle/lupos'
import {getPathMatcher} from './router-helpers/path-match'
import {PathMatcher} from './router-helpers/path-matcher'
import {Popup} from './popup'


export interface RouterEvents {

	/** After push or replace current state, note updating are not completed right now. */
	'change': (type: RouterChangeType, newState: RouterHistoryState, oldState: RouterHistoryState | null) => void
}

/** Current history state. */
export interface RouterHistoryState {

	/** An unique auto increment id. */
	index: number

	/** State path, normally starts with `/`. */
	path: string
}


/** Whether router has redirected or replaced. */
type RouterChangeType = 'redirect' | 'goto'


/** 
 * `<Router>` serves as the top-level container for all routable content,
 * rendering things based on the current path.
 *
 * ```ts
 *   this.route('/user:id', ({id}) => {
 *     return html`User Id: ${id}`
 *   })
 * ```
 */
export class Router<E = {}> extends Component<RouterEvents & E> {

	/** `Router.fromClosest` can locate original component when within popup content. */
	static fromClosest<C extends {new(...args: any): any}>(this: C, element: Element, searchDepth: number = 50): InstanceType<C> | null {
		let parent: Element | null = element
		let depth = 0

		while (parent) {
			let com = Component.from(parent) as Component

			if (com && com instanceof Router) {
				return com as InstanceType<C>
			}
			else if (com && com instanceof Popup) {
				parent = com.getTriggerElement()
			}
			else {
				parent = parent.parentElement
			}

			if (depth >= searchDepth) {
				break
			}
		}

		return null
	}


	/** 
	 * Current path, no matter normal path or popup path.
	 * If work as a sub router, it accepts rest path of outer router processed.
	 * If `path` is not get initialized, it will be initialized by pathname part of current uri.
	 */
	path: string = ''

	/** 
	 * If in hash mode, will apply hash instead of applying pathname.
	 * Use this if there is only a single page.
	 */
	hashMode: boolean = false

	/** Current history state. */
	protected state!: RouterHistoryState

	/** To indicate latest state index. */
	protected latestStateIndex: number = 0

	onConnected() {
		super.onConnected()

		if (!this.path) {
			if (this.hashMode) {
				this.path = location.hash.slice(1) || '/'
			}
			else {
				this.path = location.pathname || '/'
			}
		}

		this.state = {index: 0, path: this.path}
		this.replaceHistoryState(this.state)
		DOMEvents.on(window, 'popstate', this.onWindowPopState as (e: Event) => void, this)
	}

	onWillDisconnect() {
		super.onWillDisconnect()
		DOMEvents.off(window, 'popstate', this.onWindowPopState as (e: Event) => void, this)
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

		let newIndex = this.latestStateIndex = this.state.index + 1
		let state = {index: newIndex, path}
		this.handleGotoState(state)
	}

	protected handleGotoState(this: Router, state: RouterHistoryState) {
		let oldState = this.state

		this.path = state.path
		this.state = state
		this.pushHistoryState(state)

		this.onRouterChange('goto', this.state, oldState)
	}

	protected pushHistoryState(state: RouterHistoryState) {
		let uri = this.getHistoryURI(state.path)
		history.pushState(state, '', uri)
	}

	protected getHistoryURI(path: string) {
		let uri = path

		if (this.hashMode) {
			uri = location.pathname + location.search + '#' + path
		}

		return uri
	}

	/** Redirect to a new path and update render result, replace current history state. */
	redirectTo(path: string) {
		if (path === this.path) {
			return
		}

		let newIndex = this.latestStateIndex = this.state.index
		let state = {index: newIndex, path}

		this.handleRedirectToState(state)
	}

	protected handleRedirectToState(this: Router, state: RouterHistoryState) {
		let oldState = this.state

		this.path = state.path
		this.state = state
		this.replaceHistoryState(state)

		this.onRouterChange('redirect', this.state, oldState)
	}

	protected replaceHistoryState(state: RouterHistoryState) {
		let uri = this.getHistoryURI(state.path)
		history.replaceState(state, '', uri)
	}

	protected onRouterChange(this: Router, type: RouterChangeType, newState: RouterHistoryState, oldState: RouterHistoryState | null) {
		this.fire('change', type, newState, oldState)
	}

	/** `isRedirection` determines redirect or go to a path.  */
	navigateTo(path: string, isRedirection: boolean) {
		if (isRedirection) {
			this.redirectTo(path)
		}
		else {
			this.goto(path)
		}
	}

	/** 
	 * Use this to push a history state separately without affecting rendering.
	 * So later can navigate back to this path.
	 */
	pushHistoryOnly(path: string) {
		let newIndex = this.latestStateIndex = this.state.index + 1
		let state = {index: newIndex, path}
		this.pushHistoryState(state)
	}

	/** Check whether can go back. */
	canGoBack() {
		return this.state && this.state.index > 0
	}

	/** Check whether can go back. */
	canGoForward() {
		return this.state && this.state.index < this.latestStateIndex
	}

	/** Test whether current path match specified route path. */
	test(routePath: string | RegExp): boolean {
		let matcher = new PathMatcher(routePath)
		return matcher.test(this.path)
	}

	/** 
	 * Render content if route path match.
	 * `renderFn` receives:
	 *  - `{id: '12345'}` for router paths like `/user/:id`,
	 *  - `{0: '12345'}` for router regexps like `/\/user\/(\d+)/`,
	 *  - `{id: '12345'}` for router regexps like `/\/user\/(?<id>\d+)/`.
	 */
	route(path: string | RegExp, renderFn: (params: Record<string | number, string>) => RenderResult): RenderResult {
		let matcher =  getPathMatcher(path)
		let params = matcher.match(this.path)!

		return renderFn(params)
	}
}
