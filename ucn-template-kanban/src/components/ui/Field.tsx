import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string;
};

export function Field({ label, error, className = "", ...props }: FieldProps) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-800">
      <span>{label}</span>
      <input
        className={"rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 shadow-sm focus:border-emerald-700 " + className}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? props.name + "-error" : undefined}
        {...props}
      />
      {error ? <span id={props.name + "-error"} className="text-sm text-red-700">{error}</span> : null}
    </label>
  );
}

export function TextareaField({ label, error, className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; name: string; error?: string }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-800">
      <span>{label}</span>
      <textarea className={"min-h-28 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 shadow-sm focus:border-emerald-700 " + className} {...props} />
      {error ? <span className="text-sm text-red-700">{error}</span> : null}
    </label>
  );
}

export function SelectField({ label, children, className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; name: string }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-800">
      <span>{label}</span>
      <select className={"rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 shadow-sm focus:border-emerald-700 " + className} {...props}>
        {children}
      </select>
    </label>
  );
}
