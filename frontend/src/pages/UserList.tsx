import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { User, Eye, RefreshCw, Trash2, ArrowLeft, Loader2, Search, MessageSquare, Zap } from 'lucide-react';

interface Persona {
    extracted_tone_style?: string;
    extracted_positive_logic?: string;
}

interface UserProfile {
    id: number;
    name: string;
    role: string;
    domain: string;
    persona?: Persona;
}

const UserList: React.FC = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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

    const getRoleLabel = (value: string) => roles.find(r => r.value === value)?.label || value;
    const getDomainLabel = (value: string) => domains.find(d => d.value === value)?.label || value;

    const fetchUsers = async () => {
        try {
            const response = await axios.get('/api/users/list/all');
            setUsers(response.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

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

    const handleViewProfile = (id: number) => {
        localStorage.setItem('currentUserId', id.toString());
        navigate('/profile');
    };

    const handleRetest = (id: number) => {
        localStorage.setItem('currentUserId', id.toString());
        navigate('/test');
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getRoleLabel(user.role).includes(searchTerm) ||
        getDomainLabel(user.domain).includes(searchTerm)
    );

    return (
        <div className="w-screen min-h-screen bg-gray-900 text-white p-4 md:p-8 pt-24">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                            已存用户画像
                        </h1>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="搜索用户..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-gray-800 border border-gray-700 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-blue-500 w-64"
                        />
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 overflow-hidden shadow-xl"
                >
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>暂无用户画像</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-900/50 text-gray-400">
                                    <tr>
                                        <th className="p-4 pl-6">姓名</th>
                                        <th className="p-4">角色</th>
                                        <th className="p-4">领域</th>
                                        <th className="p-4">沟通风格</th>
                                        <th className="p-4">正向逻辑</th>
                                        <th className="p-4 text-right pr-6">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-700/30 transition-colors group">
                                            <td className="p-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-500/20 rounded-lg">
                                                        <User className="w-5 h-5 text-blue-400" />
                                                    </div>
                                                    <span className="font-medium text-lg">{user.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-300">{getRoleLabel(user.role)}</td>
                                            <td className="p-4 text-gray-300">{getDomainLabel(user.domain)}</td>
                                            <td className="p-4">
                                                {user.persona?.extracted_tone_style ? (
                                                    <div className="flex items-center gap-2 text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full w-fit text-sm">
                                                        <MessageSquare className="w-3 h-3" />
                                                        <span className="truncate max-w-[150px]" title={user.persona.extracted_tone_style}>
                                                            {user.persona.extracted_tone_style}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500 text-sm italic">未分析</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {user.persona?.extracted_positive_logic ? (
                                                    <div className="flex items-center gap-2 text-green-300 bg-green-500/10 px-3 py-1 rounded-full w-fit text-sm">
                                                        <Zap className="w-3 h-3" />
                                                        <span className="truncate max-w-[150px]" title={user.persona.extracted_positive_logic}>
                                                            {user.persona.extracted_positive_logic}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500 text-sm italic">未分析</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right pr-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleViewProfile(user.id)}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg transition-colors text-sm font-medium"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        查看
                                                    </button>
                                                    <button
                                                        onClick={() => handleRetest(user.id)}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-lg transition-colors text-sm font-medium"
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                        重新测试
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="删除"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default UserList;
