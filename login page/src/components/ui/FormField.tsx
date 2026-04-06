interface FormFieldProps {
  label: string;
  htmlFor: string;
  helperText?: string;
  error?: string;
  children: React.ReactNode;
}

export default function FormField({ label, htmlFor, helperText, error, children }: FormFieldProps) {
  return (
    <div className="ui-form-field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <small className="ui-field-error">{error}</small> : helperText ? <small>{helperText}</small> : null}
    </div>
  );
}
