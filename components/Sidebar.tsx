import React from 'react';
import { NavItemType } from '../types';
import { NAV_ITEMS } from '../constants';
import { UsersIcon, ClipboardIcon, GradeIcon, AcademicIcon, AppIcon, KitchenIcon, CodeBracketIcon, DashboardIcon, ExitIcon } from './icons';

interface SidebarProps {
  activeView: NavItemType;
  setActiveView: (view: NavItemType) => void;
}

const ICONS: Record<NavItemType, React.ReactNode> = {
  'Dashboard': <DashboardIcon />,
  'Alumnos': <UsersIcon />,
  'Gestión Práctica': <ClipboardIcon />,
  'Gestión de Notas': <GradeIcon />,
  'Registro de Salidas': <ExitIcon />,
  'Exámenes Prácticos': <ClipboardIcon />,
  'Gestión Académica': <AcademicIcon />,
  'Cocina': <KitchenIcon />,
  'Gestión de la App': <AppIcon />,
};

export const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold">
            <span className="text-teal-400">Teacher</span>Dash
        </h1>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item}
            onClick={() => setActiveView(item)}
            className={`w-full flex items-center px-3 py-2 text-left text-sm font-medium rounded-md transition-colors ${
              activeView === item
                ? 'bg-gray-900 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {ICONS[item]}
            <span>{item}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700">
         <a href="https://github.com/a-romero-for-study/teacher-dashboard" target="_blank" rel="noopener noreferrer" className="w-full flex items-center px-3 py-2 text-left text-sm font-medium rounded-md transition-colors text-gray-400 hover:bg-gray-700 hover:text-white">
            <CodeBracketIcon className="h-6 w-6 mr-3" />
            <span>Ver código</span>
        </a>
      </div>
    </div>
  );
};