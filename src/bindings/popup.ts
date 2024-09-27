import {Binding, TemplateResult, Template, html, render, RenderResult, RenderResultRenderer} from '@pucelle/lupos.js'
import {Aligner, AlignerPosition, AlignerOptions, EventFirer, TransitionResult, fade} from '@pucelle/ff'
import {Popup} from '../components'
import {SharedPopups} from './popup-helpers/shared-popups'
import {PopupState} from './popup-helpers/popup-state'
import {PopupTriggerBinder, TriggerType} from './popup-helpers/popup-trigger-binder'


export interface PopupOptions extends AlignerOptions {

	/** 
	 * If specified, all the `:popup` binding with same key will
	 * try to share and reuse one popup component.
	 * Even can't reuse, it also destroy old one immediately and create new one.
	 * 
	 * It's useful when there are many same-type popup contents existing.
	 */
	readonly key: string

	/** 
	 * By which interaction type trigger the popup.
	 * Can be one of `hover | click | focus | contextmenu | none`.
	 * You should not change it after `:popup` initialized.
	 * Note when use `focus` type trigger, you must ensure element can get focus.
	 */
	readonly trigger: TriggerType

	/** 
	 * Specifies which element to align to.
	 * It can be a selector for trigger element to select a descendant element,
	 * or a function to receive trigger element and return a descendant element.
	 * 
	 * If omit, use current element to align to.
	 */
	alignTo: string | ((trigger: Element) => Element)

	/** 
	 * How the popup content would align with the trigger element.
	 * Reference to `AlignerPosition` type for more details.
	 * Default value is `b`, means align to the bottom position of trigger element.
	 */
	alignPosition: AlignerPosition

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
	 * Whether caches the popup component after it hides,
	 * So later my reuse it when rendering same content.
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
	
	/** Fired after `opened` state of popup binding changed. */
	'opened-change'?: (opened: boolean) => void

	/** Fired before align popup content with trigger element. */
	'will-align'?: () => void
}


/** Default popup options. */
export const DefaultPopupOptions: Omit<PopupOptions, 'key' | 'alignTo'> = {
	gap: 4,
	canShrinkOnY: true,
	stickToEdges: true,
	fixTriangle: false,

	alignPosition: 'b',
	trigger: 'hover',
	showDelay: 100,
	hideDelay: 200,
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
export class popup extends EventFirer<PopupBindingEvents> implements Binding {

	readonly el: HTMLElement
	private readonly context: any
	
	private readonly state: PopupState
	private readonly binder: PopupTriggerBinder
	private options: Omit<PopupOptions, 'key' | 'alignTo'> = DefaultPopupOptions
	private renderer: RenderResultRenderer | null = null

	/** Used to watch rect change after popup opened. */
	private unwatchRect: (() => void) | null = null

	/** Current popup. */
	private popup: Popup | null = null

	/** Controls current popup. */
	private popupTemplate: Template | null = null

	/** Align to current popup. */
	private aligner: Aligner | null = null

	/** Cached popup for reusing when `cacheable` is `true`. */
	private cachedPopup: Popup | null = null

	/** Cached popup template for reusing when `cacheable` is `true`. */
	private cachedPopupTemplate: Template | null = null

	/** Whether have prevent hiding popup content. */
	private preventedHiding: boolean = false

	constructor(el: Element, context: any) {
		super()

		this.el = el as HTMLElement
		this.context = context
		this.binder = new PopupTriggerBinder(this.el)
		this.state = new PopupState()

		this.initEvents()
	}

	private initEvents() {
		this.binder.on('will-show', this.onWillShow, this)
		this.binder.on('will-hide', this.onWillHide, this)
		this.binder.on('cancel-show', this.onCancelShow, this)
		this.binder.on('immediate-hide', this.onImmediateHide, this)
		this.binder.on('toggle-show-hide', this.onToggleShowHide, this)

		this.state.on('do-show', this.doShowPopup, this)
		this.state.on('do-hide', this.doHidePopup, this)
	}

	/** Like mouse enter, and need to show soon. */
	private onWillShow() {
		this.showPopupLater()
	}

	/** Like mouse leave, and need to hide soon. */
	private onWillHide() {
		if (this.options.keepVisible) {
			this.preventedHiding = true
			return
		}

		this.hidePopupLater()
	}

	/** 
	 * Although we call it `cancel showing`,
	 * May still be in opened state right now.
	 */
	private onCancelShow() {
		if (this.state.opened) {
			this.hidePopup()
		}
		else {
			this.state.willNotShow()
		}
	}

	/** Like trigger element become out-view, and need to hide immediately. */
	private onImmediateHide() {
		if (this.options.keepVisible) {
			this.preventedHiding = true
			return
		}

		this.hidePopup()
	}

	/** Toggle opened state and show or hide popup component immediately. */
	private onToggleShowHide() {
		if (this.state.opened) {
			this.state.hide()
		}
		else {
			this.state.show()
		}
	}


	update(renderer: RenderResultRenderer, options: Partial<PopupOptions> = {}) {
		let firstTimeUpdate = this.options === DefaultPopupOptions

		this.renderer = renderer
		this.options = {...DefaultPopupOptions, ...options}

		// Bind events after known trigger way.
		if (firstTimeUpdate) {
			this.bindEventsForFirstTimeUpdate()
		}

		// If popup has popped-up, should also update it.
		if (this.state.opened && this.popup) {
			this.updatePopup()
		}

		// Options changed and no need to persist visible.
		if (this.preventedHiding && !this.options.keepVisible) {
			this.hidePopupLater()
		}
	}

	/** When first-time update, bind events and may show. */
	private bindEventsForFirstTimeUpdate() {
		this.binder.setTriggerType(this.options.trigger)
		this.binder.bindEnter()

		if (this.options.showImmediately) {
			this.showPopupLater()
		}
	}

	/** Show popup component after a short time out. */
	showPopupLater() {
		let showDelay = this.options.showDelay
		let key = this.options.key

		// If can reuse exist, show without delay.
		if (SharedPopups.isKeyInUse(key)) {
			showDelay = 0
		}

		// If give a delay for `click` type trigger, it will feel like a stuck or slow responsive.
		if (this.binder.trigger === 'click' || this.binder.trigger === 'focus') {
			showDelay = 0
		}

		let willShow = this.state.willShow(showDelay)
		if (willShow) {
			this.binder.bindLeaveBeforeShow()
		}
	}

	/** Show popup component, can be called repeatedly. */
	showPopup() {
		this.state.show()
	}

	/** Truly show popup when required. */
	private doShowPopup() {
		enqueueUpdatableInOrder(this, this.context, QueueUpdateOrder.Directive)
		this.fire('opened-change', true)
	}
	
	__updateImmediately() {
		if (!this.state.opened) {
			return
		}

		if (this.popup) {
			this.updatePopup()
		}
		else {
			this.renderPopup()
		}
	}

	/** Update popup component, calls when updating an outer component. */
	private updatePopup() {
		let result = this.renderer()
		let key = this.options.key
		let popup = this.popup!
		let template = this.popupTemplate!

		if (!(result instanceof TemplateResult)) {
			result = html`${result}`
		}

		if (template.canPatchBy(result)) {
			template.patch(result)
		}
		else {
			popup.el.remove()
			
			let template = this.popupTemplate = render(result, this.context)
			popup = getRenderedAsComponent(template) as Popup

			if (key) {
				SharedPopups.addCache(key, {popup, template})
			}
		}

		onRenderComplete(() => {
			if (this.popup) {
				this.alignPopup()
			}
		})
	}

	/** Render the popup component. */
	private renderPopup() {
		let isOldExist = this.ensurePopup()
		let popupEl = this.popup!.el

		popupEl.style.pointerEvents = this.options.pointerable ? '' : 'none'
		popupEl.style.visibility = 'hidden'
		
		this.binder.bindLeave(this.options.hideDelay, this.popup!.el)

		onRenderComplete(() => {
			this.afterPopupRendered(isOldExist)
		})
	}

	/** Align and play transition after popup rendered. */
	private afterPopupRendered(isOldExist: boolean) {
		// May do something in the handlers of `'opened-change'` event and make it closed.
		if (!this.state.opened || !this.popup) {
			return
		}

		// May align not successfully.
		let aligned = this.alignPopup()
		if (!aligned) {
			return
		}

		this.popup.el.style.visibility = ''
		this.mayGetFocus()

		// Plays transition.
		if (!isOldExist) {
			new Transition(this.popup.el, this.options.transition).enter()
		}

		// Watch it's rect changing.
		this.unwatchRect = watchLayout(this.el, 'rect', this.onTriggerRectChanged.bind(this))
	}

	/** After trigger element position changed. */
	private onTriggerRectChanged() {
		if (isVisibleInViewport(this.el, 0.1, this.popup!.el)) {
			if (this.popup) {
				this.alignPopup()
			}
		}
		else {
			this.hidePopupLater()
		}
	}

	/** 
	 * Get a cached popup component, or create a new one.
	 * Returns whether old popup in same key is existing.
	 */
	private ensurePopup(): boolean {

		// Here no need to watch the renderFn, it will be watched from the outer component.
		let result = this.renderer()

		let key = this.options.key
		let popup: Popup | null = null
		let template: Template | null = null
		let cache = key ? SharedPopups.findCache(key, this.el) : null

		// Make sure the render result is a template result.
		if (!(result instanceof TemplateResult)) {
			result = html`${result}`
		}

		// Uses cache.
		if (this.cachedPopup && this.cachedPopupTemplate) {
			popup = this.cachedPopup

			if (this.cachedPopupTemplate.canPatchByContextual(result, this.context)) {
				this.cachedPopupTemplate.patch(result)
				popup = this.cachedPopup
				template = this.cachedPopupTemplate
				this.cachedPopup = null
				this.cachedPopupTemplate = null
			}
		}

		// Uses shared cache by `key`.
		if (!popup && cache) {
			if (cache.template.canPatchByContextual(result, this.context)) {
				popup = cache.popup
				template = cache.template
				template.patch(result)
			}
		}
		
		// Create new popup.
		if (!popup || !template) {
			template = render(result, this.context)
			popup = getRenderedAsComponent(template) as Popup
		}

		// Cleans old popups, and cut it's relationship with other popup-binding.
		if (key && cache) {
			SharedPopups.cleanPopupControls(key, cache, popup, this)
		}

		// Add as cache.
		if (key) {
			SharedPopups.addCache(key, {popup, template})
			SharedPopups.setPopupUser(popup, this)
		}

		this.popup = popup
		this.popupTemplate = template

		popup.setBinding(this)
		popup.applyAppendTo()

		let isOldExist = !!cache?.popup
		return isOldExist
	}

	/** Align popup component, returns whether aligns it successfully. */
	private alignPopup(): boolean {
		let popup = this.popup!
		let alignToFn = this.options.alignTo
		let alignTo = alignToFn ? alignToFn(this.el) : this.el

		this.fire('will-align')

		// Create a aligner since align too much times for a tooltip.
		if (!this.aligner) {
			this.aligner = new Aligner(popup.el, alignTo, this.options.alignPosition, this.getAlignOptions())
		}

		let aligned = this.aligner.align()
		if (!aligned) {
			this.hidePopup()
			return false
		}

		return true
	}

	/** Get align options. */
	private getAlignOptions(): AlignerOptions {
		let triangle = this.popup!.refElements.triangle as HTMLElement

		return {
			margin: this.options.alignMargin,
			canShrinkOnY: this.options.canShrinkOnY,
			triangle,
			fixTriangle: this.options.fixTriangle,
			stickToEdges: this.options.stickToEdges,
		}
	}

	/** Make element of popup component get focus if possible. */
	private mayGetFocus() {
		let trigger = this.binder.trigger
		if (this.options.autoFocus && (trigger !== 'hover' && trigger !== 'focus') && this.popup && this.popup.el.tabIndex >= 0) {
			this.popup.el.focus()
		}
	}

	/** Hide popup component after a short time out. */
	hidePopupLater() {
		let hideDelay = this.options.hideDelay
		this.state.willHide(hideDelay)
	}

	/** Hide popup component, can be called repeatedly. */
	hidePopup() {
		this.state.hide()
	}

	/** Truly Hide popup when required. */
	private doHidePopup() {
		if (!this.popup) {
			return
		}

		let popup = this.popup!
		let popupEl = popup.el

		this.clean()

		new Transition(popupEl, this.options.transition).leave().then(finish => {
			if (finish) {
				popupEl.remove()
			}
		})

		this.fire('opened-change', false)
	}

	/** Returns whether the popup-binding can lose control of popup. */
	__canLoseControl() {
		return !this.keepingVisible
	}

	/** Rlease control with it's popup component after another popup-binding take it. */
	__losePopupControl() {
		this.clean()
	}

	/** Cleans all popup properties. */
	private clean() {
		let key = this.options.key
		let popup = this.popup
		let popupTemplate = this.popupTemplate

		if (key && popup) {
			SharedPopups.deleteCache(key, popup)
		}

		if (popup && popupTemplate && this.options.cacheable) {
			this.cachedPopup = popup
			this.cachedPopupTemplate = popupTemplate
		}

		this.binder.unbindLeave()

		if (this.unwatchRect) {
			this.unwatchRect()
			this.unwatchRect = null
		}

		this.state.clear()
		this.popup = null
		this.popupTemplate = null
		this.aligner = null
	}
	
	remove() {
		off(this.el, 'mouseenter', this.showPopupLater, this)

		if (this.state.opened) {
			this.hidePopup()
		}
		else {
			this.clean()
		}

		this.binder.unbindEnter()
	}
}