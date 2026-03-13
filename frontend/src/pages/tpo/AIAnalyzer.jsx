import React, { useState, useEffect, useRef } from 'react';
import { analyzeExcel, getLatestAnalytics, getAnalyticsHistory } from '../../api/tpoApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import { Sparkles, FileSpreadsheet, Eye } from 'lucide-react';

const AIAnalyzer = () => {
  const [mode, setMode] = useState('existing'); // 'existing' or 'upload'
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewHistoryData, setViewHistoryData] = useState(null);

  useEffect(() => {
    fetchHistory();
    fetchLatest();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await getAnalyticsHistory(1, 10);
      setHistory(res.history || []);
    } catch(err) {
      console.error(err);
    }
  };

  const fetchLatest = async () => {
      try {
          const res = await getLatestAnalytics();
          if (res) setResults(res);
      } catch(err) {
          console.log("no latest analytics");
      }
  }

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      
      let res;
      if (mode === 'upload' && selectedFile) {
        const payload = new FormData();
        payload.append('file', selectedFile);
        res = await analyzeExcel(payload);
      } else {
        res = await analyzeExcel(null); // triggers existing DB analysis in backend
      }
      
      setResults(res.analysis);
      fetchHistory(); // refresh history table
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Make sure valid data/file is provided.');
    } finally {
      setAnalyzing(false);
      setSelectedFile(null);
    }
  };

  const openHistoryView = (record) => {
    setViewHistoryData(record.analysis_data);
    setIsModalOpen(true);
  };

  const renderAnalysisCard = (data) => {
    if (!data) return null;
    return (
      <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ color: '#065f46', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} /> 🏆 Winning Edges
          </h4>
          <ul style={{ paddingLeft: '20px', lineHeight: '1.6', color: '#333' }}>
            {data.winning_edges?.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: item }} />)}
          </ul>
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ color: '#991b1b', marginBottom: '12px' }}>⚠️ Critical Gaps</h4>
          <ul style={{ paddingLeft: '20px', lineHeight: '1.6', color: '#333' }}>
            {data.critical_gaps?.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: item }} />)}
          </ul>
        </div>
        
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #2d6cdf' }}>
          <h4 style={{ color: '#1e3a8a', marginBottom: '12px' }}>📋 Action Plan</h4>
           <ul style={{ paddingLeft: '20px', lineHeight: '1.6', color: '#333' }}>
            {data.action_plan?.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: item }} />)}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h3 style={{ marginBottom: '20px' }}>AI College Analyzer (SWOT)</h3>

      <div className="grid-2">
        {/* Run Analysis Section */}
        <div className="card">
          <h4 style={{ marginBottom: '16px' }}>Run New Analysis</h4>
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'normal' }}>
              <input type="radio" checked={mode === 'existing'} onChange={() => setMode('existing')} style={{ width: 'auto', margin: 0 }} />
              Use existing DB data
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'normal' }}>
              <input type="radio" checked={mode === 'upload'} onChange={() => setMode('upload')} style={{ width: 'auto', margin: 0 }} />
              Upload new Excel file
            </label>
          </div>

          {mode === 'upload' && (
            <div style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '4px', textAlign: 'center' }}>
              <input 
                type="file" 
                accept=".xlsx,.xls" 
                ref={fileInputRef} 
                style={{ display: 'none' }}
                onChange={e => setSelectedFile(e.target.files[0])}
              />
              <button className="btn" style={{ background: '#e2e8f0', color: '#333' }} onClick={() => fileInputRef.current?.click()}>
                <FileSpreadsheet size={16} /> Choose Excel File
              </button>
              {selectedFile && <p style={{ marginTop: '10px', fontSize: '14px', color: '#2d6cdf' }}>{selectedFile.name}</p>}
            </div>
          )}

          {error && <div style={{ color: '#e74c3c', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px' }} 
            onClick={handleAnalyze}
            disabled={analyzing || (mode === 'upload' && !selectedFile)}
          >
            {analyzing ? <><LoadingSpinner /> Analyzing Campus Data...</> : <><Sparkles size={16} /> Analyze with AI</>}
          </button>
        </div>

        {/* Previous Results / Latest */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
           <h4 style={{ marginBottom: '16px' }}>Latest Insight Board</h4>
           {analyzing ? (
             <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', borderRadius: '8px', border: '1px solid #eee' }}>
               <LoadingSpinner />
             </div>
           ) : results ? (
             renderAnalysisCard(results)
           ) : (
             <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', borderRadius: '8px', border: '1px solid #eee', color: '#888' }}>
               No analysis results available yet. Run an analysis across your dataset.
             </div>
           )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '32px' }}>
        <h4 style={{ marginBottom: '16px' }}>Past Analysis History</h4>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Analyzed By</th>
                <th>Winning Edges</th>
                <th>Critical Gaps</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center' }}>No history found</td></tr>
              ) : (
                history.map(h => (
                  <tr key={h._id}>
                    <td style={{ fontWeight: 500 }}>{new Date(h.analyzed_at).toLocaleString()}</td>
                    <td><span className="badge badge-inactive">{h.tpo_email}</span></td>
                    <td>{h.analysis_data?.winning_edges?.length || 0}</td>
                    <td>{h.analysis_data?.critical_gaps?.length || 0}</td>
                    <td>
                      <button className="btn" style={{ background: '#f0f0f0', padding: '6px' }} onClick={() => openHistoryView(h)}>
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Historical Analysis Result">
         {renderAnalysisCard(viewHistoryData)}
      </Modal>

    </div>
  );
};

export default AIAnalyzer;
