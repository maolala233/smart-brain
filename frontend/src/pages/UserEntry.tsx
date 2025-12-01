import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, Globe, ArrowRight, Loader2, Users, Trash2, X } from 'lucide-react';

interface UserProfile {
    id: number;
    name: string;
    role: string;
    domain: string;
}

const UserEntry: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        role: 'Developer',
        domain: 'Technology',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showUserList, setShowUserList] = useState(false);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const roles = [
        { value: 'Developer', label: '开发工程师' },
        { value: 'Designer', label: '设计师' },
        { value: 'Product Manager', label: '产品经理' },
        { value: 'Data Scientist', label: '数据科学家' },
        { value: 'Executive', label: '高管' }
    ];

    const domains = [
        { value: 'Technology', label: '技术' },
        { value: 'Finance', label: '金融' },
        { value: 'Healthcare', label: '医疗' },
        { value: 'Education', label: '教育' },
        { value: 'E-commerce', label: '电商' }
    ];

    // Helper function to get Chinese label
    const getRoleLabel = (value: string) => roles.find(r => r.value === value)?.label || value;
    const getDomainLabel = (value: string) => domains.find(d => d.value === value)?.label || value;

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const response = await axios.get('/api/users/list/all');
            setUsers(response.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (!window.confirm('确定要删除这个用户画像吗？')) return;
        try {
            await axios.delete(`/api/users/${id}`);
            setUsers(users.filter(u => u.id !== id));
        } catch (err) {
            console.error(err);
            alert('删除失败');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('/api/users/', formData);
            const userId = response.data.id;
            localStorage.setItem('currentUserId', userId.toString());
            navigate('/test');
        } catch (err) {
            console.error(err);
            setError('创建用户失败，请重试。');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (showUserList) {
            fetchUsers();
        }
    }, [showUserList]);

    return (
        <div className="w-screen min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4 relative overflow-y-auto">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-8 shadow-2xl relative z-10"
            >
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-600/20 rounded-xl">
                            <User className="w-6 h-6 text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold">用户画像录入</h2>
                    </div>
                    <button
                        onClick={() => setShowUserList(true)}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
                        title="查看已存画像"
                    >
                        <Users className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">姓名</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                placeholder="请输入您的姓名"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">角色</label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none"
                            >
                                {roles.map((role) => (
                                    <option key={role.value} value={role.value}>{role.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">领域</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <select
                                value={formData.domain}
                                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors appearance-none"
                            >
                                {domains.map((domain) => (
                                    <option key={domain.value} value={domain.value}>{domain.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                处理中...
                            </>
                        ) : (
                            <>
                                开始测评
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>
            </motion.div>

            {/* User List Modal */}
            <AnimatePresence>
                {showUserList && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowUserList(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                                <h3 className="text-xl font-bold">已存用户画像</h3>
                                <button
                                    onClick={() => setShowUserList(false)}
                                    className="p-1 hover:bg-gray-700 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1">
                                {loadingUsers ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                    </div>
                                ) : users.length === 0 ? (
                                    <p className="text-center text-gray-400 py-8">暂无用户画像</p>
                                ) : (
                                    <div className="space-y-3">
                                        {users.map(user => (
                                            <div key={user.id} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors">
                                                <div>
                                                    <h4 className="font-medium text-white">{user.name}</h4>
                                                    <p className="text-sm text-gray-400">{getRoleLabel(user.role)} • {getDomainLabel(user.domain)}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => {
                                                            localStorage.setItem('currentUserId', user.id.toString());
                                                            navigate('/test');
                                                        }}
                                                        className="px-3 py-1.5 text-sm bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg transition-colors"
                                                    >
                                                        选择
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="删除"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UserEntry;
