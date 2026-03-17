import { useState, useCallback } from 'react';

export const useContactHandler = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'whatsapp' | 'phone'>('whatsapp');

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const handleContactClick = useCallback((type: 'whatsapp' | 'phone', link: string) => {
    if (isMobileDevice()) {
      window.location.href = link;
    } else {
      setModalType(type);
      setIsModalOpen(true);
    }
  }, []);

  return {
    isModalOpen,
    setIsModalOpen,
    modalType,
    handleContactClick
  };
};