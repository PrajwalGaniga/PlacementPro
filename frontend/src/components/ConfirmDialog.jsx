import React from 'react';
import Modal from './Modal';

const ConfirmDialog = ({ isOpen, message, onConfirm, onCancel }) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Confirm Action">
      <p style={{ marginBottom: '20px' }}>{message || "Are you sure you want to proceed?"}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button className="btn" style={{ background: '#ddd' }} onClick={onCancel}>Cancel</button>
        <button className="btn btn-danger" onClick={() => { onConfirm(); onCancel(); }}>Confirm</button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
