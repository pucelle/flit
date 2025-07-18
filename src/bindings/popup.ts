import {Binding, render, RenderResultRenderer, RenderedComponentLike, Part} from '@pucelle/lupos.js'
import {AnchorAligner, AnchorPosition, AnchorAlignerOptions, IntersectionWatcher, MouseLeaveControl} from '@pucelle/ff'
import {Popup} from '../components'
import * as SharedPopups from './popup-helpers/shared-popups'
import {PopupState} from './popup-helpers/popup-state'
import {PopupTriggerBinder, TriggerType} from './popup-helpers/popup-binder'
import {promiseWithResolves, untilUpdateComplete} from '@pucelle/lupos'
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
	 * 
	 * Note if this value is too small, and popup element has no transition set,
	 * will cause click event on popup descendant element not fired.
	 */
	hideDelay: number

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
	 * If `keepVisible` is true, it prevents `key` based popup sharing,
	 * and prevents `stickToEdges`.
	 * Default value is `false`.
	 */
	keepVisible: boolean

	/** If specified, only when element match this selector then trigger contextmenu action. */
	matchSelector?: string

	/** Fire after `opened` state of popup binding changed. */
	onOpenedChange?: (opened: boolean) => void

	/** Fire before align popup content with trigger element. */
	onWillAlign?: (content: Popup) => void
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
	hideDelay: 100,
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
 * `:popup=${null}` or `:popup=${() => null}` can prevent popup.
 */
export class popup implements Binding, Part {

	readonly el: HTMLElement
	readonly context: any

	protected readonly state: PopupState
	protected readonly binder: PopupTriggerBinder

	protected options: PopupOptions = DefaultPopupOptions
	protected renderer: RenderResultRenderer | null = null
	protected updateComplete: Promise<void> | null = null
	protected persistVisible: boolean = false

	/** Help to update popup content by newly rendered result. */
	protected rendered: RenderedComponentLike | null = null

	/** Current popup component. */
	protected popup: Popup | null = null

	/** Align to current popup. */
	protected aligner: AnchorAligner | null = null

	constructor(el: Element, context: any) {
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
		this.binder.setMatchSelector(this.options.matchSelector)
		this.binder.bindEnter()

		if (this.shouldShowImmediately()) {
			this.showPopupLater()
		}
	}

    beforeDisconnectCallback() {
		if (this.opened) {
			this.hidePopup()
		}
	}

	/** Whether should show popup content immediately after connected. */
	protected shouldShowImmediately(): boolean {
		if (!this.renderer) {
			return false
		}

		return this.options.showImmediately
	}

	/** Whether should keep popup content visible always. */
	protected shouldKeepVisible(): boolean {
		if (!this.renderer) {
			return false
		}

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

	/** Do show popup action. */
	protected async doShowPopup() {
		if (!this.renderer) {
			return
		}

		this.options.onOpenedChange?.(true)

		// Must lock before requesting to find cache in update process.
		MouseLeaveControl.lock(this.el)
		
		await this.createPopupAndUntilUpdated()
		
		if (this.opened) {
			this.appendPopup()
			this.alignPopup()
			this.binder.bindLeave(this.options.hideDelay, this.popup!.el)
		}
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

	/** 
	 * Do hide popup action.
	 * If `forReuse`, will leave element in document.
	 */
	protected doHidePopup() {
		this.options.onOpenedChange?.(false)
		this.aligner?.stop()
		this.binder.unbindLeave()

		IntersectionWatcher.unwatch(this.el)
		MouseLeaveControl.unlock(this.el)

		// Only remove popup is not enough.
		// Rendered content to be referenced as a slot content by popup,
		// it's as part of `rendered`, not `popup`.
		this.popup?.remove(true)
		this.rendered?.remove()
	}

	update(renderer: RenderResultRenderer | null, options: Partial<PopupOptions> = {}) {
		this.renderer = renderer
		this.options = {...DefaultPopupOptions, ...options} as PopupOptions

		// If should show immediately and haven't shown.
		if (!this.opened && this.shouldKeepVisible()) {
			this.persistVisible = true

			// Not `showPopup` here, to prevent it affect first frame rendering.
			this.showPopupLater()
		}

		// Options changes and no need to persist visible, or renderer becomes null.
		else if (this.opened && this.persistVisible && !this.shouldKeepVisible()) {
			this.persistVisible = false
			this.hidePopup()
		}
		
		// If popup has popped-up, should update it.
		else if (this.opened && renderer) {
			this.updatePopupAndUntil()
		}
	}

	/** Merge several update request, e.g., from enter event and renderer update. */
	protected async updatePopupAndUntil() {
		if (this.updateComplete) {
			return this.updateComplete
		}

		let {promise, resolve} = promiseWithResolves()
		this.updateComplete = promise

		// Not wait for update complete,
		// or for outer context it will can't capture the time point
		// that current popup get update complete.
		await Promise.resolve()

		await this.updatePopup()
		this.updateComplete = null
		resolve()
	}

	/** Update popup content, if haven't rendered, render it firstly. */
	protected async updatePopup() {
		let rendered = this.rendered!

		// Reset renderer.
		rendered.renderer = this.renderer
		rendered.context = this.context

		// Connect rendered without appending it to document.
		await rendered.connectManually()

		// Wait for child Popup component get initialized.
		await untilUpdateComplete()

		// Immediately hide.
		if (!this.opened) {
			return
		}

		let popup = rendered.getAs(Popup)

		// Has nothing rendered, close immediately.
		if (!popup) {
			this.hidePopup()
			return
		}

		// Update popup property and related transition.
		if (popup !== this.popup) {
			this.popup = popup
			SharedPopups.setPopupUser(popup, this)
		}

		// Update popup properties.
		if (this.opened) {
			popup.triangleDirection = AnchorAligner.getAnchorFaceDirection(this.options.position).opposite.toInsetKey()!
			popup.el.style.pointerEvents = this.options.pointable ? '' : 'none'
		}
	}

	/** 
	 * Create rendered and popup property, and wait for it update complete.
	 * Returned promise to be resolved by whether reusing popup is in document before.
	 */
	protected async createPopupAndUntilUpdated() {
		let rendered = this.rendered

		// Find cache, even if current rendered and popup existing, still needs to clear existing cache.
		if (!rendered) {
			let cache = this.options.key ? SharedPopups.getCache(this.options.key) : null
			if (cache) {
				rendered = cache
			}
			else {
				rendered = render(this.renderer, this.context)

				if (this.options.key) {
					SharedPopups.addCache(this.options.key, rendered)
				}
			}

			this.rendered = rendered
			SharedPopups.setCacheUser(rendered, this)
		}

		// Same key cache exists, clear it.
		else if (this.options.key) {
			SharedPopups.clearCache(this.options.key, this)
		}

		// Wait until update complete
		await this.updatePopupAndUntil()
	}

	/** Append popup element into document. */
	protected appendPopup() {
		if (!this.opened) {
			return
		}

		// Although in document, need append too.
		// This can ensure it re-connect,
		// but transition will stop playing.
		let alreadyInDOM = document.body.contains(this.popup!.el)
		let playTransition = !alreadyInDOM
		this.popup!.appendTo(document.body, playTransition)

		// Get focus if needed.
		this.mayGetFocus()
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

		this.options.onWillAlign?.(this.popup!)

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
		let keepVisible = this.shouldKeepVisible()

		return {
			position: this.options?.position as AnchorPosition,
			gaps: this.options?.gaps,
			edgeGaps: this.options?.edgeGaps,
			stickToEdges: this.options?.stickToEdges && !keepVisible,
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
	canPopupReuse(): boolean {
		if (!this.options.key) {
			return false
		}
		
		if (this.shouldKeepVisible()) {
			return !this.opened
		}

		return true
	}

	/** Clears popup content, reset to initial state. */
	clearPopup() {
		if (this.opened) {
			this.hidePopup()
		}

		if (this.popup) {
			SharedPopups.clearPopupUser(this.popup)
		}

		this.rendered = null
		this.popup = null
		this.aligner = null
	}
}