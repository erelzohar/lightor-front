import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle, ChevronLeft, ChevronRight, Phone, User, Shield, Tag, XCircle, MessageSquareX, MessageSquareCode, MessagesSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../../contexts/LanguageContext';
import { AppointmentType } from '../../../models/AppointmentType';
import { Appointment } from '../../../models/Appointment';
import { ScheduleConfig } from '../../../models/ScheduleConfig';
import AppointmentService from '../../../services/AppointmentService';
import smsService from '../../../services/SmsService';
import { Loader } from 'lucide-react';
import { Vacation } from '../../../models/Vacation';
import { MaterialInput } from './ScheduleForms';
import { DateButton } from './ScheduleCalendar';

interface BookingFormData {
  name: string;
  phone: string;
  verificationCode: string;
}

interface FormErrors {
  name?: string;
  phone?: string;
  verificationCode?: string;
}

interface ScheduleProps {
  config: ScheduleConfig;
  workingDays: (string | null)[];
  user_id: string;
  phone: string;
  businessName: string;
  timeToCancel: number;
  vacations: Vacation[];
  appointmentTypes: AppointmentType[];
  minsPerSlot: number;
  isUpdating?: boolean;
  appointmentToUpdate?: Appointment;
  onUpdateComplete?: (newAppointment: Appointment) => void;
  onCancelUpdate?: () => void;
}


const Schedule: React.FC<ScheduleProps> = ({ config, workingDays, user_id, phone, businessName, timeToCancel, vacations, appointmentTypes, minsPerSlot, isUpdating, appointmentToUpdate, onUpdateComplete, onCancelUpdate }) => {
  const { t, language } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedAppointmentType, setSelectedAppointmentType] = useState<AppointmentType | null>(null);
  const [bookingStep, setBookingStep] = useState<'date' | 'type' | 'time' | 'details' | 'verification'>('date');
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    phone: '',
    verificationCode: ''
  });
  const [channelType, setChannelType] = useState<'sms' | 'whatsapp'>('sms');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isUpdating && appointmentToUpdate) {
      setFormData({
        name: appointmentToUpdate.name,
        phone: appointmentToUpdate.phone,
        verificationCode: ''
      });
      setSelectedAppointmentType(appointmentToUpdate.type);
      const date = new Date(parseInt(appointmentToUpdate.timestamp));
      date.setHours(0, 0, 0, 0);
      setSelectedDate(date);
      const hours = new Date(parseInt(appointmentToUpdate.timestamp)).getHours().toString().padStart(2, '0');
      const minutes = new Date(parseInt(appointmentToUpdate.timestamp)).getMinutes().toString().padStart(2, '0');
      setSelectedTime(`${hours}:${minutes}`);
    }
  }, [isUpdating, appointmentToUpdate]);
  const [error, setError] = useState<string | null>(null);
  const [bookedAppointments, setBookedAppointments] = useState<Appointment[]>([]);
  const [resendTimer, setResendTimer] = useState(0);
  const days = [t('day.0'), t('day.1'), t('day.2'), t('day.3'), t('day.4'), t('day.5'), t('day.6')];

  const millisecondsToTimeMap: Record<number, string> = {
    0: t('time.unlimited'),
    90000: t('time.half.hour'),
    1800000: t('time.half.hour'),
    3600000: t('time.hour'),
    7200000: t('time.2hours'),
    10800000: t('time.3hours'),
    14400000: t('time.4hours'),
    21600000: t('time.6hours'),
    43200000: t('time.12hours'),
    86400000: t('time.24hours'),
    172800000: t('time.48hours'),
    259200000: t('time.72hours'),
    604800000: t('time.week'),
    1209600000: t('time.2weeks')
  };


  useEffect(() => {
    if (error) throw error;
    AppointmentService.getInstance()
      .getAppointments("?user_id=" + user_id + "&status=scheduled&startDate=" + Date.now())
      .then(setBookedAppointments)
      .catch((err) => setError(err.message || String(err)));

  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const validateForm = useCallback(() => {
    const errors: FormErrors = {};

    if (formData.name.length < 2) {
      errors.name = t('schedule.validation.name');
    }

    if (!formData.phone.startsWith('05')) {
      errors.phone = t('schedule.validation.phone.start');
    } else if (formData.phone.length !== 10) {
      errors.phone = t('schedule.validation.phone.length');
    } else if (!/^\d+$/.test(formData.phone)) {
      errors.phone = t('schedule.validation.phone.digits');
    }

    if (bookingStep === 'verification') {
      if (formData.verificationCode.length !== 6) {
        errors.verificationCode = t('schedule.validation.otp.length');
      } else if (!/^\d+$/.test(formData.verificationCode)) {
        errors.verificationCode = t('schedule.validation.otp.digits');
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, bookingStep, language]);

  const resetCalendar = useCallback(() => {
    setError(null);
    setIsSuccess(false);
    setSelectedDate(null);
    setSelectedAppointmentType(null);
    setSelectedTime(null);
    setFormData({ name: '', phone: '', verificationCode: '' });
    setBookingStep('date');
  }, []);

  const handleDetailsSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!selectedDate || !selectedAppointmentType) {
      setError(t('schedule.error'));
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await smsService.sendOtp(formData.phone, channelType);
      if (success) {
        setError(null);
        setResendTimer(30);
        setBookingStep('verification');
      } else {
        setError(t('schedule.error.sendOtp'));
      }
    } catch (error) {
      setError(t('schedule.error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, selectedDate, selectedAppointmentType, t, language, channelType]);

  const handleResendCode = useCallback(async () => {
    setResendTimer(30);
    try {
      await smsService.sendOtp(formData.phone, channelType);
    } catch (error) {
      console.error("Failed to resend code");
    }
  }, [formData.phone, channelType]);

  const handleVerificationSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!selectedDate || !selectedAppointmentType) return; // Should be set if we are here

    lastSubmittedCode.current = formData.verificationCode;

    setIsSubmitting(true);
    try {
      const verified = await smsService.verifyOtp(formData.phone, formData.verificationCode);
      if (!verified) {
        setError(t('schedule.error.invalidOtp'));
        setIsSubmitting(false);
        formData.verificationCode = "";
        otpInputRefs.current[0]?.focus();
        return;
      }

      // Proceed to create appointment
      const fixedDate = new Date(selectedDate);
      fixedDate.setHours(+selectedTime.split(":")[0])
      fixedDate.setMinutes(+selectedTime.split(":")[1])

      const appointmentToCreate = {
        name: formData.name,
        phone: formData.phone,
        type_id: selectedAppointmentType._id,
        timestamp: fixedDate.valueOf().toString(),
        user_id,
        status: "scheduled"
      }
      const service = AppointmentService.getInstance();
      const res = isUpdating && appointmentToUpdate
        ? await service.updateAppointment({ ...appointmentToUpdate, ...appointmentToCreate })
        : await service.createAppointment(appointmentToCreate);

      setBookedAppointments(prev => isUpdating ? prev.map(a => a._id === res._id ? res : a) : [...prev, res])

      if (isUpdating && onUpdateComplete) {
        onUpdateComplete(res);
      }

      try {
        const dateStr = `${selectedDate.getDate()}.${selectedDate.getMonth() + 1}`;
        const timeUntilLabel = timeToCancel > 0
          ? t('common.until', { time: millisecondsToTimeMap[timeToCancel] }) + ' ' + t('common.before')
          : '';

        const userMsg = t(isUpdating ? 'schedule.confirmation.user.update' : 'schedule.confirmation.user', {
          name: formData.name,
          businessName: businessName,
          day: days[selectedDate.getDay()],
          date: dateStr,
          time: selectedTime,
          timeUntilLabel: timeUntilLabel,
          link: "https://" + window.location.hostname + "/manage/" + res._id
        });

        await smsService.sendSMS(formData.phone, userMsg);

        if (!isUpdating) {
          const businessMsg = t('schedule.confirmation.business', {
            name: formData.name,
            phone: formData.phone,
            day: days[selectedDate.getDay()],
            date: dateStr,
            time: selectedTime
          });

          await smsService.sendSMS(phone, businessMsg);
        }
      }
      catch (err) {
        console.log("Failed to send message");
      }
      setError(null);
      setSuccessMessage(isUpdating ? t('schedule.update.success') : t('schedule.success'));
      setIsSuccess(true);
      setTimeout(() => {
        resetCalendar();
      }, 5000);

    } catch (error: any) {
      if (error && error.message === "SLOT_TAKEN") {
        AppointmentService.getInstance()
          .getAppointments("?user_id=" + user_id + "&status=scheduled&startDate=" + Date.now())
          .then(setBookedAppointments)
          .catch(console.error);
        setError(t('schedule.conflictError'));
        setTimeout(() => {
          resetCalendar();
        }, 5000);
      }
      else setError(t('schedule.error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, selectedDate, selectedAppointmentType, selectedTime, user_id, days, businessName, timeToCancel, phone, t, resetCalendar, language, millisecondsToTimeMap]);

  const handleInputChange = (field: keyof BookingFormData, value: string) => {
    let processedValue = value;

    switch (field) {
      case 'phone':
        processedValue = value.replace(/\D/g, '').slice(0, 10);
        break;
      case 'verificationCode':
        processedValue = value.replace(/\D/g, '').slice(0, 6);
        break;
      case 'name':
        processedValue = value.replace(/[^\p{L}\s]/gu, '').slice(0, 50);
        break;
    }

    setFormData(prev => ({ ...prev, [field]: processedValue }));
    setFormErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const lastSubmittedCode = useRef<string | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const chars = (formData.verificationCode || '').split('');
    while (chars.length < 6) chars.push('');

    chars[index] = value;
    const newCode = chars.join('').slice(0, 6);

    handleInputChange('verificationCode', newCode);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !formData.verificationCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    if (!isSubmitting &&
      !isSuccess &&
      bookingStep === 'verification' &&
      formData.verificationCode.length === 6 &&
      formData.verificationCode !== lastSubmittedCode.current
    ) {
      handleVerificationSubmit({ preventDefault: () => { } } as React.FormEvent);
    }
  }, [formData.verificationCode, bookingStep, handleVerificationSubmit, isSubmitting, isSuccess]);

  // The function now accepts the duration of the slot being tested (new appointment)
  const isTimeSlotBooked = useCallback((date: Date, timeStr: string, testDurationMS: number) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const testSlotStart = new Date(date);
    testSlotStart.setHours(hours, minutes, 0, 0);
    const testSlotEnd = testSlotStart.getTime() + testDurationMS; // End time of the new slot

    return bookedAppointments.some(appointment => {
      const appointmentStart = parseInt(appointment.timestamp);
      // Ensure type.durationMS is treated as string properly before parsing if needed, or assume model is strings
      const appointmentDuration = parseInt(appointment.type.durationMS);
      const appointmentEnd = appointmentStart + appointmentDuration; // End time of the existing appointment

      // 1. Existing appointment starts during the new slot's duration
      const overlapStart1 = appointmentStart >= testSlotStart.getTime() && appointmentStart < testSlotEnd;

      // 2. New slot starts during the existing appointment's duration
      const overlapStart2 = testSlotStart.getTime() >= appointmentStart && testSlotStart.getTime() < appointmentEnd;

      return overlapStart1 || overlapStart2;
    });
  }, [bookedAppointments]);

  // Inside the Schedule component definition

  /**
   * Checks if a potential new time slot (start time + duration) overlaps 
   * with any vacation period.
   * * @param date The Date object for the day being checked.
   * @param timeStr The start time string of the potential slot (e.g., "14:00").
   * @param testDurationMS The duration (in milliseconds) of the potential new appointment. // <--- NEW PARAMETER
   * @returns true if there is an overlap with vacation, false otherwise.
   */
  const isTimeInVacation = useCallback((date: Date, timeStr: string, testDurationMS: number) => {
    // 1. Calculate the New Slot Window (Proposed Appointment)
    const [hours, minutes] = timeStr.split(':').map(Number);
    const testSlotStart = new Date(date);
    testSlotStart.setHours(hours, minutes, 0, 0);

    const testSlotStartTime = testSlotStart.getTime();
    const testSlotEnd = testSlotStartTime + testDurationMS; // End time of the new slot (e.g., 14:00 + 1hr = 15:00)

    // 2. Iterate and Check Against Vacation Periods
    return vacations.some(vacation => {
      // Retrieve the start and end times of the existing vacation
      const vacationStart = +vacation.startDate; // Existing Vacation Start (e.g., 14:20)
      const vacationEnd = +vacation.endDate;     // Existing Vacation End (e.g., 16:00)

      // 3. Overlap Check Logic (C < B AND A < D)

      // C < B: Vacation period starts before the new slot ends
      const vacationStartsBeforeSlotEnds = vacationStart < testSlotEnd;

      // A < D: New slot starts before the vacation period ends
      const slotStartsBeforeVacationEnds = testSlotStartTime < vacationEnd;

      return vacationStartsBeforeSlotEnds && slotStartsBeforeVacationEnds;
    });
  }, [vacations]);



  const generateTimeSlots = useCallback((date: Date, durationMS: number | undefined) => {
    const dayOfWeek = date.getDay();
    const workingHours = workingDays[dayOfWeek];

    if (!workingHours) return [];

    const [start, end] = workingHours.split('-');
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);

    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    const slots = [];

    const durationMinutes = durationMS ? durationMS / 60000 : minsPerSlot;
    const slotInterval = minsPerSlot;

    const now = new Date();
    const testDurationMS = durationMS || minsPerSlot * 60000; // Duration to test against

    for (let time = startTime; (time + durationMinutes) <= endTime; time += slotInterval) {

      const hour = Math.floor(time / 60);
      const minute = time % 60;

      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const slotDateTime = new Date(date);
      slotDateTime.setHours(hour, minute, 0, 0);

      if (
        slotDateTime.getTime() > now.getTime() &&
        // 🚨 CRITICAL FIX HERE: Pass testDurationMS to isTimeInVacation
        !isTimeInVacation(date, timeStr, testDurationMS) &&
        !isTimeSlotBooked(date, timeStr, testDurationMS)
      ) {
        slots.push(timeStr);
      }
    }

    return slots;
  }, [workingDays, minsPerSlot, isTimeInVacation, isTimeSlotBooked]);

  const isPast = useCallback((date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }, []);

  const isSelected = useCallback((date: Date) => {
    if (!selectedDate) return false;
    return date.getTime() === selectedDate.getTime();
  }, [selectedDate]);

  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }, []);

  const isAvailable = useCallback((date: Date) => {
    const dayIndex = date.getDay();
    if (workingDays[dayIndex] === null) return false;
    return generateTimeSlots(date, minsPerSlot * 60000).length > 0;
  }, [workingDays, generateTimeSlots, minsPerSlot]);

  const isNextMonth = useCallback((date: Date) => {
    return date.getMonth() > currentMonth.getMonth();
  }, [currentMonth]);

  const isCurrentMonth = useCallback(() => {
    const today = new Date();
    return currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear();
  }, [currentMonth]);


  const getAvailabilityStatus = useCallback((date: Date): 'full' | 'limited' | 'none' | 'vacation' | 'past' => {
    if (isPast(date)) return 'past';

    const dayIndex = date.getDay();
    const workingHours = workingDays[dayIndex];

    // Check 1: Is it a day the business is scheduled to work?
    const isScheduledWorkingDay = workingHours !== null;

    // --- Calculate total working capacity (needed for thresholds) ---
    const totalWorkingMinutes = workingHours
      ? (parseInt(workingHours.split('-')[1].split(':')[0]) * 60 + parseInt(workingHours.split('-')[1].split(':')[1]))
      - (parseInt(workingHours.split('-')[0].split(':')[0]) * 60 + parseInt(workingHours.split('-')[0].split(':')[1]))
      : 0;

    // Total number of possible slots in the day, using the smallest interval (minsPerSlot)
    const estimatedMaxSlots = Math.floor(totalWorkingMinutes / minsPerSlot);


    // --- Define Thresholds ---
    // 'full' > 55% availability
    // 'limited' <= 55% availability (but > 0)
    // We can define the boundary where 'limited' begins.
    // The requirement is 'limited' if 55% OR LESS is available.

    // If availability is > 55% (i.e., > 0.55), it's 'full'.
    // If availability is <= 55% (i.e., <= 0.55) and > 0, it's 'limited'.

    // We only need one threshold to define the boundary:
    const FULL_THRESHOLD_COUNT = Math.floor(estimatedMaxSlots * 0.55);


    // --- Generate Slots ---
    // The duration used for status checks is the minimum slot duration
    const checkDurationMS = minsPerSlot * 60000;
    const availableSlots = generateTimeSlots(date, checkDurationMS);


    // Check 2: Are there available slots left?
    if (availableSlots.length === 0) {

      if (!isScheduledWorkingDay) {
        return 'none'; // Not a working day
      }

      // --- Vacation Check (Only for scheduled working days with 0 slots) ---
      const startTimeStr = workingHours!.split('-')[0];

      // Pass the duration to perform the robust overlap check for the entire day's start
      if (isTimeInVacation(date, startTimeStr, checkDurationMS)) {
        return 'vacation';
      } else {
        // Start time is fine, but 0 available slots. Fully booked or time passed.
        return 'none';
      }
    }


    // Check 3: Determine degree of availability (Using the new threshold)

    if (availableSlots.length > FULL_THRESHOLD_COUNT) { // Availability is > 55%
      return 'full';
    } else { // availableSlots.length is > 0 and <= FULL_THRESHOLD_COUNT (i.e., <= 55% available)
      return 'limited';
    }
  }, [isPast, workingDays, generateTimeSlots, minsPerSlot, isTimeInVacation]);

  const formatSelectedDate = useCallback((date: Date) => {
    return date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, [language]);

  const formatTime = useCallback((timestamp: string) => {
    const date = new Date(parseInt(timestamp));
    return date.toLocaleTimeString(language === 'he' ? 'he-IL' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: language !== 'he',
    });
  }, [language]);

  const handleDateSelect = useCallback((date: Date) => {
    if (!isPast(date) && isAvailable(date)) {
      if (isNextMonth(date)) {
        setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      }
      setSelectedDate(date);
      setBookingStep('type');
    }
  }, [isPast, isAvailable, isNextMonth]);

  const handleAppointmentTypeSelect = useCallback((type: AppointmentType) => {
    setSelectedAppointmentType(type);
    setSelectedTime('');
    setBookingStep('time');
  }, []);

  const handleTimeSelect = useCallback((time: string) => {
    setSelectedTime(time);
    setBookingStep('details');
  }, []);

  const handleBack = useCallback(() => {
    switch (bookingStep) {
      case 'date':
        if (isUpdating && onCancelUpdate) {
          onCancelUpdate();
        }
        break;
      case 'type':
        setSelectedDate(null);
        setBookingStep('date');
        break;
      case 'time':
        setSelectedAppointmentType(null);
        setBookingStep('type');
        break;
      case 'details':
        setSelectedTime('');
        setBookingStep('time');
        break;
      case 'verification':
        setBookingStep('details');
        break;
    }
  }, [bookingStep]);

  const getDayNames = useCallback(() => {
    const days = [];
    const firstDayOfWeek = new Date();
    firstDayOfWeek.setDate(firstDayOfWeek.getDate() - firstDayOfWeek.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(firstDayOfWeek);
      date.setDate(firstDayOfWeek.getDate() + i);
      days.push(
        new Intl.DateTimeFormat(language === 'he' ? 'he-IL' : 'en-US', {
          weekday: 'short'
        }).format(date)
      );
    }
    return days;
  }, [language]);

  const generateCalendarDays = useCallback(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];

    // Add empty slots for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    // Add current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const availabilityStatus = getAvailabilityStatus(date);

      days.push(
        <div key={`day-${i}`} className="aspect-square">
          <DateButton
            date={date}
            isPast={isPast}
            isSelected={isSelected}
            isToday={isToday}
            isAvailable={isAvailable}
            isNextMonth={isNextMonth}
            formatSelectedDate={formatSelectedDate}
            language={language}
            handleDateSelect={handleDateSelect}
            availabilityStatus={availabilityStatus}
          />
        </div>
      );
    }

    // Add first 3 days of next month if we're in last 5 days
    const today = new Date();
    const isLastFiveDays = today.getMonth() === month && today.getDate() > daysInMonth - 5;

    if (isLastFiveDays) {
      for (let i = 1; i <= 3; i++) {
        const date = new Date(year, month + 1, i);

        const availabilityStatus = getAvailabilityStatus(date);

        days.push(
          <div key={`next-${i}`} className="aspect-square">
            <DateButton
              date={date}
              isPast={isPast}
              isSelected={isSelected}
              isToday={isToday}
              isAvailable={isAvailable}
              isNextMonth={isNextMonth}
              formatSelectedDate={formatSelectedDate}
              language={language}
              handleDateSelect={handleDateSelect}
              availabilityStatus={availabilityStatus}
            />
          </div>
        );
      }
    }

    return days;
  }, [
    currentMonth,
    language,
    isPast,
    isSelected,
    isToday,
    isAvailable,
    isNextMonth,
    formatSelectedDate,
    handleDateSelect,
    getAvailabilityStatus
  ]);

  return (
    <section id="schedule" className="py-32 bg-gradient-to-b from-light-bg to-light-surface dark:from-dark-bg dark:to-dark-surface transition-colors duration-300">
      <motion.div className="container mx-auto px-4">
        <motion.div className="text-center mb-20">
          <h2 className="text-4xl font-bold text-light-text dark:text-dark-text mb-6">
            {config.title}
          </h2>
          <div className="w-24 h-1 bg-primary dark:bg-primary-dark mx-auto mb-8"></div>


          <p className="text-xl text-light-text/80 dark:text-dark-text/80 max-w-2xl mx-auto">
            {config.description}
          </p>

          {isUpdating && appointmentToUpdate && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="my-2 p-4 rounded-2xl bg-primary/5 dark:bg-primary-dark/5 border border-primary/10 dark:border-primary-dark/10 inline-flex flex-col items-center"
            >
              {/* <span className="text-sm font-medium text-light-text/60 dark:text-dark-text/60 mb-1">
                {t('schedule.original.appointment')}
              </span> */}
              <div className="flex items-center gap-3 text-primary dark:text-primary-dark font-semibold">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4" />
                  {formatSelectedDate(new Date(parseInt(appointmentToUpdate.timestamp)))}
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-primary/30 dark:bg-primary-dark/30" />
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {formatTime(appointmentToUpdate.timestamp)}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        <motion.div className="max-w-[700px] mx-auto">
          <motion.div className="bg-light-surface dark:bg-dark-surface rounded-3xl shadow-xl p-6 md:p-8">
            {(bookingStep !== 'date' || (isUpdating && onCancelUpdate)) && (
              <motion.button
                type="button"
                onClick={handleBack}
                className="mb-6 text-primary dark:text-primary-dark hover:underline flex items-center gap-2"
                whileHover={{ x: -5 }}
              >
                <ChevronLeft className={`h-5 w-5 ${language === 'he' ? 'rotate-180' : ''}`} />
                {t('common.back')}
              </motion.button>
            )}

            <div className="flex items-center justify-center gap-2 mb-8">
              {['date', 'type', 'time', 'details', 'verification'].map((step, index) => (
                <div
                  key={step}
                  className={`h-2 rounded-full transition-all ${index === ['date', 'type', 'time', 'details', 'verification'].indexOf(bookingStep)
                    ? 'w-8 bg-primary dark:bg-primary-dark'
                    : 'w-2 bg-primary/30 dark:bg-primary-dark/30'
                    }`}
                />
              ))}
            </div>

            {bookingStep === 'date' && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <motion.button
                    type="button"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                    className={`p-2 rounded-lg transition-colors ${isCurrentMonth()
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:bg-light-gray dark:hover:bg-dark-gray'
                      }`}
                    whileHover={!isCurrentMonth() ? { scale: 1.1 } : undefined}
                    whileTap={!isCurrentMonth() ? { scale: 0.9 } : undefined}
                    disabled={isCurrentMonth()}
                  >
                    <ChevronLeft className={`h-5 w-5 text-light-text dark:text-dark-text ${language === 'he' ? 'rotate-180' : ''}`} />
                  </motion.button>
                  <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">
                    {currentMonth.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </h3>
                  <motion.button
                    type="button"
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                    className="p-2 hover:bg-light-gray dark:hover:bg-dark-gray rounded-lg transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <ChevronRight className={`h-5 w-5 text-light-text dark:text-dark-text ${language === 'he' ? 'rotate-180' : ''}`} />
                  </motion.button>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-2">
                  {getDayNames().map((day, index) => (
                    <div
                      key={index}
                      className="text-center text-light-text/60 dark:text-dark-text/60 text-sm font-medium"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {generateCalendarDays()}
                </div>
                <div className={`mt-8 pt-4 border-t border-light-gray dark:border-dark-gray text-sm 
                            ${language === 'he' ? 'text-right' : 'text-left'}`}>

                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    {/* Full Availability Dot */}
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="text-light-text dark:text-dark-text/80">
                        {t('schedule.legend.available')}
                      </span>
                    </div>
                    {/* Limited Availability Dot */}
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <span className="text-light-text dark:text-dark-text/80">
                        {t('schedule.legend.limited')}
                      </span>
                    </div>
                    {/* vacation Dot */}
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                      <span className="text-light-text dark:text-dark-text/80">
                        {t('schedule.legend.vacation')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                      <span className="text-light-text dark:text-dark-text/80">
                        {t('schedule.legend.closed')}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {bookingStep === 'type' && selectedDate && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-semibold text-light-text dark:text-dark-text mb-6">
                  {t('schedule.select.type')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {appointmentTypes.map((type) => {
                    const durationMS = +type.durationMS || 0;
                    if (generateTimeSlots(selectedDate, durationMS).length > 0)
                      return (
                        <motion.button
                          key={type._id}
                          type="button"
                          onClick={() => handleAppointmentTypeSelect(type)}
                          className="p-6 rounded-xl bg-light-gray/30 dark:bg-dark-gray/30 hover:bg-primary/10 dark:hover:bg-primary-dark/10 transition-colors group"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 dark:bg-primary-dark/10 flex items-center justify-center group-hover:bg-primary/20 dark:group-hover:bg-primary-dark/20">
                              <Tag className="h-6 w-6 text-primary dark:text-primary-dark" />
                            </div>
                            <div className="flex-1 text-right">
                              <h4 className="font-semibold text-light-text dark:text-dark-text mb-1">
                                {type.name}
                              </h4>
                              <p className="text-sm text-light-text/70 dark:text-dark-text/70">
                                {parseInt(type.durationMS) / 60000} {t('common.minutes')} | ₪{type.price}
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      )
                  })}
                </div>
              </motion.div>
            )}

            {bookingStep === 'time' && selectedDate && selectedAppointmentType && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="p-4 rounded-lg bg-light-gray/30 dark:bg-dark-gray/30">
                  <h4 className="font-semibold text-light-text dark:text-dark-text mb-1">
                    {selectedAppointmentType.name}
                  </h4>
                  <p className="text-sm text-light-text/70 dark:text-dark-text/70">
                    {parseInt(selectedAppointmentType.durationMS) / 60000} {language === 'he' ? 'דקות' : 'minutes'} | ₪{selectedAppointmentType.price}
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
                    {t('schedule.available.times')} {formatSelectedDate(selectedDate)}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {generateTimeSlots(selectedDate, parseInt(selectedAppointmentType.durationMS)).map((time) => (
                      <motion.button
                        key={time}
                        type="button"
                        onClick={() => handleTimeSelect(time)}
                        className={`relative overflow-hidden p-3 rounded-xl text-sm font-medium ${selectedTime === time
                          ? 'bg-primary dark:bg-primary-dark text-white dark:text-dark-surface shadow-lg'
                          : 'bg-primary/10 dark:bg-primary-dark/10 text-primary dark:text-primary-dark hover:shadow-md'
                          }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          initial={{ x: '-100%' }}
                          whileHover={{ x: '100%' }}
                          transition={{ duration: 0.3 }}
                        />
                        <span className="relative flex items-center justify-center gap-2">
                          <Clock className="h-4 w-4" />
                          {time}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {bookingStep === 'details' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                <div className="flex flex-col items-center mb-8 text-center">
                  <div className="flex items-center gap-2 text-lg font-semibold text-light-text dark:text-dark-text">
                    <CalendarIcon className="h-5 w-5 text-primary/70 dark:text-primary-dark/70" />
                    <span>{selectedDate ? formatSelectedDate(selectedDate) : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 text-lg font-semibold text-light-text dark:text-dark-text mt-1">
                    <Clock className="h-5 w-5 text-primary/70 dark:text-primary-dark/70" />
                    <span>{selectedTime}</span>
                  </div>
                </div>
                <form onSubmit={handleDetailsSubmit}>
                  <MaterialInput
                    icon={User}
                    label={t('schedule.form.name')}
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    error={formErrors.name}
                    name="name"
                    id="schedule-name"
                    maxLength={50}
                  />

                  <div className="mt-6">
                    <MaterialInput
                      icon={Phone}
                      label={t('schedule.form.phone')}
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      error={formErrors.phone}
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      name="phone"
                      id="schedule-phone"
                    />
                  </div>



                  <div className="flex flex-col items-center gap-3 mt-6">
                    <span className="text-sm font-medium text-light-text/70 dark:text-dark-text/70 text-center">
                      {channelType === 'whatsapp'
                        ? t('schedule.channel.whatsapp')
                        : t('schedule.channel.sms')}
                    </span>
                    <div className="flex items-center gap-4 py-2" dir="ltr">
                      <MessagesSquare className={`w-6 h-6 transition-colors ${channelType === 'sms' ? 'text-amber-400' : 'text-gray-400'}`} />

                      <button
                        type="button"
                        onClick={() => setChannelType(prev => prev === 'sms' ? 'whatsapp' : 'sms')}
                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${channelType === 'whatsapp' ? 'bg-green-500' : 'bg-amber-400'
                          }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${channelType === 'whatsapp' ? 'translate-x-6' : 'translate-x-0'
                            }`}
                        />
                      </button>

                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className={`w-6 h-6 transition-colors ${channelType === 'whatsapp' ? 'text-[#25D366]' : 'text-gray-400'}`}
                        aria-hidden="true"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    className="w-full mt-8 bg-primary dark:bg-primary-dark text-white dark:text-dark-surface py-4 px-6 rounded-xl transition-all relative overflow-hidden shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isSubmitting || !formData.name || !formData.phone}
                  >

                    <span className="relative text-center">{isSubmitting ? <Loader className="animate-spin m-auto" /> : t('schedule.form.send.code')}</span>
                  </motion.button>
                  <p className="mt-4 text-xs text-light-text/60 dark:text-dark-text/50 text-center">
                    {t('schedule.form.helper')}
                  </p>
                </form>
              </motion.div>
            )}

            {bookingStep === 'verification' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col items-center mb-8 text-center">
                  <div className="flex items-center gap-2 text-lg font-semibold text-light-text dark:text-dark-text">
                    <CalendarIcon className="h-5 w-5 text-primary/70 dark:text-primary-dark/70" />
                    <span>{selectedDate ? formatSelectedDate(selectedDate) : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 text-lg font-semibold text-light-text dark:text-dark-text mt-1">
                    <Clock className="h-5 w-5 text-primary/70 dark:text-primary-dark/70" />
                    <span>{selectedTime}</span>
                  </div>
                </div>
                <form onSubmit={handleVerificationSubmit}>
                  <div className="flex justify-center gap-1 sm:gap-2 mb-2 mx-1" dir="ltr">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <input
                        key={index.toString()}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={formData.verificationCode[index] || ''}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className={`w-11 h-14 sm:w-14 sm:h-16 text-center text-xl font-bold rounded-lg border-2 shadow-sm focus:shadow-md transition-all outline-none
                          ${formErrors.verificationCode
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/10'
                            : 'border-gray-200 dark:border-gray-700 focus:border-primary dark:focus:border-primary-dark bg-white dark:bg-gray-800'
                          } text-gray-800 dark:text-gray-100`}
                        autoFocus={index === 0}
                      />
                    ))}
                  </div>
                  {formErrors.verificationCode && (
                    <p className="text-sm text-red-500 text-center mb-4">{formErrors.verificationCode}</p>
                  )}

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-light-text/65 dark:text-dark-text/60 text-center mt-4 mb-4"
                  >
                    {t('schedule.form.verification.message')}
                  </motion.p>

                  <div className="flex flex-col items-center gap-3 mb-4">
                    <span className="text-sm font-medium text-light-text/70 dark:text-dark-text/70 text-center">
                      {channelType === 'whatsapp'
                        ? t('schedule.channel.whatsapp')
                        : t('schedule.channel.sms')}
                    </span>
                    <div className="flex items-center gap-4 py-2" dir="ltr">
                      <MessagesSquare className={`w-6 h-6 transition-colors ${channelType === 'sms' ? 'text-amber-400' : 'text-gray-400'}`} />

                      <button
                        type="button"
                        onClick={() => setChannelType(prev => prev === 'sms' ? 'whatsapp' : 'sms')}
                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${channelType === 'whatsapp' ? 'bg-green-500' : 'bg-amber-400'
                          }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${channelType === 'whatsapp' ? 'translate-x-6' : 'translate-x-0'
                            }`}
                        />
                      </button>

                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className={`w-6 h-6 transition-colors ${channelType === 'whatsapp' ? 'text-[#25D366]' : 'text-gray-400'}`}
                        aria-hidden="true"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </div>
                  </div>

                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendTimer > 0}
                      className={`text-sm font-medium transition-colors ${resendTimer > 0
                        ? 'text-light-text/65 dark:text-dark-text/65 cursor-not-allowed'
                        : 'text-primary dark:text-primary-dark underline'
                        }`}
                    >
                      {resendTimer > 0
                        ? `${t('schedule.form.resend.wait')} ${resendTimer} ${t('schedule.form.resend.timer')}`
                        : t('schedule.form.resend.code')}
                    </button>
                  </div>
                  <motion.button
                    type="submit"
                    className="w-full mt-8 bg-primary dark:bg-primary-dark text-white dark:text-dark-surface py-4 px-6 rounded-xl transition-all relative overflow-hidden shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isSubmitting || !formData.verificationCode}
                  >
                    <span className="relative">{isSubmitting ? <Loader className="animate-spin m-auto" /> : t('schedule.form.verify')}</span>
                  </motion.button>


                </form>
              </motion.div>
            )}

            <AnimatePresence>
              {isSuccess && (
                <motion.div
                  key="success-message"
                  className="mt-6 text-emerald-500 dark:text-emerald-400 text-center flex items-center justify-center space-x-2"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <CheckCircle className="h-5 w-5" />
                  <span>{successMessage}</span>
                </motion.div>
              )}
              {error && (
                <motion.div
                  key="error-message"
                  className="mt-6 text-red-500 dark:text-red-400 text-center flex items-center justify-center space-x-2"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <XCircle className="h-5 w-5" />
                  {/* <span>{t('schedule.error')}</span> */}
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </motion.div>
    </section >
  );
};

export default Schedule;