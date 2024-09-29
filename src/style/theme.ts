import {Color, ListMap, Observed} from '@pucelle/ff'


export interface ThemeOptions {

	/** Main highlight color. */
	mainColor: string

	/** Background color. */
	backgroundColor: string

	/** Background color of fields like input field. */
	fieldBackgroundColor: string

	/** Text color. */
	textColor: string
	
	/** Color of success message. */
	successColor: string

	/** Color of error message. */
	errorColor: string

	/** Color of warning message. */
	warningColor: string

	/** Color of info message. */
	infoColor:string

	/** Border color. */
	borderColor: string

	/** Border radius in pixels. */
	borderRadius: number

	/** Color of popup background. */
	popupBackgroundColor: string

	/** Popup border radius in pixels. */
	popupBorderRadius: number

	/** Color of popup shadow. */
	popupShadowColor: string

	/** Popup shadow blur radius in pixels. */
	popupShadowBlurRadius: number

	/** Blur radius in pixels for focus elements. */
	focusBlurRadius: number

	/** Font size. */
	fontSize: number

	/** Height of normal one line components, not the `lineHeight` of multiple lines. */
	lineHeight: number
}

/** All color options. */
type ColorOptions = {[key in
	'mainColor' |
	'backgroundColor' |
	'fieldBackgroundColor' | 
	'textColor' |

	'borderColor' |
	'successColor' |
	'errorColor' |
	'warningColor' |
	'infoColor' |

	'popupBackgroundColor' |
	'popupShadowColor'
]: Color}

type NotColorOptions = {[key in Exclude<keyof ThemeOptions, keyof ColorOptions>]: ThemeOptions[key]}

/** Theme size enums, all components should implements size property according to this. */
export type ThemeSize = 'small' | 'medium' | 'large'


export class Theme implements ColorOptions, NotColorOptions, Observed {
	
	protected readonly themeMap: Map<string, Partial<ThemeOptions>> = new Map()
	protected readonly prefixMap: Map<string, string> = new Map()
	protected readonly ofPrefixMap: ListMap<string, string> = new ListMap()
	protected options: ThemeOptions
	protected names: string[] = []

	constructor() {
		this.options = {...DefaultColorThemeOptions, ...DefaultSizeThemeOptions} as ThemeOptions
	}

	/** 
	 * Define a new theme by overwritten default options.
	 * @param prefix: When setting theme, will overwrite same prefixed theme.
	 */
	defineTheme(name: string, prefix: string, options: Partial<ThemeOptions>) {
		this.themeMap.set(name, options)
		this.prefixMap.set(name, prefix)
		this.ofPrefixMap.add(prefix, name)
	}

	/** Get options of a defined theme. */
	getThemeOptions(name: string): Partial<ThemeOptions> {
		return this.themeMap.get(name)!
	}

	/** Get a single value of option. */
	get<K extends keyof ThemeOptions>(key: K): ThemeOptions[K] {
		return this.options[key] as ThemeOptions[K]
	}

	/** Overwrite whole theme list. */
	setTheme(...names: string[]) {
		this.options = {} as ThemeOptions

		for (let name of names) {
			if (!this.themeMap.has(name)) {
				throw new Error(`"${name}" is not a defined theme!`)
			}

			Object.assign(this.options, this.themeMap.get(name)!)
		}

		this.names = names
	}

	/** 
	 * Apply more themes to current by name and assign their defined theme options.
	 * Same prefixed theme will be overwritten.
	 */
	applyTheme(...names: string[]) {
		let prefixes = names.map(n => this.prefixMap.get(n)).filter(v => v) as string[]
		if (prefixes.length > 0) {
			let surviveNames = this.names.filter(n => {
				let p = this.prefixMap.get(n)
				return !p || !prefixes.includes(p)
			})

			names = [...surviveNames, ...names]
		}

		this.setTheme(...names)
	}

	/** Main highlight color. */
	get mainColor(): Color {
		return Color.fromString(this.get('mainColor'))!
	}

	/** Background color. */
	get backgroundColor(): Color {
		return Color.fromString(this.get('backgroundColor'))!
	}

	/** Background color for fields. */
	get fieldBackgroundColor(): Color {
		return Color.fromString(this.get('fieldBackgroundColor'))!
	}

	/** Text color. */
	get textColor(): Color {
		return Color.fromString(this.get('textColor'))!
	}

	/** Color for success message. */
	get successColor(): Color {
		return Color.fromString(this.get('successColor'))!
	}

	/** Color for error message. */
	get errorColor(): Color {
		return Color.fromString(this.get('errorColor'))!
	}

	/** Color for warning message. */
	get warningColor(): Color {
		return Color.fromString(this.get('warningColor'))!
	}

	/** Color for info message. */
	get infoColor(): Color {
		return Color.fromString(this.get('infoColor'))!
	}

	/** Border color. */
	get borderColor(): Color {
		return Color.fromString(this.get('borderColor'))!
	}

	/** Border radius in pixels. */
	get borderRadius() {
		return this.get('borderRadius')
	}

	/** Color of popup background. */
	get popupBackgroundColor(): Color {
		return Color.fromString(this.get('popupBackgroundColor'))!
	}

	/** Popup border radius in pixels. */
	get popupBorderRadius() {
		return this.get('popupBorderRadius')
	}

	/** Popup shadow blur radius in pixels. */
	get popupShadowBlurRadius() {
		return this.get('popupShadowBlurRadius')
	}

	/** Color of popup shadow. */
	get popupShadowColor() {
		return Color.fromString(this.get('popupShadowColor'))!
	}

	/** Blur radius in pixels for focus elements. */
	get focusBlurRadius() {
		return this.get('focusBlurRadius')
	}

	/** Font size. */
	get fontSize() {
		return this.get('fontSize')
	}

	/** Height of normal one line components, not the `lineHeight` of multiple lines. */
	get lineHeight() {
		return this.get('lineHeight')
	}
}


const DefaultColorThemeOptions: Partial<ThemeOptions> = {
	infoColor: '#3369fa',
	successColor: '#29bc04',
	errorColor: '#e10000',
	warningColor: '#f3b907',
}

const DefaultSizeThemeOptions: Partial<ThemeOptions> = {
	borderRadius: 4,
	popupBorderRadius: 4,
	popupShadowBlurRadius: 6,
	focusBlurRadius: 6,
}


/** `theme` can help to specify and toggle like primary color, font size.... */
export const theme = new Theme()

theme.defineTheme('light', 'color', {
	...DefaultColorThemeOptions,
	mainColor: '#3a6cf6',
	backgroundColor: '#fff',
	fieldBackgroundColor: '#e2e2e2',
	textColor: '#000',
	borderColor: '#9b9b9b',
	popupBackgroundColor: '#fff',
	popupShadowColor: 'rgba(0, 0, 0, 0.4)',
})

theme.defineTheme('dark', 'color', {
	...DefaultColorThemeOptions,
	mainColor: '#3a6cf6',
	backgroundColor: '#333',
	fieldBackgroundColor: '#414141',
	textColor: '#eee',
	borderColor: '#888',
	popupBackgroundColor: '#333',
	popupShadowColor: 'rgba(0, 0, 0, 0.6)',
})

theme.defineTheme('small', 'size', {
	...DefaultSizeThemeOptions,
	fontSize: 13,
	lineHeight: 24,
})

theme.defineTheme('medium', 'size', {
	...DefaultSizeThemeOptions,
	fontSize: 14,
	lineHeight: 28,
})

theme.defineTheme('large', 'size', {
	...DefaultSizeThemeOptions,
	fontSize: 16,
	lineHeight: 32,
})
