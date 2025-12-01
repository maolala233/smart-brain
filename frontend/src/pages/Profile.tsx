import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { User, Brain, MessageSquare, Zap, Loader2, Share2, Download } from 'lucide-react';

interface Persona {
    base_logic_type: string;
    extracted_positive_logic: string;
    extracted_tone_style: string;
}

interface UserData {
    id: number;
    name: string;
    role: string;
    domain: string;
    persona: Persona;
}

const Profile: React.FC = () => {
    const navigate = useNavigate();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUser = async () => {
            const storedUserId = localStorage.getItem('currentUserId');
            if (!storedUserId) {
                navigate('/entry');
                return;
            }

            try {
                const response = await axios.get(`/api/users/${storedUserId}`);
                setUserData(response.data);
            } catch (err) {
                console.error(err);
                setError('Failed to load profile.');
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [navigate]);

    if (loading) {
        return (
            <div className="w-screen min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (error || !userData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <p className="text-red-400">{error || 'User not found'}</p>
            </div>
        );
    }

    return (
        <div className="w-screen min-h-screen bg-gray-900 text-white p-4 pt-20">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700 overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="relative h-48 bg-gradient-to-r from-blue-600 to-purple-600">
                        <div className="absolute -bottom-16 left-8">
                            <div className="w-32 h-32 bg-gray-900 rounded-full p-2">
                                <div className="w-full h-full bg-gray-800 rounded-full flex items-center justify-center border-4 border-gray-700">
                                    <User className="w-16 h-16 text-gray-400" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-20 px-8 pb-8">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h1 className="text-3xl font-bold">{userData.name}</h1>
                                <p className="text-gray-400 text-lg">{userData.role} • {userData.domain}</p>
                            </div>
                            <div className="flex gap-3">
                                <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                                    <Share2 className="w-5 h-5" />
                                </button>
                                <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                                    <Download className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Persona Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-gray-900/50 p-6 rounded-2xl border border-gray-700 hover:border-blue-500/50 transition-colors"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-blue-500/20 rounded-lg">
                                        <Brain className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <h3 className="font-semibold text-gray-300">Logic Type</h3>
                                </div>
                                <p className="text-xl font-bold text-white">
                                    {userData.persona?.base_logic_type || 'Not Assessed'}
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-gray-900/50 p-6 rounded-2xl border border-gray-700 hover:border-purple-500/50 transition-colors"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-purple-500/20 rounded-lg">
                                        <MessageSquare className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <h3 className="font-semibold text-gray-300">Communication Tone</h3>
                                </div>
                                <p className="text-lg text-white leading-relaxed">
                                    {userData.persona?.extracted_tone_style || 'Pending Analysis'}
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-gray-900/50 p-6 rounded-2xl border border-gray-700 hover:border-green-500/50 transition-colors"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-green-500/20 rounded-lg">
                                        <Zap className="w-6 h-6 text-green-400" />
                                    </div>
                                    <h3 className="font-semibold text-gray-300">Positive Logic</h3>
                                </div>
                                <p className="text-lg text-white leading-relaxed">
                                    {userData.persona?.extracted_positive_logic || 'Pending Analysis'}
                                </p>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Profile;
