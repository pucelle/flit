import {PathMatcher} from './path-matcher'


const PathMatcherCache: Map<string, PathMatcher> = /*#__PURE__*/new Map()


export function getPathMatcher(routePath: string | RegExp): PathMatcher {
	if (typeof routePath !== 'string') {
		return new PathMatcher(routePath)
	}
	else if (PathMatcherCache.has(routePath)) {
		return PathMatcherCache.get(routePath)!
	}
	else {
		let matcher = new PathMatcher(routePath)
		PathMatcherCache.set(routePath, matcher)
		
		return matcher
	}
}
