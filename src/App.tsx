import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Save, FolderOpen, Trash2, ChevronRight, ChevronDown, ChevronLeft, FileText, Link as LinkIcon, Image as ImageIcon, PlusCircle, X, ExternalLink, MousePointer2, Hand, ZoomIn, ZoomOut, Maximize, Sun, Moon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';
import { Stage, Layer, Group, Rect, Text, Line, Circle } from 'react-konva';
import { useFileSystem } from './hooks/useFileSystem';
import { AppData, TopicPage, MindMapNode } from './types';
import { cn } from './lib/utils';
import Konva from 'konva';

const INITIAL_DATA: AppData = {
  topics: [],
};

const NODE_WIDTH = 180;
const NODE_HEIGHT = 40;
const HORIZONTAL_GAP = 100;
const VERTICAL_GAP = 20;

const NODE_COLORS = [
  { name: 'Mustard', value: '#E6C35C' },
  { name: 'Ink', value: '#1A1A1A' },
  { name: 'Terracotta', value: '#D96666' },
  { name: 'Sage', value: '#8FB399' },
  { name: 'Peach Fuzz', value: '#FFBE98' },
  { name: 'Cloud Blue', value: '#A8C3D1' },
  { name: 'Muted Lavender', value: '#B4A7D6' },
  { name: 'Living Coral', value: '#FF6F61' },
  { name: 'Classic Blue', value: '#0F4C81' },
  { name: 'Soft Sand', value: '#F5F5F0' },
];

const getContrastColor = (hexColor: string) => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#1A1A1A' : '#FFFFFF';
};

const createNewNode = (text: string = 'New Idea'): MindMapNode => ({
  id: uuidv4(),
  text,
  children: [],
  isExpanded: true,
});

const createNewTopic = (title: string = 'New Topic'): TopicPage => {
  const root = createNewNode(title);
  return {
    id: uuidv4(),
    title,
    root,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
};

interface PositionedNode extends MindMapNode {
  x: number;
  y: number;
  width: number;
  height: number;
  subtreeHeight: number;
  side: 'left' | 'right' | 'center';
}

export default function App() {
  const { isSupported, selectFile, saveFile, hasFile } = useFileSystem();
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const stageRef = useRef<Konva.Stage>(null);

  // Load from localStorage as fallback or initial state
  useEffect(() => {
    const saved = localStorage.getItem('ideamapper_local');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData(parsed);
        if (parsed.lastOpenedTopicId) {
          setActiveTopicId(parsed.lastOpenedTopicId);
        }
      } catch (e) {
        console.error('Failed to load local data', e);
      }
    }
    const savedTheme = localStorage.getItem('ideamapper_theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  // Save to localStorage and file system
  useEffect(() => {
    localStorage.setItem('ideamapper_local', JSON.stringify(data));
    if (hasFile) {
      saveFile(data);
    }
  }, [data, hasFile, saveFile]);

  useEffect(() => {
    localStorage.setItem('ideamapper_theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleOpenFile = async () => {
    const fileData = await selectFile();
    if (fileData) {
      setData(fileData);
      if (fileData.lastOpenedTopicId) {
        setActiveTopicId(fileData.lastOpenedTopicId);
      } else if (fileData.topics.length > 0) {
        setActiveTopicId(fileData.topics[0].id);
      }
    }
  };

  const handleCreateTopic = () => {
    const newTopic = createNewTopic();
    setData(prev => ({
      ...prev,
      topics: [...prev.topics, newTopic],
      lastOpenedTopicId: newTopic.id
    }));
    setActiveTopicId(newTopic.id);
    setSelectedNodeId(newTopic.root.id);
  };

  const handleDeleteTopic = (id: string) => {
    if (confirm('Are you sure you want to delete this topic?')) {
      setData(prev => ({
        ...prev,
        topics: prev.topics.filter(t => t.id !== id),
        lastOpenedTopicId: prev.lastOpenedTopicId === id ? undefined : prev.lastOpenedTopicId
      }));
      if (activeTopicId === id) setActiveTopicId(null);
    }
  };

  const updateActiveTopic = (updater: (topic: TopicPage) => TopicPage) => {
    setData(prev => ({
      ...prev,
      topics: prev.topics.map(t => t.id === activeTopicId ? updater(t) : t)
    }));
  };

  const activeTopic = data.topics.find(t => t.id === activeTopicId);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1;
    setStageScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  const handleZoom = (delta: number) => {
    const newScale = delta > 0 ? stageScale * 1.2 : stageScale / 1.2;
    setStageScale(newScale);
  };

  const handleResetView = () => {
    setStageScale(1);
    setStagePos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  };

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const containerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Auto-select and focus root on start
  useEffect(() => {
    if (activeTopic && !selectedNodeId) {
      setSelectedNodeId(activeTopic.root.id);
    }
  }, [activeTopicId]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setStageSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Handle focus for inline editing
  useEffect(() => {
    if (editingNodeId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingNodeId]);

  const handleDeleteNode = (id: string) => {
    if (!activeTopic) return;
    if (id === activeTopic.root.id) {
      alert("Cannot delete the main topic node.");
      return;
    }
    const parent = findParentNode(activeTopic.root, id);
    if (parent) {
      const newChildren = parent.children.filter(c => c.id !== id);
      handleNodeUpdate(parent.id, { ...parent, children: newChildren });
      setSelectedNodeId(null);
    }
  };

  // Layout Algorithm
  const layoutNodes = useMemo(() => {
    if (!activeTopic) return [];

    const calculateSubtreeHeight = (node: MindMapNode): number => {
      if (!node.isExpanded || node.children.length === 0) return NODE_HEIGHT;
      const childrenHeight = node.children.reduce((acc, child) => acc + calculateSubtreeHeight(child), 0);
      return Math.max(NODE_HEIGHT, childrenHeight + (node.children.length - 1) * VERTICAL_GAP);
    };

    const positioned: PositionedNode[] = [];

    const layoutSubtree = (node: MindMapNode, x: number, y: number, side: 'left' | 'right' | 'center') => {
      const subtreeHeight = calculateSubtreeHeight(node);
      const pNode: PositionedNode = {
        ...node,
        x,
        y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        subtreeHeight,
        side
      };
      positioned.push(pNode);

      if (node.isExpanded && node.children.length > 0) {
        let currentY = y - subtreeHeight / 2 + NODE_HEIGHT / 2;
        
        // For root, split children left and right
        if (side === 'center') {
          const mid = Math.ceil(node.children.length / 2);
          const rightChildren = node.children.slice(0, mid);
          const leftChildren = node.children.slice(mid);

          // Right side
          let rightY = y - (rightChildren.reduce((acc, c) => acc + calculateSubtreeHeight(c), 0) + (rightChildren.length - 1) * VERTICAL_GAP) / 2 + NODE_HEIGHT / 2;
          rightChildren.forEach(child => {
            const childHeight = calculateSubtreeHeight(child);
            layoutSubtree(child, x + NODE_WIDTH + HORIZONTAL_GAP, rightY + childHeight / 2 - NODE_HEIGHT / 2, 'right');
            rightY += childHeight + VERTICAL_GAP;
          });

          // Left side
          let leftY = y - (leftChildren.reduce((acc, c) => acc + calculateSubtreeHeight(c), 0) + (leftChildren.length - 1) * VERTICAL_GAP) / 2 + NODE_HEIGHT / 2;
          leftChildren.forEach(child => {
            const childHeight = calculateSubtreeHeight(child);
            layoutSubtree(child, x - NODE_WIDTH - HORIZONTAL_GAP, leftY + childHeight / 2 - NODE_HEIGHT / 2, 'left');
            leftY += childHeight + VERTICAL_GAP;
          });
        } else {
          const direction = side === 'right' ? 1 : -1;
          node.children.forEach(child => {
            const childHeight = calculateSubtreeHeight(child);
            layoutSubtree(child, x + (NODE_WIDTH + HORIZONTAL_GAP) * direction, currentY + childHeight / 2 - NODE_HEIGHT / 2, side);
            currentY += childHeight + VERTICAL_GAP;
          });
        }
      }
    };

    layoutSubtree(activeTopic.root, 0, 0, 'center');
    return positioned;
  }, [activeTopic]);

  const findNodeById = (node: MindMapNode, id: string): MindMapNode | null => {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
    return null;
  };

  const findParentNode = (root: MindMapNode, targetId: string): MindMapNode | null => {
    if (root.children.some(child => child.id === targetId)) return root;
    for (const child of root.children) {
      const found = findParentNode(child, targetId);
      if (found) return found;
    }
    return null;
  };

  const updateNodeInTree = (root: MindMapNode, id: string, updater: (node: MindMapNode) => MindMapNode | null): MindMapNode | null => {
    if (root.id === id) return updater(root);
    return {
      ...root,
      children: root.children
        .map(child => updateNodeInTree(child, id, updater))
        .filter((c): c is MindMapNode => c !== null)
    };
  };

  const handleNodeUpdate = (id: string, updated: MindMapNode | null) => {
    updateActiveTopic(topic => {
      const newRoot = updateNodeInTree(topic.root, id, () => updated);
      return { ...topic, root: newRoot || createNewNode(topic.title), updatedAt: Date.now() };
    });
  };

  const handleToggleExpand = (id: string) => {
    if (!activeTopic) return;
    const node = findNodeById(activeTopic.root, id);
    if (node) {
      handleNodeUpdate(id, { ...node, isExpanded: !node.isExpanded });
    }
  };

  const handleAddSubNode = (parentId: string) => {
    const newNode = createNewNode();

    updateActiveTopic(topic => {
      const newRoot = updateNodeInTree(topic.root, parentId, (node) => ({
        ...node,
        isExpanded: true,
        children: [...node.children, newNode]
      }));
      return { ...topic, root: newRoot!, updatedAt: Date.now() };
    });
    setSelectedNodeId(newNode.id);
    setEditingNodeId(newNode.id);
  };

  const selectedNode = activeTopic ? findNodeById(activeTopic.root, selectedNodeId || '') : null;

  return (
    <div className={cn(
      "flex h-screen font-sans overflow-hidden transition-colors duration-300",
      isDarkMode ? "bg-[#0A0A0A] text-[#F5F5F3]" : "bg-[#FDFCFB] text-[#1A1A1A]"
    )}>
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className={cn(
              "border-r flex flex-col z-20 transition-colors duration-300",
              isDarkMode ? "border-white/10 bg-[#151515]" : "border-[#E5E5E5] bg-[#F5F5F3]"
            )}
          >
            <div className={cn(
              "p-6 border-b flex items-center justify-between transition-colors duration-300",
              isDarkMode ? "border-white/10" : "border-[#E5E5E5]"
            )}>
              <h1 className="text-lg font-serif italic font-bold tracking-tight">IdeaMapper</h1>
              <button onClick={handleCreateTopic} className={cn(
                "p-1 rounded-full transition-colors",
                isDarkMode ? "hover:bg-white/10" : "hover:bg-[#E5E5E5]"
              )}>
                <Plus size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {data.topics.map(topic => (
                <div
                  key={topic.id}
                  onClick={() => setActiveTopicId(topic.id)}
                  className={cn(
                    "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all",
                    activeTopicId === topic.id 
                      ? (isDarkMode ? "bg-white/10 shadow-sm ring-1 ring-white/10" : "bg-white shadow-sm ring-1 ring-black/5") 
                      : (isDarkMode ? "hover:bg-white/5" : "hover:bg-white/50")
                  )}
                >
                  <span className="truncate font-medium text-sm">{topic.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteTopic(topic.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className={cn(
              "p-4 border-t space-y-2 transition-colors duration-300",
              isDarkMode ? "border-white/10" : "border-[#E5E5E5]"
            )}>
              {!isSupported && (
                <p className="text-[10px] text-orange-600 uppercase tracking-widest font-bold mb-2">
                  File System API not supported
                </p>
              )}
              <button
                onClick={handleOpenFile}
                className={cn(
                  "w-full flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-all rounded-lg",
                  isDarkMode 
                    ? "border-white/20 hover:bg-white hover:text-black" 
                    : "border-black hover:bg-black hover:text-white"
                )}
              >
                <FolderOpen size={14} />
                {hasFile ? 'Switch File' : 'Open Local File'}
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className={cn(
          "h-16 border-b flex items-center justify-between px-8 backdrop-blur-sm z-10 transition-colors duration-300",
          isDarkMode ? "border-white/10 bg-[#0A0A0A]/80" : "border-[#E5E5E5] bg-white/80"
        )}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isDarkMode ? "hover:bg-white/10" : "hover:bg-[#F5F5F3]"
              )}
            >
              <ChevronRight className={cn("transition-transform", isSidebarOpen && "rotate-180")} size={20} />
            </button>
            {activeTopic && (
              <input
                value={activeTopic.title}
                onChange={(e) => updateActiveTopic(t => ({ ...t, title: e.target.value, root: { ...t.root, text: e.target.value } }))}
                className="text-xl font-serif italic font-bold bg-transparent border-none focus:ring-0 p-0"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className={cn(
                "p-2 rounded-lg transition-colors mr-2",
                isDarkMode ? "hover:bg-white/10 text-yellow-400" : "hover:bg-[#F5F5F3] text-indigo-600"
              )}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => handleZoom(1)} className={cn("p-2 rounded-lg", isDarkMode ? "hover:bg-white/10" : "hover:bg-[#F5F5F3]")}><ZoomIn size={18} /></button>
            <button onClick={() => handleZoom(-1)} className={cn("p-2 rounded-lg", isDarkMode ? "hover:bg-white/10" : "hover:bg-[#F5F5F3]")}><ZoomOut size={18} /></button>
            <button onClick={handleResetView} className={cn("p-2 rounded-lg", isDarkMode ? "hover:bg-white/10" : "hover:bg-[#F5F5F3]")}><Maximize size={18} /></button>
          </div>
        </header>

        <div ref={containerRef} className={cn(
          "flex-1 relative cursor-grab active:cursor-grabbing transition-colors duration-300",
          isDarkMode ? "bg-[#0A0A0A]" : "bg-[#FDFCFB]"
        )}>
          {activeTopic ? (
            <Stage
              width={stageSize.width}
              height={stageSize.height}
              ref={stageRef}
              scaleX={stageScale}
              scaleY={stageScale}
              x={stagePos.x}
              y={stagePos.y}
              draggable
              onWheel={handleWheel}
              onDragEnd={(e) => setStagePos({ x: e.target.x(), y: e.target.y() })}
              onClick={() => setSelectedNodeId(null)}
            >
              <Layer>
                {/* Connections */}
                {layoutNodes.map(node => {
                  if (node.id === activeTopic.root.id) return null;
                  const parent = layoutNodes.find(p => p.children.some(c => c.id === node.id));
                  if (!parent) return null;

                  const startX = parent.side === 'left' ? parent.x : parent.x + parent.width;
                  const startY = parent.y + parent.height / 2;
                  const endX = node.side === 'left' ? node.x + node.width : node.x;
                  const endY = node.y + node.height / 2;

                  // Root special case
                  let actualStartX = startX;
                  if (parent.side === 'center') {
                    actualStartX = node.side === 'left' ? parent.x : parent.x + parent.width;
                  }

                  return (
                      <Line
                        key={`line-${node.id}`}
                        points={[
                          actualStartX, startY,
                          actualStartX + (node.side === 'left' ? -20 : 20), startY,
                          endX + (node.side === 'left' ? 20 : -20), endY,
                          endX, endY
                        ]}
                        stroke={isDarkMode ? "rgba(255,255,255,0.1)" : "#E5E5E5"}
                        strokeWidth={2}
                        tension={0.5}
                      />
                  );
                })}

                {/* Nodes */}
                {layoutNodes.map(node => (
                  <Group
                    key={node.id}
                    x={node.x}
                    y={node.y}
                    onClick={(e) => { e.cancelBubble = true; setSelectedNodeId(node.id); }}
                    onTap={(e) => { e.cancelBubble = true; setSelectedNodeId(node.id); }}
                    onDblClick={(e) => { e.cancelBubble = true; setEditingNodeId(node.id); }}
                  >
                    <Rect
                      width={node.width}
                      height={node.height}
                      fill={(() => {
                        if (node.color) return node.color;
                        if (node.id === activeTopic.root.id) {
                          return isDarkMode ? '#FFFFFF' : '#1A1A1A';
                        }
                        return isDarkMode ? '#1A1A1A' : '#F5F5F0';
                      })()}
                      cornerRadius={12}
                      stroke={selectedNodeId === node.id ? (isDarkMode ? '#FFF' : '#000') : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E5E5')}
                      strokeWidth={selectedNodeId === node.id ? 2 : 1}
                      shadowBlur={selectedNodeId === node.id ? 10 : 0}
                      shadowColor={isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                    />
                    {editingNodeId !== node.id && (
                      <Text
                        text={node.text}
                        width={node.width}
                        height={node.height}
                        align="center"
                        verticalAlign="middle"
                        fontSize={13}
                        fontStyle={node.id === activeTopic.root.id ? 'bold italic' : 'normal'}
                        fill={getContrastColor((() => {
                          if (node.color) return node.color;
                          if (node.id === activeTopic.root.id) {
                            return isDarkMode ? '#FFFFFF' : '#1A1A1A';
                          }
                          return isDarkMode ? '#1A1A1A' : '#F5F5F0';
                        })())}
                        padding={10}
                        ellipsis
                      />
                    )}
                    
                    {/* Expand/Collapse Toggle */}
                    {node.children.length > 0 && (
                      <Group 
                        x={node.side === 'left' ? -15 : node.width + 15} 
                        y={node.height / 2}
                        onClick={(e) => { e.cancelBubble = true; handleToggleExpand(node.id); }}
                        onTap={(e) => { e.cancelBubble = true; handleToggleExpand(node.id); }}
                      >
                        <Circle radius={10} fill={isDarkMode ? "#1A1A1A" : "white"} stroke={isDarkMode ? "rgba(255,255,255,0.1)" : "#E5E5E5"} strokeWidth={1} />
                        <Text 
                          text={node.isExpanded ? '−' : '+'} 
                          x={-4} 
                          y={-6} 
                          fontSize={12} 
                          fill={isDarkMode ? "white" : "#1A1A1A"} 
                          listening={false} 
                        />
                      </Group>
                    )}
                    
                    {/* Floating Actions (Visible when selected) */}
                    {selectedNodeId === node.id && (
                      <Group y={-30} x={node.width / 2 - 30}>
                        {/* Add Button */}
                        <Group 
                          onClick={(e) => { e.cancelBubble = true; handleAddSubNode(node.id); }}
                          onTap={(e) => { e.cancelBubble = true; handleAddSubNode(node.id); }}
                        >
                          <Circle radius={16} fill="transparent" />
                          <Circle radius={12} fill="#1A1A1A" listening={false} />
                          <Text text="+" x={-5} y={-7} fontSize={14} fill="white" listening={false} />
                        </Group>
                        {/* Delete Button */}
                        {node.id !== activeTopic.root.id && (
                          <Group 
                            x={30} 
                            onClick={(e) => { e.cancelBubble = true; handleDeleteNode(node.id); }}
                            onTap={(e) => { e.cancelBubble = true; handleDeleteNode(node.id); }}
                          >
                            <Circle radius={16} fill="transparent" />
                            <Circle radius={12} fill="#EF4444" listening={false} />
                            <Text text="×" x={-5} y={-8} fontSize={16} fill="white" listening={false} />
                          </Group>
                        )}
                      </Group>
                    )}
                  </Group>
                ))}
              </Layer>
            </Stage>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-24 h-24 rounded-full border border-black/10 flex items-center justify-center">
                <Plus size={40} className="opacity-20" />
              </div>
              <div>
                <h2 className="text-2xl font-serif italic font-bold">Start a new exploration</h2>
                <p className="text-sm text-black/40 mt-2">Create a topic to begin mapping your ideas.</p>
              </div>
              <button
                onClick={handleCreateTopic}
                className="px-8 py-3 bg-black text-white rounded-full font-bold uppercase tracking-widest text-xs hover:scale-105 transition-transform"
              >
                Create First Topic
              </button>
            </div>
          )}

          {/* Floating Editor Overlay */}
          {selectedNodeId && activeTopic && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: (layoutNodes.find(n => n.id === selectedNodeId)?.x || 0) * stageScale + stagePos.x,
                top: ((layoutNodes.find(n => n.id === selectedNodeId)?.y || 0) + NODE_HEIGHT + 10) * stageScale + stagePos.y,
                width: NODE_WIDTH * 1.5 * stageScale,
                zIndex: 50
              }}
            >
              <div className={cn(
                "pointer-events-auto border shadow-2xl rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 transition-colors duration-300",
                isDarkMode ? "bg-[#151515] border-white/10" : "bg-white border-black/10"
              )}>
                {(() => {
                  const node = findNodeById(activeTopic.root, selectedNodeId)!;
                  return (
                    <>
                      <input
                        value={node.text}
                        onChange={(e) => handleNodeUpdate(node.id, { ...node, text: e.target.value })}
                        className={cn(
                          "w-full text-sm font-bold border-none focus:ring-0 p-0 placeholder:opacity-20 bg-transparent",
                          isDarkMode ? "text-white" : "text-black"
                        )}
                        placeholder="Heading..."
                      />
                      <textarea
                        value={node.notes || ''}
                        onChange={(e) => handleNodeUpdate(node.id, { ...node, notes: e.target.value })}
                        placeholder="Add details..."
                        className={cn(
                          "w-full text-xs leading-relaxed border-none focus:ring-0 p-0 resize-none min-h-[60px] placeholder:opacity-20 bg-transparent",
                          isDarkMode ? "text-white/70" : "text-black/70"
                        )}
                      />
                      <div className="flex flex-wrap gap-1.5 py-1">
                        {NODE_COLORS.map(color => {
                          const isDefault = !node.color && (
                            (node.id === activeTopic.root.id && color.value === (isDarkMode ? '#FFFFFF' : '#1A1A1A')) ||
                            (node.id !== activeTopic.root.id && color.value === (isDarkMode ? '#1A1A1A' : '#F5F5F0'))
                          );
                          const isSelected = node.color === color.value || isDefault;
                          
                          return (
                            <button
                              key={color.value}
                              onClick={() => handleNodeUpdate(node.id, { ...node, color: color.value })}
                              className={cn(
                                "w-4 h-4 rounded-full border border-black/5 transition-transform hover:scale-125",
                                isSelected && (isDarkMode ? "ring-2 ring-white/40 ring-offset-1 ring-offset-[#151515]" : "ring-2 ring-black/20 ring-offset-1")
                              )}
                              style={{ backgroundColor: color.value }}
                              title={color.name}
                            />
                          );
                        })}
                      </div>
                      <div className={cn(
                        "pt-2 border-t flex items-center justify-between transition-colors duration-300",
                        isDarkMode ? "border-white/5" : "border-black/5"
                      )}>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleAddSubNode(node.id)}
                            className={cn(
                              "p-1 rounded-md transition-colors",
                              isDarkMode ? "hover:bg-white/10" : "hover:bg-black/5"
                            )}
                            title="Add Sub-node"
                          >
                            <PlusCircle size={12} className="opacity-40" />
                          </button>
                          <button 
                            onClick={() => {
                              const url = prompt('Enter URL:');
                              if (url) handleNodeUpdate(node.id, { ...node, links: [...(node.links || []), url] });
                            }}
                            className={cn(
                              "p-1 rounded-md transition-colors",
                              isDarkMode ? "hover:bg-white/10" : "hover:bg-black/5"
                            )}
                            title="Add Link"
                          >
                            <LinkIcon size={12} className="opacity-40" />
                          </button>
                          <button 
                            onClick={() => {
                              const url = prompt('Enter Image URL:');
                              if (url) handleNodeUpdate(node.id, { ...node, images: [...(node.images || []), url] });
                            }}
                            className={cn(
                              "p-1 rounded-md transition-colors",
                              isDarkMode ? "hover:bg-white/10" : "hover:bg-black/5"
                            )}
                            title="Add Image"
                          >
                            <ImageIcon size={12} className="opacity-40" />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          {node.id !== activeTopic.root.id && (
                            <button
                              onClick={() => handleDeleteNode(node.id)}
                              className={cn(
                                "p-1 rounded-md transition-colors",
                                isDarkMode ? "hover:bg-red-900/20 text-red-400" : "hover:bg-red-50 text-red-500"
                              )}
                              title="Delete Node"
                            >
                              <Trash2 size={12} className="opacity-40" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedNodeId(null)}
                            className="text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                      {(node.links && node.links.length > 0) || (node.images && node.images.length > 0) ? (
                        <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                          {node.links?.map((link, i) => (
                            <div key={i} className={cn(
                              "flex items-center justify-between p-2 rounded-lg text-[10px] group transition-colors",
                              isDarkMode ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"
                            )}>
                              <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 truncate flex-1">
                                <ExternalLink size={10} />
                                <span className="truncate">{link}</span>
                              </a>
                              <button 
                                onClick={() => handleNodeUpdate(node.id, { ...node, links: node.links?.filter((_, idx) => idx !== i) })}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                          {node.images?.map((img, i) => (
                            <div key={i} className="relative group rounded-lg overflow-hidden border border-black/5">
                              <img src={img} alt="" className="w-full h-24 object-cover" referrerPolicy="no-referrer" />
                              <button 
                                onClick={() => handleNodeUpdate(node.id, { ...node, images: node.images?.filter((_, idx) => idx !== i) })}
                                className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-md opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Inline Title Editor (Double Click) */}
          {editingNodeId && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: (layoutNodes.find(n => n.id === editingNodeId)?.x || 0) * stageScale + stagePos.x,
                top: (layoutNodes.find(n => n.id === editingNodeId)?.y || 0) * stageScale + stagePos.y,
                width: NODE_WIDTH * stageScale,
                height: NODE_HEIGHT * stageScale,
                zIndex: 60
              }}
            >
              <input
                ref={editInputRef}
                className={cn(
                  "pointer-events-auto w-full h-full border-2 rounded-xl px-4 text-sm font-medium shadow-2xl outline-none transition-colors duration-300",
                  isDarkMode ? "bg-[#1A1A1A] border-white/20 text-white" : "bg-white border-black text-black"
                )}
                value={layoutNodes.find(n => n.id === editingNodeId)?.text || ''}
                onChange={(e) => handleNodeUpdate(editingNodeId, { ...findNodeById(activeTopic!.root, editingNodeId)!, text: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') setEditingNodeId(null);
                }}
                onBlur={() => setEditingNodeId(null)}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
