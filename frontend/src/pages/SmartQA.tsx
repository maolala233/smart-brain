import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Share2, Send, Bot } from 'lucide-react';

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

const SmartQA: React.FC = () => {
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [subgraphs, setSubgraphs] = useState<KnowledgeSubgraph[]>([]);
  const [selectedSubgraphs, setSelectedSubgraphs] = useState<number[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  // 获取所有用户画像
  useEffect(() => {
    fetchUserProfiles();
  }, []);

  // 当用户选择改变时，获取对应的子图
  useEffect(() => {
    if (selectedUser) {
      fetchSubgraphs(selectedUser);
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

    setIsLoading(true);
    setError('');
    setAnswer('');

    try {
      const response = await fetch(`/api/kg/smart-qa/${selectedUser}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: question,
          subgraph_ids: selectedSubgraphs,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnswer(data.answer);
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

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="w-8 h-8 text-blue-400" />
            智慧问答
          </h1>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            返回
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧配置面板 */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                选择用户画像
              </h2>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {userProfiles.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user.id)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedUser === user.id
                        ? 'bg-blue-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-medium">{user.name}</div>
                    {user.persona && (
                      <div className="text-sm text-gray-300 mt-1">
                        {user.persona.name}
                      </div>
                    )}
                  </div>
                ))}
                {userProfiles.length === 0 && (
                  <div className="text-gray-400 text-center py-4">
                    暂无用户画像
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                选择知识子图
              </h2>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {subgraphs.map((subgraph) => (
                  <div
                    key={subgraph.id}
                    onClick={() => handleSubgraphToggle(subgraph.id)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedSubgraphs.includes(subgraph.id)
                        ? 'bg-purple-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-medium">{subgraph.name}</div>
                    {subgraph.description && (
                      <div className="text-sm text-gray-300 mt-1">
                        {subgraph.description}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-2">
                      创建于: {new Date(subgraph.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {selectedUser && subgraphs.length === 0 && (
                  <div className="text-gray-400 text-center py-4">
                    该用户暂无知识子图
                  </div>
                )}
                {!selectedUser && (
                  <div className="text-gray-400 text-center py-4">
                    请先选择用户画像
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧问答区域 */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Search className="w-5 h-5" />
                提问
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="请输入您的问题..."
                    className="w-full h-32 bg-gray-700 rounded-lg p-4 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="absolute bottom-4 right-4 p-2 bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                {error && (
                  <div className="text-red-400 text-sm p-3 bg-red-900/20 rounded-lg">
                    {error}
                  </div>
                )}
              </form>
            </div>

            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">答案</h2>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3">正在思考中...</span>
                </div>
              ) : answer ? (
                <div className="prose prose-invert max-w-none">
                  <div className="whitespace-pre-wrap">{answer}</div>
                </div>
              ) : (
                <div className="text-gray-400 text-center py-12">
                  {selectedUser && selectedSubgraphs.length > 0 && question
                    ? '点击发送按钮获取答案'
                    : '请选择用户画像、知识子图并输入问题'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartQA;