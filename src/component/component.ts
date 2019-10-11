import {Emitter} from '../libs/emitter'
import {NodePart, TemplateResult} from '../parts'
import {enqueueComponentUpdate} from '../queue'
import {startUpdating, endUpdating, observeComTarget, clearDependencies, clearAsDependency, restoreAsDependency, targetMap} from '../observer'
import {WatcherGroup} from '../watcher'
import {getScopedClassNameSet} from '../style'
import {NodeAnchorType, NodeAnchor} from '../libs/node-helper'
import {DirectiveResult} from '../directives'
import {getClosestComponent} from '../element'
import {ComponentConstructor, ComponentStyle} from './define'
import {setComponentAtElement} from './from-element'
import {emitComponentCreatedCallbacks, onComponentConnected, onComponentDisconnected} from './life-cycle'
import {SlotProcesser} from './slot'

/** Context may be `null` when using `render` or `renderAndUpdate` */
export type Context = Component | null

export interface ComponentEvents {
	// Normally no need to register `created` event, you may just get component and do something.
	// The only usage of it is to handle something after all sequential `onCreated` called.
	created: () => void
	
	ready: () => void

	/** After data updated, and will reander in next tick. */
	updated: () => void

	// After data rendered, you can visit element layouts now.
	// We dropped the support of it because it equals running `onRenderComplete` or `renderComplete` in `updated`.
	// rendered: () => void

	/** After element been inserted into body, include the first time. */
	connected: () => void

	/** After element been removed from body, include the first time. */
	disconnected: () => void
}


export abstract class Component<Events = any> extends Emitter<Events & ComponentEvents> {

	/**
	 * The static `style` property contains style text used as styles for current component.
	 * Styles in it will be partialy scoped, so we have benefits of scoped styles,
	 * and also avoid the problems in sharing styles.
	 * 
	 * symbol `$` in class name will be replaced to current component name:
	 * `.$title` -> `.title__com-name`
	 * 
	 * tag selector will be nested in com-name selector:
	 * `p` -> `com-name p`
	 */
	static style: ComponentStyle | null = null

	/**
	 * Used to assign very important and unchanged properties,
	 * Can be camel cased or dash cased, but assin in HTML element must be dash caces.
	 * So I would suggest use it for one-word properties.
	 */
	static properties: string[] | null = null

	/** The root element of component. */
	el: HTMLElement

	/**
	 * The reference map object of element inside.
	 * You can specify `:ref="refName"` on an element,
	 * or using `:ref=${this.onRef}` to call `this.onRef(refElement)` every time when the reference element updated.
	 */

	// Should be `Element` type, but in 99% scenarios it's HTMLElement.
	refs: {[key: string]: HTMLElement} = {}
	slots: {[key: string]: HTMLElement[]} = {}

	private __slotProcesser: SlotProcesser | null = null
	private __rootPart: NodePart | null = null
	private __updated: boolean = false
	private __watcherGroup: WatcherGroup | null = null
	private __connected: boolean = true

	constructor(el: HTMLElement) {
		super()
		this.el = el
		return observeComTarget(this as any)
	}

	__emitCreated() {
		setComponentAtElement(this.el, this)
		emitComponentCreatedCallbacks(this.el, this)
		this.onCreated()
		this.emit('created')

		if (this.el.childNodes.length > 0) {
			this.__slotProcesser = new SlotProcesser(this)
		}

		// A typescript issue here if we want to infer emitter arguments:
		// We accept an `Events` and union it with type `ComponentEvents`,
		// the returned type for `rendered` property will become `Events['rendered'] & () => void`,
		// `Parmaters<...>` of it will return the arguments of `Events['rendered']`.
		// So here show the issue that passed arguments `[]` can't be assigned to it.

		// This can't be fixed right now since we can't implement a type function like `interface overwritting`
		// But finally this was resolved by a newly defined type `ExtendEvents` in `emitter.ts`.
		
		// this.emit('created')
	}

	__emitConnected() {
		// Not do following things when firstly connected.
		if (!this.__connected) {
			// Must restore before updating, because the restored result may be changed when updating.
			restoreAsDependency(targetMap.get(this)!)

			if (this.__watcherGroup) {
				this.__watcherGroup.connect()
			}

			this.__connected = true
		}

		// Why using `update` but not `__updateImmediately`?
		// After component created, it may delete element belongs to other components in `onCreated`
		// Then in following micro task, the deleted components's `__connected` becomes false,
		// and they will not been updated finally as expected.
		this.update()
		this.onConnected()
		this.emit('connected')
		onComponentConnected(this)
	}

	__emitDisconnected() {
		clearDependencies(this)

		// We generated `updatable proxy -> dependency target` maps in dependency module,
		// So here need to pass component target but not proxy to clear dependencies.
		clearAsDependency(targetMap.get(this)!)

		if (this.__watcherGroup) {
			this.__watcherGroup.disconnect()
		}

		this.__connected = false
		this.onDisconnected()
		this.emit('disconnected')
		onComponentDisconnected(this)
	}

	__updateImmediately() {
		if (!this.__connected) {
			return
		}

		startUpdating(this)
		let result = this.render()
		endUpdating(this)

		if (this.__rootPart) {
			this.__rootPart.update(result)
		}
		else if (result !== null) {
			if (this.__slotProcesser) {
				this.__slotProcesser.initRestSlotRange()
			}

			this.__rootPart = new NodePart(new NodeAnchor(this.el, NodeAnchorType.Root), result, this)
		}

		if (this.__slotProcesser) {
			this.__slotProcesser.mayFillSlots()
		}

		let isFirstlyUpdate = !this.__updated
		if (isFirstlyUpdate) {
			this.onReady()
			this.emit('ready')
			this.__updated = true
		}
		
		this.onUpdated()
		this.emit('updated')
	}

	/** Force to update all watchers binded to current context. */
	__updateWatcherGroup() {
		if (this.__watcherGroup) {
			this.__watcherGroup.update()
		}
	}

	/** May be called in rendering, so we can avoid checking slot elements when no slot rendered. */
	__foundSlotsWhenRendering() {
		if (this.__slotProcesser) {
			this.__slotProcesser.needToFillSlotsLater()
		}
	}

	/** 
	 * Child class should implement this method, normally returns html`...` or string.
	 * You can choose to not overwrite `render()` to keep it returns `null` when you don't want to render any child nodes.
	 */
	protected render(): TemplateResult | string | DirectiveResult | null {
		return null
	}

	/**
	 * Call this to partially or fully update asynchronously if needed.
	 * You should not overwrite this method until you know what you are doing.
	 */
	update() {
		enqueueComponentUpdate(this)
	}

	/**
	 * Get closest ancestor component which instanceof `Com`.
	 * It's very common that you extend a component and define a new custom element,
	 * So you will can't find the parent component from the tag name. 
	 */
	closest<C extends ComponentConstructor>(Com: C): InstanceType<C> | null {
		return getClosestComponent(this.el, Com)
	}

	/**
	 * Called when component instance was just created and all properties assigned.
	 * Original child nodes are prepared, but slots are not prepared right now.
	 * You may changed some data or visit parent nodes or `this.el` and operate them here.
	 */
	protected onCreated() {}

	/**
	 * Called after all the data updated for the first time.
	 * Child nodes are rendered, slots are prepared, but child components are not.
	 * Will keep updating other components, so please don't check computed styles on elements.
	 * You may visit child nodes or bind events here.
	 */
	protected onReady() {}

	/** 
	 * Called after all the data updated.
	 * Will keep updating other components, so please don't check computed style on elements.
	 */
	protected onUpdated() {}

	/** 
	 * Called after all the data updated and elements have rendered.
	 * You can visit elemenet layout properties now.
	 */
	protected onRendered() {}

	/** 
	 * Called when root element was inserted into document.
	 * This will be called for each time you insert the element into document.
	 * If you need to register global listeners like `resize` when element in document, restore them here.
	 */
	protected onConnected() {}

	/**
	 * Called when root element removed from document.
	 * This will be called for each time you removed the element into document.
	 * If you registered global listeners like `resize`, don't forget to unregister them here.
	 */
	protected onDisconnected() {}

	/** 
	 * Watch return value of function and trigger callback with this value as argument after it changed.
	 * Will set callback scope as this.
	 */
	watch<T>(fn: () => T, callback: (value: T) => void): () => void {
		this.__watcherGroup = this.__watcherGroup || new WatcherGroup()
		return this.__watcherGroup!.watch(fn, callback.bind(this))
	}

	/** 
	 * Watch return value of function and trigger callback with this value as argument later and after it changed.
	 * Will set callback scope as this.
	 */
	watchImmediately<T>(fn: () => T, callback: (value: T) => void): () => void {
		this.__watcherGroup = this.__watcherGroup || new WatcherGroup()
		return this.__watcherGroup!.watchImmediately(fn, callback.bind(this))
	}

	/** 
	 * Watch return value of function and trigger callback with this value as argument. Trigger callback for only once.
	 * Will set callback scope as this.
	 */
	watchOnce<T>(fn: () => T, callback: (value: T) => void): () => void {
		this.__watcherGroup = this.__watcherGroup || new WatcherGroup()
		return this.__watcherGroup!.watchOnce(fn, callback.bind(this))
	}

	/** 
	 * Watch return value of function and trigger callback with this value as argument. Trigger callback for only once.
	 * Will set callback scope as this.
	 */
	watchUntil<T>(fn: () => T, callback: () => void): () => void {
		this.__watcherGroup = this.__watcherGroup || new WatcherGroup()
		return this.__watcherGroup!.watchUntil(fn, callback.bind(this))
	}

	/** returns scoped class name E `.name -> .name__com-name` */
	scopeClassName(className: string): string {
		let startsWithDot = className[0] === '.'
		let classNameWithoutDot = startsWithDot ? className.slice(1) : className
		let scopedClassNameSet = getScopedClassNameSet(this.el.localName)

		if (scopedClassNameSet && scopedClassNameSet.has(classNameWithoutDot)) {
			return className + '__' + this.el.localName
		}
		else {
			return className
		}
	}
}