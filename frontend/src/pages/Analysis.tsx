import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Upload, FileText, Loader2, Type, X, SkipForward } from 'lucide-react';

const Analysis: React.FC = () => {
    const navigate = useNavigate();
    const [files, setFiles] = useState<File[]>([]);
    const [textInput, setTextInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const storedUserId = localStorage.getItem('currentUserId');
        if (!storedUserId) {
            navigate('/entry');
        } else {
            setUserId(storedUserId);
        }
    }, [navigate]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!userId) return;

        setLoading(true);
        const formData = new FormData();

        // 添加所有文件
        files.forEach(file => {
            formData.append('files', file);
        });

        // 添加文本输入
        if (textInput.trim()) {
            formData.append('text_input', textInput);
        }

        try {
            await axios.post(`/api/users/${userId}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            navigate('/profile');
        } catch (err) {
            console.error(err);
            alert('分析失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        // 直接跳过文档分析，进入画像页面
        navigate('/profile');
    };

    return (
        <div className="w-screen min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-2xl bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700 p-8 shadow-2xl"
            >
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 bg-purple-500/10 rounded-full mb-6">
                        <FileText className="w-12 h-12 text-purple-400" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">文档与思维分析</h1>
                    <p className="text-gray-400">上传您的过往文档或直接输入文字，AI将提取您的逻辑与风格</p>
                    <p className="text-sm text-gray-500 mt-2">💡 此步骤为可选，可直接跳过查看当前画像</p>
                </div>

                <div className="space-y-6">
                    {/* File Upload Area */}
                    <div className="relative">
                        <input
                            type="file"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            style={{ zIndex: files.length > 0 ? -1 : 10 }}
                            accept=".txt,.md,.pdf,.docx"
                            multiple
                        />
                        <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${files.length > 0 ? 'border-purple-500 bg-purple-500/10' : 'border-gray-600 hover:border-purple-400 hover:bg-gray-700/50'
                            }`}>
                            <Upload className={`w-10 h-10 mx-auto mb-4 ${files.length > 0 ? 'text-purple-400' : 'text-gray-500'}`} />
                            {files.length > 0 ? (
                                <div>
                                    <p className="text-purple-300 font-medium mb-2">已选择 {files.length} 个文件</p>
                                    <div className="flex flex-wrap gap-2 justify-center relative z-20">
                                        {files.map((file, index) => (
                                            <div key={index} className="flex items-center gap-1 bg-gray-700 px-3 py-1 rounded-full text-sm">
                                                <span className="max-w-[150px] truncate">{file.name}</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        removeFile(index);
                                                    }}
                                                    className="hover:text-red-400 transition-colors z-30"
                                                    type="button"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-3">点击下方区域继续添加文件</p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-lg font-medium mb-1">点击或拖拽上传文件</p>
                                    <p className="text-sm text-gray-500">支持 TXT, MD, PDF, DOCX（可多选）</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="h-px bg-gray-700 flex-1" />
                        <span className="text-gray-500 text-sm">或</span>
                        <div className="h-px bg-gray-700 flex-1" />
                    </div>

                    {/* Text Input Area */}
                    <div>
                        <div className="relative">
                            <textarea
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                placeholder="在此直接输入或粘贴您的文字内容..."
                                className="w-full h-40 bg-gray-900/50 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                            />
                            <Type className="absolute top-4 right-4 w-5 h-5 text-gray-600" />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleSkip}
                            className="flex-1 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
                        >
                            <SkipForward className="w-5 h-5" />
                            跳过此步骤
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl font-bold text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    正在深度分析...
                                </>
                            ) : (
                                '开始分析'
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Analysis;
