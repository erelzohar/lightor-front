import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Phone, CheckCircle, Loader2, AlertTriangle, Edit, Trash, Tag } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Appointment } from '../models/Appointment';
import Schedule from './Layout/Schedule/Schedule';
import AppointmentService from '../services/AppointmentService';
import NotFound from './NotFound';
import { useTheme } from '../hooks/useTheme';
import smsService from '../services/SmsService';
import WebConfigService from '../services/WebConfigService';
import { WebsiteConfig } from '../models/WebsiteConfig';



const ManageAppointment: React.FC = () => {
  const { 'appointment-id': appointmentId } = useParams();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [minCancelTime, setMinCancelTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastAction, setLastAction] = useState<'cancel' | 'update'>('cancel');
  const [config, setConfig] = useState<WebsiteConfig | null>(null);
  const service = AppointmentService.getInstance()
  const configService = WebConfigService.getInstance();

  useTheme(config);

  document.title = t('manage.manage.title');

  useEffect(() => {
    if (!appointmentId) return;
    const fetchAppointment = async () => {
      try {
        const response = await service.getAppointmentById(appointmentId as string);
        if (!response) {
          throw new Error('Appointment not found');
        }
        setAppointment(response);
        const config = await configService.getWebConfigByUserId(response.user_id);
        if (!config) throw new Error('Error loading config');
        setConfig(config);
        setMinCancelTime(config.minCancelTimeMS);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch appointment');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointment();

  }, [appointmentId]);


  const canCancelAppointment = (timestamp: string): boolean => {
    const appointmentTime = parseInt(timestamp);
    const currentTime = Date.now();
    return appointmentTime - currentTime >= minCancelTime;
  };

  const handleCancel = async () => {
    if (!appointment || !canCancelAppointment(appointment.timestamp)) {
      return;
    }

    setIsCancelling(true);
    try {
      await service.updateAppointment({ ...appointment, status: "cancelled" });
      setIsSuccess(true);
      try {
        const service = WebConfigService.getInstance();
        const res = await service.getWebConfigByUserId(appointment.user_id);
        const businessPhone = res.contact.phone;
        const msg = `התור של ${appointment.name} - ${appointment.phone}
        בתאריך ${formatDate(appointment.timestamp)} בשעה ${formatTime(appointment.timestamp)}
        בוטל ע"י הלקוח
        Lightor`;

        await smsService.sendSMS(businessPhone, msg);
      }
      catch (err) {

      }
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel appointment');
    } finally {
      setIsCancelling(false);
      setIsConfirmationOpen(false);
    }
  };

  const handleUpdate = () => {
    if (!appointment || !canCancelAppointment(appointment.timestamp)) {
      return;
    }
    setIsUpdating(true);
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(parseInt(timestamp));
    return date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(parseInt(timestamp));
    return date.toLocaleTimeString(language === 'he' ? 'he-IL' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: language !== 'he',
    });
  };

  const getTimeUntilAppointment = (timestamp: string): string => {
    const appointmentTime = parseInt(timestamp);
    const currentTime = Date.now();
    const timeDiff = appointmentTime - currentTime;

    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    if (timeDiff <= 0) {
      return t('manage.message.started');
    }
    if (language === 'he') {
      return `${hours} שעות ו-${minutes} דקות`;
    }
    return `${hours} hours and ${minutes} minutes`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-primary dark:text-primary-dark animate-spin" />
      </div>
    );
  }

  if (error || !appointment || appointment.status !== 'scheduled') {
    return <NotFound />;
  }

  if (isUpdating && appointment && config) {
    return (
      <Schedule
        config={{
          title: t('manage.update.title'),
          description: t('manage.new.time.title')
        }}
        workingDays={config.workingDays}
        vacations={config.vacations}
        appointmentTypes={config.appointmentTypes}
        businessName={config.businessName}
        phone={config.contact.phone}
        timeToCancel={minCancelTime || config.minCancelTimeMS}
        user_id={appointment.user_id}
        isUpdating={true}
        appointmentToUpdate={appointment}
        onCancelUpdate={() => setIsUpdating(false)}
        onUpdateComplete={(newAppointment) => {
          setAppointment(newAppointment);
          setIsUpdating(false);
          setLastAction('update');
          setIsSuccess(true);
          setTimeout(() => {
            setIsSuccess(false);
            navigate(0); // Refresh to show new details
          }, 2000);
        }}
      />
    );
  }

  const isCancellable = canCancelAppointment(appointment.timestamp);

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center p-4 transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-light-surface dark:bg-dark-surface rounded-3xl shadow-xl p-6 md:p-8 transition-colors duration-300"
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mb-2">
            {t('manage.manage.title')}
          </h2>
          <p className="text-light-text/70 dark:text-dark-text/70">
            {isCancellable
              ? t('manage.message.cancellable')
              : t('manage.message.not.cancellable') + (minCancelTime / (1000 * 60 * 60)) + (language === 'he' ? ' שעות לפני מועד התור' : ' hours before the appointment')
            }
          </p>
        </div>

        {!isCancellable && (
          <div className="mb-6 p-4 bg-red-500/10 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-500 text-sm">
              {parseInt(appointment.timestamp) - Date.now() <= 0
                ? getTimeUntilAppointment(appointment.timestamp)
                : t('manage.message.time.until').replace('{{time}}', getTimeUntilAppointment(appointment.timestamp))}
            </p>
          </div>
        )}

        <div className="space-y-6 mb-8">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-light-gray/30 dark:bg-dark-gray/30">
            <Calendar className="w-6 h-6 text-primary dark:text-primary-dark flex-shrink-0" />
            <div>
              <div className="text-sm text-light-text/70 dark:text-dark-text/70">
                {t('manage.label.date')}
              </div>
              <div className="font-medium text-light-text dark:text-dark-text">
                {formatDate(appointment.timestamp)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl bg-light-gray/30 dark:bg-dark-gray/30">
            <Clock className="w-6 h-6 text-primary dark:text-primary-dark flex-shrink-0" />
            <div>
              <div className="text-sm text-light-text/70 dark:text-dark-text/70">
                {t('manage.label.time')}
              </div>
              <div className="font-medium text-light-text dark:text-dark-text">
                {formatTime(appointment.timestamp)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl bg-light-gray/30 dark:bg-dark-gray/30">
            <Tag className="w-6 h-6 text-primary dark:text-primary-dark flex-shrink-0" />
            <div>
              <div className="text-sm text-light-text/70 dark:text-dark-text/70">
                {t('manage.label.type')}
              </div>
              <div className="font-medium text-light-text dark:text-dark-text">
                {appointment.type.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl bg-light-gray/30 dark:bg-dark-gray/30">
            <User className="w-6 h-6 text-primary dark:text-primary-dark flex-shrink-0" />
            <div>
              <div className="text-sm text-light-text/70 dark:text-dark-text/70">
                {t('manage.label.name')}
              </div>
              <div className="font-medium text-light-text dark:text-dark-text">
                {appointment.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl bg-light-gray/30 dark:bg-dark-gray/30">
            <Phone className="w-6 h-6 text-primary dark:text-primary-dark flex-shrink-0" />
            <div>
              <div className="text-sm text-light-text/70 dark:text-dark-text/70">
                {t('manage.label.phone')}
              </div>
              <div className="font-medium text-light-text dark:text-dark-text">
                {appointment.phone}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <motion.button
            onClick={handleUpdate}
            className={`w-full md:flex-1 py-3 px-6 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${isCancellable
              ? 'bg-primary dark:bg-primary-dark text-white'
              : 'bg-primary/50 dark:bg-primary-dark/50 text-white cursor-not-allowed'
              }`}
            whileHover={isCancellable ? { scale: 1.02 } : undefined}
            whileTap={isCancellable ? { scale: 0.98 } : undefined}
            disabled={!isCancellable}
          >
            <Edit className="w-4 h-4" />
            {language === 'he' ? 'עדכן תור' : 'Update'}
          </motion.button>

          <motion.button
            onClick={() => setIsConfirmationOpen(true)}
            className={`w-full md:flex-1 py-3 px-6 rounded-xl font-medium transition-colors ${isCancellable
              ? 'bg-red-500 text-white'
              : 'bg-red-500/50 text-white cursor-not-allowed'
              }`}
            whileHover={isCancellable ? { scale: 1.02 } : undefined}
            whileTap={isCancellable ? { scale: 0.98 } : undefined}
            disabled={!isCancellable}
          >
            <div className="flex items-center justify-center gap-2">
              <Trash className="w-4 h-4" />
              {t('manage.button.cancel')}
            </div>
          </motion.button>
        </div>

        {/* Confirmation Modal */}
        {isConfirmationOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsConfirmationOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-light-surface dark:bg-dark-surface rounded-2xl p-6 max-w-sm w-full relative"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-light-text dark:text-dark-text mb-4 text-center">
                {t('manage.modal.confirm.title')}
              </h3>
              <p className="text-light-text/70 dark:text-dark-text/70 text-center mb-6">
                {t('manage.modal.confirm.message')}
              </p>
              <div className="flex gap-4">
                <motion.button
                  onClick={() => setIsConfirmationOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-light-gray dark:bg-dark-gray text-light-text dark:text-dark-text font-medium"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t('manage.button.back')}
                </motion.button>
                <motion.button
                  onClick={handleCancel}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-500 text-white font-medium relative"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    t('manage.modal.button.confirm')
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Success Message */}
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-light-surface dark:bg-dark-surface rounded-2xl p-8 text-center shadow-2xl overflow-hidden min-w-[280px]"
            >
              {lastAction === 'update' ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 10, stiffness: 100 }}
                >
                  <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
                </motion.div>
              ) : (
                <div className="relative w-24 h-24 mx-auto mb-6">
                  {/* Garbage Can Lid */}
                  <motion.div
                    className="absolute top-0 left-1/4 w-1/2 h-2 bg-red-500 rounded-t-sm z-10"
                    initial={{ y: 0, rotate: 0 }}
                    animate={{ y: -15, rotate: -25 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                  />
                  {/* Garbage Can Body */}
                  <div className="absolute bottom-0 left-1/4 w-1/2 h-16 bg-red-500 rounded-b-lg border-t-4 border-red-600">
                    <div className="flex justify-around px-2 mt-2">
                      <div className="w-1 h-10 bg-red-600/50 rounded-full" />
                      <div className="w-1 h-10 bg-red-600/50 rounded-full" />
                      <div className="w-1 h-10 bg-red-600/50 rounded-full" />
                    </div>
                  </div>
                  {/* Falling "Appointment" paper */}
                  <motion.div
                    className="absolute top-0 left-1/3 w-8 h-10 bg-white dark:bg-gray-200 rounded-sm shadow-sm flex flex-col gap-1 p-1"
                    initial={{ y: -50, opacity: 0, rotate: 0 }}
                    animate={{ y: 20, opacity: [0, 1, 1, 0], rotate: 45 }}
                    transition={{ duration: 0.8, times: [0, 0.2, 0.7, 1] }}
                  >
                    <div className="w-full h-1 bg-gray-300" />
                    <div className="w-3/4 h-1 bg-gray-300" />
                  </motion.div>
                </div>
              )}
              <h3 className="text-2xl font-bold text-light-text dark:text-dark-text mb-2">
                {lastAction === 'update' ? t('manage.update.success.title') : t('manage.success.title')}
              </h3>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default ManageAppointment;