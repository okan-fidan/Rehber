import { Link, useLocation } from 'react-router-dom';
import { Users, FileText, Briefcase, User, Globe } from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { path: '/communities', icon: Globe, label: 'Topluluklar' },
    { path: '/my-communities', icon: Users, label: 'Topluluklarım' },
    { path: '/posts', icon: FileText, label: 'Gönderiler' },
    { path: '/collaboration', icon: Briefcase, label: 'İş Birliği' },
    { path: '/profile', icon: User, label: 'Profil' },
  ];

  // Don't show on chat pages
  if (currentPath.includes('/chat/') || currentPath.includes('/messages/') || currentPath.includes('/subgroup/')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#17212b] border-t border-[#242f3d] z-40" data-testid="bottom-nav">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = currentPath === item.path || 
            (item.path === '/my-communities' && currentPath === '/messages') ||
            (item.path === '/communities' && currentPath.includes('/community/'));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-[#4A90E2]' : 'text-gray-500 hover:text-gray-400'
              }`}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-[10px] mt-1 ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 w-12 h-0.5 bg-[#4A90E2] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
