import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { ArrowLeft, Upload, FileText, Trash2, RefreshCw, Share2, Loader2 } from 'lucide-react';

interface UserProfile {
    id: number;
    name: string;
    role: string;
}

const KnowledgeGraph: React.FC = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [textInput, setTextInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [graphData, setGraphData] = useState<{ nodes: any[], relationships: any[] } | null>(null);

    const networkContainer = useRef<HTMLDivElement>(null);
    const networkRef = useRef<Network | null>(null);

    // Fetch users on mount
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await axios.get('/api/users/list/all');
                setUsers(response.data);
                // Default to first user if available
                if (response.data.length > 0) {
                    setSelectedUserId(response.data[0].id);
                }
            } catch (err) {
                console.error("Failed to fetch users", err);
            }
        };
        fetchUsers();
    }, []);

    // Fetch graph when user changes
    useEffect(() => {
        if (selectedUserId) {
            fetchGraph(selectedUserId);
        }
    }, [selectedUserId]);

    // Initialize/Update Vis Network
    useEffect(() => {
        if (networkContainer.current && graphData) {
            const nodes = new DataSet(
                graphData.nodes.map((n: any) => ({
                    id: n.id,
                    label: n.name || n.label,
                    group: n.label,
                    shape: 'dot',
                    size: 20,
                    font: { size: 14, color: '#ffffff' }
                }))
            );

            const edges = new DataSet(
                graphData.relationships.map((r: any) => ({
                    from: r.from,
                    to: r.to,
                    label: r.type,
                    arrows: 'to',
                    font: { align: 'middle', size: 10, color: '#aaaaaa' },
                    color: { color: '#666666' }
                }))
            );

            const data: any = { nodes, edges };
            const options = {
                nodes: {
                    borderWidth: 2,
                    shadow: true,
                    color: {
                        background: '#3b82f6',
                        border: '#2563eb',
                        highlight: { background: '#60a5fa', border: '#3b82f6' }
                    }
                },
                edges: {
                    width: 1,
                    shadow: true,
                    smooth: { type: 'continuous' }
                },
                physics: {
                    stabilization: false,
                    barnesHut: {
                        gravitationalConstant: -2000,
                        springConstant: 0.04,
                        springLength: 95
                    }
                },
                interaction: {
                    hover: true,
                    tooltipDelay: 200
                },
                groups: {
                    Person: { color: { background: '#10b981', border: '#059669' } },
                    Company: { color: { background: '#f59e0b', border: '#d97706' } },
                    Concept: { color: { background: '#8b5cf6', border: '#7c3aed' } }
                }
            };

            if (networkRef.current) {
                networkRef.current.destroy();
            }

            networkRef.current = new Network(networkContainer.current, data, options);
        }
    }, [graphData]);

    const fetchGraph = async (userId: number) => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/kg/${userId}`);
            setGraphData(response.data);
        } catch (err) {
            console.error("Failed to fetch graph", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!selectedUserId) return;
        if (!file && !textInput.trim()) {
            alert("请上传文件或输入文本");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        if (file) formData.append('file', file);
        if (textInput) formData.append('text_input', textInput);

        try {
            await axios.post(`/api/kg/upload/${selectedUserId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("上传成功，正在生成图谱...");
            fetchGraph(selectedUserId);
            setFile(null);
            setTextInput('');
        } catch (err) {
            console.error("Upload failed", err);
            alert("上传失败");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteGraph = async () => {
        if (!selectedUserId || !window.confirm("确定要清空该用户的知识图谱吗？")) return;
        try {
            await axios.delete(`/api/kg/${selectedUserId}`);
            setGraphData({ nodes: [], relationships: [] });
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    return (
        <div className="w-screen min-h-screen bg-gray-900 text-white p-4 md:p-8 pt-24 flex flex-col">
            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                            知识图谱可视化
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <select
                            value={selectedUserId || ''}
                            onChange={(e) => setSelectedUserId(Number(e.target.value))}
                            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                        >
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                            ))}
                        </select>
                        <button
                            onClick={() => selectedUserId && fetchGraph(selectedUserId)}
                            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                            title="刷新"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={handleDeleteGraph}
                            className="p-2 hover:bg-red-900/20 text-red-400 rounded-lg transition-colors"
                            title="清空图谱"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
                    {/* Sidebar: Upload & Controls */}
                    <div className="lg:col-span-1 bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6 flex flex-col gap-6 h-fit">
                        <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Upload className="w-5 h-5 text-blue-400" />
                                导入知识
                            </h3>

                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-gray-600 rounded-xl p-4 hover:border-blue-500 transition-colors cursor-pointer relative">
                                    <input
                                        type="file"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="text-center">
                                        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                        <p className="text-sm text-gray-300">
                                            {file ? file.name : "点击上传文档 (PDF/Word)"}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <textarea
                                        value={textInput}
                                        onChange={(e) => setTextInput(e.target.value)}
                                        placeholder="或者直接输入文本内容..."
                                        className="w-full bg-gray-900/50 border border-gray-600 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 h-32 resize-none"
                                    />
                                </div>

                                <button
                                    onClick={handleUpload}
                                    disabled={uploading || (!file && !textInput)}
                                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            解析中...
                                        </>
                                    ) : (
                                        <>
                                            <Share2 className="w-4 h-4" />
                                            开始解析并构建
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="border-t border-gray-700 pt-4">
                            <h4 className="text-sm font-medium text-gray-400 mb-2">统计信息</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-900/50 p-3 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-blue-400">
                                        {graphData?.nodes.length || 0}
                                    </div>
                                    <div className="text-xs text-gray-500">实体节点</div>
                                </div>
                                <div className="bg-gray-900/50 p-3 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-purple-400">
                                        {graphData?.relationships.length || 0}
                                    </div>
                                    <div className="text-xs text-gray-500">关联关系</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Area: Graph Visualization */}
                    <div className="lg:col-span-3 bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden relative shadow-inner h-[600px] lg:h-auto">
                        {loading && (
                            <div className="absolute inset-0 z-10 bg-gray-900/80 flex items-center justify-center backdrop-blur-sm">
                                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                            </div>
                        )}

                        {!loading && (!graphData || graphData.nodes.length === 0) && (
                            <div className="absolute inset-0 z-0 flex flex-col items-center justify-center text-gray-500">
                                <Share2 className="w-16 h-16 mb-4 opacity-20" />
                                <p>暂无图谱数据，请先导入文档</p>
                            </div>
                        )}

                        <div ref={networkContainer} className="w-full h-full cursor-move" />

                        <div className="absolute bottom-4 right-4 bg-gray-800/80 backdrop-blur px-3 py-1.5 rounded-lg text-xs text-gray-400 border border-gray-700">
                            支持滚轮缩放 / 拖拽移动 / 点击节点
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KnowledgeGraph;
