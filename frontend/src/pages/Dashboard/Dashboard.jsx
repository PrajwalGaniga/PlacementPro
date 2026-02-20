import { useState, useEffect } from 'react';
import { Users, Briefcase, CheckCircle2, TrendingUp } from 'lucide-react';
import { getStats } from '../../api';
import styles from './Dashboard.module.css';

const STAT_CONFIG = [
    {
        key: 'total_eligible',
        label: 'Total Eligible',
        icon: Users,
        colorClass: 'purple',
        delta: 'Based on CGPA ≥ 7.0',
    },
    {
        key: 'active_drives',
        label: 'Active Drives',
        icon: Briefcase,
        colorClass: 'blue',
        delta: 'Currently open',
    },
    {
        key: 'placed_students',
        label: 'Students Placed',
        icon: CheckCircle2,
        colorClass: 'teal',
        delta: 'This placement season',
    },
    {
        key: 'total_students',
        label: 'Total Students',
        icon: TrendingUp,
        colorClass: 'amber',
        delta: 'Enrolled in system',
    },
];

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const tpoName = localStorage.getItem('tpo_name') || 'TPO';

    useEffect(() => {
        getStats()
            .then(res => setStats(res.data))
            .catch(() => setStats({}))
            .finally(() => setLoading(false));
    }, []);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <h1>{greeting}, {tpoName.split(' ')[0]} 👋</h1>
                <p>Here's your placement overview for today.</p>
            </div>

            {/* Stats grid */}
            <div className={styles.statsGrid}>
                {STAT_CONFIG.map(({ key, label, icon: Icon, colorClass, delta }, idx) => (
                    <div className={styles.statCard} key={key} style={{ animationDelay: `${idx * 0.08}s` }}>
                        <div className={`${styles.statIcon} ${styles[colorClass]}`}>
                            <Icon size={22} />
                        </div>
                        <div className={styles.statData}>
                            <div className={styles.statLabel}>{label}</div>
                            <div className={styles.statValue}>
                                {loading ? '—' : (stats?.[key] ?? 0)}
                            </div>
                            <div className={styles.statDelta}>{delta}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick tip */}
            <h2 className={styles.sectionTitle}>Quick Actions</h2>
            <div className={styles.empty}>
                🚀 Head to <strong>Create Drive</strong> to upload a JD and let AI auto-fill the form.<br />
                Then use <strong>Check Eligibility</strong> to instantly see how many students qualify.
            </div>
        </div>
    );
}
