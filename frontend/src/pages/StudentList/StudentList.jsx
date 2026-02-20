import { useState, useEffect } from 'react';
import { Search, GraduationCap } from 'lucide-react';
import { getStudents, getBatches } from '../../api';
import styles from './StudentList.module.css';

const BRANCHES = ['All', 'CSE', 'ISE', 'ECE', 'ME', 'CE'];

export default function StudentList() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [branch, setBranch] = useState('All');
    const [placedFilter, setPlacedFilter] = useState('all');
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState('all');

    useEffect(() => {
        getBatches().then(r => setBatches(r.data)).catch(() => { });
    }, []);

    useEffect(() => {
        const params = {};
        if (branch !== 'All') params.branch = branch;
        if (placedFilter === 'placed') params.placed = true;
        if (placedFilter === 'not-placed') params.placed = false;
        if (selectedBatch !== 'all') params.graduation_year = parseInt(selectedBatch);

        setLoading(true);
        getStudents(params)
            .then(res => setStudents(res.data))
            .catch(() => setStudents([]))
            .finally(() => setLoading(false));
    }, [branch, placedFilter, selectedBatch]);

    const filtered = students.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.usn?.toLowerCase().includes(search.toLowerCase())
    );

    const cgpaClass = (cgpa) =>
        cgpa >= 8 ? styles.high : cgpa >= 7 ? styles.mid : styles.low;

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h1>Student List</h1>
                    <p>Browse and filter students in your institution.</p>
                </div>
                <div className={styles.toolbar}>
                    <div className={styles.searchWrap}>
                        <Search size={16} className={styles.searchIcon} />
                        <input
                            className={styles.searchInput}
                            placeholder="Search name, USN, email…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    {/* Batch filter */}
                    <select className={styles.select} value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
                        <option value="all">All Batches</option>
                        {batches.map(b => (
                            <option key={b} value={b}>{b - 1}–{String(b).slice(2)} Batch</option>
                        ))}
                    </select>
                    <select className={styles.select} value={branch} onChange={e => setBranch(e.target.value)}>
                        {BRANCHES.map(b => <option key={b}>{b}</option>)}
                    </select>
                    <select className={styles.select} value={placedFilter} onChange={e => setPlacedFilter(e.target.value)}>
                        <option value="all">All Status</option>
                        <option value="placed">Placed</option>
                        <option value="not-placed">Not Placed</option>
                    </select>
                </div>
            </div>

            <div className={styles.tableWrap}>
                {loading ? (
                    <div className={styles.loading}><span className="spinner" /> Loading students…</div>
                ) : filtered.length === 0 ? (
                    <div className={styles.empty}>No students match your filters.</div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th>USN</th>
                                <th>Branch</th>
                                <th>Batch</th>
                                <th>CGPA</th>
                                <th>Backlogs</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((s, idx) => (
                                <tr key={s.usn || idx}>
                                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.email}</div>
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
                                        {s.usn || '—'}
                                    </td>
                                    <td><span className={styles.branchBadge}>{s.branch}</span></td>
                                    <td>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
                                            <GraduationCap size={12} /> {s.batch_label || s.graduation_year || '—'}
                                        </span>
                                    </td>
                                    <td><span className={`${styles.cgpa} ${cgpaClass(s.cgpa)}`}>{s.cgpa?.toFixed(2)}</span></td>
                                    <td style={{ textAlign: 'center' }}>{s.backlogs}</td>
                                    <td>
                                        <span className={`${styles.badge} ${s.placed ? styles.placed : styles.notPlaced}`}>
                                            {s.placed ? '✓ Placed' : 'Not Placed'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            {!loading && (
                <p className={styles.count}>
                    Showing {filtered.length} of {students.length} students
                </p>
            )}
        </div>
    );
}
