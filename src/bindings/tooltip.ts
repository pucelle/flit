import {getMainAlignDirection, ensureWindowLoaded, AlignOptions, isVisibleInViewport} from '@pucelle/ff'
import {html, defineBinding, BindingResult, TemplateResult, UpdatableOptions} from '@pucelle/flit'
import {popup, PopupOptions} from './popup'
import {TooltipType} from '../components3/tooltip'


export interface TooltipOptions extends PopupOptions{

	/** Tooltip type, `default | prompt | error`. */
	readonly type?: TooltipType
}


const defaultTooltipOptions: TooltipOptions = {
	alignPosition: 'r',
	alignMargin: 3,
	showDelay: 0,
	hideDelay: 200,
	triangle: true,
	fixTriangle: false,
	type: 'default',
	pointerable: false,
}


/**
 * A `:tooltip` binding can help to show a short text message beside it's trigger element.
 * 
 * `:tooltip="message"`
 * `:tooltip=${message}`
 */
export class tooltip extends popup {

	protected title: string | TemplateResult = ''
	protected readonly options!: UpdatableOptions<TooltipOptions>

	update(title: string | TemplateResult | any, options: TooltipOptions = {}) {
		this.title = title
		super.update(this.getRenderFn.bind(this) as any, this.getPopupOptions(options))
	}

	protected getRenderFn() {
		return html`
			<f-tooltip
				.herizontal=${this.isHerizontal()}
				.type=${this.getOption<any>('type')}
			>
				${this.title}
			</f-tooltip>
		`
	}

	protected getPopupOptions(options: TooltipOptions = {}): TooltipOptions {
		return {
			...defaultTooltipOptions,
			key: 'tooltip',
			...options,
		}
	}

	protected isHerizontal(): boolean {
		let direction = getMainAlignDirection(this.options.get('alignPosition'))
		return direction === 'l' || direction === 'r'
	}

	showPopupLater() {
		// Not popup if no `title` specified.
		if (!this.title) {
			return
		}
		
		super.showPopupLater()
	}

	protected bindEnterEvents() {
		if (this.shouldKeepVisible()) {
			// If not wait window loaded, page scrolling position may be not determinated yet.
			// So element may be aligned to a wrong position.
			ensureWindowLoaded().then(() => {
				this.showPopupLater()
			})
		}
		else {
			super.bindEnterEvents()
		}
	}
	
	protected shouldKeepVisible(): boolean {
		return super.shouldKeepVisible()
			|| ['prompt', 'error'].includes(this.getOption<any>('type'))
	}

	/** After trigger element position changed. */
	protected onTriggerRectChanged() {
		if (this.shouldKeepVisible() || isVisibleInViewport(this.el, 0.1, this.popup!.el)) {
			if (this.popup) {
				this.alignPopup()
			}
		}
		else {
			this.hidePopupLater()
		}
	}

	protected getAlignOptions(): AlignOptions {
		let triangle = this.popup!.refElements.triangle as HTMLElement

		return {
			margin: this.getOption('alignMargin'),
			stickToEdges: false,
			canShrinkInY: true,
			triangle,
			fixTriangle: this.getOption('fixTriangle'), 
		}
	}
}
