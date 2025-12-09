import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, User, Bot, Share2, CheckCircle, Network, ArrowLeft, Loader2, Search, Circle } from 'lucide-react';
import EvidenceGraphModal from '../components/EvidenceGraphModal';

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
    context?: any; // To store search strategies and other metadata
    senderName?: string;
}

interface UserPersona {
    id: number;
    name: string;
    role: string;
    avatar_url: string;
    tone: string;
    logic: string;
    description: string;
}

interface Subgraph {
    id: number;
    name: string;
}

const SmartQA: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([{
        id: '1',
        type: 'ai',
        content: '你好！我是你的智慧助手。请选择一个"数字分身"并提问，我会用TA的思维逻辑回答你。',
        senderName: '智慧助手'
    }]);
    const [question, setQuestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<number | null>(null);
    const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
    const [subgraphs, setSubgraphs] = useState<KnowledgeSubgraph[]>([]);
    const [selectedSubgraphs, setSelectedSubgraphs] = useState<number[]>([]);
    const [error, setError] = useState('');

    // Evidence Graph State
    const [showEvidenceGraph, setShowEvidenceGraph] = useState(false);
    const [evidenceData, setEvidenceData] = useState<{ nodes: any[], relationships: any[] }>({ nodes: [], relationships: [] });

    // Auto-scroll ref
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
            // Prepare history (last 5 messages)
            const history = messages.slice(-5).map(msg => ({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: msg.content
            }));

            const response = await fetch(`/api/kg/smart-qa/${selectedUser}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: currentQuestion,
                    subgraph_ids: selectedSubgraphs,
                    history: history
                }),
            });

            if (response.ok) {
                const data = await response.json();
                // 添加AI回复到对话历史
                const sender = userProfiles.find(u => u.id === selectedUser);
                const aiMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    type: 'ai',
                    content: data.answer,
                    context: data.context, // Save the context data
                    senderName: sender?.name || 'AI助手'
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
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                选择数字分身
                            </h3>
                            <div className="space-y-2">
                                {userProfiles.length === 0 ? (
                                    <div className="text-gray-500 text-sm text-center py-4 bg-gray-900/50 rounded-lg">
                                        暂无可用画像
                                    </div>
                                ) : (
                                    userProfiles.map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => setSelectedUser(user.id)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedUser === user.id
                                                ? 'bg-blue-600/20 border-blue-500/50 shadow-lg shadow-blue-500/10'
                                                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedUser === user.id ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'
                                                }`}>
                                                <User className="w-6 h-6" />
                                            </div>
                                            <div className="text-left">
                                                <div className={`font-medium ${selectedUser === user.id ? 'text-blue-300' : 'text-gray-200'}`}>
                                                    {user.name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {user.role || '普通用户'}
                                                </div>
                                            </div>
                                            {selectedUser === user.id && (
                                                <CheckCircle className="w-5 h-5 text-blue-400 ml-auto" />
                                            )}
                                        </button>
                                    ))
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
                                        className={`p-3 rounded-lg cursor-pointer transition-all border flex items-center gap-3 ${selectedSubgraphs.includes(subgraph.id)
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
                                                className={`max-w-3xl rounded-2xl px-4 py-3 ${message.type === 'user'
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
                                                        {message.type === 'user' ? '你' : (message.senderName || 'AI助手')}
                                                    </span>
                                                </div>

                                                {/* Search Strategy Visualization */}
                                                {message.type === 'ai' && message.context?.search_strategies && (
                                                    <div className="mb-3 mt-1 p-3 bg-gray-900/50 rounded-lg border border-gray-700/50 text-xs">
                                                        <div className="font-semibold text-gray-400 mb-2 flex items-center gap-1">
                                                            <Share2 className="w-3 h-3" />
                                                            检索逻辑 (基于用户画像)
                                                        </div>
                                                        <div className="space-y-2 mb-3">
                                                            {message.context.search_strategies.map((strategy: any, idx: number) => (
                                                                <div key={idx} className="flex flex-col gap-1 border-l-2 border-blue-500/30 pl-2">
                                                                    <div className="text-blue-300 font-medium">
                                                                        策略: {strategy.query}
                                                                    </div>
                                                                    <div className="text-gray-500">
                                                                        {strategy.description}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Evidence Visualization */}
                                                        {(message.context.nodes?.length > 0 || message.context.relationships?.length > 0) && (
                                                            <div className="border-t border-gray-700/50 pt-2 mt-2">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="font-semibold text-gray-400 flex items-center gap-1">
                                                                        <CheckCircle className="w-3 h-3 text-green-500/50" />
                                                                        参考证据
                                                                    </div>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEvidenceData({
                                                                                nodes: message.context.nodes || [],
                                                                                relationships: message.context.relationships || []
                                                                            });
                                                                            setShowEvidenceGraph(true);
                                                                        }}
                                                                        className="flex items-center gap-1 text-[10px] bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-2 py-1 rounded transition-colors"
                                                                    >
                                                                        <Network className="w-3 h-3" />
                                                                        查看图谱
                                                                    </button>
                                                                </div>

                                                                {/* Nodes */}
                                                                {message.context.nodes?.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1 mb-2">
                                                                        {message.context.nodes.map((node: any, idx: number) => (
                                                                            <span key={idx} className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded border border-gray-700 text-[10px] truncate max-w-[150px]" title={`Label: ${node.label}`}>
                                                                                {node.name}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* Relationships (Simple count or list) */}
                                                                {message.context.relationships?.length > 0 && (
                                                                    <div className="text-[10px] text-gray-500">
                                                                        已关联 {message.context.relationships.length} 条关系数据
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

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
                                                    <span className="text-xs font-medium">
                                                        {userProfiles.find(u => u.id === selectedUser)?.name || 'AI助手'}
                                                    </span>
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

            {/* Evidence Modal */}
            <EvidenceGraphModal
                isOpen={showEvidenceGraph}
                onClose={() => setShowEvidenceGraph(false)}
                data={evidenceData}
            />
        </div>
    );
};

export default SmartQA;