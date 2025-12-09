import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Share2, Send, Bot, CheckCircle, Circle, ArrowLeft, Loader2 } from 'lucide-react';

interface UserProfile {
    id: number;
    name: string;
    role?: string;
    domain?: string;
    persona?: {
        id: number;
        name: string;
        description?: string;
    };
}

interface KnowledgeSubgraph {
    id: number;
    name: string;
    description?: string;
    created_at: string;
}

interface Message {
    id: string;
    type: 'user' | 'ai';
    content: string;
}

const SmartQA: React.FC = () => {
    const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
    const [selectedUser, setSelectedUser] = useState<number | null>(null);
    const [subgraphs, setSubgraphs] = useState<KnowledgeSubgraph[]>([]);
    const [selectedSubgraphs, setSelectedSubgraphs] = useState<number[]>([]);
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // 获取所有用户画像
    useEffect(() => {
        fetchUserProfiles();
    }, []);

    // 当用户选择改变时，获取对应的子图
    useEffect(() => {
        if (selectedUser) {
            fetchSubgraphs(selectedUser);
            setSelectedSubgraphs([]);
        }
    }, [selectedUser]);

    const fetchUserProfiles = async () => {
        try {
            const response = await fetch('/api/users/list/all');
            if (response.ok) {
                const users = await response.json();
                setUserProfiles(users);
            } else {
                setError('获取用户列表失败');
            }
        } catch (err) {
            setError('网络错误');
            console.error(err);
        }
    };

    const fetchSubgraphs = async (userId: number) => {
        try {
            const response = await fetch(`/api/kg/subgraph/list/${userId}`);
            if (response.ok) {
                const data = await response.json();
                setSubgraphs(data);
            } else {
                setError('获取知识子图失败');
            }
        } catch (err) {
            setError('网络错误');
            console.error(err);
        }
    };

    const handleSubgraphToggle = (subgraphId: number) => {
        if (selectedSubgraphs.includes(subgraphId)) {
            setSelectedSubgraphs(selectedSubgraphs.filter(id => id !== subgraphId));
        } else {
            setSelectedSubgraphs([...selectedSubgraphs, subgraphId]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || selectedSubgraphs.length === 0 || !question.trim()) {
            setError('请选择用户画像、至少一个知识子图并输入问题');
            return;
        }

        // 添加用户消息到对话历史
        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: question
        };
        
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        setError('');
        
        const currentQuestion = question;
        setQuestion('');

        try {
            const response = await fetch(`/api/kg/smart-qa/${selectedUser}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: currentQuestion,
                    subgraph_ids: selectedSubgraphs,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                // 添加AI回复到对话历史
                const aiMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    type: 'ai',
                    content: data.answer
                };
                setMessages(prev => [...prev, aiMessage]);
            } else {
                const errorData = await response.json();
                setError(errorData.detail || '问答处理失败');
            }
        } catch (err) {
            setError('网络错误');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isLoading && question.trim() && selectedUser && selectedSubgraphs.length > 0) {
                handleSubmit(e as any);
            }
        }
        // Shift+Enter 默认行为就是换行，不需要额外处理
    };

    return (
        <div className="w-screen min-h-screen bg-gray-900 text-white p-4 md:p-8 pt-24 flex flex-col">
            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
                {/* Header: 完全复刻 KnowledgeGraph 的头部样式 */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                            智慧问答
                        </h1>
                    </div>
                    {/* 右侧可以放一些状态指示器，或者保持空白 */}
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                        {selectedUser && <span>已选画像: {userProfiles.find(u => u.id === selectedUser)?.name}</span>}
                    </div>
                </div>

                {/* Main Grid: 左侧配置 (1/4) + 右侧问答 (3/4) */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">

                    {/* === 左侧 Sidebar: 配置区域 === */}
                    <div className="lg:col-span-1 bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6 flex flex-col gap-6 h-fit max-h-[calc(100vh-160px)] overflow-y-auto">

                        {/* 1. 用户画像选择 */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-400">
                                <User className="w-5 h-5" />
                                选择用户画像
                            </h3>
                            <div className="space-y-3">
                                {userProfiles.map((user) => (
                                    <div
                                        key={user.id}
                                        onClick={() => setSelectedUser(user.id)}
                                        className={`p-3 rounded-lg cursor-pointer transition-all border ${
                                            selectedUser === user.id
                                                ? 'bg-blue-600/20 border-blue-500'
                                                : 'bg-gray-900/50 border-gray-700 hover:border-gray-500'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm">{user.name}</span>
                                            {selectedUser === user.id && <CheckCircle className="w-4 h-4 text-blue-400" />}
                                        </div>
                                        {user.persona && (
                                            <div className="text-xs text-gray-400 mt-1 truncate">
                                                {user.persona.name}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {userProfiles.length === 0 && (
                                    <div className="text-gray-500 text-sm text-center">暂无画像</div>
                                )}
                            </div>
                        </div>

                        {/* 2. 知识子图选择 */}
                        <div className="border-t border-gray-700 pt-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-purple-400">
                                <Share2 className="w-5 h-5" />
                                选择知识子图
                            </h3>
                            <div className="space-y-2">
                                {subgraphs.map((subgraph) => (
                                    <div
                                        key={subgraph.id}
                                        onClick={() => handleSubgraphToggle(subgraph.id)}
                                        className={`p-3 rounded-lg cursor-pointer transition-all border flex items-center gap-3 ${
                                            selectedSubgraphs.includes(subgraph.id)
                                                ? 'bg-purple-600/20 border-purple-500'
                                                : 'bg-gray-900/50 border-gray-700 hover:border-gray-500'
                                        }`}
                                    >
                                        {selectedSubgraphs.includes(subgraph.id) ? (
                                            <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                        ) : (
                                            <Circle className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <div className="font-medium text-sm truncate">{subgraph.name}</div>
                                            {subgraph.description && (
                                                <div className="text-xs text-gray-400 truncate">{subgraph.description}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {!selectedUser && (
                                    <div className="text-gray-500 text-sm text-center">请先选择用户画像</div>
                                )}
                                {selectedUser && subgraphs.length === 0 && (
                                    <div className="text-gray-500 text-sm text-center">该用户暂无子图</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* === 右侧 Main Area: 问答区域 === */}
                    <div className="lg:col-span-3 flex flex-col gap-6 h-[calc(100vh-160px)]">

                        {/* 答案显示区 (占据剩余空间) */}
                        <div className="flex-1 bg-gray-900/50 rounded-2xl border border-gray-700 p-6 overflow-y-auto shadow-inner relative">
                            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <Bot className="w-5 h-5 text-green-400" />
                                对话记录
                            </h2>

                            {messages.length === 0 && !isLoading ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                    <Bot className="w-16 h-16 mb-4 opacity-20" />
                                    <p>请在左侧配置参数，并在下方输入问题</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {messages.map((message) => (
                                        <div 
                                            key={message.id} 
                                            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div 
                                                className={`max-w-3xl rounded-2xl px-4 py-3 ${
                                                    message.type === 'user' 
                                                        ? 'bg-blue-600/20 border border-blue-500/30' 
                                                        : 'bg-gray-800/50 border border-gray-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    {message.type === 'user' ? (
                                                        <User className="w-4 h-4 text-blue-400" />
                                                    ) : (
                                                        <Bot className="w-4 h-4 text-green-400" />
                                                    )}
                                                    <span className="text-xs font-medium">
                                                        {message.type === 'user' ? '你' : 'AI助手'}
                                                    </span>
                                                </div>
                                                <div className="whitespace-pre-wrap leading-relaxed text-gray-200">
                                                    {message.content}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <div className="max-w-3xl rounded-2xl px-4 py-3 bg-gray-800/50 border border-gray-700">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Bot className="w-4 h-4 text-green-400" />
                                                    <span className="text-xs font-medium">AI助手</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                                    <span className="text-gray-400">正在思考并检索知识库...</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 提问输入区 (固定高度) */}
                        <div className="h-48 bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-4 flex flex-col relative shrink-0 shadow-lg">
                            <h2 className="text-sm font-semibold mb-2 flex items-center gap-2 text-gray-400">
                                <Search className="w-4 h-4" />
                                提问
                            </h2>
                            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                                <textarea
                                    ref={textareaRef}
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="请输入您的问题...&#10;Enter发送，Shift+Enter换行"
                                    className="flex-1 w-full bg-gray-900/50 rounded-xl p-3 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 border border-gray-600/50 text-white placeholder-gray-500"
                                    disabled={isLoading}
                                />
                                <div className="flex justify-between items-center mt-3">
                                    <div className="text-xs text-red-400 h-4">
                                        {error && <span>{error}</span>}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading || !selectedUser || selectedSubgraphs.length === 0 || !question.trim()}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2 font-medium text-sm shadow-md"
                                    >
                                        <Send className="w-4 h-4" />
                                        发送提问
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SmartQA;