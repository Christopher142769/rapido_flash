import React, { createContext, useState, useContext } from 'react';
import Modal from '../components/Modal';

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    children: null
  });

  const showModal = ({ type = 'info', title = '', message = '', children = null }) => {
    setModal({
      isOpen: true,
      type,
      title,
      message,
      children
    });
  };

  const showSuccess = (message, title = 'Succès') => {
    showModal({ type: 'success', title, message });
  };

  const showError = (message, title = 'Erreur') => {
    showModal({ type: 'error', title, message });
  };

  const showWarning = (message, title = 'Attention') => {
    showModal({ type: 'warning', title, message });
  };

  const showInfo = (message, title = 'Information') => {
    showModal({ type: 'info', title, message });
  };

  const closeModal = () => {
    setModal({
      isOpen: false,
      type: 'info',
      title: '',
      message: '',
      children: null
    });
  };

  return (
    <ModalContext.Provider value={{ showModal, showSuccess, showError, showWarning, showInfo, closeModal }}>
      {children}
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        type={modal.type}
        title={modal.title}
        message={modal.message}
      >
        {modal.children}
      </Modal>
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export default ModalContext;
