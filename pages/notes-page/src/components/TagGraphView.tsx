import { useRef, useState, useEffect } from 'react';
import type { FC, MutableRefObject } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

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

  // Couleurs pour les noeuds
  const nodeColor = (node: NodeObject) => {
    const nodeId = node.id as string;

    if (activeTag && nodeId === activeTag) {
      return '#3b82f6'; // blue-500 (sélectionné)
    }

    if (hoveredNode === nodeId) {
      return '#60a5fa'; // blue-400 (survol)
    }

    // Valeur du noeud pour déterminer la nuance (plus de connexions = plus intense)
    const intensity = Math.min(0.4 + (node.val as number) * 0.1, 0.9);
    return `rgba(148, 163, 184, ${intensity})`; // slate-400 avec intensité variable
  };

  // Couleurs pour les liens
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
    const opacity = 0.2 + Math.min((link.value as number) * 0.1, 0.3);
    return `rgba(71, 85, 105, ${opacity})`; // slate-600 avec opacité variable
  };

  // Calcul automatique de la taille de conteneur
  const containerStyle = {
    width: '100%',
    height: '100%',
  };

  return (
    <div className="h-full flex flex-col p-5 overflow-hidden">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-blue-400">Graphe de Tags</h2>

        {activeTag && (
          <button
            onClick={onClearFilter}
            className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-2 py-1 rounded-md transition-colors flex items-center">
            <svg className="w-3 h-3 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            Effacer le filtre
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        className="flex-1 bg-gray-900 rounded-lg overflow-hidden shadow-inner"
        style={containerStyle}>
        {tagData.nodes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 h-full flex flex-col justify-center items-center bg-gray-800/30 border border-gray-700/50 rounded-lg">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 7C17 8.10457 16.1046 9 15 9C13.8954 9 13 8.10457 13 7C13 5.89543 13.8954 5 15 5C16.1046 5 17 5.89543 17 7Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 12C7 13.1046 6.10457 14 5 14C3.89543 14 3 13.1046 3 12C3 10.8954 3.89543 10 5 10C6.10457 10 7 10.8954 7 12Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M14 18C14 19.1046 13.1046 20 12 20C10.8954 20 10 19.1046 10 18C10 16.8954 10.8954 16 12 16C13.1046 16 14 16.8954 14 18Z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 8.5L6.5 11" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16.5L6.5 13" />
            </svg>
            <p className="font-medium">Aucun tag disponible</p>
            <p className="text-xs mt-2 px-4">Ajoutez des tags à vos notes pour les voir apparaître ici</p>
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            graphData={tagData}
            nodeLabel="name"
            nodeColor={nodeColor}
            nodeVal={(node: NodeObject) => Math.max(1, (node.val as number) * 1.5)}
            linkWidth={link => (link.value ? Math.sqrt(link.value as number) * 0.8 : 1)}
            linkColor={linkColor}
            nodeRelSize={7} // Taille de base des noeuds augmentée
            backgroundColor="#111827" // gray-900 plus sombre
            onNodeClick={(node: NodeObject) => onTagSelect(node.id as string)}
            onNodeHover={node => setHoveredNode(node ? (node.id as string) : null)}
            cooldownTicks={100}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={link => (link.value ? Math.sqrt(link.value as number) * 0.8 : 1)}
            linkDirectionalParticleSpeed={0.005}
            warmupTicks={50}
            onEngineStop={() => fgRef.current && fgRef.current.zoomToFit(400, 50)}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = node.name as string;
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
              const radius = Math.sqrt((node.val as number) * 20) || 5;

              // Dessiner le nœud avec un halo
              const nodeColor = node.color as string;
              ctx.beginPath();
              if (node.id === activeTag || node.id === hoveredNode) {
                ctx.shadowColor = 'rgba(59, 130, 246, 0.6)';
                ctx.shadowBlur = 10;
              }
              ctx.arc(node.x as number, node.y as number, radius, 0, 2 * Math.PI);
              ctx.fillStyle = nodeColor;
              ctx.fill();
              ctx.shadowColor = 'transparent';
              ctx.shadowBlur = 0;

              if (globalScale > 2.5) {
                // Afficher le texte uniquement quand on zoome suffisamment
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, node.x as number, node.y as number);
              } else if ((node.id === activeTag || node.id === hoveredNode) && globalScale > 1) {
                // Toujours afficher le texte pour le nœud actif/survolé
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, node.x as number, node.y as number);
              }
            }}
          />
        )}
      </div>

      <div className="pt-4 border-t border-gray-700/50 mt-4">
        <div className="text-xs text-gray-500 flex items-center">
          <svg className="w-3 h-3 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p>Cliquez sur un tag pour filtrer les notes • Utilisez la molette pour zoomer</p>
        </div>
      </div>
    </div>
  );
};

export default TagGraphView;
