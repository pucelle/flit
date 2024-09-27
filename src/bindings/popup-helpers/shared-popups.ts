import {MouseLeave} from '@pucelle/ff'
import {clearTransition, Template} from '@pucelle/flit'
import type {Popup} from '../../components/popup'
import type {PopupBinding} from '../popup'


type SharedPopupCache = {template: Template, popup: Popup}


export namespace SharedPopups {

	/** 
	 * Cache shared popup components with their `key` option.
	 * The order of the cache list with the same key is very important.
	 */
	const PopupCache: Map<string, SharedPopupCache[]> = new Map()

	/** Cache shared popup components that in use, and used by which binding. */
	const PopupsUsedBy: Map<Popup, PopupBinding> = new Map()


	/** 
	 * Get a shared popup component by `key`,
	 * it must can be patched by `result`,
	 * and must not include `triggerEl`.
	 */
	export function findCache(key: string, triggerEl: Element): SharedPopupCache | null {
		let cache = findCacheByKey(key)
		if (!cache) {
			return null
		}

		let {popup} = cache

		// Popup sequence, can't close the old popup.
		let isTriggerInside = popup.el.contains(triggerEl)
		if (isTriggerInside) {
			return null
		}

		let existBinding = PopupsUsedBy.get(popup)
		if (existBinding && !existBinding.__canLoseControl()) {
			return null
		}

		return cache
	}

	/** Get a shared popup cache by key. */
	function findCacheByKey(key: string): SharedPopupCache | null {
		let caches = PopupCache.get(key)

		if (caches) {
			// We want to match template result here.
			// Then we found:
			// Popup1 -> Popup2.
			// Popup3 reuse Popup1.
			// Popup2 still appears and follows Popup3 for a little while, then disappear.
			// This is not what we want.

			for (let i = caches.length - 1; i >= 0; i--) {
				let cache = caches[i]
				let popup = cache.popup

				// If current popup is in use, not reuse it.
				if (!MouseLeave.checkLocked(popup.el)) {
					return cache
				}
			}
		}

		return null
	}

	/** Add a shared popup cache. */
	export function addCache(key: string, cache: SharedPopupCache) {
		let caches = PopupCache.get(key)
		if (!caches) {
			caches = []
			PopupCache.set(key, caches)
		}

		let alreadyIn = caches.find(c => c.popup === cache.popup)
		if (!alreadyIn) {
			caches.push(cache)
		}
	}

	/** Delete a shared popup component after the popup was hide. */
	export function deleteCache(key: string, popup: Popup) {
		let caches = PopupCache.get(key)
		if (caches) {
			caches = caches.filter(cache => cache.popup !== popup)
			PopupCache.set(key, caches)
		}

		PopupsUsedBy.delete(popup)
	}

	/** 
	 * If another popup-binding holds the popup, cut the relationship.
	 * Otherwise if cached popup can't reuse, just delete it.
	 */
	export function cleanPopupControls(key: string, cache: SharedPopupCache, popup: Popup, binding: PopupBinding) {
		let existPopup = cache.popup
		let existBinding = PopupsUsedBy.get(existPopup)

		// Reused by another popup-binding, release it.
		if (existBinding && existBinding !== binding) {
			existBinding.__losePopupControl()
		}

		// Made another popup because of can't share, delete the old one.
		if (existPopup === popup) {
			clearTransition(popup.el)
		}
		else {
			existPopup.el.remove()
			deleteCache(key, existPopup)
		}
	}

	/** Is cache with the specified key is being used by any binding. */
	export function isKeyInUse(key: string): boolean {
		let cache = findCacheByKey(key)
		let popup = cache?.popup

		return popup ? PopupsUsedBy.has(popup) : false
	}

	/** Set user for a popup. */
	export function setPopupUser(popup: Popup, binding: PopupBinding) {
		return PopupsUsedBy.set(popup, binding)
	}
}

