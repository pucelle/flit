import {MouseLeaveControl} from '@pucelle/ff'
import {Popup} from '../../components'
import {popup} from '../popup'
import {RenderedComponentLike} from '@pucelle/lupos.js'


/** Cache item */
type SharedPopupContentCache = {rendered: RenderedComponentLike, popup: Popup}


/** 
 * Cache shared popup contents by their `:popup` `key` option.
 * If many different template share same key, may cause frequently toggling and destroying.
 */
const PopupContentCache: Map<string, SharedPopupContentCache> = new Map()

/** Cache shared popup contents that are using by popup binding. */
const PopupContentUsedBy: Map<Popup, popup> = new Map()


/** Get a shared popup cache by `key`, initialize it for reuse. */
export function getCache(key: string): SharedPopupContentCache | null {
	let cache = findCache(key)
	if (!cache) {
		return null
	}

	let binding = PopupContentUsedBy.get(cache.popup)
	if (binding) {
		binding.clearContent()
	}

	return cache
}


/** Find a shared popup cache by `key`. */
function findCache(key: string): SharedPopupContentCache | null {
	let cache = PopupContentCache.get(key)
	if (!cache) {
		return null
	}

	let {popup} = cache
	if (MouseLeaveControl.checkLocked(popup.el)) {
		return null
	}

	let binding = PopupContentUsedBy.get(popup)
	if (binding) {
		if (binding.canContentReuse()) {
			return cache
		}
		else {
			return null
		}
	}

	return cache
}


/** Check whether the represented popup from cache with the specified key is opened. */
export function isCacheOpened(key: string): boolean {
	let cache = findCache(key)
	if (!cache) {
		return false
	}

	let binding = PopupContentUsedBy.get(cache.popup)
	if (!binding) {
		return false
	}

	return binding.opened
}


/** Add a shared popup cache. */
export function setCache(key: string, cache: SharedPopupContentCache) {
	PopupContentCache.set(key, cache)
}


/** Set a <Popup> is using by a popup binding. */
export function setUser(popup: Popup, binding: popup) {
	PopupContentUsedBy.set(popup, binding)
}


/** Get the popup binding which uses a <Popup>. */
export function getUser(popup: Popup) {
	return PopupContentUsedBy.get(popup)
}


/** Clear <Popup> usage. */
export function clearUser(popup: Popup) {
	PopupContentUsedBy.delete(popup)
}


