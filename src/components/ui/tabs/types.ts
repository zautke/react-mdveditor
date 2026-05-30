/**
 * TabSystem Types
 * Comprehensive type definitions for the multi-variant tab component
 */

export interface TabItem {
  id: string
  label: string
  icon?: React.ReactNode
  disabled?: boolean
  closable?: boolean
  /** Accent color from plugin (CSS color value, e.g. oklch(...)). */
  color?: string
}

export interface NewTabMenuItem {
  id: string
  label: string
  icon: React.ReactNode
  onSelect: () => void
  disabled?: boolean
}

export type TabOrientation = "horizontal" | "vertical"

export type TabVariant = "chrome" | "capsule" | "underline" | "pills" | "boxed" | "minimal"

export type CloseButtonPosition = "inside" | "outside" | "overlap"
export type CloseButtonShape = "circle" | "square" | "none"
export type CloseButtonVisibility = "always" | "hover" | "active-only"

// v2 stub: Tab grouping interface
export interface TabGroupConfig {
  enabled?: boolean
  groups?: TabGroup[]
  allowDragBetweenGroups?: boolean
}

export interface TabGroup {
  id: string
  label?: string
  color?: string
  tabIds: string[]
  collapsed?: boolean
}

export interface TabSystemProps {
  /** Tab orientation - horizontal (default) or vertical */
  orientation?: TabOrientation

  /** Visual style variant */
  variant?: TabVariant

  /** Array of tab items */
  tabs: TabItem[]

  /** Currently active tab ID */
  activeTab: string

  /** Callback when active tab changes */
  onTabChange: (tabId: string) => void

  /** Callback when new tab button is clicked */
  onNewTab?: () => void

  /** Callback when a tab is deleted */
  onDeleteTab?: (tabId: string) => void

  /** Callback when a tab label is renamed */
  onRenameTab?: (tabId: string, label: string) => void

  /** Show the new tab button */
  showNewButton?: boolean

  /** Optional dropdown menu items for the new tab control */
  newTabMenuItems?: NewTabMenuItem[]

  /** Show close buttons on tabs */
  showCloseButtons?: boolean

  /** Position of close button relative to tab */
  closeButtonPosition?: CloseButtonPosition

  /** Shape of close button */
  closeButtonShape?: CloseButtonShape

  /** When to show close buttons */
  closeButtonVisibility?: CloseButtonVisibility

  /** Callback when tabs are reordered via drag-and-drop */
  onReorderTabs?: (tabIds: string[]) => void

  /** Minimum tab width (CSS value). Default: '5rem' */
  tabMinWidth?: string

  /** Maximum tab width (CSS value). Default: '15rem' */
  tabMaxWidth?: string

  /** v2 stub: Tab grouping configuration */
  grouping?: TabGroupConfig

  /** Additional CSS classes for the root element */
  className?: string

  /** Content to render for each tab (keyed by tab ID) */
  children?: React.ReactNode
}

// Internal animation state
export interface TabAnimationState {
  isAnimating: boolean
  exitingTabId: string | null
  enteringTabId: string | null
}
