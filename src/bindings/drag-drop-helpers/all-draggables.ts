import {draggable} from '../draggable'


const AllDraggableMap: WeakMap<HTMLElement, draggable> = new WeakMap()


export function registerDraggable(draggable: draggable) {
	AllDraggableMap.set(draggable.el, draggable)
}


export function getDraggableByElement(el: HTMLElement) {
	return AllDraggableMap.get(el)
}