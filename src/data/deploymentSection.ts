import { SpecSection } from '../types';

export const deploymentSection: SpecSection = {
  id: 'deployment-arch',
  number: 10,
  title: 'Deployment & Infrastructure Architecture',
  shortTitle: '10. Deployment',
  badge: 'DevOps & Cloud',
  summary: 'Cloud-native infrastructure blueprint detailing containerized NestJS services, PostgreSQL High Availability (HA) with streaming replication, Redis cluster, distributed locking, and multi-store network topologies.',
  subsections: [
    {
      id: 'deploy-cloud-topology',
      title: '10.1 Cloud Infrastructure Topology',
      content: `The backend runs on containerized orchestrators (Kubernetes / Google Cloud Run / AWS ECS) fronted by Cloudflare Enterprise for DDoS protection and edge caching:

\`\`\`
                                  +-----------------------+
                                  | Cloudflare WAF / CDN  |
                                  +-----------+-----------+
                                              | HTTPS (Anycast)
                                              v
                              +-------------------------------+
                              | External Application LB (TLS) |
                              +---------------+---------------+
                                              |
                     +------------------------+------------------------+
                     |                                                 |
                     v                                                 v
    +----------------------------------+              +----------------------------------+
    | NestJS API Pods (Zone A)         |              | NestJS API Pods (Zone B)         |
    | - Auto-scaling HPA (2 - 20 pods) |              | - Auto-scaling HPA (2 - 20 pods) |
    | - Health Check: /api/v1/health   |              | - Health Check: /api/v1/health   |
    +----------------+-----------------+              +----------------+-----------------+
                     |                                                 |
                     +------------------------+------------------------+
                                              |
                   +--------------------------+--------------------------+
                   |                          |                          |
                   v                          v                          v
    +----------------------------+   +-------------------+   +-----------------------+
    | PostgreSQL Primary (HA)    |   | Redis Cluster     |   | Object Storage        |
    | - PgBouncer Connection Pool|   | - Sentinel / AOF  |   | (S3 / Cloud Storage)  |
    | - Multi-AZ Synchronous Rep |   | - Redlock Engine  |   | - PDF Receipts        |
    | - Automated Failover       |   | - Cache & BullMQ  |   | - Product Images      |
    +--------------+-------------+   +-------------------+   +-----------------------+
                   | Streaming Replication
                   v
    +----------------------------+
    | PostgreSQL Read Replicas   |
    | - Dedicated Analytics Pool |
    | - BI & Report Materializer |
    +----------------------------+
\`\`\``
    },
    {
      id: 'deploy-database-ha',
      title: '10.2 Database High Availability & Disaster Recovery',
      content: `1. **PostgreSQL Configuration**:
   - Primary-Standby setup with synchronous streaming replication across 2 Availability Zones.
   - **Connection Pooling**: PgBouncer configured in transaction pooling mode to handle 2,000+ concurrent mobile terminal connections.
   - **Backups**: Continuous WAL archiving to cloud object storage with point-in-time recovery (PITR) up to 35 days. RPO < 5 seconds, RTO < 2 minutes.
2. **Redis Cluster**:
   - 3-master, 3-replica cluster for token blacklisting, rate limiting, and BullMQ background task processing.
3. **CI/CD Pipeline**:
   - GitHub Actions automated matrix: Linter -> Unit Tests -> Testcontainers Integration -> Docker Image build -> Zero-downtime rolling update via Helm / Terraform.`
    }
  ]
};
