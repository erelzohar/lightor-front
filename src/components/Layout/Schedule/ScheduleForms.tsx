import React, { memo } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

/**
 * The border and text chrome every field on the booking form shares, so the
 * owner's own questions (LT-178) look like name and phone.
 */
const fieldClass = (error?: string) =>
    `w-full ps-10 pe-4 py-3 bg-transparent border-2 ${error
        ? 'border-red-500 dark:border-red-500'
        : 'border-primary/30 dark:border-primary-dark/30 focus:border-primary dark:focus:border-primary-dark'
        } rounded-design-sm transition-all outline-none text-light-text dark:text-dark-text placeholder-light-text/50 dark:placeholder-dark-text/50`;

const LABEL_CLASS = 'absolute start-10 -top-0 px-2 text-sm font-medium text-primary dark:text-primary-dark bg-light-surface dark:bg-dark-surface';

/** A floating label, with the "(optional)" hint after it when there is one. */
const FieldLabel = ({ htmlFor, label, hint }: { htmlFor: string; label: string; hint?: string }) => (
    <label htmlFor={htmlFor} className={LABEL_CLASS}>
        {label}
        {hint && <span className="ms-1 font-normal text-light-text/60 dark:text-dark-text/60">({hint})</span>}
    </label>
);

const FieldError = ({ error }: { error?: string }) =>
    error ? <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p> : null;

export interface MaterialInputProps {
    icon: LucideIcon;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
    name: string;
    id: string;
    maxLength?: number;
    pattern?: string;
    inputMode?: "search" | "text" | "none" | "tel" | "url" | "email" | "numeric" | "decimal";
    onInvalid?: (e: React.FormEvent<HTMLInputElement>) => void;
    title?: string;
    autoComplete?: string;
    /** Shown after the label, e.g. "optional" (LT-178). */
    hint?: string;
}

export const MaterialInput = memo(({
    icon: Icon,
    label,
    value,
    onChange,
    error,
    type = "text",
    required = true,
    placeholder = "",
    name,
    id,
    maxLength,
    pattern,
    inputMode,
    onInvalid,
    title,
    autoComplete,
    hint
}: MaterialInputProps) => (
    <div className="relative pt-2">
        <FieldLabel htmlFor={id} label={label} hint={hint} />
        <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-primary dark:text-primary-dark" aria-hidden="true" />
        </div>
        <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            name={name}
            maxLength={maxLength}
            pattern={pattern}
            inputMode={inputMode}
            onInvalid={onInvalid}
            title={title}
            autoComplete={autoComplete}
            className={fieldClass(error)}
            aria-required={required}
            aria-invalid={!!error}
        />
        <FieldError error={error} />
    </div>
));

MaterialInput.displayName = 'MaterialInput';

export interface MaterialTextareaProps {
    icon: LucideIcon;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    error?: string;
    required?: boolean;
    name: string;
    id: string;
    maxLength?: number;
    hint?: string;
}

/** A few lines of free text: the owner's "note" question (LT-178). */
export const MaterialTextarea = memo(({
    icon: Icon,
    label,
    value,
    onChange,
    error,
    required = false,
    name,
    id,
    maxLength,
    hint
}: MaterialTextareaProps) => (
    <div className="relative pt-2">
        <FieldLabel htmlFor={id} label={label} hint={hint} />
        <div className="absolute top-2 start-0 ps-3 pt-3.5 flex items-start pointer-events-none">
            <Icon className="h-5 w-5 text-primary dark:text-primary-dark" aria-hidden="true" />
        </div>
        <textarea
            id={id}
            value={value}
            onChange={onChange}
            required={required}
            name={name}
            maxLength={maxLength}
            rows={3}
            className={`${fieldClass(error)} resize-y min-h-[6rem]`}
            aria-required={required}
            aria-invalid={!!error}
        />
        <FieldError error={error} />
    </div>
));

MaterialTextarea.displayName = 'MaterialTextarea';

export interface MaterialSelectProps {
    icon: LucideIcon;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    /** The owner's options, rendered raw. */
    options: string[];
    /** The empty first entry, e.g. "Choose an option". */
    placeholder: string;
    error?: string;
    required?: boolean;
    name: string;
    id: string;
    hint?: string;
}

/** One of the owner's options: the "choice" question (LT-178). */
export const MaterialSelect = memo(({
    icon: Icon,
    label,
    value,
    onChange,
    options,
    placeholder,
    error,
    required = false,
    name,
    id,
    hint
}: MaterialSelectProps) => (
    <div className="relative pt-2">
        <FieldLabel htmlFor={id} label={label} hint={hint} />
        <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-primary dark:text-primary-dark" aria-hidden="true" />
        </div>
        <select
            id={id}
            value={value}
            onChange={onChange}
            required={required}
            name={name}
            className={`${fieldClass(error)} appearance-none cursor-pointer pe-10`}
            aria-required={required}
            aria-invalid={!!error}
        >
            <option value="">{placeholder}</option>
            {options.map((option) => (
                <option key={option} value={option}>{option}</option>
            ))}
        </select>
        <div className="absolute inset-y-0 end-0 pe-3 flex items-center pointer-events-none">
            <ChevronDown className="h-5 w-5 text-light-text/60 dark:text-dark-text/60" aria-hidden="true" />
        </div>
        <FieldError error={error} />
    </div>
));

MaterialSelect.displayName = 'MaterialSelect';

export interface MaterialCheckboxProps {
    label: string;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    required?: boolean;
    name: string;
    id: string;
    hint?: string;
}

/** A box to tick: the "confirm" question (LT-178). */
export const MaterialCheckbox = memo(({
    label,
    checked,
    onChange,
    error,
    required = false,
    name,
    id,
    hint
}: MaterialCheckboxProps) => (
    <div className="pt-2">
        <label
            htmlFor={id}
            className={`flex items-start gap-3 px-4 py-3 border-2 rounded-design-sm cursor-pointer transition-all ${error
                ? 'border-red-500 dark:border-red-500'
                : 'border-primary/30 dark:border-primary-dark/30'
                }`}
        >
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                required={required}
                name={name}
                className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-primary dark:accent-primary-dark"
                aria-required={required}
                aria-invalid={!!error}
            />
            <span className="text-light-text dark:text-dark-text">
                {label}
                {hint && <span className="ms-1 text-sm text-light-text/60 dark:text-dark-text/60">({hint})</span>}
            </span>
        </label>
        <FieldError error={error} />
    </div>
));

MaterialCheckbox.displayName = 'MaterialCheckbox';
