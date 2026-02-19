export type Breakpoint = "mobile" | "tablet" | "desktop"

export interface LayoutConfig {
	breakpoint: Breakpoint
	sidebarVisible: boolean
	hamburgerVisible: boolean
	ribbonOrientation: "horizontal" | "vertical"
	gridColumns: number
}

export const BREAKPOINTS = {
	mobile: 640,
	tablet: 1024,
} as const

export function getBreakpoint(width: number): Breakpoint {
	if (width < BREAKPOINTS.mobile) return "mobile"
	if (width < BREAKPOINTS.tablet) return "tablet"
	return "desktop"
}

export function getLayoutConfig(width: number): LayoutConfig {
	const breakpoint = getBreakpoint(width)

	switch (breakpoint) {
		case "mobile":
			return {
				breakpoint,
				sidebarVisible: false,
				hamburgerVisible: true,
				ribbonOrientation: "vertical",
				gridColumns: 1,
			}
		case "tablet":
			return {
				breakpoint,
				sidebarVisible: false,
				hamburgerVisible: true,
				ribbonOrientation: "horizontal",
				gridColumns: 2,
			}
		case "desktop":
			return {
				breakpoint,
				sidebarVisible: true,
				hamburgerVisible: false,
				ribbonOrientation: "horizontal",
				gridColumns: 4,
			}
	}
}

export interface NavItem {
	path: string
	label: string
	adminOnly: boolean
}

export const NAV_ITEMS: NavItem[] = [
	{ path: "/dashboard", label: "Dashboard", adminOnly: false },
	{ path: "/tasks", label: "Tasks", adminOnly: false },
	{ path: "/skills", label: "Skills", adminOnly: false },
	{ path: "/settings", label: "Settings", adminOnly: true },
]

export function getVisibleNavItems(role: "admin" | "viewer"): NavItem[] {
	if (role === "admin") return NAV_ITEMS
	return NAV_ITEMS.filter((item) => !item.adminOnly)
}
