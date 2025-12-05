import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as vis from 'vis-network';
import { DataSet } from 'vis-data';
import { ArrowLeft, Upload, FileText, Trash2, RefreshCw, Share2, Loader2, X, Plus, Edit } from 'lucide-react';

interface UserProfile {
    id: number;
    name: string;
    role: string;
}

interface Subgraph {
    id: number;
    user_id: number;
    name: string;
    description: string | null;
    created_at: string;
}

const KnowledgeGraph: React.FC = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [subgraphs, setSubgraphs] = useState<Subgraph[]>([]);
    const [selectedSubgraphId, setSelectedSubgraphId] = useState<number | null>(null);
    const [showCreateSubgraph, setShowCreateSubgraph] = useState(false);
    const [newSubgraphName, setNewSubgraphName] = useState('');
    const [newSubgraphDescription, setNewSubgraphDescription] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showEditSubgraph, setShowEditSubgraph] = useState(false);
    const [editSubgraphName, setEditSubgraphName] = useState('');
    const [editSubgraphDescription, setEditSubgraphDescription] = useState('');

    const [files, setFiles] = useState<File[]>([]);
    const [textInput, setTextInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [graphData, setGraphData] = useState<{ nodes: any[], relationships: any[] } | null>(null);

    const networkContainer = useRef<HTMLDivElement>(null);
    const networkRef = useRef<vis.Network | null>(null);

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

    // Fetch subgraphs when user changes
    useEffect(() => {
        if (selectedUserId) {
            fetchSubgraphs(selectedUserId);
        }
    }, [selectedUserId]);

    // Fetch graph when subgraph changes
    useEffect(() => {
        if (selectedUserId && selectedSubgraphId) {
            fetchGraph(selectedUserId, selectedSubgraphId);
        } else if (selectedUserId && subgraphs.length > 0) {
            // Auto-select first subgraph if none selected
            setSelectedSubgraphId(subgraphs[0].id);
            fetchGraph(selectedUserId, subgraphs[0].id);
        }
    }, [selectedUserId, selectedSubgraphId, subgraphs]);

    // Initialize/Update Vis Network
    useEffect(() => {
        if (networkContainer.current && graphData) {
            // Prepare node and edge data
            const nodes = graphData.nodes.map((n: any) => ({
                id: n.id,
                label: n.name || n.label,
                group: n.label,
                shape: 'dot',
                size: 15,
                font: { size: 14, color: '#ffffff', strokeWidth: 0, bold: { color: '#ffffff' } }
            }));

            const edges = graphData.relationships.map((r: any) => ({
                from: r.from,
                to: r.to,
                label: r.type,
                arrows: 'to',
                font: { align: 'middle', size: 10, color: '#ffffff', strokeWidth: 0 },
                color: { color: '#666666' }
            }));


            const options: vis.Options = {
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
                    smooth: { type: 'continuous', enabled: true, roundness: 0.5 }
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

            // 如果网络实例不存在，则创建新实例
            if (!networkRef.current) {
                const nodesDataSet = new DataSet(nodes);
                const edgesDataSet = new DataSet(edges as any);
                const dataSet: any = { nodes: nodesDataSet, edges: edgesDataSet };
                networkRef.current = new vis.Network(networkContainer.current, dataSet, options);
            } else {
                // 如果网络实例已存在，只需更新数据
                const network = networkRef.current;

                // 清空现有数据
                ((network as any).body.data.nodes as DataSet<any>).clear();
                ((network as any).body.data.edges as DataSet<any>).clear();

                // 添加新数据
                ((network as any).body.data.nodes as DataSet<any>).add(nodes);
                ((network as any).body.data.edges as DataSet<any>).add(edges);
            }
        }

        // Cleanup function to destroy network when component unmounts
        return () => {
            if (networkRef.current) {
                networkRef.current.destroy();
                networkRef.current = null;
            }
        };
    }, [graphData]);

    const fetchSubgraphs = async (userId: number) => {
        try {
            const response = await axios.get(`/api/kg/subgraph/list/${userId}`);
            setSubgraphs(response.data);
            // Reset selected subgraph
            setSelectedSubgraphId(null);
        } catch (err) {
            console.error("Failed to fetch subgraphs", err);
        }
    };

    const fetchGraph = async (userId: number, subgraphId: number) => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/kg/${userId}?subgraph_id=${subgraphId}`);
            setGraphData(response.data);
        } catch (err) {
            console.error("Failed to fetch graph", err);
        } finally {
            setLoading(false);
        }
    };

    const createSubgraph = async () => {
        if (!selectedUserId || !newSubgraphName.trim()) return;

        try {
            const response = await axios.post('/api/kg/subgraph', {
                user_id: selectedUserId,
                name: newSubgraphName,
                description: newSubgraphDescription
            });

            // Add new subgraph to list
            setSubgraphs(prev => [...prev, response.data]);
            setSelectedSubgraphId(response.data.id);

            // Reset form
            setNewSubgraphName('');
            setNewSubgraphDescription('');
            setShowCreateSubgraph(false);
        } catch (err) {
            console.error("Failed to create subgraph", err);
            alert("创建子图失败");
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (!selectedUserId || !selectedSubgraphId) return;
        if (files.length === 0 && !textInput.trim()) {
            alert("请上传文件或输入文本");
            return;
        }

        setUploading(true);
        const formData = new FormData();

        // Append all files
        files.forEach(file => {
            formData.append('files', file);
        });

        if (textInput) formData.append('text_input', textInput);
        formData.append('subgraph_id', selectedSubgraphId.toString());

        try {
            await axios.post(`/api/kg/upload/${selectedUserId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("上传成功，正在生成图谱...");
            fetchGraph(selectedUserId, selectedSubgraphId);
            setFiles([]);
            setTextInput('');
        } catch (err) {
            console.error("Upload failed", err);
            alert("上传失败");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteClick = () => {
        if (!selectedUserId || !selectedSubgraphId) return;
        setShowDeleteConfirm(true);
    };

    const confirmDeleteSubgraph = async () => {
        if (!selectedUserId || !selectedSubgraphId) return;
        try {
            await axios.delete(`/api/kg/subgraph/${selectedSubgraphId}`);
            setGraphData({ nodes: [], relationships: [] });
            // Refresh subgraphs list
            fetchSubgraphs(selectedUserId);
            setShowDeleteConfirm(false);
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    const handleEditClick = () => {
        if (!selectedSubgraphId) return;
        const currentSubgraph = subgraphs.find(s => s.id === selectedSubgraphId);
        if (currentSubgraph) {
            setEditSubgraphName(currentSubgraph.name);
            setEditSubgraphDescription(currentSubgraph.description || '');
            setShowEditSubgraph(true);
        }
    };

    const updateSubgraph = async () => {
        if (!selectedSubgraphId || !editSubgraphName.trim()) return;

        try {
            const response = await axios.put(`/api/kg/subgraph/${selectedSubgraphId}`, {
                name: editSubgraphName,
                description: editSubgraphDescription
            });

            // Update subgraph in list
            setSubgraphs(prev => prev.map(s =>
                s.id === selectedSubgraphId ? response.data : s
            ));

            // Reset form and close modal
            setEditSubgraphName('');
            setEditSubgraphDescription('');
            setShowEditSubgraph(false);
        } catch (err) {
            console.error("Failed to update subgraph", err);
            alert("更新子图失败");
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

                        <div className="flex items-center gap-2">
                            <select
                                value={selectedSubgraphId || ''}
                                onChange={(e) => setSelectedSubgraphId(Number(e.target.value))}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                            >
                                <option value="">选择子图</option>
                                {subgraphs.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>

                            <button
                                onClick={() => setShowCreateSubgraph(true)}
                                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                                title="创建新子图"
                            >
                                <Plus className="w-5 h-5" />
                            </button>

                            <button
                                onClick={handleEditClick}
                                disabled={!selectedSubgraphId}
                                className="p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="编辑子图"
                            >
                                <Edit className="w-5 h-5" />
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                if (selectedUserId) {
                                    fetchSubgraphs(selectedUserId);
                                    if (selectedSubgraphId) {
                                        fetchGraph(selectedUserId, selectedSubgraphId);
                                    }
                                }
                            }}
                            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                            title="刷新"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={handleDeleteClick}
                            className="p-2 hover:bg-red-900/20 text-red-400 rounded-lg transition-colors"
                            title="删除子图"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Create Subgraph Modal */}
                {showCreateSubgraph && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
                            <h3 className="text-xl font-semibold mb-4">创建新子图</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">子图名称</label>
                                    <input
                                        type="text"
                                        value={newSubgraphName}
                                        onChange={(e) => setNewSubgraphName(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                                        placeholder="请输入子图名称"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">描述（可选）</label>
                                    <textarea
                                        value={newSubgraphDescription}
                                        onChange={(e) => setNewSubgraphDescription(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 h-24 resize-none"
                                        placeholder="请输入子图描述"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setShowCreateSubgraph(false);
                                        setNewSubgraphName('');
                                        setNewSubgraphDescription('');
                                    }}
                                    className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={createSubgraph}
                                    disabled={!newSubgraphName.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded-lg transition-colors"
                                >
                                    创建
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
                            <h3 className="text-xl font-semibold mb-4 text-white">确认删除子图</h3>
                            <p className="text-gray-300 mb-6">
                                确定要删除该子图吗？此操作将永久删除该子图及其所有关联数据，且不可恢复。
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors text-white"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={confirmDeleteSubgraph}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors text-white"
                                >
                                    确认删除
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Subgraph Modal */}
                {showEditSubgraph && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
                            <h3 className="text-xl font-semibold mb-4 text-white">编辑子图</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">子图名称</label>
                                    <input
                                        type="text"
                                        value={editSubgraphName}
                                        onChange={(e) => setEditSubgraphName(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                                        placeholder="请输入子图名称"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">描述（可选）</label>
                                    <textarea
                                        value={editSubgraphDescription}
                                        onChange={(e) => setEditSubgraphDescription(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 h-24 resize-none"
                                        placeholder="请输入子图描述"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setShowEditSubgraph(false);
                                        setEditSubgraphName('');
                                        setEditSubgraphDescription('');
                                    }}
                                    className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors text-white"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={updateSubgraph}
                                    disabled={!editSubgraphName.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded-lg transition-colors text-white"
                                >
                                    保存
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
                                        onChange={(e) => {
                                            if (e.target.files) {
                                                const newFiles = Array.from(e.target.files);
                                                setFiles(prev => [...prev, ...newFiles]);
                                            }
                                        }}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        multiple
                                    />
                                    <div className="text-center">
                                        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                        <p className="text-sm text-gray-300">
                                            点击上传文档 (支持多文件)
                                        </p>
                                    </div>
                                </div>

                                {/* 文件列表展示区 */}
                                {files.length > 0 && (
                                    <div className="bg-gray-900/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                                        <h4 className="text-sm font-medium mb-2 text-gray-300">已选择文件:</h4>
                                        <ul className="space-y-1">
                                            {files.map((file, index) => (
                                                <li
                                                    key={index}
                                                    className="flex items-center justify-between text-xs bg-gray-800/50 rounded px-2 py-1"
                                                >
                                                    <span className="truncate max-w-[70%]">{file.name}</span>
                                                    <button
                                                        onClick={() => removeFile(index)}
                                                        className="text-red-400 hover:text-red-300 p-1"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

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
                                    disabled={uploading || !selectedSubgraphId || (files.length === 0 && !textInput.trim())}
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

                                {selectedSubgraphId && (
                                    <div className="text-xs text-gray-400 bg-gray-900/50 rounded-lg p-3">
                                        <p className="font-medium mb-1">当前子图</p>
                                        <p>{subgraphs.find(s => s.id === selectedSubgraphId)?.name}</p>
                                    </div>
                                )}
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