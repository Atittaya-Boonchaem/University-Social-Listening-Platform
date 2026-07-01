import React from 'react';
import { Bell, User } from 'lucide-react';

const Navbar = () => {
  return (
    <header className="bg-white h-16 border-b flex items-center justify-between px-6 sticky top-0 z-10 w-full">
      <div className="font-medium text-gray-700">
        Overview
      </div>
      <div className="flex items-center gap-4">
        <button className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors">
          <Bell size={20} />
        </button>
        <div className="flex items-center gap-3 pl-4 border-l">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-semibold">
            <User size={16} />
          </div>
          <span className="text-sm font-medium text-gray-700">Admin</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
