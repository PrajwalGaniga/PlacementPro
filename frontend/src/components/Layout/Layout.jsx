import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    BrainCircuit, LayoutDashboard, PlusCircle, Briefcase,
    Users, LogOut, CalendarDays, FileCode2, GraduationCap
} from 'lucide-react';
import styles from './Layout.module.css';

// ... rest of your code ...

const NAV_ITEMS = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/dashboard/drives/create', icon: PlusCircle, label: 'Create Drive' },
    { to: '/dashboard/drives', icon: Briefcase, label: 'Active Drives' },
    { to: '/dashboard/students', icon: Users, label: 'Students' },
    { to: '/dashboard/scheduler', icon: CalendarDays, label: 'Scheduler' },
    { to: '/dashboard/templates', icon: FileCode2, label: 'Resume Templates' },
    { to: '/dashboard/alumni', icon: GraduationCap, label: 'Alumni Connect' },
];

const PAGE_TITLES = {
    '/dashboard': 'Dashboard',
    '/dashboard/drives/create': 'Create Drive',
    '/dashboard/drives': 'Active Drives',
    '/dashboard/students': 'Student List',
    '/dashboard/scheduler': 'Interview Scheduler',
    '/dashboard/alumni': 'Alumni Connect',
};

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const tpoName = localStorage.getItem('tpo_name') || 'TPO';
    const initials = tpoName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const pageTitle = PAGE_TITLES[location.pathname] || 'Dashboard';

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('college_id');
        localStorage.removeItem('tpo_name');
        navigate('/');
    };

    return (
        <div className={styles.shell}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarLogo}>
                    <div className={styles.sidebarLogoIcon}>
                        <BrainCircuit size={18} />
                    </div>
                    <span className={`${styles.sidebarLogoText} gradient-text`}>PlacementPro AI</span>
                </div>

                <nav className={styles.nav}>
                    <div className={styles.navSection}>Main Menu</div>
                    {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({ isActive }) =>
                                `${styles.navLink} ${isActive ? styles.active : ''}`
                            }
                        >
                            <Icon size={18} />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div className={styles.sidebarBottom}>
                    <div className={styles.tpoCard}>
                        <div className={styles.avatar}>{initials}</div>
                        <div className={styles.tpoInfo}>
                            <div className={styles.tpoName}>{tpoName}</div>
                            <div className={styles.tpoRole}>Training & Placement Officer</div>
                        </div>
                        <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <div className={styles.main}>
                <header className={styles.topbar}>
                    <h1 className={styles.pageTitle}>{pageTitle}</h1>
                </header>
                <main className={styles.content}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
