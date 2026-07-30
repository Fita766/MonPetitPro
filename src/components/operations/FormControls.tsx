import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
      {children}
      {hint && <span className="ml-2 normal-case tracking-normal text-slate-400">{hint}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-300 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10 disabled:bg-slate-100 disabled:text-slate-500 ${props.className ?? ''}`} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10 ${props.className ?? ''}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-slate-950 shadow-sm outline-none transition placeholder:text-slate-300 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10 ${props.className ?? ''}`} />;
}

export function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-6 border-b border-slate-200 pb-5">
      <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-teal-700">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-medium tracking-tight text-slate-950">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}

export function CheckField({ checked, onChange, children, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode; disabled?: boolean }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-teal-300 has-[:disabled]:bg-slate-100 has-[:disabled]:text-slate-500">
      <input disabled={disabled} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600" />
      {children}
    </label>
  );
}
