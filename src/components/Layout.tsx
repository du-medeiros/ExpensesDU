import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { MessageCircle, PieChart, Target, User } from 'lucide-react';

export const Layout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-muted">
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>

      <nav className="bg-background border-t border-border pb-safe">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-4">
          <NavLink 
            to="/app" 
            end
            className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <MessageCircle className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Conversa</span>
          </NavLink>
          
          <NavLink 
            to="/app/resumo" 
            className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <PieChart className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Resumo</span>
          </NavLink>

          <NavLink 
            to="/app/metas" 
            className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Target className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Metas</span>
          </NavLink>

          <NavLink 
            to="/app/perfil" 
            className={({ isActive }) => `flex flex-col items-center justify-center w-16 h-full transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <User className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Perfil</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
};
