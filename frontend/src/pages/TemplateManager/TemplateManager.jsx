import { useState, useEffect } from 'react';
import { FileText, Wand2, Upload, Trash2, Eye, CheckCircle2 } from 'lucide-react';
import { uploadDocxTemplate, uploadAIPdfTemplate, getTemplates, deleteTemplate } from '../../api';

export default function TemplateManager() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');

    const loadGallery = () => {
        getTemplates().then(res => setTemplates(res.data)).catch(() => {});
    };

    useEffect(() => {
        loadGallery();
    }, []);

    const handleUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(type); 
        setSuccess('');
        
        try {
            const fd = new FormData();
            fd.append('file', file);
            if (type === 'docx') {
                await uploadDocxTemplate(fd);
            } else {
                await uploadAIPdfTemplate(fd);
            }
            setSuccess(`Success! ${type.toUpperCase()} template successfully processed and activated.`);
            loadGallery(); // Refresh the grid to show the new thumbnail
        } catch (err) {
            alert('Upload failed: ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
            e.target.value = null; // Reset input
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this template? Students will no longer be able to use it.")) return;
        try {
            await deleteTemplate(id);
            loadGallery();
        } catch (err) {
            alert('Failed to delete template.');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 'bold', marginBottom: '8px' }}>Resume Templates</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Upload dynamic templates for your students to use in their app.</p>

            {success && (
                <div className="animate-fade-in" style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--emerald)', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                    <CheckCircle2 size={18}/> {success}
                </div>
            )}

            {/* ── Top Section: Uploaders ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '48px' }}>
                
                {/* Method A: DOCX */}
                <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '18px' }}>
                        <FileText color="var(--accent)" /> Standard Word (.docx)
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', flex: 1 }}>
                        Upload a designed Word document containing exact tags like <code>{`{{ name }}`}</code>, <code>{`{{ cgpa }}`}</code>, or <code>{`{% for p in projects %}`}</code>.
                    </p>
                    <label style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', padding: '24px', border: '2px dashed var(--border)', borderRadius: '8px', transition: 'border 0.2s', ':hover': { borderColor: 'var(--accent)' } }}>
                        <input type="file" accept=".docx" style={{ display: 'none' }} onChange={(e) => handleUpload(e, 'docx')} disabled={loading} />
                        {loading === 'docx' ? <span className="spinner"/> : <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontWeight: '600' }}><Upload size={18}/> Upload DOCX</span>}
                    </label>
                </div>

                {/* Method B: AI PDF */}
                <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '18px' }}>
                        <Wand2 color="#a855f7" /> AI Auto-Template (.pdf)
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', flex: 1 }}>
                        Upload a static PDF resume you found online. Gemini AI will scan it, strip the personal data, and convert it into a dynamic HTML template.
                    </p>
                    <label style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', padding: '24px', border: '2px dashed #a855f7', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.05)' }}>
                        <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => handleUpload(e, 'pdf')} disabled={loading} />
                        {loading === 'pdf' ? <span className="spinner"/> : <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7', fontWeight: '600' }}><Wand2 size={18}/> Generate via AI</span>}
                    </label>
                </div>
            </div>

            {/* ── Bottom Section: Template Gallery ── */}
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                Template Gallery <span style={{ fontSize: '12px', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '12px', color: 'var(--text-muted)' }}>{templates.length} Active</span>
            </h2>
            
            {templates.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
                    No templates activated yet. Upload one above!
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '24px' }}>
                    {templates.map(t => (
                        <div key={t._id} className="animate-fade-in" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                            {/* High-Res Thumbnail */}
                            <div style={{ height: '280px', background: '#fff', borderBottom: '1px solid var(--border)', position: 'relative' }}>
                                {t.thumb_url ? (
                                    <img src={t.thumb_url} alt="Template Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No Preview</div>
                                )}
                                <div style={{ position: 'absolute', top: '10px', right: '10px', background: t.type === 'docx' ? 'rgba(99, 102, 241, 0.9)' : 'rgba(168, 85, 247, 0.9)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                    {t.type}
                                </div>
                            </div>
                            
                            {/* Meta & Actions */}
                            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                                <div style={{ fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.name}>
                                    {t.name}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
                                    <button onClick={() => window.open(t.thumb_url, '_blank')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '6px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
                                        <Eye size={14}/> Preview
                                    </button>
                                    <button onClick={() => handleDelete(t._id)} style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '8px', borderRadius: '6px', color: 'var(--rose)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete Template">
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}