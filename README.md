# LapShop — Backend (Node.js / Express)

## Overview
Backend API for LapShop providing auth, products, orders and admin endpoints. Uses MySQL/TiDB Cloud as the data store.

## Tech stack
- Node.js, Express.js
- MySQL/TiDB 

## Prerequisites
- Node version ->20.19.2
- npm version ->10.8.2
## Install
git clone https://github.com/ramsair/lapshop_backend/tree/develop
cd lapshop-backend
npm install

## Environment
Create `.env` with:
PORT=3000
DB_HOST=...
DB_USER=...
DB_PASS=...
DB_NAME=...
JWT_SECRET=...
## Run (production)
npm run build
npm start

## Contact
Author: Ramsai Ummadisetty 20035571@mydbs.ie
