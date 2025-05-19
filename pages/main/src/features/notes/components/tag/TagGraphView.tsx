import { useRef, useState, useEffect } from 'react';
import type { FC, MutableRefObject } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { XCircle, Info, GitBranch } from 'lucide-react';

// Types pour les éléments du graphe
interface NodeObject {
  id: string;
  name: string;
  val: number;
  [key: string]: unknown;
}

interface LinkObject {
  source: string;
  target: string;
  value: number;
  [key: string]: unknown;
}

// Type générique pour la référence au graphe
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ForceGraphInstance = any;

interface TagGraphViewProps {
  tagData: {
    nodes: Array<NodeObject>;
    links: Array<LinkObject>;
  };
  activeTag: string | null;
  onTagSelect: (tag: string) => void;
  onClearFilter: () => void;
}

// Utility to determine if a color is light or dark - Removed as unused
// const _getColorBrightness = (color: string): number => { ... };

// Determine text color based on background color luminance - Forcing white for better contrast in dark theme
const getContrastTextColor = (): string => {
  // Parameter _backgroundColor removed as unused
  // const brightness = getColorBrightness(backgroundColor);
  // return brightness > 0.5 ? '#1f2937' : '#ffffff'; // Use dark gray instead of pure black if needed
  return '#ffffff'; // Force white text for all nodes in this dark theme
};

const TagGraphView: FC<TagGraphViewProps> = ({ tagData, activeTag, onTagSelect, onClearFilter }) => {
  // On utilise un type plus simple pour la référence
  const fgRef = useRef<ForceGraphInstance>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const containerRef: MutableRefObject<HTMLDivElement | null> = useRef(null);

  // Force le rendu du graphe lors du redimensionnement de la fenêtre
  useEffect(() => {
    const handleResize = () => {
      if (fgRef.current) {
        fgRef.current.width(containerRef.current?.clientWidth ?? 0);
        fgRef.current.height(containerRef.current?.clientHeight ?? 0);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Couleurs pour les noeuds - palette améliorée
  const nodeColor = (node: NodeObject) => {
    const nodeId = node.id as string;

    if (activeTag && nodeId === activeTag) {
      return '#3b82f6'; // blue-500 (selected)
    }

    if (hoveredNode === nodeId) {
      return '#60a5fa'; // blue-400 (hover)
    }

    // Valeur du noeud pour déterminer la nuance (plus de connexions = plus intense)
    const intensity = Math.min(0.4 + (node.val as number) * 0.08, 0.85); // Adjusted intensity range
    return `rgba(100, 116, 139, ${intensity})`; // slate-500 with variable intensity
  };

  // Couleurs pour les liens - palette améliorée
  const linkColor = (link: LinkObject) => {
    const sourceId = typeof link.source === 'object' ? (link.source as NodeObject).id : link.source;
    const targetId = typeof link.target === 'object' ? (link.target as NodeObject).id : link.target;

    // Si le lien est connecté au nœud actif, le mettre en évidence
    if (activeTag && (sourceId === activeTag || targetId === activeTag)) {
      return 'rgba(59, 130, 246, 0.7)'; // blue-500 semi-transparent
    }

    // Si le lien est connecté au nœud survolé, le mettre en évidence
    if (hoveredNode && (sourceId === hoveredNode || targetId === hoveredNode)) {
      return 'rgba(96, 165, 250, 0.6)'; // blue-400 semi-transparent
    }

    // Valeur du lien pour déterminer l'opacité
    const opacity = 0.2 + Math.min((link.value as number) * 0.05, 0.3); // Adjusted opacity range
    return `rgba(71, 85, 105, ${opacity})`; // slate-600 with variable opacity
  };

  // Calcul automatique de la taille de conteneur
  const containerStyle = {
    width: '100%',
    height: '100%',
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden text-slate-200">
      <div className="mb-4 flex justify-between items-center flex-shrink-0">
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <GitBranch size={18} className="text-blue-400" />
          Graphe de Tags
        </h2>

        {activeTag && (
          <button
            onClick={onClearFilter}
            className="text-xs bg-slate-600 hover:bg-slate-500 text-slate-200 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1">
            <XCircle size={14} />
            Effacer
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        className="flex-1 bg-slate-850 rounded-lg overflow-hidden shadow-inner relative"
        style={containerStyle}>
        {tagData.nodes.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-500 h-full flex flex-col justify-center items-center bg-slate-850/60 border border-slate-700/50 rounded-lg">
            <GitBranch size={24} className="w-10 h-10 mx-auto mb-3 text-slate-600" strokeWidth={1.5} />
            <p className="font-medium text-slate-400">Aucun tag disponible</p>
            <p className="text-xs mt-1.5 px-4">Ajoutez des tags à vos notes pour les voir apparaître ici</p>
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            graphData={tagData}
            nodeLabel="name"
            nodeColor={nodeColor}
            nodeVal={(node: NodeObject) => Math.max(2, (node.val as number) * 1.8)}
            linkWidth={link => (link.value ? Math.sqrt(link.value as number) * 0.6 : 0.8)}
            linkColor={linkColor}
            nodeRelSize={6}
            backgroundColor="#1e293b"
            onNodeClick={(node: NodeObject) => onTagSelect(node.id as string)}
            onNodeHover={node => setHoveredNode(node ? (node.id as string) : null)}
            cooldownTicks={100}
            linkDirectionalParticles={1}
            linkDirectionalParticleWidth={link => (link.value ? Math.sqrt(link.value as number) * 0.5 : 0.6)}
            linkDirectionalParticleSpeed={0.006}
            warmupTicks={50}
            onEngineStop={() => fgRef.current && fgRef.current.zoomToFit(400, 60)}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = node.name as string;
              const fontSize = 13 / globalScale;
              ctx.font = `${Math.max(fontSize, 3.5)}px 'Source Sans Pro', Sans-Serif`;
              const baseRadius = node.__index ? Math.max(2, (node.val as number) * 1.8) / 2 : 4;
              const radius = (baseRadius / globalScale) * 6;

              const calculatedNodeColor = nodeColor(node);
              node.color = calculatedNodeColor;

              ctx.beginPath();
              ctx.arc(node.x as number, node.y as number, radius, 0, 2 * Math.PI);
              ctx.fillStyle = calculatedNodeColor;
              ctx.fill();

              const textColor = getContrastTextColor();

              const textVisibilityThreshold = 1.8;
              if (
                globalScale > textVisibilityThreshold ||
                ((node.id === activeTag || node.id === hoveredNode) && globalScale > 0.8)
              ) {
                ctx.fillStyle = textColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.fillText(label, node.x as number, node.y as number);
              }
            }}
          />
        )}
      </div>

      <div className="pt-3 border-t border-slate-700/70 mt-4 flex-shrink-0">
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Info size={14} />
          Cliquez sur un tag pour filtrer • Molette pour zoomer
        </div>
      </div>
    </div>
  );
};

export default TagGraphView;
