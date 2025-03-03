import {Binding, render, RenderResultRenderer, RenderedComponentLike, Part} from '@pucelle/lupos.js'
import {AnchorAligner, AnchorPosition, AnchorAlignerOptions, EventFirer, TransitionResult, fade, Transition, DOMEvents, sleep, IntersectionWatcher, untilUpdateComplete, promiseWithResolves} from '@pucelle/ff'
import {Popup} from '../components'
import * as SharedPopups from './popup-helpers/shared-popups'
import {PopupState} from './popup-helpers/popup-state'
import {PopupTriggerBinder, TriggerType} from './popup-helpers/popup-trigger-binder'
export {TriggerType}


/** Options for `:popup` */
export interface PopupOptions extends AnchorAlignerOptions {

	/** Whether popup content will be aligned to follow trigger events.
	 * Default value is `false`.
	 */
	followEvents: boolean

	/** 
	 * If specified, all the `:popup` binding with same key will
	 * try to share and reuse one popup content.
	 * Even can't reuse, it also destroy old one immediately and create new one.
	 * 
	 * If `key` provided, all same-keyed share popup content, `cacheable` will not work.
	 * 
	 * It's useful when there are many same-type popup contents existing,
	 * and you'd like only one of them exist to reduce disturb.
	 */
	key?: string

	/** 
	 * By which interaction type trigger the popup.
	 * Can be one of `hover | click | focus | contextmenu | none`.
	 * You should not change it after `:popup` initialized.
	 * Note when use `focus` type trigger, you must ensure element can get focus.
	 * Default value is `hover`.
	 */
	trigger: TriggerType

	/** 
	 * Specifies which element to align to.
	 * It can be a selector for trigger element to select a descendant element,
	 * or a function to receive trigger element and return a descendant element.
	 * 
	 * If omit, use current element to align to.
	 */
	alignTo?: string | ((trigger: Element) => Element)

	/** 
	 * Delay showing in milliseconds, such that mouse hover unexpected will not cause layer popup.
	 * Only for `hover` and `focus` trigger types.
	 * Default value is `100`.
	 */
	showDelay: number

	/** 
	 * Delay hiding in milliseconds, such that mouse hover from `el` to `layer` will not cause it flush.
	 * Default value is `100`.
	 */
	hideDelay: number

	/** 
	 * Transition options to play transition when popup hiding and showing.
	 * Default value is `fade()`.
	 */
	transition: TransitionResult

	/** 
	 * If specified as `true`, will show popup immediately.
	 * Only works when initializing.
	 * Default value is `false`.
	 */
	showImmediately: boolean

	/** 
	 * If specified as `true`, popup element will get focus after pop-up.
	 * Only work when popup element can get focus.
	 * Default value is `false`.
	 */
	autoFocus: boolean

	/** 
	 * Whether the popup element is pointable and can interact with mouse.
	 * If specifies as `false`, popup element will be applied `pointer-events: none`.
	 * Default value is `true`.
	 */
	pointable: boolean

	/** 
	 * Whether caches the popup content after it hides,
	 * So later my reuse it when rendering same content.
	 * Especially when the popup-content is expensive to render.
	 * 
	 * If `key` provided, all same-keyed share popup content, `cacheable` will not work.
	 * 
	 * Default value is `false`.
	 */
	cacheable: boolean

	/** 
	 * If specified as `true`, will keep the popup visible once popup opened,
	 * until this value becomes `false`, or hide popup manually.
	 * If `keepVisible` is true, it prevents `key` based popup sharing.
	 * Default value is `false`.
	 */
	keepVisible: boolean
}

interface PopupBindingEvents {
	
	/** Fire after `opened` state of popup binding changed. */
	'opened-change': (opened: boolean) => void

	/** Fire before align popup content with trigger element. */
	'will-align': (content: Popup) => void
}


/** Default popup options. */
export const DefaultPopupOptions: PopupOptions = {

	position: 'b',
	gaps: 0,
	edgeGaps: 0,
	stickToEdges: true,
	flipDirection: 'auto',
	fixedTriangle: false,

	followEvents: false, 
	trigger: 'hover',
	showDelay: 0,
	hideDelay: 0,
	transition: fade(),
	showImmediately: false,
	autoFocus: false,
	pointable: true,
	cacheable: false,
	keepVisible: false,
}


/**
 * A `:popup` binding can bind trigger element with it's popup content,
 * and make popup content get popped-up when interact with trigger element.
 * 
 * `:popup=${html`<Popup />`, ?{...}}`
 * `:popup=${() => html`<Popup />`, ?{...}}`
 * `:popup=${null}` can prevent popup.
 */
export class popup extends EventFirer<PopupBindingEvents> implements Binding, Part {

	readonly el: HTMLElement
	readonly context: any

	protected readonly state: PopupState
	protected readonly binder: PopupTriggerBinder

	protected transition: Transition | null = null
	protected options: PopupOptions = DefaultPopupOptions
	protected renderer: RenderResultRenderer | null = null
	protected updateComplete: Promise<boolean> | null = null

	/** Help to update popup content by newly rendered result. */
	protected rendered: RenderedComponentLike | null = null

	/** Current popup component. */
	protected popup: Popup | null = null

	/** Align to current popup. */
	protected aligner: AnchorAligner | null = null

	/** Whether have prevent hiding popup content. */
	protected preventedHiding: boolean = false

	constructor(el: Element, context: any) {
		super()

		this.el = el as HTMLElement
		this.context = context
		this.binder = new PopupTriggerBinder(this.el)
		this.state = new PopupState()

		this.initEvents()
	}

	/** Whether popup content is opened. */
	get opened() {
		return this.state.opened
	}

	afterConnectCallback() {
		this.binder.setTriggerType(this.options.trigger)
		this.binder.bindEnter()

		if (this.shouldShowImmediately()) {

			// If window is not loaded, page scroll position may not determined yet.
			// Sleep to avoid it affects browser paint.
			DOMEvents.untilWindowLoaded().then(async () => {
				await sleep(0)
				this.showPopupLater()
			})
		}
	}

    beforeDisconnectCallback() {
		if (this.opened && this.popup) {
			this.popup.remove()
		}

		IntersectionWatcher.watch(this.el, this.onElIntersectionChanged, this)
		this.state.clear()
		this.binder.unbindLeave()
		this.preventedHiding = false
	}

	/** Whether should show popup content immediately after connected. */
	protected shouldShowImmediately(): boolean {
		return this.options.showImmediately
	}

	/** Whether should keep popup content visible always. */
	protected shouldKeepVisible(): boolean {
		return this.options.keepVisible
	}

	protected initEvents() {
		this.binder.on('will-show', this.onWillShow, this)
		this.binder.on('will-hide', this.onWillHide, this)
		this.binder.on('cancel-show', this.onCancelShow, this)
		this.binder.on('immediate-hide', this.onImmediateHide, this)
		this.binder.on('toggle-show-hide', this.onToggleShowHide, this)

		this.state.on('do-show', this.doShowPopup, this)
		this.state.on('do-hide', this.doHidePopup, this)
	}

	/** Like mouse enter, and need to show soon. */
	protected onWillShow() {
		this.showPopupLater()
	}

	/** Like mouse leave, and need to hide soon. */
	protected onWillHide() {
		if (this.shouldKeepVisible()) {
			this.preventedHiding = true
			return
		}

		this.hidePopupLater()
	}

	/** 
	 * Although we call it `cancel showing`,
	 * May still be in opened state right now.
	 */
	protected onCancelShow() {
		if (this.opened) {
			this.hidePopup()
		}
		else {
			this.state.willNotShow()
		}
	}

	/** Like trigger element become out-view, and need to hide immediately. */
	protected onImmediateHide() {
		if (this.shouldKeepVisible()) {
			this.preventedHiding = true
			return
		}

		this.hidePopup()
	}

	/** Toggle opened state and show or hide popup content immediately. */
	protected onToggleShowHide() {
		if (this.opened) {
			this.state.hide()
		}
		else {
			this.state.show()
		}
	}

	/** Do show popup action. */
	protected async doShowPopup() {
		if (!this.renderer) {
			return
		}

		this.fire('opened-change', true)

		let inDOMBefore = await this.willUpdatePopupAndUntil()
		this.appendPopup(inDOMBefore)
		this.alignPopup()
		this.binder.bindLeave(this.options.hideDelay, this.popup!.el)
	}
	
	/** Do hide popup action. */
	protected async doHidePopup() {
		if (!this.renderer) {
			return
		}

		this.fire('opened-change', false)

		// Play leave transition if need.
		if (this.options.transition && this.transition) {
			await this.transition.leave(this.options.transition)
	
			if (this.opened) {
				return
			}
			
			this.popup?.remove()
		}

		IntersectionWatcher.unwatch(this.el)
		this.aligner?.stop()
		this.binder.unbindLeave()
		this.preventedHiding = false
	}


	/** Show popup content after a short time out. */
	showPopupLater() {
		let showDelay = this.options.showDelay
		let key = this.options.key

		// If can reuse exist, show without delay.
		if (key && SharedPopups.isCacheOpened(key)) {
			showDelay = 0
		}

		// If have delay for `click` type trigger, it will feel like a stuck or slow responsive.
		if (this.binder.trigger === 'click' || this.binder.trigger === 'focus') {
			showDelay = 0
		}

		let willShow = this.state.willShow(showDelay)
		if (willShow) {
			this.binder.bindLeaveBeforeShow()
		}
	}

	/** Send a request to show popup content, can be called repeatedly. */
	showPopup() {
		this.state.show()
	}

	/** Send a request to hide popup content after a short time out. */
	hidePopupLater() {
		let hideDelay = this.options.hideDelay
		this.state.willHide(hideDelay)
	}

	/** Send a request to hide popup content, can be called repeatedly. */
	hidePopup() {
		this.state.hide()
	}

	update(renderer: RenderResultRenderer | null, options: Partial<PopupOptions> = {}) {
		this.renderer = renderer
		this.options = {...DefaultPopupOptions, ...options} as PopupOptions

		// Options changes and no need to persist visible, or renderer becomes null.
		if (this.preventedHiding && !this.shouldKeepVisible() || this.opened && !renderer) {
			this.hidePopup()
		}
		
		// If popup has popped-up, should update it.
		else if (this.opened && renderer) {
			this.willUpdatePopupAndUntil()
		}
	}

	/** 
	 * Merge several update request, e.g., from enter event and renderer update.
	 * Returned promise to be resolved after updated, by whether reusing popup is in document before.
	 */
	protected async willUpdatePopupAndUntil(): Promise<boolean> {
		if (this.updateComplete) {
			return this.updateComplete
		}

		let {promise, resolve} = promiseWithResolves<boolean>()
		this.updateComplete = promise

		// Not wait for update complete,
		// or for outer context it will can't capture the time point
		// that current popup get update complete.
		await Promise.resolve()

		let inDOMBefore = await this.updatePopup()
		this.updateComplete = null
		resolve(inDOMBefore)

		return promise
	}

	/** 
	 * Update popup content, if haven't rendered, render it firstly.
	 * Returned promise to be resolved by whether reusing popup is in document before.
	 */
	protected async updatePopup(): Promise<boolean> {
		let inDOMBefore = await this.updatePopupRendering()

		// Update popup properties.
		this.popup!.triangleDirection = AnchorAligner.getAnchorFaceDirection(this.options.position).opposite.toInsetKey()!
		this.popup!.el.style.pointerEvents = this.options.pointable ? '' : 'none'

		return inDOMBefore
	}

	/** 
	 * Update rendered and popup property, and may use and add cache.
	 * Returned promise to be resolved by whether reusing popup is in document before.
	 */
	protected async updatePopupRendering(): Promise<boolean> {
		let rendered = this.rendered
		let popup = this.popup

		// Use cache.
		if (!rendered) {
			let cache = this.options.key ? SharedPopups.getCache(this.options.key) : null
			if (cache) {
				rendered = cache.rendered
				popup = cache.popup
			}
		}

		// Whether in document already, if yes, will not play enter transition.
		let inDOMAlready = !!popup && document.contains(popup.el)


		// Make rendered.
		if (!rendered) {
			rendered = render(this.renderer!, this.context)
			await rendered.connectManually()
		}

		// Reset renderer.
		else if (rendered.renderer !== this.renderer!) {
			rendered.renderer = this.renderer!
			await untilUpdateComplete()
		}

		this.rendered = rendered


		// Pick rendered popup.
		let firstElement = rendered!.el.firstElementChild!

		// May re-render popup component, or reuse old which have been moved out.
		popup = firstElement ? Popup.from(firstElement) : popup
		if (!popup) {
			throw new Error(`The "renderer" of ":popup(renderer)" must render a "<Popup>" type of component!`)
		}
		
		// Update popup property.
		if (popup !== this.popup) {
			this.popup = popup
			this.transition?.cancel()
			this.transition = new Transition(popup.el)

			if (this.options.key) {
				SharedPopups.setCache(this.options.key, {popup, rendered})
			}
			
			SharedPopups.setUser(popup, this)
		}

		return inDOMAlready
	}

	/** Append popup element into document. */
	protected appendPopup(inDOMBefore: boolean) {
		if (!this.opened) {
			return
		}

		// Although in document, need append too.
		// This can ensure it overleaps all other tooltips.
		this.popup!.appendTo(document.body)

		// Get focus if needed.
		this.mayGetFocus()

		// Play enter transition.
		if (!inDOMBefore && this.options.transition) {
			this.transition!.enter(this.options.transition)
		}

		// May playing leave transition.
		else {
			this.transition!.cancel()
		}
	}

	/** After trigger element position changed. */
	protected onElIntersectionChanged(entry: IntersectionObserverEntry) {
		if (entry.intersectionRatio === 0) {
			this.hidePopup()
		}
		else {
			this.alignPopup()
		}
	}

	/** Align popup content, returns whether align successfully. */
	protected alignPopup() {
		if (!this.opened) {
			return
		}

		this.fire('will-align', this.popup!)

		let anchor = this.getAlignAnchorElement()
	
		// Update aligner if required.
		if (!this.aligner || this.aligner.anchor !== anchor || this.aligner.target !== this.popup!.el) {
			this.aligner = new AnchorAligner(this.popup!.el, this.getAlignerOptions())
		}

		if (this.options.followEvents) {
			let event = this.binder.getLatestTriggerEvent()
			if (event) {
				this.aligner.alignToEvent(event)
			}
		}
		else {
			this.aligner.alignTo(anchor)
		}
}

	/** Get element popup will align to. */
	protected getAlignAnchorElement(): Element {
		if (!this.options.alignTo) {
			return this.el
		}
		else if (typeof this.options.alignTo === 'function') {
			return this.options.alignTo(this.el) ?? this.el
		}
		else {
			return this.el.querySelector(this.options.alignTo) ?? this.el
		}
	}

	/** Get options for Aligner. */
	protected getAlignerOptions(): AnchorAlignerOptions {
		let triangle = this.popup!.el.querySelector("[class*='triangle']") as HTMLElement | null

		return {
			position: this.options?.position as AnchorPosition,
			gaps: this.options?.gaps,
			edgeGaps: this.options?.edgeGaps,
			stickToEdges: this.options?.stickToEdges,
			flipDirection: this.options?.flipDirection,
			fixedTriangle: this.options?.fixedTriangle,
			triangle: triangle ?? undefined,
		}
	}

	/** Make element of popup content get focus if possible. */
	protected mayGetFocus() {
		let trigger = this.binder.trigger
		let popupEl = this.popup!.el

		if (this.options.autoFocus
			&& (trigger !== 'hover' && trigger !== 'focus')
			&& popupEl.tabIndex >= 0
		) {
			popupEl.focus()
		}
	}

	/** Returns whether the popup-content can be reused by key. */
	canContentReuse(): boolean {
		if (!this.options.key) {
			return false
		}
		
		if (this.shouldKeepVisible()) {
			return !this.opened
		}

		return true
	}

	/** Clears popup content, reset to initial state. */
	clearContent() {
		if (this.popup) {
			SharedPopups.clearUser(this.popup)
		}

		IntersectionWatcher.unwatch(this.el)
		this.binder.unbindLeave()
		this.state.clear()
		this.rendered = null
		this.popup = null
		this.transition?.cancel()
		this.transition = null
		this.aligner?.stop()
		this.aligner = null
		this.preventedHiding = false
	}
}