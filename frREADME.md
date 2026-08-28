# LiveKit PWA

![Aperçu](./public/images/preview.png)

Un client non officiel pour [LiveKit Meet](https://github.com/livekit-examples/meet) :
un serveur de visioconférence auto-hébergé, conçu comme une alternative plus légère à Jitsi.
Il se distingue par son **système d'authentification** intégré, son **système de modération** et sa
**consommation réduite des ressources du serveur**, ce qui permet de le faire tourner même sur un serveur modeste.

## Fonctionnalités

- Authentification.
- Possibilité d'inviter des personnes sans compte dans une salle.
- Possibilité de créer des salles protégées par mot de passe et réservées aux administrateurs.
- Fonctions de modération des salles.
- Chat avec prise en charge des pièces jointes.
- 6 langues d'interface, thème sombre, PWA (installation en tant qu'application sur le téléphone).

# Installation

L'application a besoin de deux parties obligatoires : le [**serveur multimédia LiveKit**](https://github.com/livekit/livekit) (serveur) et
l'**application web** (client).

Des dépendances supplémentaires sont également requises pour que tous les composants fonctionnent et pour optimiser l'interface web :
- **livekit-vad** — transmission de la voix uniquement (suppression du bruit avancée)
- **livekit-egress** — le service d'enregistrement des conférences
- **Redis** — pour la mise en cache des requêtes


## Option 1. Docker (recommandé)

1. Créez le fichier de configuration à partir du modèle :

   ```bash
   cp .env.example .env
   ```

   Dans `.env`, définissez :
   - `LIVEKIT_API_SECRET` — un long secret aléatoire (`openssl rand -hex 32`) ;
   - `AUTH_SECRET` — un secret aléatoire pour les cookies de session (`openssl rand -hex 32`) ;
   - `LIVEKIT_URL` — l'adresse publique de LiveKit pour le navigateur (`wss://votre-domaine` ;
     pour un test sur une seule machine — `ws://localhost:7880`).


2. Lancez l'ensemble des modules dont vous avez besoin via les profils :

   ```bash
   docker compose up -d /     # base : appels, chat, authentification
   --profile vad /            # + détection de la voix (VAD)
   --profile recording        # + enregistrement des conférences
   ```

   Les profils se combinent ; vous pouvez en installer une partie ou tous à la fois :

   `docker compose --profile recording --profile vad up -d`.


### **Gestion** — avec les commandes Compose habituelles :

```bash
docker compose up -d --build                 # reconstruire l'image web et démarrer
docker compose restart                       # redémarrer sans reconstruire
docker compose pull && docker compose up -d  # mettre à jour les images depuis le registre
```

## Option 2. Installation native

Nécessite Node.js ≥ 18 et pnpm, ainsi qu'un serveur LiveKit déjà installé.

```bash
pnpm install
pnpm build
pnpm start
```

La configuration est lue depuis `.env.local` à la racine du projet ; le modèle se trouve dans le fichier `.env.example`.
```bash
   cp .env.example .env.local
```
Pour un fonctionnement correct, n'oubliez pas de démarrer le serveur [LiveKit](https://github.com/livekit/livekit).
