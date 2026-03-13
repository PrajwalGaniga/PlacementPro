import { useState, useRef } from 'react';
import {
    UploadCloud, Sparkles, CheckCircle, AlertTriangle,
    Target, RotateCcw, Download, Loader2, BarChart3, 
    ArrowRight, Lightbulb
} from 'lucide-react';
import { analyzeExcel, exportStudentsExcel } from '../../api';

// --- Theme Constants (Consistent with your reference) ---
const theme = {
    bg: '#13111c', cardBg: '#1e1c2e', border: '#2d2b42', text: '#e2e8f0', 
    muted: '#94a3b8', accent1: '#8b5cf6', accent2: '#ec4899', 
    success: '#10b981', danger: '#f43f5e', warning: '#f59e0b'
};

export default function AIAnalyzer() {
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        if (e.target.files?.[0]) { setFile(e.target.files[0]); setAnalysis(null); setError(''); }
    };

    const runAnalysis = async () => {
        if (!file) return;
        setIsAnalyzing(true); setError('');
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await analyzeExcel(fd);
            setAnalysis(res.data);
        } catch (err) {
            setError('Analysis failed. Ensure the Excel follows the standard placement format.');
        } finally { setIsAnalyzing(false); }
    };

    const reset = () => { setFile(null); setAnalysis(null); setError(''); };

    // --- Inline Styles for Results ---
    const insightCard = (color) => ({
        background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '24px',
        padding: '24px', position: 'relative', overflow: 'hidden', borderLeft: `6px solid ${color}`
    });

    return (
        <div style={{ padding: '24px', background: theme.bg, color: theme.text, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        Gemini AI Analyzer <BarChart3 size={24} color={theme.accent1} />
                    </h1>
                    <p style={{ color: theme.muted, marginTop: '8px' }}>Upload your <strong>placement_data.xlsx</strong> to generate comparative success metrics.</p>
                </div>
                <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '12px', color: 'white', cursor: 'pointer' }}>
                    <Download size={16} /> Get Sample Data
                </button>
            </div>

            {!analysis ? (
                /* --- UPLOAD STATE --- */
                <div style={{ maxWidth: '800px', margin: '40px auto' }}>
                    <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files[0]); }}
                        onClick={() => fileInputRef.current.click()}
                        style={{ 
                            background: theme.cardBg, border: `2px dashed ${isDragging ? theme.accent1 : theme.border}`, 
                            borderRadius: '32px', padding: '80px 40px', textAlign: 'center', cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" style={{ display: 'none' }} />
                        <UploadCloud size={64} color={file ? theme.success : theme.accent1} style={{ marginBottom: '20px' }} />
                        <h2 style={{ fontSize: '22px', margin: '0 0 10px 0' }}>{file ? `✅ ${file.name}` : 'Drop Placement Data Here'}</h2>
                        <p style={{ color: theme.muted }}>{file ? 'Data ready for comparative intelligence' : 'Drag & drop Excel or click to browse'}</p>
                    </div>

                    {file && (
                        <button onClick={runAnalysis} disabled={isAnalyzing} style={{ width: '100%', padding: '16px', marginTop: '24px', background: `linear-gradient(135deg, ${theme.accent1}, ${theme.accent2})`, color: 'white', border: 'none', borderRadius: '16px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: `0 10px 30px ${theme.accent1}40` }}>
                            {isAnalyzing ? <Loader2 className="spin" size={20} /> : <Sparkles size={20} />}
                            {isAnalyzing ? 'Gemini is processing datasets...' : 'Begin AI Deep Dive'}
                        </button>
                    )}
                </div>
            ) : (
                /* --- RESULTS DASHBOARD --- */
                <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: theme.accent1 }}>Comparative Insights</h2>
                        <button onClick={reset} style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.muted, padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <RotateCcw size={14} /> New Analysis
                        </button>
                    </div>

                    {/* Executive Overview */}
                    <div style={{ background: `linear-gradient(135deg, ${theme.cardBg}, #13111c)`, padding: '32px', borderRadius: '24px', border: `1px solid ${theme.border}`, marginBottom: '32px', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '24px', right: '24px', background: `${theme.accent1}20`, color: theme.accent1, padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>EXECUTIVE SUMMARY</div>
                        <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Lightbulb color={theme.warning} size={20} /> AI Synthesis</h3>
                        <p style={{ lineHeight: '1.8', color: theme.text, fontSize: '15px', margin: 0 }}>{analysis.overview}</p>
                    </div>

                    {/* Comparative Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                        
                        {/* Winning Edge */}
                        <div style={insightCard(theme.success)}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: theme.success, margin: '0 0 20px 0' }}>
                                <CheckCircle size={20} /> Success Characteristics (Placed)
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {analysis.winning_edge?.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px' }}>
                                        <div style={{ background: theme.success, width: '6px', height: '6px', borderRadius: '50%', marginTop: '6px' }} />
                                        <span style={{ fontSize: '14px', lineHeight: '1.5' }}>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Critical Gaps */}
                        <div style={insightCard(theme.danger)}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: theme.danger, margin: '0 0 20px 0' }}>
                                <AlertTriangle size={20} /> Friction Points (Unplaced)
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {analysis.critical_gaps?.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px' }}>
                                        <div style={{ background: theme.danger, width: '6px', height: '6px', borderRadius: '50%', marginTop: '6px' }} />
                                        <span style={{ fontSize: '14px', lineHeight: '1.5' }}>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Roadmap / Action Plan */}
                    <div style={{ background: theme.cardBg, borderRadius: '24px', border: `1px solid ${theme.border}`, padding: '32px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', margin: '0 0 32px 0' }}>
                            <Target size={22} color={theme.accent2} /> Strategic TPO Action Plan
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                            {analysis.action_plan?.map((item, i) => (
                                <div key={i} style={{ position: 'relative', padding: '24px', background: '#13111c', borderRadius: '20px', border: `1px solid ${theme.border}` }}>
                                    <div style={{ position: 'absolute', top: '-15px', left: '24px', width: '32px', height: '32px', background: `linear-gradient(135deg, ${theme.accent1}, ${theme.accent2})`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
                                        {i + 1}
                                    </div>
                                    <p style={{ margin: '8px 0 0 0', fontSize: '14px', lineHeight: '1.6', color: theme.text }}>{item}</p>
                                    <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: theme.accent1, fontWeight: 'bold' }}>
                                        PRIORITY ACTION <ArrowRight size={12} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}