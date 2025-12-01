import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

interface Option {
    text: string;
    score: number;
}

interface Question {
    id: number;
    text: string;
    options: Option[];
    dimension?: string;
}

const LogicTest: React.FC = () => {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(false);
    const [fetchingQuestions, setFetchingQuestions] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        const storedUserId = localStorage.getItem('currentUserId');
        if (!storedUserId) {
            navigate('/entry');
        } else {
            setUserId(storedUserId);
            // Fetch user profile
            axios.get(`/api/users/${storedUserId}`)
                .then(res => setUserProfile(res.data))
                .catch(err => console.error(err));
        }
    }, [navigate]);

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const response = await axios.get('/api/users/questions/generate');
                setQuestions(response.data);
            } catch (error) {
                console.error('Failed to fetch questions:', error);
            } finally {
                setFetchingQuestions(false);
            }
        };
        fetchQuestions();
    }, []);

    const handleOptionSelect = (score: number) => {
        if (!questions[currentQuestionIndex]) return;
        setAnswers({ ...answers, [questions[currentQuestionIndex].id]: score });

        if (currentQuestionIndex < questions.length - 1) {
            setTimeout(() => setCurrentQuestionIndex(currentQuestionIndex + 1), 300);
        } else {
            // Finished
        }
    };

    const calculateTotalScore = () => {
        return Object.values(answers).reduce((a, b) => a + b, 0);
    };

    const handleSubmit = async () => {
        if (!userId) return;
        setLoading(true);
        const totalScore = calculateTotalScore();

        try {
            await axios.post(`/api/users/${userId}/logic`, {
                score: totalScore,
                answers: answers
            });
            navigate('/analysis');
        } catch (err) {
            console.error(err);
            alert('Failed to submit test. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (fetchingQuestions) {
        return (
            <div className="w-screen min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-2">Generating personalized questions...</span>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <p>No questions available. Please try again later.</p>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    const hasAnsweredCurrent = answers[currentQuestion.id] !== undefined;

    if (!userId) return null;

    return (
        <div className="w-screen min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
            <div className="w-full max-w-2xl">
                {/* User Profile Header */}
                {userProfile && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 bg-gray-800/30 backdrop-blur-md rounded-xl p-4 border border-gray-700 flex items-center justify-between"
                    >
                        <div>
                            <h2 className="text-lg font-bold text-white">{userProfile.name}</h2>
                            <p className="text-sm text-gray-400">{userProfile.role} • {userProfile.domain}</p>
                        </div>
                        <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium">
                            正在测评
                        </div>
                    </motion.div>
                )}

                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                        <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentQuestion.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-8 shadow-2xl"
                    >
                        <div className="mb-6">
                            <span className="text-xs font-medium text-blue-400 uppercase tracking-wider bg-blue-500/10 px-2 py-1 rounded">
                                {currentQuestion.dimension || 'General'}
                            </span>
                            <h2 className="text-2xl font-bold mt-2">{currentQuestion.text}</h2>
                        </div>

                        <div className="space-y-4">
                            {currentQuestion.options.map((option, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleOptionSelect(option.score)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between group ${answers[currentQuestion.id] === option.score
                                        ? 'bg-blue-600/20 border-blue-500 text-blue-100'
                                        : 'bg-gray-900/50 border-gray-700 hover:bg-gray-700 hover:border-gray-500'
                                        }`}
                                >
                                    <span>{option.text}</span>
                                    {answers[currentQuestion.id] === option.score && (
                                        <CheckCircle className="w-5 h-5 text-blue-400" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {isLastQuestion && hasAnsweredCurrent && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-8 flex justify-end"
                            >
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            Submit Assessment
                                            <ArrowRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </motion.div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default LogicTest;
