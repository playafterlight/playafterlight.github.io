# playafterlight.github.io
Site officiel du jeu vidéo AFTERLIGHT.

## Pages

- `index.html` : accueil
- `releases.html` : actualités et avancement
- `forum.html` : forum communautaire partagé
- `account.html` : création et gestion d'un compte Supabase
- `download.html` : disponibilité du jeu
- `lore.html` : page prévue pour le lore détaillé

## Configuration des comptes

Les comptes utilisent Supabase Auth. Pour les activer :

1. Crée un projet Supabase.
2. Dans les paramètres API du projet, copie son URL et sa clé publique (`publishable`, ou `anon` sur les anciens projets) dans `supabase-config.js`.
3. Dans **Authentication → URL Configuration**, définis `https://playafterlight.github.io` comme URL du site et ajoute `https://playafterlight.github.io/account.html` aux URL de redirection autorisées.
4. Active la confirmation par e-mail si tu veux vérifier les adresses avant la première connexion.

La clé publique est conçue pour être utilisée dans un site web. Ne mets jamais une clé secrète ou `service_role` dans ce dépôt ou dans le navigateur. Supabase Auth gère les mots de passe côté serveur; ce site ne les stocke pas lui-même.

## Forum partagé

Pour créer le stockage public des discussions :

1. Ouvre le **SQL Editor** du projet Supabase.
2. Copie le contenu de `supabase-forum.sql`, exécute-le une fois, puis recharge le site.

Les sujets et réponses sont lisibles par tous les visiteurs. Seuls les comptes connectés peuvent en publier. Les règles Row Level Security du script empêchent les visiteurs non connectés d'écrire et lient chaque publication au compte Supabase qui l'a créée.
