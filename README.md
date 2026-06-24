<div align="center">
  <img src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" alt="NovaSearch Banner" width="100%" />
</div>

<h1 align="center">🚀 NovaSearch: Distributed Search Engine Platform</h1>

<p align="center">
  <strong>A high-performance, distributed search engine with dynamic UI and real PostgreSQL full-text search backend.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#tech-stack">Tech Stack</a>
</p>

---

## 🌟 Features

- **Real Distributed Sharding**: Queries are dispatched via a central Coordinator node to multiple independent Leaf Shard nodes simultaneously.
- **Advanced Full-Text Search**: Leverages PostgreSQL's native `to_tsvector` and `ts_rank` indexing to approximate Okapi BM25 and TF-IDF scoring in real-time.
- **Dynamic Cluster UI**: Real-time monitoring of cluster health, document counts, vocabulary sizes, and latency metrics across your distributed topology.
- **Web Crawler Sandbox**: Simulates an async multi-threaded crawler. Submit a URL, watch the HTML stripping, and post straight to a backend shard for live indexing!
- **O(k) Autocomplete Lookups**: Real-time prefix Trie suggestions fetched directly from the database as you type.

---

## 🏗️ Architecture Topology

Our architecture is split into a seamless React-based visualization frontend and a robust multi-node Express/PostgreSQL backend mesh.

1. **The Coordinator**: Exposes an API Gateway that receives search payloads and fans them out across the network.
2. **The Shard Nodes**: Independent Express microservices simulating partition segments. Each shard queries the central Postgres database (acting as the storage engine) and returns scored hits.
3. **The Frontend Workspace**: A fluid, highly dynamic dashboard built with Tailwind CSS and Framer Motion to visualize gRPC traces, system load, and AST query parsing on the fly.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18+)
- **PostgreSQL** running locally on default port 5432 (User: `postgres`, Password: `root`)

### 2. Installation
Clone the repo and install dependencies:
```bash
git clone https://github.com/venkatanaveen2078909-rgb/NovaSearch.git
cd NovaSearch
npm install
```

### 3. Initialize the Database
Bootstraps the `novasearch` database, builds the tables (`documents`, `shards`, `autocomplete_trie`), and seeds the initial corpora:
```bash
npm run db:init
```

### 4. Run the Full Cluster
Spin up the Vite frontend and all 4 backend microservices (1 Coordinator + 3 Shards) concurrently:
```bash
npm run dev
```

The UI will automatically open at `http://localhost:3000`.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Backend Coordinator & Shards**: Express, Node.js, `tsx`, `cross-env`
- **Database Engine**: PostgreSQL, `pg` driver (using native `GIN` indexes and `to_tsquery`)

<div align="center">
  <sub>Built with ❤️ for High Performance Systems.</sub>
</div>
