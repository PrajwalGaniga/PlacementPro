import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', gap: '8px' }}>
      <button 
        className="btn" 
        style={{ background: '#eee', color: '#333' }}
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Previous
      </button>
      
      <span style={{ padding: '8px 12px' }}>
        Page {currentPage} of {totalPages}
      </span>
      
      <button 
        className="btn" 
         style={{ background: '#eee', color: '#333' }}
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
