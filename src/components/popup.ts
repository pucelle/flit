import {css, Component, html, RenderResult, fade} from '@pucelle/lupos.js'
import {SharedPopups} from '../bindings'
import {Triangle} from './triangle'


/** 
 * `<Popup>` represents the container of popup content.
 * `<Popup>` should be contained by a `<lu:portal>` when rendering.
 */
export class Popup<E = {}> extends Component<E> {

	static style = css`
		.popup{

			/* Recently, until chrome 133, fixed layout with anchor positioning is not work when page can scroll. */
			position: absolute;

			left: 0;
			top: 0;
			background: var(--popup-background-color);
			border-radius: var(--popup-border-radius);

			/** Avoid become narrower after alignment when touches page edges. */
			width: max-content;

			max-width: 100vw;
			max-height: 100vh;

			/* 
			Same with window type components, so if inside of a window,
			we must move it behind the window.
			*/
			z-index: 1000;

			/* 3px drop shadow nearly equals 6px of box-shadow. */
			filter: drop-shadow(0 0 calc(var(--popup-shadow-blur-radius) / 2) var(--popup-shadow-color));
		}
	`


	/** Whether shows triangle element. */
	triangle: boolean = true

	/** The direction triangle acute angle point to. */
	triangleDirection: 'top' | 'bottom' | 'left' | 'right' = 'top'

	/** 
	 * Get the trigger element, which cause current popup pop-up.
	 * Only exist after current popup get popped-up.
	 */
	getTriggerElement(): HTMLElement | null {
		let binding = SharedPopups.getPopupUser(this)
		if (binding) {
			return binding.el
		}
		else {
			return null
		}
	}

	protected render(): RenderResult {
		return html`
			<template class="popup" tabindex="0"
				:transition.immediate=${fade()}
			>
				<lu:if ${this.triangle}>
					<Triangle .direction=${this.triangleDirection} />
				</lu:if>
				<slot />
			</template>
		`
	}

	/** Close current popup. */
	close() {
		let binding = SharedPopups.getPopupUser(this)
		if (binding) {
			binding.hidePopup()
		}
	}
}
