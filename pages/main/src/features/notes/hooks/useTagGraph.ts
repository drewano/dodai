import { useMemo } from 'react';
import type { NoteEntry } from '@extension/storage';

interface TagGraphData {
  nodes: Array<{
    id: string;
    name: string;
    val: number; // Nombre de notes avec ce tag
  }>;
  links: Array<{
    source: string;
    target: string;
    value: number; // Nombre de cooccurrences
  }>;
}

export function useTagGraph(notes: NoteEntry[] | null): TagGraphData {
  return useMemo(() => {
    if (!notes || notes.length === 0) {
      return { nodes: [], links: [] };
    }

    // Calcul des occurrences de tags
    const tagOccurrences: Record<string, number> = {};
    // Calcul des cooccurrences de tags
    const tagCooccurrences: Record<string, Record<string, number>> = {};

    // Parcourir toutes les notes
    notes.forEach(note => {
      const tags = note.tags || [];

      // Ignorer les notes sans tags
      if (tags.length === 0) return;

      // Compter les occurrences de chaque tag
      tags.forEach(tag => {
        if (!tagOccurrences[tag]) {
          tagOccurrences[tag] = 0;
        }
        tagOccurrences[tag]++;
      });

      // Compter les cooccurrences de paires de tags
      // Pour chaque paire de tags distincts dans la note
      for (let i = 0; i < tags.length; i++) {
        for (let j = i + 1; j < tags.length; j++) {
          const tag1 = tags[i];
          const tag2 = tags[j];

          // Créer les entrées si elles n'existent pas
          if (!tagCooccurrences[tag1]) {
            tagCooccurrences[tag1] = {};
          }
          if (!tagCooccurrences[tag2]) {
            tagCooccurrences[tag2] = {};
          }

          // Incrémenter dans les deux directions pour garantir la symétrie
          if (!tagCooccurrences[tag1][tag2]) {
            tagCooccurrences[tag1][tag2] = 0;
          }
          if (!tagCooccurrences[tag2][tag1]) {
            tagCooccurrences[tag2][tag1] = 0;
          }

          tagCooccurrences[tag1][tag2]++;
          tagCooccurrences[tag2][tag1]++;
        }
      }
    });

    // Créer les nœuds pour le graphe
    const nodes = Object.keys(tagOccurrences).map(tag => ({
      id: tag,
      name: tag,
      val: Math.max(1, Math.log(tagOccurrences[tag] * 2) * 2), // Ajuster la taille en fonction du nombre d'occurrences
    }));

    // Créer les liens entre les nœuds
    const links: TagGraphData['links'] = [];

    // Pour éviter les doublons
    const addedLinks = new Set<string>();

    Object.keys(tagCooccurrences).forEach(tag1 => {
      Object.keys(tagCooccurrences[tag1]).forEach(tag2 => {
        // Créer un identifiant unique pour chaque paire (toujours dans le même ordre)
        const linkId = [tag1, tag2].sort().join('-');

        // Ne pas ajouter le même lien deux fois
        if (!addedLinks.has(linkId)) {
          links.push({
            source: tag1,
            target: tag2,
            value: tagCooccurrences[tag1][tag2],
          });

          addedLinks.add(linkId);
        }
      });
    });

    return { nodes, links };
  }, [notes]);
}
