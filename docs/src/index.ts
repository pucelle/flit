import * as ff from '@pucelle/ff'
import {html, Component, render} from '@pucelle/lupos.js'
import {
	Radio, RadioGroup, Checkbox, CheckboxGroup, Row, Col, Icon, Button, ButtonGroup,
	theme, Select, tooltip, Link, Label, Switch, Tag, Input, Textarea, Form, Search,
	Progress, Slider, Loader, List, Navigation, Popover, popup, Menu, notification,
	dialog, Modal, loading, Table, TableColumn, Store, RemoteStore, draggable, droppable,
	Resizer
} from '../../out'
import {range, watch} from '@pucelle/ff'


declare global {
    interface Window {
		ff: typeof ff
	}
}


window.ff = ff


class Preview extends Component {

	protected render() {
		let {textColor, backgroundColor} = theme

		return html`
		<template class="preview size-default"
			style="color: ${textColor}; background: ${backgroundColor}"
		>
			<div class="wrapper">
				${this.renderTheme()}
				
				<h2>Components</h2>
				${this.renderButton()}
				${this.renderButtonGroup()}
				${this.renderLink()}
				${this.renderLabel()}
				${this.renderCheckboxAndSomeOthers()}
				${this.renderInputTextarea()}
				${this.renderForm()}
				${this.renderSelect()}
				${this.renderSearchField()}
				${this.renderProgressBar()}
				${this.renderSlider()}
				${this.renderLoader()}
				${this.renderList()}
				${this.renderNavigation()}
				${this.renderPopover()}
				${this.renderMenu()}
				${this.renderTooltip()}
				${this.renderNotification()}
				${this.renderDialog()}
				${this.renderModal()}
				${this.renderTable()}
				${this.renderDragDrop()}
				${this.renderResizer()}
			</div>
		</template>
		`
	}

	private renderTheme() {
		return html`
			<section class="theme">
				<h2>Theme</h2>

				<Row style="margin: 12px 0;">
					<Col .span=${4}>Light Mode</Col>
					<Col .span=${20}>
						<RadioGroup .value="light" @change=${(name: string) => theme.apply(name)}>
							<Radio .value="light" style="margin-right: 20px;">Light</Radio>
							<Radio .value="dark" style="margin-right: 20px;">Dark</Radio>
						</RadioGroup>
					</Col>
				</Row>

				<Row style="margin: 12px 0;">
					<Col .span=${4}>Size</Col>
					<Col .span=${20}>
						<RadioGroup .value="medium" @change=${(name: string) => theme.apply(name)}>
							<Radio .value="small" style="margin-right: 20px;">Small</Radio>
							<Radio .value="medium" style="margin-right: 20px;">Medium</Radio>
							<Radio .value="large" style="margin-right: 20px;">Large</Radio>
						</RadioGroup>
					</Col>
				</Row>

				<Row style="margin: 12px 0;">
					<Col .span=${4}>Main color</Col>
					<Col .span=${20}>
						<MainColorSelect style="width: 12em;" />
					</Col>
				</Row>
			</section>
		`
	}

	private renderButton() {
		return html`
			<section class="basic">
				<h3>Buttons</h3>
				<Row style="margin: 12px 0;">
					<Col .span=${4}>
						<header>Primary</header>
						<Button style="margin: 8px 0;" .primary>Button Text</Button><br>
						<Button style="margin: 8px 0;" .primary><Icon .type="love" /><span>Button Text</span></Button><br>
						<Button style="margin: 8px 0;" .primary><Icon .type="love" /></Button><br>
					</Col>
					<Col .span=${4}>
						<header>Normal</header>
						<Button style="margin: 8px 0;">Button Text</Button><br>
						<Button style="margin: 8px 0;"><span>Button Text</span><Icon .type="right" /></Button><br>
						<Button style="margin: 8px 0;"><Icon .type="love" /></Button><br>
					</Col>
					<Col .span=${4}>
						<header>Flat</header>
						<Button style="margin: 8px 0;" .flat>Button Text</Button><br>
						<Button style="margin: 8px 0;" .flat><Icon .type="love" /><span>Button Text</span></Button><br>
					</Col>
				</Row>
			</section>

		`
	}

	private renderButtonGroup() {
		return html`
			<section>
				<h3>Button Group</h3>

				<ButtonGroup style="margin: 8px 0;">
					<Button .primary>One</Button>
					<Button>Two</Button>
					<Button>Three</Button>
				</ButtonGroup><br>

				<ButtonGroup style="margin: 8px 0;">
					<Button .primary><Icon .type="love" /></Button>
					<Button><Icon .type="love" /></Button>
					<Button><Icon .type="love" /></Button>
				</ButtonGroup><br>
			</section>

		`
	}
	
	private renderLink() {
		return html`
			<section>
				<h3>Links</h3>
				<Row style="margin: 12px 0;">
					<Col .span=${4}>
						<header>Primary</header>
						<Link .primary><a href="javascript:void">Link Text</a></Link>
					</Col>
					<Col .span=${4}>
						<header>Normal</header>
						<Link><a href="javascript:void">Link Text</a></Link>
					</Col>
				</Row>
			</section>
		`
	}

	private renderLabel() {
		return html`<section>
			<h3>Labels</h3>
			<Row style="margin: 12px 0;">
				<Col .span=${4}>
					<header>Normal</header>
					<Label>First Name</Label>
				</Col>
				<Col .span=${4}>
					<header>Required</header>
					<Label .required>Email</Label>
				</Col>
				<Col .span=${4}>
					<header>With Info</header>
					<Label>
						Last Name
						<Icon .type="tips" :tooltip="Guide Tips" />
					</Label>
				</Col>
			</Row>
		</section>
		`
	}


	checkboxValue: string[] = ['2']
	checkboxIndeterminate = true
	switch1On = true
	switch2On = false
	tagClosed = false

	private renderCheckboxAndSomeOthers() {
		return html`
			<section>
				<Row style="margin: 8px 0;" .gutter=${24}>
					<Col .span=${6}>
						<h3>Checkboxes</h3>
						<CheckboxGroup .value=${this.checkboxValue} @change=${(value: string[]) => this.checkboxValue = value}>
							<Checkbox .value="1">${this.checkboxValue.includes('1') ? 'Checked' : 'Unchecked'}</Checkbox><br>
							<Checkbox .value="2">${this.checkboxValue.includes('2') ? 'Checked' : 'Unchecked'}</Checkbox><br>
							<Checkbox .value="3" .indeterminate=${this.checkboxIndeterminate} @change=${() => this.checkboxIndeterminate = false}>${
								this.checkboxIndeterminate ? 'Indeterminate' : this.checkboxValue.includes('3') ? 'Checked' : 'Unchecked'
							}</Checkbox><br>
						</CheckboxGroup>
					</Col>

					<Col .span=${6}>
						<h3>Radios</h3>
						<RadioGroup .value="1">
							<Radio .value="1">Radio 1</Radio><br>
							<Radio .value="2">Radio 2</Radio><br>
						</RadioGroup>
					</Col>

					<Col .span=${6}>
						<h3>Switches</h3>
						<div style="padding: 0.2em 0">
							<Switch style="margin-right: 8px;"
								.value=${this.switch1On}
								@change=${(value: boolean) => this.switch1On = value}
							/>
							Switch 1 ${this.switch1On ? 'On' : 'Off'}
						</div>
						<div style="padding: 0.2em 0">
							<Switch style="margin-right: 8px;"
								.value=${this.switch2On}
								@change=${(value: boolean) => this.switch2On = value}
							/>
							Switch 2 ${this.switch2On ? 'On' : 'Off'}
						</div>
					</Col>

					<Col .span=${6}>
						<h3>Tags</h3>

						<div style="padding: 0.2em 0">
							<Tag>Normal Tag</Tag>
						</div>
						
						<div style="padding: 0.2em 0">
							<Tag .closable
								?hidden=${this.tagClosed}
								@close=${() => this.tagClosed = true}
							>
								Closable Tag
							</Tag>
						</div>
					</Col>
				</Row>
			</section>

			`
	}

	private renderInputTextarea() {
		return html`
			<section>
				<h3>Form Inputs</h3>

				<Row style="margin: 8px 0 16px 0;" .gutter=${24}>
					<Col .span=${6}>
						<header>Text Input</header>
						<Input .type="text" style="width: 100%;" />
					</Col>
					<Col .span=${6}>
						<header>With Placeholder</header>
						<Input .type="text" style="width: 100%;" .placeholder="With Placeholder" />
					</Col>
					<Col .span=${6}>
						<header>Textarea</header>
						<Textarea .rows=${2} style="width: 100%;" />
					</Col>
				</Row>

				<Row style="margin: 8px 0 16px 0;" .gutter=${24}>
					<Col .span=${6}>
						<header>Valid Input</header>
						<Input .type="text" style="width: 100%;" .touched .valid=${true} .placeholder="Valid Input" />
					</Col>
					<Col .span=${6}>
						<header>Invalid Input</header>
						<Input .type="text" style="width: 100%;" .touched .valid=${false} .placeholder="Invalid Input" .error="Error Message" />
					</Col>
					<Col .span=${6}>
						<header>Error message on tooltip</header>
						<Input .type="text" style="width: 100%;" .errorOnTooltip .touched .valid=${false} .placeholder="Invalid Input" .error="Error Message" />
					</Col>
				</Row>
			</section>

			`
	}


	form!: Form

	private renderForm() {
		return html`
			<section>
				<h3>Form</h3>

				<Form :ref=${this.form}>
					<Row style="margin: 8px 0 24px 0;" .gutter=${24}>
						<Col .span=${12}>
							<header><Label .required>Name</Label></header>
							<Input style="width: 100%;" .validator=${(value: string) => {
								if (value.length === 0) {
									return `The name field is required!`
								}
								else if (value.length < 10) {
									return `The name field should have at least 10 characters!`
								}
								else {
									return null
								}
							}} />
						</Col>
					</Row>

					<Row style="margin: 8px 0;" .gutter=${24}>
						<Col .span=${6}>
							<header>Country</header>
							<Select style="width: 100%;" .searchable .data=${[{value: '1', text: 'Country 1'}, {value: '2', text: 'Country 2'}]} />
						</Col>

						<Col .span=${6}>
							<header>City</header>
							<Select style="width: 100%;" .searchable .data=${[{value: '1', text: 'City 1'}, {value: '2', text: 'City 2'}]} />
						</Col>
					</Row>

					<Row style="margin: 8px 0;" .gutter=${24}>
						<Col .span=${12}>
							<header>Address</header>
							<Input style="width: 100%;" />
						</Col>
					</Row>

					<Row style="margin: 8px 0;" .gutter=${24}>
						<Col .span=${12}>
							<header>About</header>
							<Textarea style="width: 100%;" />
						</Col>
					</Row>

					<Row style="margin: 16px 0 10px;" .gutter=${24}>
						<Col .span=${12} style="text-align: right;">
							<Button .primary @click=${() => this.form.validate()}>Save</Button>
						</Col>
					</Row>
				</Form>
			</section>

			`
	}

	private renderSelect() {
		return html`
			<section>
				<h3>Selects</h3>
				
				<Row style="margin: 8px 0;" .gutter=${24}>
					<Col .span=${6}>
						<header>Single Select</header>
						<Select style="width: 100%; margin: 8px 0;"
							.data=${[...range(1, 11)].map(value => ({value, text: 'Option ' + value}))}
							.value=${[1]}
						/>
					</Col>

					<Col .span=${6}>
						<header>Multiple Select</header>
						<Select style="width: 100%; margin: 8px 0;"
							.multiple
							.data=${[...range(1, 11)].map(value => ({value, text: 'Option ' + value}))}
							.value=${[1, 2]}
						/>
					</Col>

					<Col .span=${6}>
						<header>Searchable Select</header>
						<Select style="width: 100%; margin: 8px 0;"
							.searchable
							.data=${[...range(1, 11)].map(value => ({value, text: 'Option ' + value}))}
							.value=${[1]}
						/>
					</Col>
				</Row>
			</section>

			`
	}

	private renderSearchField() {
		return html`
			<section>
				<h3>Search Field</h3>
				
				<Row style="margin: 16px 0 16px 0;" .gutter=${24}>
					<Col .span=${6}>
						<Search style="width: 100%; margin-bottom: 8px;" />
					</Col>
				</Row>
			</section>
		`
	}

	private renderProgressBar() {
		return html`
			<section>
				<h3>Progress Bar</h3>
				
				<Row style="margin: 16px 0 8px 0;" .gutter=${24}>
					<Col .span=${6} style="line-height: 2em;">
						<Progress style="width: calc(100% - 3em); margin-right: 0.5em; vertical-align: middle" .value=${0.1} /> 10%<br>
						<Progress style="width: calc(100% - 3em); margin-right: 0.5em; vertical-align: middle" .value=${0.5} /> 50%<br>
						<Progress style="width: calc(100% - 3em); margin-right: 0.5em; vertical-align: middle" .value=${1} /> 100%<br>
					</Col>

					<Col .span=${6} style="line-height: 2em;">
						<Progress style="width: calc(100% - 2em); margin-right: 0.5em; vertical-align: middle" .value=${0.3} .height=${1} />1<br>
						<Progress style="width: calc(100% - 2em); margin-right: 0.5em; vertical-align: middle" .value=${0.5} .height=${2} />2<br>
						<Progress style="width: calc(100% - 2em); margin-right: 0.5em; vertical-align: middle" .value=${0.8} .height=${3} />3<br>
					</Col>
				</Row>
			</section>
		`
	}

	private renderSlider() {
		return html`
			<section>
				<h3>Slider</h3>
				
				<Row style="margin: 16px 0 8px 0;" .gutter=${24}>
					<Col .span=${6}>
						<header>Horizontal</header>
						<Slider style="width: 100%;" .value=${10} />
					</Col>

					<Col .span=${6}>
						<header>Vertical</header>
						<Slider style="height: 6em;" .value=${50} .vertical />
					</Col>

					<Col .span=${6} style="line-height: 2em;">
						<header>Size</header>
						<Slider style="width: calc(100% - 2em); margin-right: 1em;" .value=${50} .grooveSize=${1} />1<br>
						<Slider style="width: calc(100% - 2em); margin-right: 1em;" .value=${50} .grooveSize=${2} .ballSize=${18} />2<br>
						<Slider style="width: calc(100% - 2em); margin-right: 1em;" .value=${50} .grooveSize=${3} .ballSize=${20} />3<br>
					</Col>
				</Row>
			</section>

			`
	}

	private renderLoader() {
		return html`
			<section>
				<h3>Loader</h3>
				
				<Row style="margin: 16px 0 8px 0;" .gutter=${24}>
					<Col .span=${4}>
						<header style="margin-bottom: 8px;">18 + 3</header>
						<Loader .size=${18} .strokeSize=${3} .speed="0.7" />
					</Col>

					<Col .span=${4}>
						<header style="margin-bottom: 8px;">28 + 4</header>
						<Loader .size=${28} .strokeSize=${4} .speed="0.6" />
					</Col>

					<Col .span=${4}>
						<header style="margin-bottom: 8px;">38 + 5</header>
						<Loader .size=${38} .strokeSize=${5} .speed="0.5" />
					</Col>

					<Col .span=${4}>
						<header style="margin-bottom: 8px;">:loading=\${...}</header>
						<div style="position: relative; width: 100px; height: 100px" :loading=${true}></div>
					</Col>
				</Row>
			</section>

			`
	}

	private renderList() {
		return html`
			<section>
				<h3>List</h3>
				
				<Row style="margin: 16px 0 8px 0;" .gutter=${24}>
					<Col .span=${6}>
						<header style="margin-bottom: 8px;">Non Selection</header>
						<List .data=${[...range(1, 6)].map(value => ({value, text: 'Option ' + value}))} />
					</Col>

					<Col .span=${6}>
						<header style="margin-bottom: 8px;">Single Selection</header>
						<List .data=${[...range(1, 6)].map(value => ({value, text: 'Option ' + value}))} .selectable .selected=${[2]} />
					</Col>

					<Col .span=${6}>
						<header style="margin-bottom: 8px;">Multiple Selection</header>
						<List .data=${[...range(1, 6)].map(value => ({value, text: 'Option ' + value}))} .selectable .multipleSelect .selected=${[1, 2]} />
					</Col>

					<Col .span=${6}>
						<header style="margin-bottom: 8px;">Navigation Type</header>
						<List .data=${[...range(1, 6)].map(value => ({value, text: 'Option ' + value}))} .mode="navigation" .selectable .selected=${[1]} />
					</Col>
				</Row>

				<Row style="margin: 32px 0 8px 0;" .gutter=${24}>
					<Col .span=${6}>
						<header style="margin-bottom: 8px;">With Icon</header>
						<List .data=${[...range(1, 6)].map(value => ({value, text: 'Option ' + value, icon: 'love'}))} />
					</Col>

					<Col .span=${6}>
						<header style="margin-bottom: 8px;">With Subsection</header>
						<List .type="navigation" .data=${[
							{value: 1, text: 'Folder A', children:
								[
									{value: 11, text: 'Sub Folder a', children: [
										{value: 111, text: 'Item 1'},
										{value: 112, text: 'Item 2'},
									]},
									{value: 12, text: 'Sub Folder b', children: [
										{value: 121, text: 'Item 1'},
										{value: 122, text: 'Item 2'},
									]}
								]
							},
							{value: 2, text: 'Folder B', opened: true, children:
								[
									{value: 21, text: 'Sub Folder a', children: [
										{value: 211, text: 'Item 1'},
										{value: 212, text: 'Item 2'},
									]},
									{value: 22, text: 'Sub Folder b', children: [
										{value: 221, text: 'Item 1'},
										{value: 222, text: 'Item 2'},
									]}
								]
							},
						]} />
					</Col>
				</Row>
			</section>

			`
	}

	private renderNavigation() {
		return html`
			<section>
				<h3>Navigation</h3>

				<Row style="margin: 16px 0 8px 0;" .gutter=${24}>
					<Col .span=${6}>
						<Navigation
							.selected=${[111]}
							.title="Navigation Menu"
							.data=${[
								{value: 1, text: 'Folder A', children:
									[
										{value: 11, text: 'Sub Folder a', children: [
											{value: 111, text: 'Item 1'},
											{value: 112, text: 'Item 2'},
										]},
										{value: 12, text: 'Sub Folder b', children: [
											{value: 121, text: 'Item 1'},
											{value: 122, text: 'Item 2'},
										]}
									]
								},
								{value: 2, text: 'Folder B', opened: true, children:
									[
										{value: 21, text: 'Sub Folder a', children: [
											{value: 211, text: 'Item 1'},
											{value: 212, text: 'Item 2'},
										]},
										{value: 22, text: 'Sub Folder b', children: [
											{value: 221, text: 'Item 1'},
											{value: 222, text: 'Item 2'},
										]}
									]
								},
							]}
						/>
					</Col>

				</Row>

			</section>
			`
	}


	popupWithActions!: Popover

	private renderPopover() {
		return html`
			<section>
				<h3>Popovers</h3>
				
				<Row style="margin: 16px 0 8px 0;" .gutter=${24}>
					<Col .span=${6}>
						<header style="margin-bottom: 8px;">Default</header>
						<Button :popup=${
							() => html`
							<Popover .title="Popover title">
								This is Popover content.
							</Popover>
							`,
							{trigger: 'click', position: 'b', fixTriangle: true}
						}>Click to Open Popover</Button>
					</Col>

					<Col .span=${6}>
						<header style="margin-bottom: 8px;">With Close Button</header>
						<Button :popup=${
							() => html`
							<Popover .title="Popover title" .closable>
								This is Popover content.
							</Popover>
							`,
							{trigger: 'click', position: 'b', fixTriangle: true}
						}>Click to Open Popover</Button>
					</Col>

					<Col .span=${6}>
						<header style="margin-bottom: 8px;">No Title</header>
						<Button :popup=${
							() => html`
							<Popover>
								This is Popover content.
							</Popover>
							`,
							{trigger: 'click', position: 'b', fixTriangle: true}
						}>Click to Open Popover</Button>
					</Col>

					<Col .span=${6}>
						<header style="margin-bottom: 8px;">With actions</header>
						<Button :popup=${
							() => html`
							<Popover .title="Popover title" :ref=${this.popupWithActions}>
								This is Popover content.
								<div :slot="action">
									<Button @click=${() => this.popupWithActions.close()} .size="inherit">Cancel</Button>
									<Button .primary @click=${() => this.popupWithActions.close()} .size="inherit">Save</Button>
								</div>
							</Popover>
							`,
							{trigger: 'click', position: 'b', fixTriangle: true}
						}>Click to Open Popover</Button>
					</Col>
				</Row>
			</section>

			`
	}

	private renderMenu() {
		return html`
			<section>
				<h3>Menu</h3>
				
				<Row style="margin: 16px 0 8px 0;" .gutter=${24}>
					<Col .span=${6}>
						<Button :popup=${
							() => html`
								<Menu>
									<List .data=${[...range(1, 6)].map(value => ({value, text: 'Option ' + value}))} />
								</Menu>
							`,
							{trigger: 'click', position: 'b', fixTriangle: true,}
						}>
							<span>Click to Open Menu</span>
							<Icon .type="down" />
						</Button>
					</Col>

					<Col .span=${6}>
						<Button :popup=${() => html`
							<Menu .title="Menu title">
								<List .data=${[...range(1, 6)].map(value => ({value, text: 'Option ' + value}))} .selectable .selected=${[1]} />
							</Menu>
							`,
							{trigger: 'click', position: 'b', fixTriangle: true,}
						}>
							<span>Menu with Title</span>
							<Icon .type="down" />
						</Button>
					</Col>
				</Row>
			</section>

			`
	}

	private renderTooltip() {
		return html`
			<section>
				<h3>Tooltip</h3>

				<Row style="margin: 16px 0 8px 0;" .gutter=${24}>
					<Col .span=${6}>
						<header style="margin-bottom: 8px;">Default</header>
						<Button :tooltip=${'Tooltip text', {type: 'default'}}>Hover for Tooltip</Button>
					</Col>

					<Col .span=${6}>
						<header style="margin-bottom: 8px;">Prompt</header>
						<Button :tooltip=${'Add some items to your list by clicking this button.', {type: 'prompt'}}>Add Items</Button>
					</Col>
				</Row>

				<Row style="margin: 16px 0 8px 0;" .gutter=${24}>
					<Col .span=${6}>
						<header style="margin-bottom: 8px;">Error</header>
						<Button .primary disabled :tooltip=${
							'You can\'t submit, try resolve all mistakes then this tooltip will disappear.',
							{type: 'error'}
						}>Submit</Button>
					</Col>
				</Row>
			</section>

			`
	}

	private renderNotification() {
		return html`
			<section>
				<h3>Notifications</h3>

				<Row style="margin: 16px 0 8px 0;" .gutter=${24}>
					<Col .span=${6}>
						<header style="margin-bottom: 8px;">Info</header>
						<Button @click=${
							() => notification.info('Info notification content', {title: 'Info Notification'})
						}>
							Info Notification
						</Button>
					</Col>

					<Col .span=${6}>
						<header style="margin-bottom: 8px;">Warn</header>
						<Button @click=${
							() => notification.warn('Warning notification content', {title: 'Warning Notification'})
						}>
							Warn Notification
						</Button>
					</Col>
					
					<Col .span=${6}>
						<header style="margin-bottom: 8px;">Error</header>
						<Button @click=${
							() => notification.error('Error notification content', {title: 'Error Notification'})
						}>
							Error Notification
						</Button>
					</Col>

					<Col .span=${6}>
						<header style="margin-bottom: 8px;">Success</header>
						<Button @click=${
							() => notification.success('Success notification content', {title: 'Success Notification'})
						}>
							Success Notification
						</Button>
					</Col>
				</Row>

				<Row style="margin: 32px 0 8px 0;" .gutter=${24}>
					<Col .span=${6}>
						<header style="margin-bottom: 8px;">Without Title</header>
						<Button @click=${
							() => notification.success('Success notification content', {
								title: 'Success Notification',
							})
						}>
							Notification with Title
						</Button>
					</Col>

					<Col .span=${6}>
						<header style="margin-bottom: 8px;">With List</header>
						<Button @click=${
							() => notification.warn('Warning notification content', {
								title: 'Warning Notification',
								list: ['List Item 1', 'List Item 2']
							})
						}>
							Notification with List
						</Button>
					</Col>

					<Col .span=${6}>
						<header style="margin-bottom: 8px;">With Actions</header>
						<Button @click=${
							() => notification.error('Error notification content', {
								title: 'Error Notification',
								actions: [{text: 'Try Again'}]
							})
						}>
							Notification with Actions
						</Button>
					</Col>

				</Row>
			</section>
			`
	}

	private renderDialog() {
		return html`
			<section>
				<h3>Dialogs</h3>

				<Row style="margin: 16px 0 8px 0;" .gutter=${24}>
					<Col .span=${6}>
						<header style="margin-bottom: 8px;">Default</header>
						<Button @click=${
							() => dialog.show('This is dialog message.')
						}>
							Default Dialog
						</Button>
					</Col>

					<Col .span=${6}>
						<header style="margin-bottom: 8px;">With Title</header>
						<Button @click=${
							() => dialog.show('This is dialog message.', {title: 'Dialog Title'})
						}>
							Dialog with Title
						</Button>
					</Col>

					<Col .span=${6}>
						<header style="margin-bottom: 8px;">Confirm</header>
						<Button @click=${
							() => dialog.confirm('Are you sure you want to delete these items?', {title: 'Dialog Title'})
						}>
							Confirm Dialog
						</Button>
					</Col>

					<Col .span=${6}>
						<header style="margin-bottom: 8px;">Prompt</header>
						<Button @click=${
							() => dialog.prompt('Please input the name of your account:', {
								title: 'Dialog Title',
								placeholder: 'Name of your account',
								validator: (value: string) => {if (!value) {return 'Name is required'} else {return null}}
							})
						}>
							Prompt Dialog
						</Button>
					</Col>
				</Row>
				
				<Row style="margin: 32px 0 8px 0;" .gutter=${24}>
					<Col .span=${6}>
						<header style="margin-bottom: 8px;">With Third action</header>
						<Button @click=${
							() => dialog.confirm('You have unsaved data, are you sure you want to save your changes?', {
								title: 'Dialog Title',
								actions: [
									{text: 'Don\'t Save', third: true},
									{text: 'Cancel'},
									{text: 'Save', primary: true},
								]
							})
						}>
							Dialog with Third Action
						</Button>
					</Col>
					
					<Col .span=${6}>
						<header style="margin-bottom: 8px;">Customize</header>
						<Button @click=${
							() => {
								let input: Input

								dialog.show(
									html`
										Please input the name of your account:
										<Input style="margin-top: 8px; width: 100%;"
											.placeholder="Input Name of Your Account"
											.validator=${(v: string) => v ? null : 'Name field is required'}
											.errorOnTooltip
											:ref=${input!}
										/>
										<Checkbox .checked style="margin-top: 8px;">Remember Me</Checkbox>
									`,
									{
										title: 'Dialog Title',
										actions: [{
											value: 'ok',
											text: 'OK',
											handler() {
												if (!input.touched || !input.valid) {
													input.touched = true
													return true
												}
												return null
											}
										}]
									}
								)
							}
						}>
							Custom Dialog
						</Button>
					</Col>
				</Row>

			</section>

			`
	}

	private renderModal() {
		return html`
			<section>
				<h3>Modals</h3>

				<Row style="margin: 16px 0 8px 0;" .gutter=${24}>
					<Col .span=${6}>
						<header style="margin-bottom: 8px;">Default</header>

						<Button @click=${() => {
							render(html`
								<Modal style="width: ${theme.emOf(360)};"
									.title="Modal Title"
									:ref=${((m: Modal) => m.show())}
								>
									This is modal content
								</Modal>
							`).connectManually()
						}}>
							Open Modal
						</Button>
					</Col>

					<Col .span=${6}>
						<header style="margin-bottom: 8px;">With Actions</header>

						<Button @click=${() => {
							let modal: Modal

							render(html`
								<Modal style="width: ${theme.emOf(360)};"
									.title="Modal Title"
									:ref=${((m: Modal) => {modal = m; m.show()})}
								>
									This is modal content
									<div :slot="action">
										<Button @click=${() => modal.hide()}>Cancel</Button>
										<Button .primary @click=${() => modal.hide()}>Save</Button>
									</div>
								</Modal>
							`).connectManually()
						}}>
							Modal with Actions
						</Button>
					</Col>
				</Row>

			</section>

			`
	}

	private renderTable() {
		return html`
			<section>
				<h3>Table</h3>

				<Table
					.resizable
					.store=${new Store({
						data: [...range(1, 101)].map(n => ({id: n, value: Math.round(Math.random() * 100)})),
					})}
					.columns=${[
						{
							title: 'Index',
							renderer: (_item: {id: number, value: number}, index: number) => {
								return index
							},
						},
						{
							title: 'ID',
							orderBy: 'id',
							renderer: (item) => item.id,
						},
						{
							title: 'Name',
							orderBy: 'id',
							renderer: (item) => `Name ${item.id}`,
						},
						{
							title: 'Random Value',
							orderBy: 'value',
							renderer: (item) => item.value,
							align: 'right',
						}
					] as TableColumn[]}
				/>
			</section>

			
			<section>
				<h3>Table on Live Mode</h3>

				<Table
					style="height: 200px;"
					.resizable
					.live
					.store=${new Store({
						data: [...range(1, 1001)].map(n => ({id: n, value: Math.round(Math.random() * 100)})),
					})}
					.columns=${[
						{
							title: 'Index',
							renderer: (_item: {id: number, value: number}, index: number) => {
								return index
							},
						},
						{
							title: 'ID',
							orderBy: 'id',
							renderer: (item) => item.id,
						},
						{
							title: 'Name',
							orderBy: 'id',
							renderer: (item) => `Name ${item.id}`,
						},
						{
							title: 'Random Value',
							orderBy: 'value',
							renderer: (item) => item.value,
							align: 'right',
						}
					] as TableColumn[]}
				/>
			</section>

			
			<section>
				<h3>Table with Remote Data</h3>

				<Table
					.resizable
					.live
					.store=${new ExampleRemoteStore()}
					.columns=${[
						{
							title: 'Index',
							renderer: (_item: {id: number, value: number}, index: number) => {
								return index
							},
						},
						{
							title: 'ID',
							orderBy: 'id',
							renderer: (item) => item?.id ?? '--',
						},
						{
							title: 'Name',
							orderBy: 'id',
							renderer: (item) => item ? `Name ${item.id}` : '--',
						},
						{
							title: 'Random Value',
							orderBy: 'value',
							renderer: (item) => item?.value ?? '--',
							align: 'right',
						}
					] as TableColumn[]}
				/>
			</section>

			`
	}
	

	leftData = [1, 2, 3]
	rightData = [4, 5, 6]

	private renderDragDrop() {
		return html`
			<section>
				<h3>Drag & Drop</h3>
					
			<div style="display: inline-flex; vertical-align: top; padding: 4px; background: ${theme.backgroundColor.toIntermediate(0.05)}; line-height: 100px; font-size: 60px; text-align: center; height: 116px; min-width: 116px; v"
					:droppable=${((value: number, index: number) => {
						this.leftData = this.leftData.filter(v => v !== value)
						this.rightData = this.rightData.filter(v => v !== value)

						if (index === -1) {
							this.leftData.push(value)
						}
						else {
							this.leftData.splice(index, 0, value)
						}
					}), {itemsAlignDirection: 'horizontal'}}
				>
					${this.leftData.map((data: number, index: number) => html`
						<div style="width: 100px; margin: 4px; cursor: grab;"
							:style.background=${theme.backgroundColor.toIntermediate(0.15).toString()}
							:draggable=${data, index}
						>${data}</div>
					`)}
				</div>
				<br>

				<div style="display: inline-flex; vertical-align: top; padding: 4px; margin-top: -8px; background: ${theme.backgroundColor.toIntermediate(0.05)}; line-height: 100px; font-size: 60px; text-align: center; height: 116px; min-width: 116px;"
					:droppable=${((value: number, index: number) => {
						this.leftData = this.leftData.filter(v => v !== value)
						this.rightData = this.rightData.filter(v => v !== value)

						if (index === -1) {
							this.rightData.push(value)
						}
						else {
							this.rightData.splice(index, 0, value)
						}
					}), {itemsAlignDirection: 'horizontal'}}
				>
					${this.rightData.map((data: number, index: number) => html`
						<div style="width: 100px; margin: 4px; cursor: grab;"
							:style.background=${theme.backgroundColor.toIntermediate(0.15).toString()}
							:draggable=${data, index}
						>${data}</div>
					`)}
				</div>
			</section>

			`
	}

	private renderResizer() {
		return html`
			<section>
				<h3>Resizer</h3>

				<div style="position: relative; display: inline-flex; justify-content: center; line-height: 100px; font-size: 14px; text-align: center; width: 200px; height: 100px;"
					:style.background=${theme.backgroundColor.toIntermediate(0.05).toString()}
				>
					Resizer on the Right
					<Resizer .position="right" .min=${200} .max=${600} style="background: ${theme.backgroundColor.toIntermediate(0.15)}"></f-resizer>
				</div>
				<br>
			</section>

		</div>
	`}
}


class MainColorSelect extends Select<string> {

	data = [
		{value: '#3a6cf6', text: html`<div style="color: #3a6cf6;">Blue</div>`},
		{value: '#0077cf', text: html`<div style="color: #0077cf;">Darkblue</div>`},
		{value: '#4eb2ea', text: html`<div style="color: #4eb2ea;">Skyblue</div>`},
		{value: '#48c7c7', text: html`<div style="color: #48c7c7;">Cyan</div>`},
		{value: '#be66cc', text: html`<div style="color: #be66cc;">Purple</div>`},
		{value: '#ff6666', text: html`<div style="color: #ff6666;">Red</div>`},
		{value: '#ff8095', text: html`<div style="color: #ff8095;">Pink</div>`},
		{value: '#15af78', text: html`<div style="color: #15af78;">Green</div>`},
		{value: '#888888', text: html`<div style="color: #888888;">Grey</div>`},
	]

	value: string[] = ['#3a6cf6']

	@watch('value')
	protected onValueChange(value: string[]) {
		theme.overwrite({mainColor: value[0]})
	}
}


class ExampleRemoteStore extends RemoteStore {

	constructor() {
		super({
			pageSize: 10,
			preloadPageCount: 0,
		})
	}

	protected dataCountGetter() {
		return 1000
	}

	async pageDataGetter(start: number, end: number) {
		await ff.sleep(500)
		return [...ff.range(start, end)].map(v => ({id: v + 1, value: Math.round(Math.random() * 100)}))
	}
}


ff.DOMEvents.untilWindowLoaded().then(() => {
	new Preview().appendTo(document.body)
})
