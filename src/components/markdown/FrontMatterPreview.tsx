import React from 'react';
import yaml from 'js-yaml';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FrontMatterPreviewProps {
  content: string;
}

const FrontMatterPreview: React.FC<FrontMatterPreviewProps> = ({ content }) => {
  let data: any = null;
  let error: string | null = null;

  try {
    data = yaml.load(content);
  } catch (e: any) {
    error = e.message || 'Invalid YAML structure';
  }

  if (error) {
    return (
      <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-destructive">
        <div className="flex items-center gap-2 mb-2 font-semibold">
          <AlertCircle className="h-4 w-4" />
          <span>Front Matter Error</span>
        </div>
        <pre className="text-xs whitespace-pre-wrap font-mono opacity-80">{error}</pre>
      </div>
    );
  }

  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    return null;
  }

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-bold uppercase tracking-wider text-emerald-800">Document Metadata</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          Validated YAML
        </div>
      </div>
      <div className="p-4">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex flex-col border-l-2 border-emerald-500/30 pl-3">
              <dt className="text-xs font-semibold uppercase tracking-tight text-emerald-700/70">{key}</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {renderValue(value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

const renderValue = (value: any): React.ReactNode => {
  if (value === null || value === undefined) return <span className="italic text-muted-foreground">null</span>;
  if (typeof value === 'boolean') return <span className={cn("font-bold", value ? "text-emerald-600" : "text-amber-600")}>{value ? 'TRUE' : 'FALSE'}</span>;
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {value.map((item, i) => (
          <span key={i} className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-800 border border-emerald-500/20">
            {String(item)}
          </span>
        ))}
      </div>
    );
  }
  if (typeof value === 'object') {
    return (
      <pre className="mt-1 rounded bg-muted p-2 text-[10px] font-mono leading-tight overflow-x-auto">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return String(value);
};

export default FrontMatterPreview;
