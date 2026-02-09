import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, Users } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/log', icon: UtensilsCrossed, label: 'Log Food' },
  { to: '/groups', icon: Users, label: 'Groups' },
];

export default function Layout() {
  return (
    <div className="min-h-screen pb-20">
      <Outlet />
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                  isActive ? 'text-primary-600' : 'text-gray-500'
                }`
              }
            >
              <Icon size={22} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
