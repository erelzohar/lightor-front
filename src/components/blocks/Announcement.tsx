import React from 'react';

interface Props { text: string }

/** LT-136: one-line bar — a note the business wants seen first. */
const Announcement: React.FC<Props> = ({ text }) => (
  <section className="bg-light-text text-light-bg dark:bg-dark-text dark:text-dark-bg text-sm md:text-base font-semibold text-center py-3 px-4 transition-colors duration-300">
    <p className="m-0">{text}</p>
  </section>
);
export default Announcement;
