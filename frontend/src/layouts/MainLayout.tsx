import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Brain } from 'lucide-react';

const MainLayout: React.FC = () => {
    const location = useLocation();

    const navItems = [
        { path: '/', label: '首页', icon: Brain },
    ];

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            <nav className="fixed top-0 left-0 right-0 bg-gray-800/80 backdrop-blur-md border-b border-gray-700 z-50">
                {/* 👇 修改这里：把 max-w-7xl mx-auto 改为 w-full */}
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <Link to="/" className="flex items-center space-x-2">
                                <Brain className="w-8 h-8 text-blue-500" />
                                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                                    智慧员工
                                </span>
                            </Link>
                        </div>
                        <div className="flex space-x-4">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                                            ? 'bg-gray-700 text-blue-400'
                                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </nav>

            {/* 👇 这里的 w-full 已经是正确的了，不需要动 */}
            <main className="w-full pt-16 min-h-screen">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;