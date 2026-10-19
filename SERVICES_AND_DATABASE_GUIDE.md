# 🏛️ ArchSketch Concept Guide: Database Tables & Service Nodes

> **Why ArchSketch bridges Database ERDs and Microservices on one canvas.**  
> *Use this guide for understanding core concepts or as content for the product's "About & Architecture Guide" website page.*

---

## 1. The Big Picture: Why Both Tables and Services?

In modern software engineering, architecture diagrams traditionally suffered from a split personality:

| Tool Category | What it showed | What was missing |
| :--- | :--- | :--- |
| **Traditional ERD Tools** *(dbdiagram, drawSQL)* | Database tables, columns, foreign keys | ❌ No idea which microservice, API gateway, or background worker reads or writes to those tables. |
| **Cloud Diagram Tools** *(Lucidchart, Draw.io)* | Generic boxes for servers and APIs | ❌ No relational database schema, data types, primary keys, or SQL generation. |

### 💡 The ArchSketch Solution: Dual-Layer Canvas
ArchSketch unites both into a single living diagram:
1. **Relational Core (Database Tables):** Exact PostgreSQL schema with data types, primary keys, nullability, and foreign key relations.
2. **Execution Layer (Service Nodes):** The applications, caching layers, message queues, and API gateways that communicate with those tables and each other.

---

## 2. Visual Architecture Example

Here is how a real-world platform looks on the ArchSketch canvas:

```
[ Client / Web Browser ]
           │
           ▼ (HTTPS / GraphQL)
 ┌───────────────────────────────┐
 │   API Gateway & Auth Service  │  <-- [Service Node: Gateway]
 └──────────────┬────────────────┘
                │
        ┌───────┴────────────────────────┐
        ▼ (RESP Port 6379)               ▼ (gRPC Internal)
 ┌───────────────┐               ┌────────────────────────────────┐
 │  Redis Cache  │               │   Order Processing Worker      │  <-- [Service Node: Worker]
 └───────────────┘               └───────────────┬────────────────┘
                                                 │
                                                 ▼ (PostgreSQL Connection Pool)
                                  ┌───────────────────────────────┐
                                  │   Table: orders               │  <-- [Database Table Node]
                                  │   - id: UUID (PK)             │
                                  │   - user_id: UUID (FK) ───────┼──┐
                                  │   - total_amount: NUMERIC     │  │
                                  │   - status: VARCHAR           │  │ (Relational Edge)
                                  └───────────────────────────────┘  │
                                                                     ▼
                                                  ┌───────────────────────────────┐
                                                  │   Table: users                │  <-- [Database Table Node]
                                                  │   - id: UUID (PK)             │
                                                  │   - email: VARCHAR            │
                                                  │   - created_at: TIMESTAMP     │
                                                  └───────────────────────────────┘
```

---

## 3. What is a "Service Node"?

A **Service Node** represents an active computing or networking component in your system. While tables store data at rest, service nodes process data in motion.

In ArchSketch, a Service Node contains:
- **Service Name:** e.g., `Payment Gateway`, `Redis Session Cache`, `Notification Worker`
- **Role:**
  - `gateway`: Entry points, reverse proxies (Kong, Nginx, Envoy, Cloudflare).
  - `microservice`: Backend apps running business logic (Node.js, Go, Python, Spring Boot).
  - `cache`: In-memory fast stores (Redis, Memcached, Cloudflare KV).
  - `database`: Dedicated managed database engines.
  - `worker`: Asynchronous event processors (Celery, Kafka Consumers, BullMQ).
- **Communication Protocol:**
  - `HTTPS / REST`
  - `gRPC / Protocol Buffers`
  - `WebSocket / real-time`
  - `Kafka / RabbitMQ event stream`
  - `RESP (Redis Serialization Protocol)`

---

## 4. What is a "Table Node"?

A **Table Node** represents a relational database entity. Each table contains:
- **Table Name & Schema:** e.g., `public.orders`, `auth.users`
- **Columns Array:**
  - Column name: `id`, `user_id`, `created_at`
  - SQL Data Type: `UUID`, `VARCHAR(255)`, `BIGINT`, `TIMESTAMP`, `BOOLEAN`, `JSONB`, `NUMERIC`
  - Constraint Badges: `PK` (Primary Key), `FK` (Foreign Key), `UQ` (Unique), `NULL` (Nullable)
- **Interactive Handles:** Left/right connection dots on each column handle allow visual drag-and-drop linking of foreign keys directly between tables!

---

## 5. Edges: Connecting the Pieces

ArchSketch uses two types of connections (edges):

1. **Relational Edges (Data Schema Level):**
   - Connects a foreign key column from Table A (e.g., `orders.user_id`) to a primary key column in Table B (`users.id`).
   - Generates exact foreign key constraints when clicking **"Export SQL"**:
     ```sql
     ALTER TABLE "orders" ADD CONSTRAINT fk_user FOREIGN KEY ("user_id") REFERENCES "users"("id");
     ```

2. **Network / Protocol Edges (Architecture Level):**
   - Connects a Service Node to another Service Node, or a Service Node to a Database Table.
   - Shows the protocol (e.g. `RESP Port 6379` or `Kafka Topic: order-created`), animated dashed pulses, and latency boundaries.

---

## 6. How to Turn This Into a Product Website Page

When creating the marketing website for ArchSketch, this documentation converts naturally into an **"About & Feature Tour"** page:

- **Section 1 (Hero Hook):** *"Stop drawing architecture in one tool and database schemas in another."*
- **Section 2 (Interactive Comparison):** Side-by-side demonstration of Microservices talking to Database tables.
- **Section 3 (Export Production Artifacts):** Show how 1 click generates production-ready PostgreSQL DDL migrations from the visual diagram.
