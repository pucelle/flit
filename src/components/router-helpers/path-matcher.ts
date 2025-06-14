export class PathMatcher {

	private re!: RegExp
	private keys: string[] | null = null

	constructor(routePath: string | RegExp) {
		this.init(routePath)
	}

	private init(routePath: string | RegExp) {
		if (typeof routePath !== 'string') {
			this.re = routePath
			return
		}

		let keys: string[] = []

		let re = new RegExp(
			routePath
			.replace(/\./g, '\\.')
			.replace(/\*/g, '.*?')
			.replace(/(\/):(\w+)/g, (_m0, slash, property) => {
				if (property) {
					keys.push(property)
				}
				return slash + '([\\w-]+)'
			})
			.replace(/^/, '^')
			.replace(/$/, '$'),
		'i')
		
		this.re = re
		this.keys = keys
	}

	test(path: string): boolean {
		return this.re.test(path)
	}

	match(path: string): Record<string | number, string> | null {
		let params: Record<string | number, string> = {}
		let m = path.match(this.re)

		if (!m) {
			return null
		}

		for (let i = 0; i < m.length; i++) {
			params[i] = m[i]
		}

		if (m.groups) {
			Object.assign(params, m.groups)
		}

		if (this.keys) {
			for (let i = 0; i < this.keys.length; i++) {
				let key = this.keys[i]
				params[key] = m[i + 1]
			}
		}

		return params
	}
}