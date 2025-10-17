import {ListMap, MouseEventDelivery} from '@pucelle/ff'
import {RenderedComponentLike} from '@pucelle/lupos.js'
import {Popup} from '../../components'
import {popup} from '../popup'


/** 
 * Cache shared popup rendered by their `:popup` `key` option.
 * If many different template share same key, may cause frequently toggling and destroying.
 */
const PopupContentCache: ListMap<string, RenderedComponentLike> = /*#__PURE__*/new ListMap()

/** Cache shared rendered that are using by popup binding. */
const RenderedUsedBy: WeakMap<RenderedComponentLike, popup> = /*#__PURE__*/new WeakMap()

/** Cache popups that are using by popup binding. */
const PopupUsedBy: WeakMap<Popup, popup> = /*#__PURE__*/new WeakMap()


/** Get a shared popup cache by `key`, initialize it for reuse. */
export function getCache(key: string): RenderedComponentLike | null {
	let cache = findCache(key)
	if (!cache) {
		return null
	}

	let binding = RenderedUsedBy.get(cache)
	if (binding) {
		clearCacheUser(cache)
		binding.clearPopup()
	}

	return cache
}


/** Clear a shared popup cache by `key`, if it use by a different popup binding. */
export function clearCache(key: string, fromBinding: popup) {
	let cache = findCache(key)
	if (!cache) {
		return
	}

	let binding = RenderedUsedBy.get(cache)
	if (binding && binding !== fromBinding) {
		clearCacheUser(cache)
		binding.clearPopup()
		return true
	}

	return false
}


/** Find a shared popup cache by `key`. */
function findCache(key: string): RenderedComponentLike | null {
	let caches = PopupContentCache.get(key)
	if (!caches) {
		return null
	}

	let opened: RenderedComponentLike | null = null
	let others: RenderedComponentLike | null = null

	for (let cache of caches) {

		// Are using and can't reuse.
		let binding = RenderedUsedBy.get(cache)
		if (binding && !binding.canPopupReuse()) {
			continue
		}

		let popup = cache.getAs(Popup)
		if (!popup) {
			continue
		}

		if (MouseEventDelivery.hasAnyDeliveredTo(popup.el)) {
			continue
		}

		if (binding && binding.opened) {
			opened = cache
			break
		}
		else {
			others = cache
		}
	}

	return opened ?? others
}


/** Check whether the represented popup from cache with the specified key is opened. */
export function isCacheOpened(key: string): boolean {
	let cache = findCache(key)
	if (!cache) {
		return false
	}

	let binding = RenderedUsedBy.get(cache)
	if (!binding) {
		return false
	}

	return binding.opened
}


/** Add a shared popup cache. */
export function addCache(key: string, cache: RenderedComponentLike) {
	PopupContentCache.add(key, cache)
}


/** Set a rendered is using by a popup binding. */
export function setCacheUser(cache: RenderedComponentLike, binding: popup) {
	RenderedUsedBy.set(cache, binding)
}

/** Get the popup binding which uses a rendered. */
export function getCacheUser(cache: RenderedComponentLike): popup | undefined {
	return RenderedUsedBy.get(cache)
}

/** Clear a rendered usage. */
export function clearCacheUser(cache: RenderedComponentLike) {
	RenderedUsedBy.delete(cache)
}


/** Set a <Popup> is using by a popup binding. */
export function setPopupUser(popup: Popup, binding: popup) {
	PopupUsedBy.set(popup, binding)
}

/** Get the popup binding which uses a <Popup>. */
export function getPopupUser(popup: Popup): popup | undefined {
	return PopupUsedBy.get(popup)
}

/** Clear a <Popup> usage. */
export function clearPopupUser(popup: Popup) {
	PopupUsedBy.delete(popup)
}


