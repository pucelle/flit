import {ListMap, MouseLeaveControl} from '@pucelle/ff'
import {Popup} from '../../components'
import {popup} from '../popup'
import {RenderedComponentLike} from '@pucelle/lupos.js'


/** 
 * Cache shared popup rendered by their `:popup` `key` option.
 * If many different template share same key, may cause frequently toggling and destroying.
 */
const PopupContentCache: ListMap<string, RenderedComponentLike> = new ListMap()

/** Cache shared popup rendered that are using by popup binding. */
const PopupUsedBy: WeakMap<Popup, popup> = new WeakMap()


/** Get a shared popup cache by `key`, initialize it for reuse. */
export function getCache(key: string): RenderedComponentLike | null {
	let cache = findCache(key)
	if (!cache) {
		return null
	}

	let popup = cache.getAs(Popup)
	if (!popup) {
		return cache
	}

	let binding = PopupUsedBy.get(popup)
	if (binding) {
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

	let popup = cache.getAs(Popup)
	if (!popup) {
		return
	}

	let binding = PopupUsedBy.get(popup)
	if (binding && binding !== fromBinding) {
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
		let popup = cache.getAs(Popup)
		if (!popup) {
			others = others ?? cache
			continue
		}

		if (MouseLeaveControl.checkLocked(popup.el)) {
			continue
		}

		let binding = PopupUsedBy.get(popup)
		if (binding && !binding.canPopupReuse()) {
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

	let popup = cache.getAs(Popup)
	if (!popup) {
		return false
	}

	let binding = PopupUsedBy.get(popup)
	if (!binding) {
		return false
	}

	return binding.opened
}


/** Add a shared popup cache. */
export function addCache(key: string, cache: RenderedComponentLike) {
	PopupContentCache.add(key, cache)
}


/** Set a <Popup> is using by a popup binding. */
export function setUser(popup: Popup, binding: popup) {
	PopupUsedBy.set(popup, binding)
}


/** Get the popup binding which uses a <Popup>. */
export function getUser(popup: Popup): popup | undefined {
	return PopupUsedBy.get(popup)
}


/** Clear a <Popup> usage. */
export function clearUser(popup: Popup) {
	PopupUsedBy.delete(popup)
}


