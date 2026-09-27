import { PenLine, AlignLeft, ListChecks } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { BookingField, AnswerValue, ANSWER_MAX_LENGTH } from '../../models/BookingField';
import { MaterialInput, MaterialTextarea, MaterialSelect, MaterialCheckbox } from '../Layout/Schedule/ScheduleForms';
import { AddressAutocomplete } from '../Layout/Schedule/AddressAutocomplete';

export interface QuestionFieldProps {
  field: BookingField;
  value: AnswerValue;
  error?: string;
  onChange: (key: string, value: AnswerValue) => void;
  /** An address question reports whether Google's suggestions are live (LT-191). */
  onAddressActive: (key: string, active: boolean) => void;
  /** `schedule-answer` on the booking form, `contact-answer` on the lead form. */
  idPrefix: string;
}

/**
 * One of the owner's own questions (LT-178), shared by the booking form and
 * the lead form (LT-197). The label and the options are the owner's words,
 * rendered raw — never through t(). Text and address are single-line inputs
 * like name and phone; a note is a textarea, a choice a select, a confirm a
 * box to tick.
 */
export const QuestionField = ({ field, value, error, onChange, onAddressActive, idPrefix }: QuestionFieldProps) => {
  const { t } = useLanguage();
  const text = typeof value === 'string' ? value : '';
  // Name and phone carry no marker and are required, so on these forms an
  // unmarked question is required too; the optional ones say so.
  const hint = field.required ? undefined : t('schedule.form.answer.optional');
  const id = `${idPrefix}-${field.key}`;
  const name = `answer-${field.key}`;

  switch (field.type) {
    case 'confirm':
      return (
        <MaterialCheckbox
          label={field.label}
          checked={value === true}
          onChange={(e) => onChange(field.key, e.target.checked)}
          error={error}
          required={field.required}
          name={name}
          id={id}
          hint={hint}
        />
      );
    case 'choice':
      return (
        <MaterialSelect
          icon={ListChecks}
          label={field.label}
          value={text}
          options={field.options}
          placeholder={t('schedule.form.answer.choose')}
          onChange={(e) => onChange(field.key, e.target.value)}
          error={error}
          required={field.required}
          name={name}
          id={id}
          hint={hint}
        />
      );
    case 'note':
      return (
        <MaterialTextarea
          icon={AlignLeft}
          label={field.label}
          value={text}
          onChange={(e) => onChange(field.key, e.target.value)}
          error={error}
          required={field.required}
          name={name}
          id={id}
          maxLength={ANSWER_MAX_LENGTH.note}
          hint={hint}
        />
      );
    case 'address':
      // Google's suggestions under the input (LT-191); the plain input it
      // always was when there is no key or Google is unreachable.
      return (
        <AddressAutocomplete
          label={field.label}
          value={value}
          onChange={(answer) => onChange(field.key, answer)}
          onActiveChange={(active) => onAddressActive(field.key, active)}
          error={error}
          required={field.required}
          name={name}
          id={id}
          maxLength={ANSWER_MAX_LENGTH.address}
          hint={hint}
        />
      );
    default:
      return (
        <MaterialInput
          icon={PenLine}
          label={field.label}
          value={text}
          onChange={(e) => onChange(field.key, e.target.value)}
          error={error}
          required={field.required}
          name={name}
          id={id}
          maxLength={ANSWER_MAX_LENGTH.text}
          hint={hint}
        />
      );
  }
};
