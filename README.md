# Collectif d'achats Youville

Application web pour simplifier les commandes d'un collectif d'achats alimentaires a Montreal.
L'objectif est de remplacer les workflows manuels (Google Forms/Excel) par un parcours unique:
creation de paniers hebdomadaires, prise de commandes en ligne et agregation automatique des totaux.

## Apercu

L'admin prepare un panier avec ses produits, prix et contraintes de budget.
Les membres passent commande sans creer de compte.
Le systeme consolide ensuite les quantites et montants pour faciliter l'achat et la distribution.

## Fonctionnalites MVP

- Gestion des paniers hebdomadaires cote admin
- Duplication d'un panier existant pour gagner du temps
- Formulaire de commande public, sans connexion
- Validation des contraintes de budget (client et serveur)
- Aggregation automatique des commandes par produit
- Vues admin pour suivre commandes, recap et preparation

## Deploiement

- Production: https://collectif-d-achat.vercel.app/

## Demarrage local

Prerequis:

- Node.js 18+
- npm

Lancer l'application en local:

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000 dans le navigateur.

## Documentation complementaire

- `collective-buying-mvp-readme.md`: contexte produit et cadrage MVP
- `collective-buying-dev-steps.md`: etapes de developpement et avancement
