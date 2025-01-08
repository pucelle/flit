import {Binding, render, RenderResultRenderer, RenderedComponentLike, Part, PartCallbackParameterMask} from '@pucelle/lupos.js'
import {AnchorAligner, AnchorPosition, AlignerOptions, EventFirer, TransitionResult, fade, Transition, LayoutWatcher, DOMUtils, DOMEvents, sleep} from '@pucelle/ff'
import {Popup} from '../components'
import * as SharedPopups from './popup-helpers/shared-popups'
import {PopupState} from './popup-helpers/popup-state'
import {PopupTriggerBinder, TriggerType} from './popup-helpers/popup-trigger-binder'
export {TriggerType}


/** Options for `:popup` */
export interface PopupOptions extends AlignerOptions {

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

	/** Transition options to play transition when popup hiding and showing. */
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
	gap: 0,
	stickToEdges: true,
	canFlip: true,
	canShrinkOnY: true,
	fixTriangle: false,

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
 */
export class popup extends EventFirer<PopupBindingEvents> implements Binding, Part {

	readonly el: HTMLElement
	readonly context: any

	protected readonly state: PopupState
	protected readonly binder: PopupTriggerBinder

	protected transition: Transition | null = null
	protected options: PopupOptions = DefaultPopupOptions
	protected renderer: RenderResultRenderer = null as any

	/** Used to watch rect change after popup opened. */
	protected rectWatcher: LayoutWatcher<'rect'>

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
		this.rectWatcher = new LayoutWatcher(this.el, 'rect', this.onTriggerRectChanged, this)

		this.initEvents()
	}

	/** Whether popup content is opened. */
	get opened() {
		return this.state.opened
	}

	afterConnectCallback(_param: PartCallbackParameterMask | 0) {
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

    beforeDisconnectCallback(_param: PartCallbackParameterMask | 0) {
		if (this.state.opened && this.popup) {
			this.popup.remove()
		}

		this.state.clear()
		this.binder.unbindLeave()
		this.rectWatcher.unwatch()
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
		if (this.state.opened) {
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
		if (this.state.opened) {
			this.state.hide()
		}
		else {
			this.state.show()
		}
	}

	/** Do show popup action. */
	protected doShowPopup() {
		this.doingShowPopup()
		this.fire('opened-change', true)
	}
	
	/** Do hide popup action. */
	protected doHidePopup() {
		this.doingHidePopup()
		this.fire('opened-change', false)
	}


	/** Show popup content after a short time out. */
	showPopupLater() {
		if (!this.renderer) {
			return
		}

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
		if (!this.renderer) {
			return
		}

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


	update(renderer: RenderResultRenderer, options: Partial<PopupOptions> = {}) {
		this.renderer = renderer
		this.options = {...DefaultPopupOptions, ...options} as PopupOptions

		// If popup has popped-up, should also update it.
		if (this.state.opened) {
			this.updatePopup()
		}

		// Options changed and no need to persist visible.
		if (this.preventedHiding && !this.shouldKeepVisible()) {
			this.hidePopupLater()
		}
	}

	/** Show popup immediately, currently in opened. */
	protected async doingShowPopup() {
		this.updatePopup()

		let aligned = await this.alignPopup()
		if (aligned && this.popup) {
			this.binder.bindLeave(this.options.hideDelay, this.popup.el)
		}
	}

	/** Hide popup immediately, currently not in opened. */
	protected async doingHidePopup() {

		// Play leave transition if need.
		if (this.options.transition && this.transition) {
			let finish = await this.transition.leave(this.options.transition)
			if (finish) {
				this.popup?.remove()
			}
		
			if (this.state.opened) {
				return
			}
		}

		this.binder.unbindLeave()
		this.rectWatcher.unwatch()
		this.preventedHiding = false
	}

	/** Update popup content, if haven't rendered, render it firstly. */
	protected updatePopup() {
		this.updateRendering()

		// Update popup properties.
		this.popup!.triangleDirection = AnchorAligner.getAnchorFaceDirection(this.options.position).opposite.toBoxEdgeKey()!
		this.popup!.el.style.pointerEvents = this.options.pointable ? '' : 'none'

		/** Append popup element into document. */
		this.appendPopup()
	}

	/** Update rendered and popup property, and may use and add cache. */
	protected updateRendering() {
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

		// Make rendered.
		if (!rendered) {
			rendered = render(this.renderer!, this.context)
			rendered.connectManually()
		}

		// Reset renderer.
		else if (rendered.renderer !== this.renderer!) {
			rendered.renderer = this.renderer!
		}

		// Do alignment after rendered updated.
		if (rendered !== this.rendered) {
			rendered.on('updated', this.onRenderedUpdated, this)
			this.rendered = rendered
		}

		// Pick rendered popup.
		let firstElement = rendered!.el.firstElementChild!

		// May rendered didn't re-render popup after renderer updated.
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
	}

	/** After popup content get updated. */
	protected async onRenderedUpdated() {
		if (this.state.opened && this.popup) {
			this.alignPopup()
		}
	}

	/** Append popup element into document. */
	protected appendPopup() {
		let inDomAlready = document.contains(this.popup!.el)

		// Although in document, need append too.
		this.popup!.appendTo(document.body)

		// Get focus if needed.
		this.mayGetFocus()

		// Play enter transition.
		if (!inDomAlready && this.options.transition) {
			this.transition!.enter(this.options.transition)
		}

		// May playing leave transition.
		else {
			this.transition!.cancel()
		}

		// Watch it's rect changing.
		this.rectWatcher.watch()
	}

	/** After trigger element position changed. */
	protected onTriggerRectChanged() {

		if (this.options.stickToEdges && !DOMUtils.isRectIntersectWithViewport(this.el.getBoundingClientRect())) {
			this.hidePopup()
		}
		else {
			this.alignPopup()
		}
	}

	/** Align popup content, returns whether align successfully. */
	protected async alignPopup(): Promise<boolean> {
		if (!this.state.opened) {
			return false
		}

		this.fire('will-align', this.popup!)

		let anchor = this.getAlignAnchorElement()
		let aligned = false

		// Update aligner if required.
		if (!this.aligner || this.aligner.anchor !== anchor || this.aligner.content !== this.popup!.el) {
			this.aligner = new AnchorAligner(this.popup!.el, anchor)
		}

		if (this.options.followEvents) {
			let event = this.binder.getLatestTriggerEvent()
			if (event) {
				aligned = await this.aligner.alignToEvent(event, this.getAlignerOptions())
			}
		}
		else {
			aligned = await this.aligner.align(this.getAlignerOptions())
		}

		if (!aligned) {
			this.hidePopup()
		}

		return aligned
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
	protected getAlignerOptions(): AlignerOptions {
		let triangle = this.popup!.el.querySelector("[class*='triangle']") as HTMLElement | null

		return {
			position: this.options?.position as AnchorPosition,
			gap: this.options?.gap,
			stickToEdges: this.options?.stickToEdges,
			canFlip: this.options?.canFlip,
			canShrinkOnY: this.options?.canShrinkOnY,
			fixTriangle: this.options?.fixTriangle,
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
			return !this.state.opened
		}

		return true
	}

	/** Clears popup content, reset to initial state. */
	clearContent(forReuse: boolean = false) {
		if (!forReuse && this.state.opened && this.popup) {
			this.popup.remove()
		}

		if (this.popup) {
			SharedPopups.clearUser(this.popup)
		}

		this.binder.unbindLeave()
		this.state.clear()
		this.rectWatcher.unwatch()
		this.rendered?.off('updated', this.onRenderedUpdated, this)
		this.rendered = null
		this.popup = null
		this.transition?.cancel()
		this.transition = null
		this.aligner = null
		this.preventedHiding = false
	}
}