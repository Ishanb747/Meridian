'use client'

import { Settings, ExternalLink } from 'lucide-react'

interface FeatureDisabledBannerProps {
  title: string
  description: string
  envVar?: string
  docsUrl?: string
}

export function FeatureDisabledBanner({ title, description, envVar, docsUrl }: FeatureDisabledBannerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      <div className="w-16 h-16 rounded-2xl bg-bg-elevated border-2 border-dashed border-border-default flex items-center justify-center mb-6">
        <Settings className="w-7 h-7 text-text-muted" />
      </div>
      <h3 className="text-lg font-display font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary text-center max-w-md mb-4">{description}</p>
      {envVar && (
        <code className="text-xs bg-bg-elevated border border-border-default rounded-md px-3 py-1.5 text-text-secondary font-mono mb-4">
          {envVar}=true
        </code>
      )}
      {docsUrl && (
        <a
          href={docsUrl}
          className="text-sm text-accent hover:text-accent-hover flex items-center gap-1.5 transition-colors"
        >
          View Documentation <ExternalLink size={14} />
        </a>
      )}
    </div>
  )
}
