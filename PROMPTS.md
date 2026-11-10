# Journal des Prompts — Task Flow

> **Module** : Coder avec l'IA (Bachelor 1 — Séance 2)  
> **Règle d'or** : *On ne garde aucune ligne de code que l'on n'est pas capable d'expliquer.*

---

## Sprint 1 : Fonctions de base (CRUD)

### Objectif
Créer, afficher, modifier, supprimer et terminer des tâches (sans framework).

### Prompt
> "Écris le code HTML et JavaScript minimal pour une liste de tâches : un formulaire avec un champ texte pour ajouter une tâche (refuse les titres vides), une liste pour afficher les tâches avec une case pour les cocher/barrer, un bouton pour modifier le titre, et un bouton pour supprimer la tâche. Utilise du JavaScript pur, sans framework."

- **Outil** : Assistant IA
- **Code gardé** : Modèle de données simple (`id`, `title`, `completed`), délégation d'événements pour le clic sur les tâches, validation avec `.trim()`.
- **Code modifié / rejeté** : Retrait des librairies superflues, remplacement des fonctions complexes par des fonctions courtes et lisibles (`addTask`, `deleteTask`, `render`).
- **Explication clé** : La délégation d'événements sur `taskList.onclick` permet de gérer tous les boutons (supprimer, modifier, cocher) avec un seul écouteur d'événement au lieu d'en attacher un à chaque élément.

---

## Sprint 2 : Persistance & Mise en forme CSS

### Objectif
Sauvegarder l'état dans `localStorage` et concevoir une interface soignée et responsive.

### Prompt
> "Ajoute la sauvegarde automatique des tâches dans le localStorage du navigateur pour qu'elles restent après rechargement. Écris un CSS moderne et épuré avec des variables CSS, support du mode sombre et adaptation sur mobile."

- **Outil** : Assistant IA
- **Code gardé** : `JSON.stringify()` pour stocker les tâches et `JSON.parse()` au chargement avec valeur de repli `[]`. Variables CSS pour les couleurs claires et sombres (`prefers-color-scheme`).
- **Code modifié / rejeté** : Élimination du CSS redondant, conservation d'un style compact et direct centré sur la lisibilité.
- **Explication clé** : `localStorage` ne stocke que des chaînes de caractères. `JSON.stringify()` transforme le tableau d'objets en texte, et `JSON.parse()` le réhydrate en tableau d'objets JavaScript.

---

## Sprint 3 : Fonctionnalité filière Développement

### Objectif
Trier par priorité, filtrer par niveau et organiser par profils / catégories d'espaces (`💼 Pro`, `🎓 Étudiant`, `🏠 Perso`).

### Prompt
> "Ajoute la gestion des priorités (Haute, Moyenne, Basse) avec tri automatique des tâches urgentes en premier et alternance au clic sur le badge. Ajoute ensuite un sélecteur de profils/catégories (Pro, Étudiant, Perso, + Nouveau) avec des espaces de tâches distincts pour chacun, le tout en gardant un code ultra-compact et facile à expliquer."

- **Outil** : Assistant IA
- **Code gardé** : 
  - Objet de configuration `PRIORITIES` avec poids numérique pour trier via `sort((a, b) => weightA - weightB)`.
  - Structure `data = { profile, workspaces: { "Pro": [...], "Étudiant": [...] } }` pour isoler les tâches par profil.
  - Compteurs en temps réel dans les boutons de filtres.
- **Code modifié / rejeté** : Rejet de toute architecture surchargée (pas de modal lourd, pas de DOM virtuel inutile). Le code JavaScript fait moins de 170 lignes, ce qui le rend 100% maîtrisable pour l'audit et l'oral.
- **Explication clé** : Le tri combine deux critères grâce à l'opérateur logique `||` : d'abord le statut terminé (`a.completed - b.completed`), puis le poids de priorité (`weightA - weightB`).
