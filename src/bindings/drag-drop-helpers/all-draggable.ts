import {DraggableBase} from '../draggable'


const AllDraggableMap: WeakMap<HTMLElement, DraggableBase> = /*#__PURE__*/new WeakMap()


export function registerDraggable(draggable: DraggableBase) {
	AllDraggableMap.set(draggable.el, draggable)
}


export function getDraggableByElement(el: HTMLElement) {
	return AllDraggableMap.get(el)
}