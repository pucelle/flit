import {css, html, Component, RenderResult, fade} from '@pucelle/lupos.js'
import {AnchorAligner} from '@pucelle/ff'
import {DOMEvents} from '@pucelle/lupos'
import {Icon} from './icon'
import {IconClose} from '../icons'


/** 
 * `<Modal>` displays blocking-level content and help to
 * complete a child task on a popup modal.
 * 
 * `:slot="action"` - single action button or action buttons container.
 */
export class Modal<E = {}> extends Component<E> {

	static override style = css`
		.modal{
			position: fixed;
			display: flex;
			flex-direction: column;
			z-index: 1000;	/* Same with popup. */
			border-radius: var(--popup-border-radius);
			box-shadow: 0 0 var(--popup-shadow-blur-radius) var(--popup-shadow-color);
			background: var(--popup-background-color);
			max-width: 100%;
			max-height: 100%;
			padding: 0.6em 1.2em;
			overflow: hidden;
		}

		.modal-mask{
			position: fixed;
			z-index: 1000;
			left: 0;
			top: 0;
			width: 100%;
			height: 100%;
			background: rgba(0, 0, 0, 0.5);
		}

		.modal-header{
			display: flex;
			flex: none;
			font-size: 0.928em;
			padding-bottom: 0.4em;
			border-bottom: 1px solid color-mix(in srgb, var(--text-color) 80%, var(--background-color));
			margin-bottom: 0.6em;
		}

		.modal-title{
			flex: 1;
			min-width: 0;
			font-weight: bold;
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}

		.modal-close{
			display: flex;
			margin-top: 0;
			margin-right: -0.4em;
			cursor: pointer;

			&:active{
				transform: translateY(1px);
			}
		}

		.modal-actions{
			margin-left: 1.2em;

			.button{
				margin-left: 0.6em;
				font-size: 0.928em;
			}
		}

		.modal-content{
			flex: 1;
			min-height: 0;
			display: flex;
			flex-direction: column;
			overflow-y: auto;
			margin-right: -1.2em;
			padding-right: 1.2em;
			padding-top: 0.2em;
			padding-bottom: 0.2em;
		}
	`
	
	/** Mask element. */
	protected maskEl!: HTMLElement

	/** Modal title. */
	title: string = ''

	/** Whether modal opened. */
	opened: boolean = false

	protected override render() {
		return html`
			<template tabindex="0" autofocus
				class="modal"
				:transition.immediate=${fade()}
				@transition-leave-ended=${this.onLeaveTransitionEnded}
			>
				<div class="modal-mask"
					:ref=${this.maskEl}
					:transition.immediate.global=${fade()}
				/>

				<div class="modal-header">
					<div class="modal-title">${this.title}</div>

					<lu:if ${this.slotElements.action}>
						${this.renderAction()}
					</lu:if>
					<lu:else>
						<Icon class="modal-close" .icon=${IconClose}
							@click=${this.hide}
						/>
					</lu:else>
				</div>

				${this.renderContent()}
			</template>
		`
	}

	/** Can be overwritten. */
	protected renderAction(): RenderResult {
		return html`
			<div class="modal-actions">
				<slot name="action" />
			</div>
		`
	}

	/** Can be overwritten. */
	protected renderContent(): RenderResult {
		return html`
			<div class="modal-content">
				<slot />
			</div>
		`
	}

	protected onLeaveTransitionEnded() {
		this.maskEl.remove()
	}

	protected override onConnected() {
		super.onConnected()
		
		this.whenUpdated(() => {
			if (this.maskEl && this.el.previousElementSibling !== this.maskEl) {
				this.el.before(this.maskEl)
			}
		})
		
		DOMEvents.on(window, 'resize', this.onWindowResize, this)
	}

	protected override onUpdated() {
		this.toCenter()
	}

	protected override onWillDisconnect() {
		DOMEvents.off(window, 'resize', this.onWindowResize, this)
	}

	protected onWindowResize() {
		this.toCenter()
	}

	protected toCenter() {
		new AnchorAligner(this.el, {position: 'c'}).alignTo(document.documentElement)
	}

	/**
	 * To show the modal immediately.
	 * You may also instantiate and append to `body` if you want
	 * to render `<Modal>` as a child content.
	 */ 
	show() {
		if (this.opened) {
			return
		}

		this.opened = true
		this.appendTo(document.body)
	}

	hide() {
		if (!this.opened) {
			return
		}

		this.opened = false
		this.remove(true)
	}
}