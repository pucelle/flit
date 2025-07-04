import {Binding, Part} from '@pucelle/lupos.js'
import {DraggableBase, DraggableOptions} from './draggable'


export interface OrderableOptions extends Omit<DraggableOptions, 'persistStyleProperties'> {
	
	/** 
	 * Whether can slider only in x/y axis.
	 * If specifies as `true`, means can only swap with dragging element siblings.
	 */
	slideOnly?: boolean
}

const DefaultOrderableOptions: OrderableOptions = {
	name: '',
	slideOnly: false,
	canCauseScrolling: false,
}


/** 
 * Make current element orderable.
 * :orderable=${data, index, ?options}
 * - `data`: Data item to identify current dragging item.
 * - `index`: Data item index within it's siblings.
 * - `options` Reorder options.
 */
export class orderable<T = any> extends DraggableBase<T> implements Binding, Part {

	readonly mode = 'reorder'

	options: OrderableOptions = DefaultOrderableOptions

	/** 
	 * Data item index within it's siblings.
	 * Must provide on `reorder` mode.
	 */
	index: number = -1

	update(data: T, index: number, options: Partial<DraggableOptions> = {}) {
		this.data = data
		this.index = index
		this.options = {...DefaultOrderableOptions, ...options}
	}
}