import React, { memo } from 'react';
import { LucideIcon } from 'lucide-react';

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
    title
}: MaterialInputProps) => (
    <div className="relative pt-2">
        <label
            htmlFor={id}
            className="absolute left-10 -top-0 px-2 text-sm font-medium text-primary dark:text-primary-dark bg-light-surface dark:bg-dark-surface"
        >
            {label}
        </label>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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
            className={`w-full pl-10 pr-4 py-3 bg-transparent border-2 ${error
                ? 'border-red-500 dark:border-red-500'
                : 'border-primary/30 dark:border-primary-dark/30 focus:border-primary dark:focus:border-primary-dark'
                } rounded-lg transition-all outline-none text-light-text dark:text-dark-text placeholder-light-text/50 dark:placeholder-dark-text/50`}
            aria-required={required}
            aria-invalid={!!error}
        />
        {error && (
            <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>
        )}
    </div>
));

MaterialInput.displayName = 'MaterialInput';
