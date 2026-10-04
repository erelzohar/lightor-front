import React, { useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Appointment } from '../../models/Appointment';
import {
  AnswerValue,
  AppointmentAnswer,
  BookingField,
  answerProblem,
  answersForRequest,
} from '../../models/BookingField';
import AppointmentService, { BOOKING_CLOSED, BookingRefusedError } from '../../services/AppointmentService';
import { QuestionField } from '../common/QuestionField';

/** A stored answer back in the shape the form edits. */
const toValue = (field: BookingField, answer: AppointmentAnswer | undefined): AnswerValue => {
  if (!answer) return undefined;
  if (field.type === 'confirm') return answer.value === 'yes';
  if (field.type === 'address' && answer.placeId && typeof answer.lat === 'number' && typeof answer.lng === 'number') {
    return { text: answer.value, placeId: answer.placeId, lat: answer.lat, lng: answer.lng };
  }
  return answer.value;
};

interface AnswersEditorProps {
  appointment: Appointment;
  /** The booked service's questions, in the owner's order. */
  fields: BookingField[];
  onSaved: (updated: Appointment) => void;
  onCancel: () => void;
}

/**
 * The customer corrects their answers from the manage link (LT-217, phase 2
 * of the booking questions): the service's questions, filled with what they
 * gave, checked as on the booking form, then sent as key and value — the
 * server rebuilds them from the owner's catalog and tells the owner.
 */
const AnswersEditor: React.FC<AnswersEditorProps> = ({ appointment, fields, onSaved, onCancel }) => {
  const { t } = useLanguage();
  const [values, setValues] = useState<Record<string, AnswerValue>>(() =>
    Object.fromEntries(fields.map((field) => [field.key, toValue(field, appointment.answers.find((a) => a.key === field.key))]))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // An address whose Google suggestions are live must be chosen from them (LT-191).
  const [liveAddress, setLiveAddress] = useState<Record<string, boolean>>({});

  const onChange = useCallback((key: string, value: AnswerValue) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);
  const onAddressActive = useCallback((key: string, active: boolean) => {
    setLiveAddress((prev) => (prev[key] === active ? prev : { ...prev, [key]: active }));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const problems: Record<string, string> = {};
    for (const field of fields) {
      const problem = answerProblem(field, values[field.key], { chooseAddress: liveAddress[field.key] });
      if (problem === 'required') problems[field.key] = t('schedule.validation.answer.required');
      else if (problem === 'invalid') problems[field.key] = t('schedule.validation.answer.invalid');
      else if (problem === 'chooseAddress') problems[field.key] = t('schedule.validation.answer.chooseAddress');
    }
    setErrors(problems);
    setFailure(null);
    if (Object.keys(problems).length > 0) return;

    setSaving(true);
    try {
      const updated = await AppointmentService.getInstance().updateAnswers(appointment._id, answersForRequest(fields, values));
      onSaved(updated);
    } catch (error) {
      if (error instanceof BookingRefusedError && error.details?.key && fields.some((f) => f.key === error.details?.key)) {
        setErrors({
          [error.details.key]: t(error.code === 'ANSWER_REQUIRED' ? 'schedule.validation.answer.required' : 'schedule.validation.answer.invalid'),
        });
      } else if (error instanceof Error && error.message === BOOKING_CLOSED) {
        setFailure(t('manage.details.closed'));
      } else if (error instanceof Error && error.message === 'CUSTOMER_BLOCKED') {
        setFailure(t('schedule.blockedError'));
      } else {
        setFailure(t('manage.details.failed'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="mt-3 space-y-5" data-testid="answers-editor" noValidate>
      {fields.map((field) => (
        <QuestionField
          key={field.key}
          field={field}
          value={values[field.key]}
          error={errors[field.key]}
          onChange={onChange}
          onAddressActive={onAddressActive}
          idPrefix="manage-answer"
        />
      ))}
      {failure && (
        <p className="text-sm text-red-500" role="alert">
          {failure}
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="submit"
          disabled={saving}
          className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark text-sm font-medium disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {t('manage.details.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="w-full sm:flex-1 py-2.5 px-4 rounded-xl border border-light-gray dark:border-dark-gray text-sm font-medium text-light-text dark:text-dark-text"
        >
          {t('manage.details.cancel')}
        </button>
      </div>
    </form>
  );
};

export default AnswersEditor;
