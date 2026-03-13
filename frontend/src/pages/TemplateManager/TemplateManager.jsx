import { useState, useEffect } from 'react';
import { FileText, Wand2, Upload, Trash2, Eye, CheckCircle2, Sparkles, Layout, Layers } from 'lucide-react';
import { uploadDocxTemplate, uploadAIPdfTemplate, getTemplates, deleteTemplate } from '../../api';

// --- Theme Constants (Based on reference image) ---
const theme = {
    bg: '#13111c', cardBg: '#1e1c2e', border: '#2d2b42', text: '#e2e8f0', 
    muted: '#94a3b8', accent1: '#8b5cf6', accent2: '#ec4899', success: '#10b981'
};

export default function TemplateManager() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');

    const loadGallery = () => {
        getTemplates().then(res => setTemplates(res.data)).catch(() => {});
    };

    useEffect(() => { loadGallery(); }, []);

    const handleUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(type); setSuccess('');
        try {
            const fd = new FormData();
            fd.append('file', file);
            if (type === 'docx') await uploadDocxTemplate(fd);
            else await uploadAIPdfTemplate(fd);
            setSuccess(`${type.toUpperCase()} template successfully activated.`);
            loadGallery();
        } catch (err) { alert('Upload failed'); } 
        finally { setLoading(false); e.target.value = null; }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Remove this template?")) return;
        try { await deleteTemplate(id); loadGallery(); } catch (err) { alert('Failed to delete template.'); }
    };

    return (
        <div style={{ padding: '24px', background: theme.bg, color: theme.text, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            
            {/* Header */}
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    Resume Design Studio <Layers size={28} color={theme.accent1} />
                </h1>
                <p style={{ color: theme.muted, marginTop: '8px' }}>Empower your students with AI-optimized, professionally designed resumes.</p>
            </div>

            {success && (
                <div style={{ padding: '16px', background: `${theme.success}15`, color: theme.success, borderRadius: '12px', border: `1px solid ${theme.success}30`, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle2 size={18}/> {success}
                </div>
            )}

            {/* ── Action Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '56px' }}>
                
                {/* Method A: DOCX */}
                <div style={{ background: theme.cardBg, padding: '32px', borderRadius: '24px', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: theme.accent1, filter: 'blur(60px)', opacity: 0.2 }}></div>
                    <div style={{ background: '#13111c', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', border: `1px solid ${theme.border}` }}>
                        <FileText color={theme.accent1} size={24} />
                    </div>
                    <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Standard DOCX</h3>
                    <p style={{ fontSize: '13px', color: theme.muted, lineHeight: '1.6', marginBottom: '24px', flex: 1 }}>
                        Upload Word templates with dynamic tags like <code>{`{{ name }}`}</code>. Best for classic, ATS-friendly designs.
                    </p>
                    <label style={{ cursor: 'pointer', textAlign: 'center', padding: '16px', border: `1px solid ${theme.accent1}`, background: `${theme.accent1}10`, borderRadius: '12px', color: theme.accent1, fontWeight: '700', fontSize: '14px', transition: '0.3s' }}>
                        <input type="file" accept=".docx" style={{ display: 'none' }} onChange={(e) => handleUpload(e, 'docx')} disabled={loading} />
                        {loading === 'docx' ? <span className="spinner" /> : 'Upload Word Template'}
                    </label>
                </div>

                {/* Method B: AI PDF */}
                <div style={{ background: theme.cardBg, padding: '32px', borderRadius: '24px', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: theme.accent2, filter: 'blur(60px)', opacity: 0.2 }}></div>
                    <div style={{ background: '#13111c', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', border: `1px solid ${theme.border}` }}>
                        <Sparkles color={theme.accent2} size={24} />
                    </div>
                    <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>AI PDF Extractor</h3>
                    <p style={{ fontSize: '13px', color: theme.muted, lineHeight: '1.6', marginBottom: '24px', flex: 1 }}>
                        Upload any static PDF. Gemini will clone its design and generate a dynamic HTML/Jinja2 version automatically.
                    </p>
                    <label style={{ cursor: 'pointer', textAlign: 'center', padding: '16px', border: `1px solid ${theme.accent2}`, background: `${theme.accent2}10`, borderRadius: '12px', color: theme.accent2, fontWeight: '700', fontSize: '14px' }}>
                        <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => handleUpload(e, 'pdf')} disabled={loading} />
                        {loading === 'pdf' ? <span className="spinner" /> : 'Generate via Gemini'}
                    </label>
                </div>
            </div>

            {/* ── Gallery ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <Layout size={20} color={theme.muted} />
                <h2 style={{ fontSize: '20px', margin: 0 }}>Active Gallery</h2>
                <div style={{ fontSize: '11px', background: '#13111c', padding: '4px 12px', borderRadius: '20px', color: theme.muted, border: `1px solid ${theme.border}` }}>{templates.length} TEMPLATES</div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '32px' }}>
                {templates.map(t => (
                    <div key={t._id} style={{ background: theme.cardBg, borderRadius: '20px', border: `1px solid ${theme.border}`, overflow: 'hidden', transition: '0.3s' }}>
                        <div style={{ height: '320px', background: '#f8fafc', position: 'relative' }}>
                            {t.thumb_url ? (
                                <img src={t.thumb_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No Preview</div>
                            )}
                            <div style={{ position: 'absolute', top: '12px', right: '12px', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', background: t.type === 'docx' ? theme.accent1 : theme.accent2, color: 'white' }}>
                                {t.type.toUpperCase()}
                            </div>
                        </div>
                        
                        <div style={{ padding: '20px' }}>
                            <div style={{ fontWeight: '600', fontSize: '15px', color: 'white', marginBottom: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => window.open(t.thumb_url, '_blank')} style={{ flex: 1, padding: '10px', background: 'transparent', border: `1px solid ${theme.border}`, borderRadius: '10px', color: theme.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                    <Eye size={14}/> Preview
                                </button>
                                <button onClick={() => handleDelete(t._id)} style={{ padding: '10px', background: '#ef444420', border: '1px solid #ef444440', borderRadius: '10px', color: '#ef4444', cursor: 'pointer' }}>
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}