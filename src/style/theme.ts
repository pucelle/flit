import {Color, Observed} from '@pucelle/ff'


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


export class Theme implements ColorOptions, NotColorOptions, Observed {
	
	protected readonly themeMap: Map<string, Partial<ThemeOptions>> = new Map()
	protected options: ThemeOptions

	mode: 'dark' | 'light' = 'light'

	constructor() {
		this.options = {...defaultLightThemeOptions, ...defaultMediumThemeOptions} as ThemeOptions
	}

	/** Define a new theme by overwritten default options. */
	defineTheme(name: string, options: Partial<ThemeOptions>) {
		this.themeMap.set(name, options)
	}

	/** Get options of a defined theme. */
	getThemeOptions(name: string): Partial<ThemeOptions> {
		return this.themeMap.get(name)!
	}

	private getThemeMode(options: Partial<ThemeOptions>): 'dark' | 'light' {
		if (options.backgroundColor) {
			let color = Color.fromString(options.backgroundColor)!
			if (color.gray < 0.5) {
				return 'dark'
			}
		}
		else if (options.textColor) {
			let color = Color.fromString(options.textColor)!
			if (color.gray > 0.5) {
				return 'dark'
			}
		}

		return 'light'
	}

	/** 
	 * Set theme by name and assign defined theme options.
	 * Can set several themes one time.
	 */
	setTheme(...names: string[]) {
		this.options = {...defaultLightThemeOptions, ...defaultMediumThemeOptions} as ThemeOptions

		for (let name of names) {
			if (!this.themeMap.has(name)) {
				throw new Error(`"${name}" is not a defined theme`)
			}

			Object.assign(this.options, this.themeMap.get(name)!)
		}

		this.mode = this.getThemeMode(this.options)
	}

	/** Set a single item of option. */
	set<K extends keyof ThemeOptions>(key: K, value: ThemeOptions[K]) {
		this.options[key] = value
	}

	/** Get a single value of option. */
	get<K extends keyof ThemeOptions>(key: K): ThemeOptions[K] {
		return this.options[key] as ThemeOptions[K]
	}

	/** 
	 * Convert `font-size` on default theme settings, to the size in current theme settings.
	 * Returns value will be at least 11.
	 */
	adjustFontSize(size: number) {
		return Math.max(Math.round(size * this.fontSize / defaultMediumThemeOptions.fontSize!), 11)
	}

	/** Convert `line-height` on default theme settings, to the line height in current theme settings. */
	adjustSize(size: number) {
		return Math.round(size * this.lineHeight / defaultMediumThemeOptions.lineHeight!)
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


const defaultLightThemeOptions: Partial<ThemeOptions> = {
	mainColor: '#3a6cf6',
	backgroundColor: '#fff',
	fieldBackgroundColor: '#e2e2e2',
	textColor: '#000',
	infoColor: '#3369fa',
	successColor: '#29bc04',
	errorColor: '#e10000',
	warningColor: '#f3b907',
	borderColor: '#9b9b9b',
	popupBackgroundColor: '#fff',
	popupShadowColor: 'rgba(0, 0, 0, 0.4)',
}

const defaultMediumThemeOptions: Partial<ThemeOptions> = {
	borderRadius: 4,
	popupBorderRadius: 4,
	popupShadowBlurRadius: 6,
	focusBlurRadius: 6,
	fontSize: 14,
	lineHeight: 28,
}


export const theme = new Theme()

theme.defineTheme('light', defaultLightThemeOptions)

theme.defineTheme('dark', {
	mainColor: '#3a6cf6',
	backgroundColor: '#333',
	fieldBackgroundColor: '#414141',
	textColor: '#eee',
	borderColor: '#888',
	popupBackgroundColor: '#333',
	popupShadowColor: 'rgba(0, 0, 0, 0.6)',
})

theme.defineTheme('small', {
	fontSize: 13,
	lineHeight: 24,
})

theme.defineTheme('medium', defaultMediumThemeOptions)

theme.defineTheme('large', {
	fontSize: 16,
	lineHeight: 32,
})

theme.defineTheme('touch', {
	fontSize: 18,
	lineHeight: 46,
})