[Русский](ruREADME.md) | [English](README.md) | **Français** | [Español](spREADME.md) | [中文](zhREADME.md) | [العربية](arREADME.md)

# LiveKit PWA

![Aperçu](./public/images/preview.png)

Client non officiel pour [LiveKit Meet](https://github.com/livekit-examples/meet) — un
serveur de visioconférence auto-hébergé, conçu comme une alternative plus légère à Jitsi.
Il se distingue par un **système d'autorisation** intégré, un **système de modération**
et une **consommation moindre des ressources serveur**, ce qui permet de le faire
tourner même sur un serveur peu puissant.

## Fonctionnalités

- Autorisation.
- Possibilité d'inviter des invités dans une salle sans compte.
- Possibilité de créer des salles protégées par mot de passe et réservées aux administrateurs.
- Fonctions de modération des salles.
- Chat avec prise en charge des pièces jointes.
- 6 langues d'interface, thème sombre, PWA (installation comme application sur téléphone).

# Installation

L'application nécessite deux parties obligatoires : le [**serveur multimédia LiveKit**](https://github.com/livekit/livekit) (serveur) et l'**application web** (client).

Pour que tous les composants fonctionnent et pour optimiser l'interface web, des dépendances supplémentaires sont nécessaires :
- **livekit-vad** — transmission de la voix uniquement (suppression avancée du bruit)
- **livekit-egress** — service d'enregistrement des conférences
- **Redis** — pour la mise en cache des requêtes


## Option 1. Docker (recommandé)

1. Créez un fichier de configuration à partir du modèle :

   ```bash
   cp .env.example .env
   ```

   Dans `.env`, définissez :
   - `LIVEKIT_API_SECRET` — un secret long et aléatoire (`openssl rand -hex 32`) ;
   - `AUTH_SECRET` — un secret aléatoire pour les cookies de session (`openssl rand -hex 32`) ;
   - `LIVEKIT_URL` — l'adresse publique de LiveKit pour le navigateur (`wss://votre-domaine` ;
     pour un test sur une seule machine — `ws://localhost:7880`).


2. Démarrez l'ensemble de modules souhaité via les profils. **Important :** dans Docker
   Compose v2, l'option `--profile` doit être placée **avant** la commande `up`, et non après —
   `docker compose up -d --profile vad` renverra `unknown flag: --profile`.

   ```bash
   docker compose up -d                              # de base : appels, chat, autorisation
   docker compose --profile vad up -d                # + détection vocale (VAD)
   docker compose --profile recording up -d          # + enregistrement des conférences
   docker compose --profile vad --profile recording up -d   # tout à la fois
   ```

   Les profils peuvent être combinés à volonté. Autre solution : les définir via la
   variable d'environnement `COMPOSE_PROFILES` (par exemple dans `.env`) :

   ```bash
   COMPOSE_PROFILES=vad,recording docker compose up -d
   ```

   Si des profils sont activés, `--profile ...` (ou `COMPOSE_PROFILES` dans `.env`) doit
   également être indiqué dans les commandes suivantes (`restart`, `pull`, `down`) — sinon
   Compose ne les verra pas, et par exemple `down` n'arrêtera pas les services des profils.


3. Placez un reverse proxy TLS devant l'application (le `LIVEKIT_URL` ci-dessus n'a pas
   de port car le proxy expose LiveKit sur le port standard `443`, pas `7880` —
   la bibliothèque cliente ajoute elle-même `/rtc`). Exemple de configuration nginx :

   ```nginx
   server {
       listen 443 ssl;
       server_name meet.your-domain;
       ssl_certificate     /path/to/fullchain.pem;
       ssl_certificate_key /path/to/privkey.pem;

       # Signalisation LiveKit (WebSocket) + API => livekit-server
       location /rtc   { proxy_pass http://127.0.0.1:7880; include snippets/proxy.conf; proxy_read_timeout 3600s; proxy_send_timeout 3600s; }
       location /twirp { proxy_pass http://127.0.0.1:7880; include snippets/proxy.conf; }

       # Frontend Meet => conteneur web.
       location / {
           proxy_pass http://127.0.0.1:3000;
           include snippets/proxy.conf;
           proxy_hide_header Permissions-Policy;
           add_header Permissions-Policy "microphone=(self), camera=(self)" always;
       }
   }
   ```

   Si vous êtes derrière une cascade NAT (par exemple un serveur personnel redirigé
   via un VPS séparé qui possède l'IP publique réelle), consultez aussi
   `LIVEKIT_USE_EXTERNAL_IP` / `LIVEKIT_NODE_IP` dans `.env.example` — la détection
   automatique de l'IP via STUN de LiveKit trouvera l'IP de votre FAI, pas celle du VPS,
   ce qui casse l'audio/vidéo même quand la signalisation fonctionne.

### **Gestion** — avec les commandes Compose habituelles :

```bash
docker compose up -d --build                 # reconstruire l'image web et démarrer
docker compose restart                       # redémarrer sans reconstruction
docker compose pull && docker compose up -d  # mettre à jour les images depuis le registre
```

## Option 2. Installation native

Nécessite [Bun](https://bun.sh), ainsi qu'un serveur LiveKit préinstallé.

```bash
bun install
bun run build
bun run start
```

Les paramètres sont lus depuis `.env.local` à la racine du projet ; le modèle se trouve dans `.env.example`.
```bash
   cp .env.example .env.local
```
Pour un fonctionnement correct, n'oubliez pas de démarrer le serveur [LiveKit](https://github.com/livekit/livekit).
