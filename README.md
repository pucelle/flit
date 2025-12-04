# ff-uix

A lightweight Web UI & UX system based on [lupos.html](https://github.com/pucelle/lupos.html) and [lupos](https://github.com/pucelle/lupos).

Here is the [Live Preview](https://pucelle.github.io/ff-uix/docs/).

**ff-uix** was highly inspired by [MorningStar Design System](http://designsystem.morningstar.com/index.html).


## APIs

- **CSS**
	- `css/base.css`: base css.
	- `css/font.css`: **Roboto** font.

- **Bindings**
	- `:contextmenu`: pops-up a context menu when right click bound element.
	- `:draggable`: make current element draggable.
	- `:droppable`: make current element droppable.
	- `:editable`: after double click, shows a `<Input>` or `<Select>` as editor to edit content.
	- `:goto`: click bound element will cause closest router goto specified path.
	- `:loading`: shows a `<Loader>` and cover current element when value is `true`.
	- `:orderable`: allow current to be dragged to swap order index among siblings.
	- `:popup`: pops-up content after bound element get hover / click / focus.
	- `:scrollPersist`: helps to persist scroll position of element and restore it after gets re-connected.
	- `:tooltip`: helps to show a short text message besides bound element.

- **Components**
	- `<ButtonGroup>`: contains several `<Button>` as child to make a group.
	- `<Button>`: nearly equals <button> element.
	- `<CheckboxGroup>`: contains several `<Checkbox>` as child to make a group.
	- `<Checkbox>`: works just like `<input type="checkbox">`.
	- `<ContextMenu>`: a simple context menu with a `<List>` or `<DropList>` inside, normally work with `:contextmenu`.
	- `<Dialog>`: renders blocking-level content on a overlay modal.
	- `<DropList>`: renders sub list as popup content.
	- `<Dropdown>`: contains trigger element and popup content.
	- `<Form>`: contains several `<Input>` and `<Textarea>` and validate them.
	- `<Row>`, `<Cell>`: do grid layout.
	- `<Icon>`: renders specified svg icon.
	- `<IconLoading>`: renders loading type svg icon.
	- `<InputEditor>`: single line text editor, align with an editing element.
	- `<Input>`: works just like a `<input type="text">`.
	- `<Label>`: shows a text label.
	- `<Link>`: can include `<a>`.
	- `<List>`: renders data items as a list.
	- `<Loader>`: shows a loading animation to indicate resource is loading.
	- `<Menu>`: shows a menu with a `<List>` or `<DropList>` inside.
	- `<Modal>`: shows blocking-level content and help to complete a child task on a popup modal.
	- `<Navigation>`: extends from `<List>`, and can specify title.
	- `<Notification>`: displays a notification list of notification messages.
	- `<Popover>`: displays content message on a popup besides it's trigger element.
	- `<Popup>`: base class of all popup components.
	- `<Progress>`: displays a progress indicator in percentage, just like `<input type=progress>`.
	- `<RadioGroup>`: contains several `<Radio>` as it's child radios.
	- `<Radio>`: works just like `<input type=radio>`, you can click to check one radio in a radio group.
	- `<RectSelection>`: handles rectangle selection.
	- `<AsyncLiveRepeat>`: dynamically renders visible portions of remotely data in list format.
	- `<LiveRepeat>`: dynamically renders visible portions of data in list format.
	- `<Repeat>`: generates repetitive content using a renderFn and iterable data.
	- `<Resizer>`: allows you drag to resize sibling elements.
	- `<Router>`:  serves as the top-level container for all routable content.
	- `<Search>`: allows text input to perform searches.
	- `<Select>`: works just like html `<select>` element, supports single or multiple option selection.
	- `<Slider>`: provides a range selection control.
	- `<Switch>`: allows users to toggle between on and off states.
	- `<Table>`: display data items in rows and columns, enables users to sort and resize columns.
	- `<Tag>`: typically used to categorize content with a text label.
	- `<Textarea>`: works just like html `<textarea>` element, supports custom validator or custom error message.
	- `<Tooltip>`: displays a short text or html content beside it's trigger element.
	- `<Triangle>`: renders a small triangular indicator, typically used within `<Popup>` or `<Tooltip>`.

- **Data**
	`RemoteStore`: loads remote data for one page each time, and automatically caches per page data.
	`Store`: caches data items while support ordering and filtering.



## License

MIT