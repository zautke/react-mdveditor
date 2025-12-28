"use client"

/**
 * DesignTokenDemo - Visual demonstration of integrated design tokens
 * This component showcases all brand design tokens for verification
 */
export function DesignTokenDemo() {
  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Design Token Demo</h1>
        <p className="text-muted-foreground">
          Visual verification of integrated brand design tokens
        </p>
      </div>

      {/* Brand Accent Colors */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Brand Accent Colors</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-brand-accent flex items-center justify-center">
              <span className="text-white font-medium">brand-accent</span>
            </div>
            <code className="text-xs text-muted-foreground">#c6613f</code>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-brand-accent-light flex items-center justify-center">
              <span className="text-white font-medium">brand-accent-light</span>
            </div>
            <code className="text-xs text-muted-foreground">#c66040</code>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-brand-accent-disabled flex items-center justify-center">
              <span className="text-gray-700 font-medium">brand-accent-disabled</span>
            </div>
            <code className="text-xs text-muted-foreground">#e3b1a0</code>
          </div>
        </div>
      </section>

      {/* Text Colors */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Text Colors</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
            <p className="text-text-primary font-medium">text-primary</p>
            <code className="text-xs text-muted-foreground">#3d3d3a / #c2c0b6 (dark)</code>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
            <p className="text-text-placeholder">text-placeholder</p>
            <code className="text-xs text-muted-foreground">#73726c / #9c9a92 (dark)</code>
          </div>
        </div>
      </section>

      {/* Icon Button States */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Icon Button States</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-16 rounded-lg bg-icon-btn-active-bg flex items-center justify-center border">
              <span className="text-icon-btn-active-hover font-medium">icon-btn-active</span>
            </div>
            <code className="text-xs text-muted-foreground">bg: #eff6fc, hover: #75ace3</code>
          </div>
          <button className="h-16 rounded-lg bg-icon-btn-active-bg hover:text-icon-btn-active-hover transition-colors border">
            Hover me (icon button)
          </button>
        </div>
      </section>

      {/* Sidebar */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Sidebar Colors</h2>
        <div className="flex gap-4">
          <div className="w-48 rounded-lg overflow-hidden border">
            <div className="p-4 bg-sidebar">
              <p className="text-sm font-medium">Sidebar Background</p>
            </div>
            <div className="p-4 bg-sidebar-hover">
              <p className="text-sm">Sidebar Hover</p>
            </div>
            <div className="p-4 bg-sidebar-dropdown-hover">
              <p className="text-sm">Dropdown Hover</p>
            </div>
          </div>
          <div className="flex-1 p-4 bg-muted rounded-lg">
            <code className="text-xs text-muted-foreground block">
              bg-sidebar: #f5f4ed<br/>
              bg-sidebar-hover: #f0eee6<br/>
              bg-sidebar-dropdown-hover: #e8e6dc
            </code>
          </div>
        </div>
      </section>

      {/* Textarea */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Textarea</h2>
        <div className="p-4 bg-textarea-bg rounded-lg border">
          <textarea
            className="w-full h-24 p-3 rounded bg-transparent text-textarea-text placeholder:text-text-placeholder resize-none"
            placeholder="This textarea uses the design tokens..."
            defaultValue="Content uses text-textarea-text color"
          />
        </div>
      </section>

      {/* Alerts */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Alert Variants</h2>

        {/* Info Alert */}
        <div className="p-4 rounded-lg bg-alert-info-bg border border-alert-info-border">
          <p className="text-alert-info-text font-medium">Info Alert</p>
          <p className="text-alert-info-text text-sm mt-1">
            This is an informational message using alert-info tokens.
          </p>
        </div>

        {/* Danger Alert */}
        <div className="p-4 rounded-lg bg-alert-danger-bg">
          <p className="text-alert-danger-text font-medium">Danger Alert</p>
          <p className="text-alert-danger-text text-sm mt-1">
            This is a danger message. <a href="#" className="text-alert-danger-anchor underline">Learn more</a>
          </p>
        </div>
      </section>

      {/* Content Button */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">Content Buttons</h2>
        <div className="flex gap-4">
          <button className="px-4 py-2 rounded-lg bg-content-btn-bg hover:bg-content-btn-hover border transition-colors">
            Content Button (hover me)
          </button>
        </div>
      </section>

      {/* All Tokens Summary */}
      <section className="space-y-4 mt-12">
        <h2 className="text-xl font-semibold border-b pb-2">Token Reference</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm font-mono">
          <code>bg-brand-accent</code>
          <code>bg-brand-accent-light</code>
          <code>bg-brand-accent-disabled</code>
          <code>text-text-primary</code>
          <code>text-text-placeholder</code>
          <code>bg-icon-btn-active-bg</code>
          <code>text-icon-btn-active-hover</code>
          <code>bg-textarea-bg</code>
          <code>text-textarea-text</code>
          <code>bg-sidebar</code>
          <code>bg-sidebar-hover</code>
          <code>bg-sidebar-dropdown-hover</code>
          <code>bg-content-btn-hover</code>
          <code>bg-alert-info-bg</code>
          <code>text-alert-info-text</code>
          <code>border-alert-info-border</code>
          <code>bg-alert-danger-bg</code>
          <code>text-alert-danger-text</code>
        </div>
      </section>
    </div>
  )
}

export default DesignTokenDemo
