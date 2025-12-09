import React, { useEffect, useRef } from 'react';
import * as vis from 'vis-network';
import { DataSet } from 'vis-data';
import { X, Network } from 'lucide-react';

interface EvidenceGraphModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        nodes: any[];
        relationships: any[];
    };
}

const EvidenceGraphModal: React.FC<EvidenceGraphModalProps> = ({ isOpen, onClose, data }) => {
    const networkContainer = useRef<HTMLDivElement>(null);
    const networkRef = useRef<vis.Network | null>(null);

    useEffect(() => {
        if (isOpen && networkContainer.current && data) {
            // Prepare data
            const nodes = data.nodes.map((n: any) => ({
                id: n.id,
                label: n.name || n.label,
                group: n.label,
                shape: 'dot',
                size: 20,
                font: { size: 14, color: '#ffffff', strokeWidth: 0 },
                title: `ID: ${n.id}\nLabel: ${n.label}`
            }));

            // Deduplicate relationships for display (sometimes parallel edges can look messy, but useful here)
            const edges = data.relationships.map((r: any) => ({
                from: r.from,
                to: r.to,
                label: r.type,
                arrows: 'to',
                font: { align: 'middle', size: 12, color: '#a0aec0', strokeWidth: 0 },
                color: { color: '#4a5568' }
            }));

            // Use DataSet
            const nodesDataSet = new DataSet(nodes);
            const edgesDataSet = new DataSet(edges);

            const options: vis.Options = {
                nodes: {
                    borderWidth: 2,
                    shadow: true,
                    color: {
                        background: '#3182ce',
                        border: '#2b6cb0',
                        highlight: { background: '#63b3ed', border: '#3182ce' }
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
                        springLength: 120
                    }
                },
                layout: {
                    randomSeed: 2
                },
                interaction: {
                    hover: true,
                    zoomView: true,
                    dragView: true
                },
                groups: {
                    // Simple coloring based on groups if needed, 
                    // though we defined specific colors in nodes above options usually override specific props if not careful, 
                    // but visjs priority is specific > group > default.
                    Person: { color: { background: '#10b981', border: '#059669' } },
                    Company: { color: { background: '#f59e0b', border: '#d97706' } },
                    Concept: { color: { background: '#8b5cf6', border: '#7c3aed' } }
                }
            };

            networkRef.current = new vis.Network(networkContainer.current, { nodes: nodesDataSet, edges: edgesDataSet }, options);
        }

        return () => {
            if (networkRef.current) {
                networkRef.current.destroy();
                networkRef.current = null;
            }
        };
    }, [isOpen, data]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] backdrop-blur-sm">
            <div className="bg-gray-900 rounded-2xl w-[90vw] h-[85vh] border border-gray-700 flex flex-col shadow-2xl relative">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50 rounded-t-2xl">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Network className="w-5 h-5 text-blue-400" />
                        证据图谱可视化
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Graph Container */}
                <div className="flex-1 relative bg-gray-950 overflow-hidden" ref={networkContainer}>
                    {/* Graph renders here */}
                </div>

                {/* Legend/Info (Optional) */}
                <div className="absolute bottom-4 left-4 bg-gray-900/80 p-3 rounded-lg border border-gray-700 text-xs text-gray-400 pointer-events-none">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span> 默认节点
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Person
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-3 h-3 rounded-full bg-amber-500"></span> Company
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-purple-500"></span> Concept
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EvidenceGraphModal;
