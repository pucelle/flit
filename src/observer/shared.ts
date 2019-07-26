import {observePlainObjectTarget} from './observe-object'
import {observeArrayTarget} from './observe-array'
import {observeMapOrSetTarget} from './observe-set-or-map'


/** Normal object or array, whose changing will trigger Updatable to update. */
export type Dependency = object

/** Component instance, whose property changing will trigger Updatable to update. */
export type Com = {[key: string]: unknown} & Dependency

/** Component instance, whose property changing will trigger Updatable to update. */
export interface Updatable {
	update(): void
}


/** `target -> proxy` and `proxy -> proxy` */
export const proxyMap: WeakMap<object, object> = new WeakMap()

/** `proxy -> target` */
export const targetMap: WeakMap<object, object> = new WeakMap()

const originalToString = Object.prototype.toString


/** Finding getter descriptor from object. */
// export function getPropertyDescriptor (obj: object, prop: PropertyKey): PropertyDescriptor | null {
// 	let proto = Object.getPrototypeOf(obj)

// 	while (proto && proto !== Object.prototype) {
// 		let descriptor = Object.getOwnPropertyDescriptor(proto, prop)
// 		if (descriptor) {
// 			return descriptor
// 		}
// 		else {
// 			proto = Object.getPrototypeOf(proto)
// 		}
// 	}

// 	return null
// }


/**
 * Begin to follow obj and it's property value changings when updating.
 * If returns a proxy, it can be used like original object, but it's not it.
 * So it may cause data can't been changed if you cached the original object.
 * Normally you don't need to call this. Object will be observed automatically after used on rendering.
 * Once observed, it can't be revoked.
 * You should only call it when you know the object will be observed later,
 * and you need to pass it to another context, and got changes in the new context.
 */
export function observe<T>(value: T): T {
	if (value && typeof value === 'object') {
		let proxy = proxyMap.get(value as unknown as object)
		if (proxy) {
			return proxy as unknown as T
		}

		return observeTarget(value as unknown as object) as unknown as T
	}
	else {
		return value
	}
}


export function observeTarget<T extends object>(obj: T): T {
	let str = originalToString.call(obj)

	if (str === '[object Array]') {
		return observeArrayTarget(obj as unknown[]) as T
	}
	
	if (str === '[object Object]') {
		return observePlainObjectTarget(obj) as T
	}

	if (str === '[object Set]' || str === '[object Map]') {
		return observeMapOrSetTarget(obj as any) as T
	}

	return obj
}