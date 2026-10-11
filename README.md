# afterlight.github.io
Site officiel du jeu vidéo AFTERLIGHT.

## Pages

- `index.html` : accueil
- `releases.html` : actualités et avancement
- `forum.html` : forum de démonstration
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

Le forum reste un prototype local : ses discussions ne sont pas envoyées à Supabase et ne sont pas partagées entre visiteurs.
