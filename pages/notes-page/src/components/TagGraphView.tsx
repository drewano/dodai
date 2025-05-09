import { useRef } from 'react';
import type { FC } from 'react';
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

  // Couleurs pour les noeuds
  const nodeColor = (node: NodeObject) => {
    if (activeTag && node.id === activeTag) {
      return '#3b82f6'; // blue-500 (sélectionné)
    }
    return '#6b7280'; // gray-500 (par défaut)
  };

  // Calcul automatique de la taille de conteneur
  const containerStyle = {
    width: '100%',
    height: '100%',
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-blue-400">Graphe de Tags</h2>

        {activeTag && (
          <button onClick={onClearFilter} className="text-xs text-gray-400 hover:text-blue-400 flex items-center">
            <svg className="w-3 h-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
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

      <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden" style={containerStyle}>
        {tagData.nodes.length === 0 ? (
          <div className="text-center py-6 text-gray-500 h-full flex flex-col justify-center">
            <p>Aucun tag disponible</p>
            <p className="text-xs mt-2">Ajoutez des tags à vos notes pour les voir apparaître ici</p>
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            graphData={tagData}
            nodeLabel="name"
            nodeColor={nodeColor}
            nodeVal={(node: NodeObject) => node.val}
            linkWidth={link => (link.value ? Math.sqrt(link.value) * 0.5 : 1)}
            nodeRelSize={6} // Taille de base des noeuds
            linkColor={() => '#4b5563'} // gray-600
            backgroundColor="#1f2937" // gray-800
            onNodeClick={(node: NodeObject) => onTagSelect(node.id)}
            cooldownTicks={100}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={link => (link.value ? Math.sqrt(link.value) * 0.5 : 1)}
            warmupTicks={50}
            onEngineStop={() => fgRef.current && fgRef.current.zoomToFit(400, 50)}
          />
        )}
      </div>

      <div className="pt-4 border-t border-gray-700 mt-4">
        <div className="text-xs text-gray-500">
          <p>Cliquez sur un tag pour filtrer les notes</p>
        </div>
      </div>
    </div>
  );
};

export default TagGraphView;
