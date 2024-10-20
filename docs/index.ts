import * as ff from '@pucelle/ff'
import {html, Component, TemplateResult, css} from '@pucelle/lupos.js'
import {
	Radio, RadioGroup, Checkbox, CheckboxGroup, Row, Col, Icon, Button, ButtonGroup,
	theme, Select, tooltip, Link, Label, Switch, Tag, Input, Textarea, Form
} from '../out'
import {watch} from '@pucelle/ff'


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
				<Row style="margin: 8px 0;" .gutter="24">
					<Col .span=${6}>
						<h3>Checkboxes</h3>
						<CheckboxGroup .value=${this.checkboxValue}>
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
				<h3>Inputs</h3>

				<Row style="margin: 8px 0 16px 0;" .gutter="24">
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
						<Textarea .rows=${3} style="width: 100%;" />
					</Col>
				</Row>

				<Row style="margin: 8px 0 16px 0;" .gutter="24">
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
					<Row style="margin: 8px 0 24px 0;" .gutter="24">
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

					<Row style="margin: 8px 0;" .gutter="24">
						<Col .span=${6}>
							<header>Country</header>
							<Select style="width: 100%;" .searchable .data=${[{value: '1', text: 'Country 1'}, {value: '2', text: 'Country 2'}]} />
						</Col>

						<Col .span=${6}>
							<header>City</header>
							<Select style="width: 100%;" .searchable .data=${[{value: '1', text: 'City 1'}, {value: '2', text: 'City 2'}]} />
						</Col>
					</Row>

					<Row style="margin: 8px 0;" .gutter="24">
						<Col .span=${12}>
							<header>Address</header>
							<Input style="width: 100%;" />
						</Col>
					</Row>

					<Row style="margin: 8px 0;" .gutter="24">
						<Col .span=${12}>
							<header>About</header>
							<Textarea style="width: 100%;" />
						</Col>
					</Row>

					<Row style="margin: 16px 0 10px;" .gutter="24">
						<Col .span=${12} style="text-align: right;">
							<Button .primary @click=${() => this.form.validate()}>Save</Button>
						</Col>
					</Row>
				</Form>
			</section>

			`
	}

	// private renderSelect() {
	// 	return html`
	// 		<section>
	// 			<h3>Selects</h3>
				
	// 			<Row style="margin: 8px 0;" .gutter="24">
	// 				<Col .span=${6}>
	// 					<header>Single Select</header>
	// 					<Select style="width: 100%; margin: 8px 0;" .data=${range(1, 11).map(value => ({value, text: 'Option ' + value}))} .value=${1}  />
	// 				</Col>

	// 				<Col .span=${6}>
	// 					<header>Multiple Select</header>
	// 					<Select style="width: 100%; margin: 8px 0;" .multipleSelect .data=${range(1, 11).map(value => ({value, text: 'Option ' + value}))} .value=${[1, 2]} />
	// 				</Col>

	// 				<Col .span=${6}>
	// 					<header>Searchable Select</header>
	// 					<Select style="width: 100%; margin: 8px 0;" .searchable .data=${range(1, 11).map(value => ({value, text: 'Option ' + value}))} .value=${1} />
	// 				</Col>
	// 			</Row>
	// 		</section>

	// 		`
	// }

	// private renderSearchField() {
	// 	return html`
	// 		<section>
	// 			<h3>Search Field</h3>
				
	// 			<Row style="margin: 16px 0 16px 0;" .gutter="24">
	// 				<Col .span=${6}>
	// 					<f-search style="width: 100%; margin-bottom: 8px;" />
	// 				</Col>
	// 			</Row>
	// 		</section>


	// 		<section>
	// 			<h3>Progress Bars</h3>
				
	// 			<Row style="margin: 16px 0 8px 0;" .gutter="24">
	// 				<Col .span=${6}>
	// 					<f-progress style="width: 100%;" .value="0" />
	// 					<f-progress style="width: 100%;" .value="0.5" />
	// 					<f-progress style="width: 100%;" .value="1" />
	// 				</Col>
	// 			</Row>
	// 		</section>

	// 		<section>
	// 			<h3>Sliders</h3>
				
	// 			<Row style="margin: 16px 0 8px 0;" .gutter="24">
	// 				<Col .span=${6}>
	// 					<f-slider style="width: 100%;" .value="0" />
	// 					<f-slider style="height: 100px; margin-top: 20px;" .value="50" .vertical />
	// 				</Col>
	// 			</Row>
	// 		</section>

	// 		`
	// }

	// private renderLoader() {
	// 	return html`
	// 		<section>
	// 			<h3>Loaders</h3>
				
	// 			<Row style="margin: 16px 0 8px 0;" .gutter="24">
	// 				<Col .span=${4}>
	// 					<header style="margin-bottom: 8px;">Small</header>
	// 					<f-loader .size="small" .speed="0.7" />
	// 				</Col>

	// 				<Col .span=${4}>
	// 					<header style="margin-bottom: 8px;">Medium</header>
	// 					<f-loader .size="medium" .speed="0.6" />
	// 				</Col>

	// 				<Col .span=${4}>
	// 					<header style="margin-bottom: 8px;">Large</header>
	// 					<f-loader .size="large" .speed="0.5" />
	// 				</Col>
	// 			</Row>
	// 		</section>

	// 		`
	// }

	// private renderList() {
	// 	return html`
	// 		<section>
	// 			<h3>Lists</h3>
				
	// 			<Row style="margin: 16px 0 8px 0;" .gutter="24">
	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">Selection type</header>
	// 					<f-list .data=${range(1, 6).map(value => ({value, text: 'Option ' + value}))} />
	// 				</Col>

	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">Single Selection</header>
	// 					<f-list .data=${range(1, 6).map(value => ({value, text: 'Option ' + value}))} .selectable .selected=${[2]} />
	// 				</Col>

	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">Multiple Selection</header>
	// 					<f-list .data=${range(1, 6).map(value => ({value, text: 'Option ' + value}))} .selectable .multipleSelect .selected=${[1, 2]} />
	// 				</Col>

	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">Navigation Type</header>
	// 					<f-list .data=${range(1, 6).map(value => ({value, text: 'Option ' + value}))} .type="navigation" .active=${1} />
	// 				</Col>
	// 			</Row>

	// 			<Row style="margin: 32px 0 8px 0;" .gutter="24">
	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">With Icon</header>
	// 					<f-list .data=${range(1, 6).map(value => ({value, text: 'Option ' + value, icon: 'love'}))} />
	// 				</Col>

	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">With Subsection</header>
	// 					<f-list .type="navigation" .data=${[
	// 						{value: 1, text: 'User A', children:
	// 							[
	// 								{value: 11, text: 'Folder 1', children: [
	// 									{value: 111, text: 'Item 1'},
	// 									{value: 112, text: 'Item 2'},
	// 								]},
	// 								{value: 12, text: 'Folder 2', children: [
	// 									{value: 121, text: 'Item 1'},
	// 									{value: 122, text: 'Item 2'},
	// 								]}
	// 							]
	// 						},
	// 						{value: 2, text: 'User B', opened: true, children:
	// 							[
	// 								{value: 21, text: 'Folder 1', children: [
	// 									{value: 211, text: 'Item 1'},
	// 									{value: 212, text: 'Item 2'},
	// 								]},
	// 								{value: 22, text: 'Folder 2', children: [
	// 									{value: 221, text: 'Item 1'},
	// 									{value: 222, text: 'Item 2'},
	// 								]}
	// 							]
	// 						},
	// 					]} />
	// 				</Col>
	// 			</Row>
	// 		</section>

	// 		`
	// }

	// private renderNavigator() {
	// 	return html`
	// 		<section>
	// 			<h3>Navigations</h3>

	// 			<Row style="margin: 16px 0 8px 0;" .gutter="24">
	// 				<Col .span=${6}>
	// 					<f-navigation
	// 						.active=${111}
	// 						.title="Navigation Menu"
	// 						.data=${[
	// 							{value: 1, text: 'User A', children:
	// 								[
	// 									{value: 11, text: 'Folder 1', children: [
	// 										{value: 111, text: 'Item 1'},
	// 										{value: 112, text: 'Item 2'},
	// 									]},
	// 									{value: 12, text: 'Folder 2', children: [
	// 										{value: 121, text: 'Item 1'},
	// 										{value: 122, text: 'Item 2'},
	// 									]}
	// 								]
	// 							},
	// 							{value: 2, text: 'User B', opened: true, children:
	// 								[
	// 									{value: 21, text: 'Folder 1', children: [
	// 										{value: 211, text: 'Item 1'},
	// 										{value: 212, text: 'Item 2'},
	// 									]},
	// 									{value: 22, text: 'Folder 2', children: [
	// 										{value: 221, text: 'Item 1'},
	// 										{value: 222, text: 'Item 2'},
	// 									]}
	// 								]
	// 							},
	// 						]}
	// 					/>
	// 				</Col>

	// 			</Row>

	// 		</section>

	// 		`
	// }


	// popupWithActions: Popover

	// private renderPopover() {
	// 	return html`
	// 		<section>
	// 			<h3>Popovers</h3>
				
	// 			<Row style="margin: 16px 0 8px 0;" .gutter="24">
	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">Default</header>
	// 					<Button ${
	// 						popup(
	// 							() => html`
	// 							<f-popover .title="Popover title">
	// 								This is Popover content.
	// 							</f-popover>
	// 							`,
	// 							{trigger: 'click'}
	// 						)
	// 					}>Click to Open Popover</Button>
	// 				</Col>

	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">With Close Button</header>
	// 					<Button ${
	// 						popup(
	// 							() => html`
	// 							<f-popover .title="Popover title" .closable>
	// 								This is Popover content.
	// 							</f-popover>
	// 							`,
	// 							{trigger: 'click'}
	// 						)
	// 					}>Click to Open Popover</Button>
	// 				</Col>

	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">No Title</header>
	// 					<Button ${
	// 						popup(
	// 							() => html`
	// 							<f-popover>
	// 								This is Popover content.
	// 							</f-popover>
	// 							`,
	// 							{trigger: 'click'}
	// 						)
	// 					}>Click to Open Popover</Button>
	// 				</Col>

	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">With actions</header>
	// 					<Button ${
	// 						popup(
	// 							() => html`
	// 							<f-popover
	// 								:refComponent="popupWithActions"
	// 								.title="Popover title" 
	// 							>
	// 								This is Popover content.
	// 								<Button :slot="action" @click=${() => this.refComponents.popupWithActions.close()}>Cancel</Button>
	// 								<Button :slot="action" primary @click=${() => this.refComponents.popupWithActions.close()}>Save</Button>
	// 							</f-popover>
	// 							`,
	// 							{trigger: 'click'}
	// 						)
	// 					}>Click to Open Popover</Button>
	// 				</Col>
	// 			</Row>
	// 		</section>

	// 		`
	// }

	// private renderMenu() {
	// 	return html`
	// 		<section>
	// 			<h3>Menus</h3>
				
	// 			<Row style="margin: 16px 0 8px 0;" .gutter="24">
	// 				<Col .span=${6}>
	// 					<Button ${
	// 						popup(
	// 							() => html`
	// 							<f-menu>
	// 								<f-list .data=${range(1, 6).map(value => ({value, text: 'Option ' + value}))} />
	// 							</f-menu>
	// 							`,
	// 							{trigger: 'click'}
	// 						)
	// 					}>
	// 						<span>Click to Open Menu</span>
	// 						<Icon .type="down" />
	// 					</Button>
	// 				</Col>

	// 				<Col .span=${6}>
	// 					<Button ${
	// 						popup(
	// 							() => html`
	// 							<f-menu .title="Menu title">
	// 								<f-list .data=${range(1, 6).map(value => ({value, text: 'Option ' + value}))} .selectable .selected=${[1]} />
	// 							</f-menu>
	// 							`,
	// 							{trigger: 'click'}
	// 						)
	// 					}>
	// 						<span>Menu with Title</span>
	// 						<Icon .type="down" />
	// 					</Button>
	// 				</Col>
	// 			</Row>
	// 		</section>

	// 		`
	// }

	// private renderTooltip() {
	// 	return html`
	// 		<section>
	// 			<h3>Tooltips</h3>

	// 			<Row style="margin: 16px 0 8px 0;" .gutter="24">
	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">Default</header>
	// 					<Button ${
	// 						tooltip('Tooltip text', {type: 'default'})
	// 					}>Hover for Tooltip</Button>
	// 				</Col>

	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">Prompt</header>
	// 					<Button ${
	// 						tooltip('Add some items to your list by clicking this button.', {type: 'prompt'})
	// 					}>Add Items</Button>
	// 				</Col>
	// 			</Row>

	// 			<Row style="margin: 16px 0 8px 0;" .gutter="24">
	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">Error</header>
	// 					<Button primary disabled ${
	// 						tooltip('You can\'t submit, try resolve all mistakes then this tooltip will disappear.', {type: 'error'})
	// 					}>Submit</Button>
	// 				</Col>
	// 			</Row>
	// 		</section>

	// 		`
	// }

	// private renderNotification() {
	// 	return html`
	// 		<section>
	// 			<h3>Notifications</h3>

	// 			<Row style="margin: 16px 0 8px 0;" .gutter="24">
	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">Info</header>
	// 					<Button @click=${
	// 						() => notification.info('Info notification content', {title: 'Info Notification'})
	// 					}>
	// 						Show Info Notification
	// 					</Button>
	// 				</Col>

	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">Warn</header>
	// 					<Button @click=${
	// 						() => notification.warn('Warning notification content', {title: 'Warning Notification'})
	// 					}>
	// 						Show Warn Notification
	// 					</Button>
	// 				</Col>
					
	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">Error</header>
	// 					<Button @click=${
	// 						() => notification.error('Error notification content', {title: 'Error Notification'})
	// 					}>
	// 						Show Error Notification
	// 					</Button>
	// 				</Col>

	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">Success</header>
	// 					<Button @click=${
	// 						() => notification.success('Success notification content', {title: 'Success Notification'})
	// 					}>
	// 						Show Success Notification
	// 					</Button>
	// 				</Col>
	// 			</Row>

	// 			<Row style="margin: 32px 0 8px 0;" .gutter="24">
	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">Without Title</header>
	// 					<Button @click=${
	// 						() => notification.success('Success notification content', {
	// 							title: 'Success Notification',
	// 						})
	// 					}>
	// 						Show Notification with title
	// 					</Button>
	// 				</Col>

	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">With List</header>
	// 					<Button @click=${
	// 						() => notification.warn('Warning notification content', {
	// 							title: 'Warning Notification',
	// 							list: ['List Item 1', 'List Item 2']
	// 						})
	// 					}>
	// 						Show Notification with List
	// 					</Button>
	// 				</Col>

	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">With Actions</header>
	// 					<Button @click=${
	// 						() => notification.error('Error notification content', {
	// 							title: 'Error Notification',
	// 							actions: [{text: 'Try Again'}]
	// 						})
	// 					}>
	// 						Show Notification with Actions
	// 					</Button>
	// 				</Col>

	// 			</Row>
	// 		</section>

	// 		`
	// }

	// private renderDialog() {
	// 	return html`
	// 		<section>
	// 			<h3>Dialogs</h3>

	// 			<Row style="margin: 16px 0 8px 0;" .gutter="24">
	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">Default</header>
	// 					<Button @click=${
	// 						() => dialog.show('This is dialog message.')
	// 					}>
	// 						Open Default Dialog
	// 					</Button>
	// 				</Col>

	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">With Title</header>
	// 					<Button @click=${
	// 						() => dialog.show('This is dialog message.', {title: 'Dialog Title'})
	// 					}>
	// 						Open Dialog with Title
	// 					</Button>
	// 				</Col>

	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">Confirm</header>
	// 					<Button @click=${
	// 						() => dialog.confirm('Are you sure you want to delete these items?', {title: 'Dialog Title'})
	// 					}>
	// 						Open Confirm Dialog
	// 					</Button>
	// 				</Col>

	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">Prompt</header>
	// 					<Button @click=${
	// 						() => dialog.prompt('Please input the name of your account:', {
	// 							title: 'Dialog Title',
	// 							placeholder: 'Name of your account',
	// 							validator: (value: string) => {if (!value) {return 'Name is required'} else {return null}}
	// 						})
	// 					}>
	// 						Open Prompt Dialog
	// 					</Button>
	// 				</Col>
	// 			</Row>
				
	// 			<Row style="margin: 32px 0 8px 0;" .gutter="24">
	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">With Third action</header>
	// 					<Button @click=${
	// 						() => dialog.confirm('You have unsaved data, are you sure you want to save your changes?', {
	// 							title: 'Dialog Title',
	// 							actions: [
	// 								{text: 'Don\'t Save', third: true},
	// 								{text: 'Cancel'},
	// 								{text: 'Save', primary: true},
	// 							]
	// 						})
	// 					}>
	// 						Open Dialog with Third Action
	// 					</Button>
	// 				</Col>
					
	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">Customize</header>
	// 					<Button @click=${
	// 						() => {
	// 							let input: Input

	// 							dialog.show(
	// 								html`
	// 									Please input the name of your account:
	// 									<Input style="margin-top: 8px; width: 100%;"
	// 										.placeholder="Name of your account"
	// 										.validator=${(v: string) => v ? '' : 'Name field is required'}
	// 										.errorInTooltip
	// 										:refComponent=${(i: Input) => input = i}
	// 									/>
	// 									<Checkbox .checked style="margin-top: 8px;">Remember Me</Checkbox>
	// 								`,
	// 								{
	// 									title: 'Dialog Title',
	// 									interruptAction: () => !input.valid
	// 								}
	// 							)
	// 						}
	// 					}>
	// 						Open Custom Dialog
	// 					</Button>
	// 				</Col>
	// 			</Row>

	// 		</section>

	// 		`
	// }

	// private renderModal() {
	// 	return html`
	// 		<section>
	// 			<h3>Modals</h3>

	// 			<Row style="margin: 16px 0 8px 0;" .gutter="24">
	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">Default</header>

	// 					<Button @click="${() => {
	// 						let modal = getRenderedAsComponent(render(html`
	// 							<f-modal style="width: ${theme.adjust(360)}px;" .title="Modal Title">
	// 								This is modal content
	// 							</f-modal>
	// 						`)) as Modal

	// 						modal.show()
	// 					}}">
	// 						Open Modal
	// 					</Button>
	// 				</Col>

	// 				<Col .span=${6}>
	// 					<header style="margin-bottom: 8px;">With Actions</header>

	// 					<Button @click="${() => {
	// 						let modal = getRenderedAsComponent(render(html`
	// 							<f-modal style="width: ${theme.adjust(360)}px;" .title="Modal Title">
	// 								This is modal content
	// 								<Button :slot="action" @click=${() => modal.hide()}>Cancel</Button>
	// 								<Button :slot="action" primary @click=${() => modal.hide()}>Save</Button>
	// 							</f-modal>
	// 						`)) as Modal

	// 						modal.show()
	// 					}}">
	// 						Open Modal with Actions
	// 					</Button>
	// 				</Col>
	// 			</Row>

	// 		</section>

	// 		`
	// }

	// private renderTable() {
	// 	return html`
	// 		<section>
	// 			<h3>Table</h3>

	// 			<f-table
	// 				.resizable
	// 				.store=${new Store({
	// 					data: range(1, 101).map(n => ({id: n, value: Math.round(Math.random() * 100)})),
	// 					key: 'id',
	// 				})}
	// 				.columns=${[
	// 					{
	// 						title: 'Index',
	// 						render: (_item: {id: number, value: number}, index: number) => {
	// 							return index
	// 						},
	// 					},
	// 					{
	// 						title: 'ID',
	// 						orderBy: 'id',
	// 						render: (item) => item.id,
	// 					},
	// 					{
	// 						title: 'Name',
	// 						render: (item) => `Name ${item.id}`,
	// 					},
	// 					{
	// 						title: 'Random Value',
	// 						orderBy: 'value',
	// 						render: (item) => item.value,
	// 						align: 'right',
	// 					}
	// 				] as TableColumn[]}
	// 			/>
	// 		</section>

			
	// 		<section>
	// 			<h3>Table in Live Rendering Mode</h3>

	// 			<f-table
	// 				style="height: 204px;"
	// 				.resizable
	// 				.live
	// 				.renderCount="20"
	// 				.store=${new Store({
	// 					data: range(1, 1001).map(n => ({id: n, value: Math.round(Math.random() * 100)})),
	// 					key: 'id',
	// 				})}
	// 				.columns=${[
	// 					{
	// 						title: 'Index',
	// 						render: (_item: {id: number, value: number}, index: number) => {
	// 							return index
	// 						},
	// 					},
	// 					{
	// 						title: 'ID',
	// 						orderBy: 'id',
	// 						render: (item) => item.id,
	// 					},
	// 					{
	// 						title: 'Name',
	// 						render: (item) => `Name ${item.id}`,
	// 					},
	// 					{
	// 						title: 'Random Value',
	// 						orderBy: 'value',
	// 						render: (item) => item.value,
	// 						align: 'right',
	// 					}
	// 				] as TableColumn[]}
	// 			/>
	// 		</section>

			
	// 		<section>
	// 			<h3>Table with Remote Data</h3>

	// 			<f-table
	// 				.resizable
	// 				.renderCount="20"
	// 				.store=${new ExampleRemoteStore()}
	// 				.columns=${[
	// 					{
	// 						title: 'Index',
	// 						render: (_item: {id: number, value: number}, index: number) => {
	// 							return index
	// 						},
	// 					},
	// 					{
	// 						title: 'ID',
	// 						orderBy: 'id',
	// 						render: (item) => item?.id ?? '--',
	// 					},
	// 					{
	// 						title: 'Name',
	// 						render: (item) => item ? `Name ${item.id}` : '--',
	// 					},
	// 					{
	// 						title: 'Random Value',
	// 						orderBy: 'value',
	// 						render: (item) => item?.value ?? '--',
	// 						align: 'right',
	// 					}
	// 				] as TableColumn[]}
	// 			/>
	// 		</section>

	// 		`
	// }
	
	// leftData = observe([1, 2, 3])
	// rightData = observe([4, 5, 6])

	// private renderDragDrop() {
	// 	return html`
	// 		<section>
	// 			<h3>Drag & Drop</h3>

	// 			<div style="display: inline-flex; padding: 4px; background: ${theme.backgroundColor.toMiddle(5)}; line-height: 100px; font-size: 60px; text-align: center; height: 116px;"
	// 				${droppable((value: number, index: number) => {
	// 					ff.remove(this.leftData, value)
	// 					ff.remove(this.rightData, value)

	// 					if (index === -1) {
	// 						this.leftData.push(value)
	// 					}
	// 					else {
	// 						this.leftData.splice(index, 0, value)
	// 					}
	// 				})}
	// 			>
	// 				${repeat(this.leftData, (data: number, index: number) => html`
	// 					<div style="width: 100px; margin: 4px;"
	// 						:style.background=${theme.backgroundColor.toMiddle(15).toString()}
	// 						${draggable(data, index)}
	// 					>${data}</div>
	// 				`)}
	// 			</div>
	// 			<br>

	// 			<div style="display: inline-flex; padding: 4px; margin-top: -8px; background: ${theme.backgroundColor.toMiddle(5)}; line-height: 100px; font-size: 60px; text-align: center; height: 116px;"
	// 				${droppable((value: number, index: number) => {
	// 					ff.remove(this.leftData, value)
	// 					ff.remove(this.rightData, value)

	// 					if (index === -1) {
	// 						this.rightData.push(value)
	// 					}
	// 					else {
	// 						this.rightData.splice(index, 0, value)
	// 					}
	// 				})}
	// 			>
	// 				${repeat(this.rightData, (data: number, index: number) => html`
	// 					<div style="width: 100px; margin: 4px;"
	// 						:style.background=${theme.backgroundColor.toMiddle(15).toString()}
	// 						${draggable(data, index)}
	// 					>${data}</div>
	// 				`)}
	// 			</div>
	// 		</section>

	// 		`
	// }

	// private renderResizer() {
	// 	return html`
	// 		<section>
	// 			<h3>Resizer</h3>

	// 			<div style="position: relative; display: inline-flex; justify-content: center; line-height: 100px; font-size: 14px; text-align: center; width: 200px; height: 100px;"
	// 				:style.background=${theme.backgroundColor.toMiddle(5).toString()}
	// 			>
	// 				Resizer on the Right
	// 				<f-resizer .position="right" .min=${200} .max=${600} style="background: ${theme.backgroundColor.toMiddle(15)}"></f-resizer>
	// 			</div>
	// 			<br>
	// 		</section>

	// 	</div>
	// `}
}


class MainColorSelect extends Select<{value: string, text: TemplateResult}> {

	static style = css`

	`

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

	protected onCreated(): void {
		super.onCreated()
		this.value = [this.data[0]]
	}

	@watch('value')
	protected onValueChange(value: {value: string, text: TemplateResult}[]) {
		theme.overwrite({mainColor: value[0].value})
	}
}



// class ExampleRemoteStore extends RemoteStore {

// 	protected key = 'id'
	
// 	constructor() {
// 		super({
// 			pageSize: 20,
// 			preloadPageCount: 0,
// 		})
// 	}

// 	protected dataCount() {
// 		return 1000
// 	}

// 	async dataGetter(start: number, end: number) {
// 		await ff.sleep(500)
// 		return [...ff.range(start, end)].map(v => ({id: v + 1, value: Math.round(Math.random() * 100)}))
// 	}
// }


ff.DOMEvents.untilWindowLoaded().then(() => {
	new Preview().appendTo(document.body)
})
