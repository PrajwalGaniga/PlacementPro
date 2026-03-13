import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    BrainCircuit, LayoutDashboard, PlusCircle, Briefcase,
    Users, LogOut, CalendarDays, FileCode2, GraduationCap, Sparkles,
    Search, Bell, Command
} from 'lucide-react';

const NAV_ITEMS = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', end: true },
    { to: '/dashboard/drives/create', icon: PlusCircle, label: 'Create Drive' },
    { to: '/dashboard/drives', icon: Briefcase, label: 'Active Drives' },
    { to: '/dashboard/students', icon: Users, label: 'Talent Hub' },
    { to: '/dashboard/scheduler', icon: CalendarDays, label: 'AI Scheduler' },
    { to: '/dashboard/templates', icon: FileCode2, label: 'Resume Studio' },
    { to: '/dashboard/alumni', icon: GraduationCap, label: 'Alumni Network' },
    { to: '/dashboard/analyzer', icon: Sparkles, label: 'AI Analyzer' },
];

const PAGE_TITLES = {
    '/dashboard': 'Placement Overview',
    '/dashboard/drives/create': 'Drive Configuration',
    '/dashboard/drives': 'Active Pipelines',
    '/dashboard/students': 'Student Directory',
    '/dashboard/scheduler': 'Interview Matrix',
    '/dashboard/templates': 'Design Studio',
    '/dashboard/alumni': 'Alumni Connect',
    '/dashboard/analyzer': 'Gemini Intelligence',
};

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const tpoName = localStorage.getItem('tpo_name') || 'TPO Admin';
    const initials = tpoName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const pageTitle = PAGE_TITLES[location.pathname] || 'Command Center';

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    return (
        <div className="layout-shell">
            {/* ── Ambient Background Glows ── */}
            <div className="ambient-blob bg-purple" style={{ top: '-10%', left: '-5%' }} />
            <div className="ambient-blob bg-pink" style={{ bottom: '-10%', right: '-5%' }} />

            {/* ════ SIDEBAR ════ */}
            <aside className="sidebar">
                {/* Logo Section */}
                <div className="brand-header">
                    <div className="brand-logo">
                        <BrainCircuit size={20} color="white" />
                    </div>
                    <span className="brand-text">PlacementPro</span>
                </div>

                {/* Navigation Links */}
                <nav className="nav-menu">
                    <div className="nav-section-title">Main Menu</div>
                    {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        >
                            <Icon size={18} className="nav-icon" />
                            <span className="nav-label">{label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Profile & Logout Section */}
                <div className="sidebar-footer">
                    <div className="profile-card">
                        <div className="profile-avatar">{initials}</div>
                        <div className="profile-info">
                            <div className="profile-name">{tpoName}</div>
                            <div className="profile-role">TPO Admin</div>
                        </div>
                        <button className="logout-btn" onClick={handleLogout} title="Secure Logout">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ════ MAIN CONTENT AREA ════ */}
            <div className="main-wrapper">
                
                {/* Top Utility Bar (Mimicking the "Roger" design) */}
                <header className="topbar">
                    <div className="topbar-left">
                        <h1 className="page-title">{pageTitle}</h1>
                        <p className="page-subtitle">Welcome back, let's shape some careers.</p>
                    </div>

                    <div className="topbar-right">
                        <div className="search-bar">
                            <Search size={16} className="search-icon" />
                            <input type="text" placeholder="Global search..." />
                            <div className="shortcut-hint"><Command size={10} /> K</div>
                        </div>
                        
                        <button className="icon-btn">
                            <Bell size={18} />
                            <span className="notification-dot"></span>
                        </button>
                        
                        <button className="action-btn" onClick={() => navigate('/dashboard/drives/create')}>
                            <PlusCircle size={16} /> New Drive
                        </button>
                    </div>
                </header>

                {/* Content Injection */}
                <main className="content-area">
                    <div className="content-container">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* ── Scoped Internal CSS for exact "Roger" aesthetic ── */}
            <style>{`
                .layout-shell {
                    display: flex;
                    height: 100vh;
                    background-color: #0b0914;
                    color: #e2e8f0;
                    font-family: 'Inter', system-ui, sans-serif;
                    overflow: hidden;
                    position: relative;
                }

                /* Background Effects */
                .ambient-blob {
                    position: fixed;
                    width: 50vw;
                    height: 50vw;
                    border-radius: 50%;
                    filter: blur(160px);
                    opacity: 0.08;
                    pointer-events: none;
                    z-index: 0;
                }
                .bg-purple { background-color: #8b5cf6; }
                .bg-pink { background-color: #ec4899; }

                /* Sidebar */
                .sidebar {
                    width: 260px;
                    background: rgba(19, 17, 28, 0.6);
                    backdrop-filter: blur(24px);
                    border-right: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex;
                    flex-direction: column;
                    z-index: 50;
                    transition: all 0.3s ease;
                }

                .brand-header {
                    padding: 32px 24px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .brand-logo {
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(135deg, #8b5cf6, #ec4899);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
                }
                .brand-text {
                    font-size: 18px;
                    font-weight: 800;
                    letter-spacing: -0.5px;
                    background: linear-gradient(to right, #ffffff, #94a3b8);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                /* Navigation */
                .nav-menu {
                    flex: 1;
                    padding: 0 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    overflow-y: auto;
                }
                .nav-menu::-webkit-scrollbar { display: none; }
                
                .nav-section-title {
                    padding: 8px 12px 16px;
                    font-size: 10px;
                    font-weight: 800;
                    color: #475569;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                }

                .nav-link {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 12px 16px;
                    border-radius: 14px;
                    text-decoration: none;
                    color: #94a3b8;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                }
                .nav-link:hover {
                    color: #e2e8f0;
                    background: rgba(255, 255, 255, 0.03);
                }
                .nav-link.active {
                    color: #ffffff;
                    font-weight: 600;
                    background: rgba(139, 92, 246, 0.1);
                    border: 1px solid rgba(139, 92, 246, 0.2);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }
                .nav-link.active .nav-icon {
                    color: #8b5cf6;
                    filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.6));
                }

                /* Sidebar Footer */
                .sidebar-footer {
                    padding: 24px 20px;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }
                .profile-card {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
                .profile-avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    background: linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.3));
                    border: 1px solid rgba(139,92,246,0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 13px;
                    font-weight: bold;
                    color: #fff;
                }
                .profile-info {
                    flex: 1;
                    min-width: 0;
                }
                .profile-name {
                    font-size: 13px;
                    font-weight: 600;
                    color: #fff;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .profile-role {
                    font-size: 10px;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-top: 2px;
                }
                .logout-btn {
                    background: transparent;
                    border: none;
                    color: #f43f5e;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 8px;
                    transition: all 0.2s;
                }
                .logout-btn:hover {
                    background: rgba(244, 63, 94, 0.1);
                }

                /* Main Wrapper */
                .main-wrapper {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    z-index: 10;
                    overflow-y: auto;
                }

                /* Top Utility Bar */
                .topbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 32px 40px;
                    background: linear-gradient(to bottom, rgba(11, 9, 20, 0.9) 0%, rgba(11, 9, 20, 0) 100%);
                    position: sticky;
                    top: 0;
                    z-index: 40;
                }
                .page-title {
                    font-size: 24px;
                    font-weight: 700;
                    margin: 0;
                    letter-spacing: -0.5px;
                }
                .page-subtitle {
                    font-size: 13px;
                    color: #64748b;
                    margin: 4px 0 0 0;
                }

                .topbar-right {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .search-bar {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .search-icon {
                    position: absolute;
                    left: 14px;
                    color: #64748b;
                }
                .search-bar input {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    padding: 10px 40px;
                    color: white;
                    font-size: 13px;
                    outline: none;
                    width: 260px;
                    transition: all 0.3s ease;
                }
                .search-bar input:focus {
                    background: rgba(0, 0, 0, 0.2);
                    border-color: #8b5cf6;
                    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
                }
                .shortcut-hint {
                    position: absolute;
                    right: 12px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    padding: 2px 6px;
                    border-radius: 6px;
                    font-size: 10px;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .icon-btn {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    color: #cbd5e1;
                    padding: 10px;
                    border-radius: 12px;
                    cursor: pointer;
                    position: relative;
                    transition: all 0.2s ease;
                }
                .icon-btn:hover {
                    background: rgba(255, 255, 255, 0.08);
                    color: white;
                }
                .notification-dot {
                    position: absolute;
                    top: 8px;
                    right: 10px;
                    width: 6px;
                    height: 6px;
                    background: #8b5cf6;
                    border-radius: 50%;
                    box-shadow: 0 0 8px #8b5cf6;
                }

                .action-btn {
                    background: linear-gradient(135deg, #8b5cf6, #ec4899);
                    border: none;
                    color: white;
                    padding: 10px 20px;
                    border-radius: 12px;
                    font-size: 13px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    box-shadow: 0 8px 20px rgba(139, 92, 246, 0.25);
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .action-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 24px rgba(139, 92, 246, 0.35);
                }

                /* Content Area */
                .content-area {
                    flex: 1;
                    padding: 0 40px 40px;
                    animation: slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .content-container {
                    max-width: 1440px;
                    margin: 0 auto;
                }

                @keyframes slideUpFade {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}