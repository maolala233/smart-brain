import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Zap, MessageSquare, Users, Share2 } from 'lucide-react';

const Home: React.FC = () => {
    return (
        <div className="relative w-screen min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gray-900 text-white">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 w-full min-h-screen flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8 py-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-4xl mx-auto"
                >
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-blue-500/10 rounded-full border border-blue-500/30 backdrop-blur-xl">
                            <Brain className="w-16 h-16 text-blue-400" />
                        </div>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                        智慧员工
                    </h1>

                    <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                        基于大模型与知识图谱的数字分身系统。<br />
                        提取您的逻辑思维、语言风格与专业知识,打造您的专属AI代理。
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center justify-center gap-4 w-full max-w-4xl px-4">
                        <Link to="/entry" className="w-full lg:w-auto">
                            <motion.button
                                whileHover={{ scale: 1.05, backgroundColor: "rgba(59, 130, 246, 0.2)" }}
                                whileTap={{ scale: 0.95 }}
                                className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gray-800/40 hover:bg-gray-800/60 rounded-xl text-lg font-bold text-blue-300 border border-blue-500/30 hover:border-blue-500 transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] backdrop-blur-sm group"
                            >
                                <Zap className="w-5 h-5 group-hover:text-blue-200" />
                                <span>开始构建画像</span>
                            </motion.button>
                        </Link>

                        <Link to="/users" className="w-full lg:w-auto">
                            <motion.button
                                whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                                whileTap={{ scale: 0.95 }}
                                className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gray-800/40 hover:bg-gray-800/60 rounded-xl text-lg font-bold text-gray-300 hover:text-white border border-gray-600/30 hover:border-gray-500 transition-all backdrop-blur-sm"
                            >
                                <Users className="w-5 h-5" />
                                <span>已存用户画像</span>
                            </motion.button>
                        </Link>

                        <Link to="/knowledge-graph" className="w-full lg:w-auto">
                            <motion.button
                                whileHover={{ scale: 1.05, backgroundColor: "rgba(168, 85, 247, 0.1)" }}
                                whileTap={{ scale: 0.95 }}
                                className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gray-800/40 hover:bg-gray-800/60 rounded-xl text-lg font-bold text-purple-300 hover:text-purple-200 border border-purple-500/30 hover:border-purple-500 transition-all shadow-[0_0_15px_rgba(168,85,247,0.1)] hover:shadow-[0_0_25px_rgba(168,85,247,0.3)] backdrop-blur-sm"
                            >
                                <Share2 className="w-5 h-5" />
                                <span>知识图谱</span>
                            </motion.button>
                        </Link>

                        <Link to="/smart-qa" className="w-full lg:w-auto">
                            <motion.button
                                whileHover={{ scale: 1.05, backgroundColor: "rgba(16, 185, 129, 0.1)" }}
                                whileTap={{ scale: 0.95 }}
                                className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gray-800/40 hover:bg-gray-800/60 rounded-xl text-lg font-bold text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 hover:border-emerald-500 transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] backdrop-blur-sm"
                            >
                                <MessageSquare className="w-5 h-5" />
                                <span>智慧问答</span>
                            </motion.button>
                        </Link>
                    </div>
                </motion.div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 w-full max-w-6xl">
                    {[
                        {
                            icon: <Zap className="w-8 h-8 text-yellow-400" />,
                            title: "逻辑提取",
                            desc: "通过心理学量表与文档分析，精准捕捉您的决策风格与思维链路。"
                        },
                        {
                            icon: <MessageSquare className="w-8 h-8 text-purple-400" />,
                            title: "风格复刻",
                            desc: "学习您的沟通语气的修辞习惯，生成高度还原的语言风格模型。"
                        },
                        {
                            icon: <Brain className="w-8 h-8 text-green-400" />,
                            title: "知识内化",
                            desc: "构建个人知识图谱，让智慧员工拥有您的专业经验与业务洞察。"
                        }
                    ].map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + index * 0.1 }}
                            className="bg-gray-800/30 backdrop-blur-md p-8 rounded-2xl border border-gray-700 hover:bg-gray-800/50 transition-colors"
                        >
                            <div className="mb-4 p-4 w-fit mx-auto flex items-center justify-center">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                            <p className="text-gray-400">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Footer / Status */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 1 }}
                className="absolute bottom-8 text-gray-500 text-sm"
            >
                System Status: <span className="text-green-400">Online</span> | AI Core: <span className="text-blue-400">Active</span>
            </motion.div>
        </div>
    );
};

export default Home;
