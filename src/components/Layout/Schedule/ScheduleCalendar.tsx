import { memo } from 'react';
import { motion } from 'framer-motion';

export const dotColors: Record<string, string> = {
    full: 'bg-emerald-500',
    limited: 'bg-amber-500',
    none: 'bg-red-500',
    vacation: 'bg-indigo-500',
};

export interface DateButtonProps {
    date: Date;
    isPast: (date: Date) => boolean;
    isSelected: (date: Date) => boolean;
    isToday: (date: Date) => boolean;
    isAvailable: (date: Date) => boolean;
    isNextMonth: (date: Date) => boolean;
    formatSelectedDate: (date: Date) => string;
    language: string;
    handleDateSelect: (date: Date) => void;
    availabilityStatus: 'full' | 'limited' | 'none' | 'vacation' | 'past';
}

export const DateButton = memo(({
    date,
    isPast,
    isSelected,
    isToday,
    isAvailable,
    isNextMonth,
    formatSelectedDate,
    language,
    handleDateSelect,
    availabilityStatus
}: DateButtonProps) => (
    <motion.button
        type="button"
        onClick={() => !isPast(date) && handleDateSelect(date)}
        className={`w-full h-full rounded-lg text-sm font-medium flex flex-col items-center justify-center transition-colors relative 
    ${isPast(date)
                ? 'text-light-text/30 dark:text-dark-text/30 cursor-not-allowed'
                : isSelected(date)
                    ? 'bg-primary dark:bg-primary-dark text-white'
                    : isToday(date)
                        ? `ring-2 ring-primary dark:ring-primary-dark ${isAvailable(date)
                            ? 'text-primary dark:text-primary-dark hover:bg-light-gray dark:hover:bg-dark-gray'
                            : 'text-light-text/50 dark:text-dark-text/50'
                        }`
                        : isNextMonth(date)
                            ? isAvailable(date)
                                ? 'bg-primary/5 dark:bg-primary-dark/5 hover:bg-primary/10 dark:hover:bg-primary-dark/10 text-primary dark:text-primary-dark ring-1 ring-primary/20 dark:ring-primary-dark/20'
                                : 'bg-light-gray/30 dark:bg-dark-gray/30 text-light-text/30 dark:text-dark-text/30 cursor-not-allowed'
                            : isAvailable(date)
                                ? 'hover:bg-light-gray dark:hover:bg-dark-gray text-light-text dark:text-dark-text'
                                : 'text-light-text/30 dark:text-dark-text/30 cursor-not-allowed'
            }`}
        whileHover={!isPast(date) && isAvailable(date) ? {
            scale: isNextMonth(date) ? 1.05 : 1.1,
            transition: {
                type: "spring",
                stiffness: 400,
                damping: 10
            }
        } : undefined}
        whileTap={!isPast(date) && isAvailable(date) ? { scale: 0.9 } : undefined}
        disabled={isPast(date) || !isAvailable(date)}
        aria-label={`${formatSelectedDate(date)}${isPast(date)
            ? ' - Past date'
            : availabilityStatus === 'full'
                ? ' - Fully Available'
                : availabilityStatus === 'limited'
                    ? ' - Limited Availability'
                    : ' - Not available'
            }`}
        aria-selected={isSelected(date)}
        aria-disabled={isPast(date) || !isAvailable(date)}
    >

        <div className="flex-1 flex items-center justify-center w-full">
            {date.getDate()}
        </div>
        
        <div
            className={`h-1 w-3.5 rounded-full absolute bottom-1 
        ${dotColors[availabilityStatus === 'past' ? 'none' : availabilityStatus]} 
        ${(availabilityStatus === 'past' || isSelected(date)) ? 'hidden' : ''} 
        `}
            aria-hidden="true"
            title={availabilityStatus}
        />
    </motion.button>
));

DateButton.displayName = 'DateButton';
