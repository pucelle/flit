import {css, html, RenderResult} from '@pucelle/lupos.js'
import {List, ListItem} from './list'
import {fade, Observed} from '@pucelle/ff'
import {tooltip, contextmenu, popup, PopupOptions} from '../bindings'
import {Popup} from './popup'
import {Icon} from './icon'


/** `<DropList>` displays sub list as popup content. */
export class DropList<T> extends List<T> {

	static style = css`
		.drop-list{
			padding: 2px 0.8em;
			border-bottom: none;
			overflow-y: auto;
		}

		.drop-list-subsection{
			padding: 2px 0.8em;
			border-radius: 0;

			.list-content{
				padding-top: 0.3em;
				padding-bottom: 0.3em;
			}
		}
		
		.drop-list-selected-icon{
			margin: 0 -0.5em 0 0.2em;
		}
	`


	/** Additional class name which will apply to popup subsection. */
	subsectionClassName: string = ''

	protected render() {
		return html`
			<template class="list drop-list">
				${this.renderItems(this.data)}
			</template>
		`
	}

	protected renderItem(item: Observed<ListItem<T>>): RenderResult {
		let children = item.children
		let itemTooltip = this.renderTooltip(item)
		let itemContextmenu = this.renderContextmenu(item)

		return html`
			<div
				class="list-item"
				:class.selected=${this.hasSelected(item) || this.hasExpanded(item)}
				:class.arrow-selected=${item === this.keyNavigator.current}
				?:tooltip=${itemTooltip, itemTooltip!}
				?:contextmenu=${itemContextmenu, itemContextmenu!}
				?:popup=${children && children.length > 0,
					() => this.renderItemPopupContent(item),
					{
						key: 'drop-list',
						position: 'tl-tr',
						hideDelay: 100,
						gaps: [2, 8],
						onOpenedChange: (opened: boolean) => {
							this.onPopupOpenedChange(item, opened)
						},
					} as Partial<PopupOptions>
				}
				@click.prevent=${() => this.onClickItem(item)}
			>
				${this.renderIcon(item)}
				${this.renderItemContent(item)}
				${this.renderSelectedIcon(item)}
				${this.renderExpandedIcon(item)}
			</div>
		`
	}

	protected renderItemPopupContent(item: Observed<ListItem<T>>) {
		let children = item.children
		if (!children || children.length === 0) {
			return null
		}

		return html`
			<Popup class="drop-list-subsection ${this.subsectionClassName}"
				:transition=${fade()}
				.triangle=${false}
			>
				${this.renderItems(children!)}
			</Popup>
		`
	}

	protected renderExpandedIcon(item: Observed<ListItem<T>>) {
		let children = item.children
		if (!children || children.length === 0) {
			return null
		}

		return html`
			<Icon class="drop-list-selected-icon" .type="right" .size="inherit" />
		`
	}

	protected onPopupOpenedChange(item: ListItem<T>, opened: boolean) {
		if (opened) {
			this.expanded.push(item.value!)
		}
		else {
			let index = this.expanded.indexOf(item.value!)
			if (index > -1) {
				this.expanded.splice(index, 1)
			}
		}
	}
}