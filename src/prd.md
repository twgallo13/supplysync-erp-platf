# SupplySync ERP: Master System Document (Consolidated)

Date: 2025-09-18

This document is the consolidated, authoritative specification for SupplySync ERP. It supersedes earlier drafts and integrates functional, technical, security, telemetry, and validation requirements into a single developer-ready reference.

## 1. Project Overview & Strategic Goals

### 1.1 Purpose

SupplySync ERP is a centralized platform for managing non-merchandise supplies across a multi-location retail network. It replaces fragmented ordering processes with predictive, automated, and auditable workflows designed to ensure operational continuity, enforce governance, and achieve the lowest landed cost. The system enables seamless collaboration among AI agents, human operators, and developers.

### 1.2 Strategic Goals

- Operational Continuity: Prevent stockouts of mission-critical supplies (e.g., receipt paper, cleaning materials, POS hardware) via predictive analytics, automated replenishment triggers, seasonality, and buffer logic.
- Lowest Landed Cost: Enforce deterministic vendor selection logic (cost → lead time → preference → SLA) with complete traceability.
- Governance & Compliance: Maintain immutable, append-only audit logs with required reason codes for overrides, rejections, and escalations; audit-ready by design.
- Role-Aware Control: Implement a clear hierarchy. FM has final operational authority; DM is the primary gatekeeper for store-initiated requests and restricted items.
- System Security & Privacy: Private by default. No public endpoints. Authenticated sessions via SSO/OIDC. Assets served with signed, short-lived URLs.

## 2. Role Matrix & Use Cases

### 2.1 Role Matrix

| Role | Primary Function | Key Permissions |
| :--- | :--------------- | :-------------- |
| Store Manager (SM) | Initiates on-demand supply requests for their location. | • View site-specific catalog • Create and submit orders • View order history and tracking |
| District Manager (DM) | First-line approver and guardian of budget/policy. | • View/manage approval queue • Approve/Reject store orders • Mandatory comments on rejection |
| Facility Manager (FM) | Final operational authority for fulfillment and replenishment. | • Approve/Reject/Modify orders • Override vendors/shipping (reason required) • Manage system-generated suggestions |
| Cost Analyst | Monitors financial performance, vendor SLAs, and data integrity. | • View-only access to orders/pricing • Alerts for invoice mismatches/SLA breaches • Access to dashboards |
| Admin | Manages configuration, access, and data schemas. | • Configure RBAC/workflows/tolerances • Manage product/vendor master data • Act on audit/ETL alerts (MFA for sensitive changes) |
| System / AI | Automates and optimizes routine replenishment tasks. | • Generate replenishment orders • Enforce vendor selection logic • Trigger alerts • Maintain audit logs |

### 2.2 Core Use Cases

#### UC-1: Store Manager (SM)

UC-1.1: Request Supplies from Catalog

- Trigger: A store identifies a supply need.
- Workflow:
  - SM logs in → navigates to Order Supplies.
  - Uses search, filters, and product pages; restricted items display a “Requires DM Approval” badge.
  - Adds items/bundles to cart → checkout → submit.
- Outcome: Order created with status PENDING_DM_APPROVAL and routed to DM. SM receives confirmation.

UC-1.2: Track Order Status

- Trigger: SM needs order status.
- Workflow: SM views Order History with statuses (PENDING_DM_APPROVAL, PENDING_FM_APPROVAL, SHIPPED, REJECTED, etc.); tracking numbers shown; rejection reasons visible.
- Outcome: Full lifecycle visibility.

#### UC-2: District Manager (DM)

UC-2.1: Adjudicate Store Request

- Trigger: SM submits a new order.
- Workflow: DM opens Approval Queue → reviews → Approve or Reject.
  - Approve → proceeds to FM.
  - Reject → reasonCode required; optional comment.
- Outcome: On approval → PENDING_FM_APPROVAL; on rejection → REJECTED + notification.

#### UC-3: Facility Manager (FM)

UC-3.1: Finalize & Fulfill Order

- Trigger: DM approves a store order or a system-generated order is created.
- Workflow: FM reviews Fulfillment Queue → selects fulfillment type (Warehouse vs Direct-Ship) → may adjust quantities/vendors (reason required) → approve for fulfillment.
- Outcome: APPROVED_FOR_FULFILLMENT → dispatch to procurement/warehouse.

UC-3.2: Create Proactive Order

- Trigger: FM creates an order directly (urgent/strategic need).
- Outcome: Order created with APPROVED_FOR_FULFILLMENT; audit log marks FM-initiated action.

## 3. Core Workflows & Escalation Paths

### 3.1 Order State Transition Diagram

```text
[START]
   |
   |-- (SM Creates Order) --> [PENDING_DM_APPROVAL]
   |
   |-- (System Creates Order) --> [PENDING_FM_APPROVAL]
   |
   `-- (FM Creates Order) --> [APPROVED_FOR_FULFILLMENT]

[PENDING_DM_APPROVAL]
   |
   |-- (DM Approves) --> [PENDING_FM_APPROVAL]
   |
   `-- (DM Rejects) --> [REJECTED] --> [END]

[PENDING_FM_APPROVAL]
   |
   |-- (FM Approves) --> [APPROVED_FOR_FULFILLMENT]
   |
   `-- (FM Rejects) --> [REJECTED] --> [END]

[APPROVED_FOR_FULFILLMENT] --> [IN_TRANSIT] --> [PARTIALLY_DELIVERED] --> [DELIVERED] --> [END]
```

### 3.2 Standard Workflow: Store-Initiated Order (SM → DM → FM)

- Initiation (SM): Order submitted by SM.
- Initial State: PENDING_DM_APPROVAL; routed to assigned DM.
- First-Level Approval (DM):
  - Approve → PENDING_FM_APPROVAL (routed to FM)
  - Reject → REJECTED (reasonCode mandatory) → notify SM
- Final Approval (FM):
  - Approve → APPROVED_FOR_FULFILLMENT; send to procurement; all modifications fully logged
  - Reject → REJECTED (reasonCode mandatory) → notify DM + SM

### 3.3 Automated & Proactive Workflows

- System-Initiated Replenishment:
  - Trigger: Predictive analytics identify need based on consumption, seasonality, buffer.
  - Initial State: PENDING_FM_APPROVAL → placed in FM queue for review/approval.
- FM-Initiated Order:
  - Trigger: FM creates order for urgent/strategic need.
  - Initial State: APPROVED_FOR_FULFILLMENT; audit log marks FM-initiated.

### 3.4 Escalation & Override Logic

- Restricted Items: `requires_dm_approval: true` mandates full SM → DM → FM workflow; no bypass.
- Bundle Escalation: If any bundle item is restricted, entire bundle is restricted.
- FM Overrides: FM can modify any aspect in PENDING_FM_APPROVAL; reasonCode required; immutable audit history.

## 4. Technical Architecture & Deployment

### 4.1 High-Level Architecture

```
[User via SSO] --> [Web App (SPA)] --> [API Gateway w/ Authorizer]
																							|
																							|-- [Orders Service (Lambda)]
																							|-- [Products Service (Lambda)]
																							|-- [Users Service (Lambda)]
																							|
																							`-- [Notifications Service (Lambda)]
																										|
																										`--> (Email/SMS/Push)

[Services] <--> [Primary DB (RDS)] <--> [Search Index (OpenSearch)]
	 |
	 `--> [Event Bus (EventBridge)] --> [Analytics & Logging (S3/Athena)]

[External Systems] --> [ETL Service (Lambda/Glue)] --> [Primary DB]

[CI/CD (GitHub Actions)] --> [IaC (Terraform)] --> [AWS]
```

### 4.2 Technology Stack

| Component | Technology | Rationale |
| :-- | :-- | :-- |
| Cloud Provider | AWS | Mature serverless services; strong security controls. |
| Frontend | React (Vite) | Modern SPA; responsive UI. |
| Backend | Node.js (TypeScript) on AWS Lambda | Event-driven scalability; type safety. |
| API Layer | AWS API Gateway (REST) | Managed secure entry; integrates with auth. |
| Authentication | OIDC / AWS Cognito | Federates with IdP; authorizers enforce RBAC. |
| Primary DB | AWS Aurora (PostgreSQL) | Highly available ACID transactional store. |
| Search | AWS OpenSearch Service | Fast, faceted catalog/order search. |
| Caching | Amazon ElastiCache (Redis) | Session and hot read caching. |
| Event Bus | Amazon EventBridge | Decoupled reactive workflows. |
| Data Ingestion | AWS Glue / Lambda | Managed ETL from external sources. |
| Asset Storage | Amazon S3 | Private-by-default assets via signed URLs. |
| Infrastructure | Terraform | Repeatable IaC provisioning. |
| CI/CD | GitHub Actions | Automates build/test/deploy. |

### 4.3 Deployment Model (1-Click Install)

1. Commit → PR triggers unit tests, static analysis, and security scan.
2. Merge to main → CI builds and runs integration tests in a temp env.
3. Provision (Terraform): `plan` + `apply` set desired infra state.
4. Deploy to Staging → validate.
5. Promote to Production via manual approval using the same artifact.

### 4.4 Environments

| Environment | Purpose | Data Policy | Deployment Trigger |
| :-- | :-- | :-- | :-- |
| Development | Individual sandboxes | Mock/sanitized subset | Manual |
| Staging / UAT | Pre-production integration/UAT | Anonymized recent clone of prod | Auto on merge to main |
| Production | Live environment | Live transactional data | Manual approval post-staging |

## 5. Master Schemas

### 5.1 Orders Schema

```jsonc
{
	"order_id": "ord_a1b2c3d4e5f6", // UUID
	"store_id": "s_12345",
	"created_by_user_id": "usr_f6e5d4c3b2a1",
	"created_at": "2025-09-18T14:30:00Z",
	"updated_at": "2025-09-18T16:00:00Z",
	"status": "PENDING_FM_APPROVAL",
	"order_type": "STORE_INITIATED",
	"line_items": [
		{ "product_id": "prod_z9y8x7w6", "vendor_id": "ven_a9b8c7", "quantity": 2, "unit_cost": 15.99 }
	],
	"shipping_details": {
		"method": "GROUND", // WAREHOUSE_SHIPMENT, DIRECT_SHIP
		"address": { /* store address */ },
		"tracking_numbers": ["1Z999AA10123456784", "1Z999AA10123456785"]
	},
	"total_cost": 31.98,
	"audit_history": [
		{ "timestamp": "2025-09-18T14:30:00Z", "user_id": "usr_f6e5d4c3b2a1", "action": "ORDER_CREATED", "details": "Order submitted by Store Manager." },
		{ "timestamp": "2025-09-18T16:00:00Z", "user_id": "usr_c3b2a1d4e5f6", "action": "DM_APPROVED", "reason_code": null, "details": "Approved by District Manager." }
	]
}
```

Note: `status` enum values: PENDING_DM_APPROVAL, PENDING_FM_APPROVAL, APPROVED_FOR_FULFILLMENT, IN_TRANSIT, PARTIALLY_DELIVERED, DELIVERED, REJECTED, CANCELLED.

### 5.2 Products Schema

```jsonc
{
	"product_id": "prod_z9y8x7w6",
	"sku": "SKU-GL-085",
	"display_name": "8.5 x 11 Copy Paper, Case",
	"description": "Standard 20lb copy paper, 5000 sheets per case.",
	"category": "Office Supplies",
	"image_s3_key": "products/sku-gl-085.jpg",
	"pack_quantity": 5000,
	"requires_dm_approval": false,
	"is_active": true,
	"tags": ["paper", "printing", "office"],
	"vendors": [
		{
			"vendor_id": "ven_a9b8c7",
			"vendor_sku": "V-CP8511",
			"cost_per_item": 15.99,
			"lead_time_days": 3,
			"is_preferred": true
		}
	]
}
```

### 5.3 Users & Stores Schema

Users

```jsonc
{
	"user_id": "usr_f6e5d4c3b2a1",
	"full_name": "Alice Smith",
	"email": "alice.smith@example.com",
	"role": "SM",
	"assignment": { "type": "store", "id": "s_12345" }
}
```

Stores

```jsonc
{
	"store_id": "s_12345",
	"store_name": "Main Street Store #12345",
	"district_id": "d_67890",
	"address": { "street": "123 Main St", "city": "Anytown", "state": "CA", "zip": "12345" }
}
```

## 6. Security, Governance, and Compliance

### 6.1 Authentication & Authorization

- Authentication: OIDC via corporate IdP; AWS Cognito as broker; short-lived JWTs; no local credentials.
- Authorization (RBAC):
	- Edge: API Gateway Lambda authorizer validates JWT and role/assignment; unauthorized → 403 before backend.
	- Service Level: Services enforce fine-grained checks (e.g., SM can only create orders for their assigned `store_id`).

### 6.2 Data Security & Privacy

- Encryption in transit (TLS 1.2+) and at rest (AWS KMS for RDS, S3, OpenSearch).
- Least privilege exposure of sensitive data (e.g., `cost_per_item` hidden from unauthorized roles).
- Private-by-default assets; use pre-signed URLs; no hotlinking.
- Minimal PII limited to user name/email under IdP policies.

### 6.3 Audit & Compliance

- Immutable append-only `audit_history` for all significant actions.
- Traceability: Each event includes `user_id`, timestamp, and structured action type.

### 6.4 Governance Policies

- Quarterly Access Reviews: Automated user/permission report for review.
- Admin Guardrails:
	- MFA Elevation for sensitive changes (RBAC, workflows, tolerances).
	- Future Dual Control for destructive operations.

## 7. Telemetry & Logging Contract

### 7.1 Logging Strategy

- All logs must be structured JSON for machine-readability and analytics.

### 7.2 Standard Log Structure

```json
{
	"timestamp": "2025-09-18T14:30:05.123Z",
	"log_level": "INFO",
	"service_name": "orders-service",
	"event_name": "OrderApproved",
	"correlation_id": "req_abc123",
	"user_context": { "user_id": "usr_c3b2a1d4e5f6", "role": "DM", "session_id": "sess_xyz789" },
	"payload": { "order_id": "ord_a1b2c3d4e5f6", "approver_role": "DM", "approval_latency_ms": 12500 },
	"message": "DM approved order for store s_12345."
}
```

### 7.3 Key Telemetry Events

| Event Name | Trigger | Key Payload Fields | Description |
| :-- | :-- | :-- | :-- |
| UserLoginSuccess | User authenticates via SSO | user_id, role | Tracks user auth and session start |
| ProductSearch | User performs catalog search | search_terms, filter_criteria, result_count | Analyzes search and behavior |
| OrderCreated | SM or FM submits a new order | order_id, store_id, total_cost, line_item_count | Start of order lifecycle |
| OrderApproved | DM or FM approves an order | order_id, approver_role, approval_latency_ms | Approval velocity and progression |
| OrderRejected | DM or FM rejects an order | order_id, rejector_role, reason_code, comment | Reasons for process improvement |
| FmOverride | FM modifies order | order_id, override_type, original_value, new_value, reason_code | Audit trail for overrides |
| VendorSlaBreach | Vendor delivery late | vendor_id, order_id, days_late | Alerts to Cost Analyst and FM |
| EtlJobFailed | Data ingestion job fails | job_name, error_message, source_file | Alerts Admins to data issues |
| PrivilegedAction | Admin sensitive action | action_type, target_entity_id, mfa_elevated | Security events for changes |
| ServiceError | Unhandled exception | error_code, error_message, stack_trace | Debugging and health monitoring |

### 7.4 Log Aggregation & Analysis

- Stream logs to S3 data lake; catalog with Athena for querying.
- Dashboards: Operational, Business, Security & Audit.

## 8. Accessibility & Performance Budgets

### 8.1 Accessibility Commitment

- WCAG 2.1 AA compliance.
- Keyboard navigability; semantic HTML; ARIA where needed.
- Color contrast minimums met; labeled forms; clear errors.

### 8.2 Performance Budgets

| Metric | Budget | Description |
| :-- | :-- | :-- |
| Largest Contentful Paint (LCP) | < 2.5s | Perceived loading speed |
| Interaction to Next Paint (INP) | < 200ms | Response latency for user interactions |
| Cumulative Layout Shift (CLS) | < 0.1 | Visual stability |
| P95 API Latency | < 200ms | 95% of backend calls under 200ms |
| Initial JS Bundle Size | < 500 KB | Gzipped initial payload |

### 8.3 Enforcement & Testing

- Automated CI: Lighthouse audits and Axe-Core scans (fail build under thresholds).
- Manual accessibility testing for key workflows.
- RUM in production for Core Web Vitals and API performance.

## 9. Migration & Rollback Plan

### 9.1 Migration Strategy

Phased rollout minimizing disruption:

- Phase 1: Pilot (1 District, ~10 Stores) — 2 weeks
- Phase 2: Regional Rollout (West Coast Districts) — 2 weeks
- Phase 3: Full National Rollout — 1 week

### 9.2 Pre-Migration Checklist (T-1 Week)

- Data Cleanup & Mapping: Deduplicate vendors; confirm SKU mapping; verify IdP provisioning and role assignments.
- Infrastructure Provisioning: Terraform apply for Production; full integration test on sanitized data.
- Database Backup & Snapshot: Final backup of legacy; snapshot clean RDS for rollback.
- Communication: Notify pilot users with cutover time, training, and support.

### 9.3 Migration Execution (Go-Live Day)

- Enable maintenance mode on legacy (read-only).
- Run ETL migration job (idempotent) to load Production Aurora.
- Deploy application (promote from Staging).
- DNS switch to new stack; disable maintenance mode.
- Initial validation smoke test (login, search, test order through approvals).

### 9.4 Post-Migration Validation

- Heightened monitoring for 72 hours; dashboards for errors/latency.
- Dedicated support channel for pilot users.
- Go/No-Go at 48 hours to proceed with rollout.

### 9.5 Rollback Plan (RTO < 1 hour)

- Triggers: Auth failure, order submission failure, widespread corruption, critical security issue.
- Procedure: Declare rollback → DNS revert to legacy → disable new system (503) → restore legacy DB from backup → exit legacy maintenance mode → post-mortem prior to reattempt.

## 10. Acceptance Tests & Validation Rules

### 10.1 Functional Acceptance Tests (Selected)

- AT-RBAC-01 (SM): Direct URL to another store's orders returns 403 + Access Denied UI.
- AT-WRKFL-01 (SM): Order with restricted item submits → PENDING_DM_APPROVAL and appears in DM queue.
- AT-WRKFL-02 (DM): Reject requires reasonCode in modal before submission.
- AT-OVRD-01 (FM): Changing vendor requires reasonCode; recorded in audit history.
- AT-VEND-01 (System): System-initiated order selects vendor with lowest `cost_per_item` by default.
- AT-TRACK-01 (SM): Partially shipped order shows multiple tracking numbers and status PARTIALLY_DELIVERED.
- AT-ALERT-01 (Cost Analyst): Vendor SLA breach alert (2+ days late) sent to Cost Analyst and FM.
- AT-ADMIN-01 (Admin): Role change prompts MFA re-auth before commit.
- AT-BUND-01 (SM): Bundle with a restricted item enforces full restricted workflow (PENDING_DM_APPROVAL).

### 10.2 API & Data Validation Rules

| Entity | Field | Validation Rule | Error Code |
| :-- | :-- | :-- | :-- |
| Order | status | Must be in predefined enum | INVALID_STATUS |
| Order | line_items | Cannot be empty; at least one item | EMPTY_ORDER |
| Order | store_id | Must exist and match SM's assigned store | INVALID_STORE_ID |
| Line Item | quantity | Integer > 0 | INVALID_QUANTITY |
| Product | cost_per_item | Positive number, max two decimals | INVALID_COST |
| User | role | Must be in Role Matrix | INVALID_ROLE |

### 10.3 Non-Functional Requirement (NFR) Validation

| NFR ID | Category | Requirement | Measurement / Test |
| :-- | :-- | :-- | :-- |
| NFR-PERF-01 | Performance | All pages pass Core Web Vitals | Lighthouse LCP/INP/CLS in Good range; CI enforces |
| NFR-ACC-01 | Accessibility | WCAG 2.1 AA compliant | Axe-Core CI must report zero critical violations |
| NFR-SEC-01 | Security | Sensitive cost data hidden from unauthorized roles | Integration tests confirm cost-per-item absent for SM/DM endpoints |
| NFR-RPO-01 | Reliability | RPO of 5 minutes | RDS PITR configured for 5-minute backups |
| NFR-RTO-01 | Reliability | RTO of 1 hour | Rollback plan (9.5) tested quarterly in Staging |

## 11. Release Notes & Changelog

### Version 6.0.0 (Consolidated Master)

This version consolidates prior documents (v5.0, v5.1, v5.2, amendments) into a single, consistent specification. It establishes the canonical approval workflow, escalation logic, FM authority, master schemas/architecture, telemetry and accessibility contracts, migration plan, and exhaustive acceptance criteria.

Key resolutions:

- Unified SM → DM → FM approval flow.
- Formalized restricted-item bundle escalation.
- Solidified FM authority (overrides with reason codes; fulfillment choice).
- Canonical schemas and secure, scalable architecture.
- Contracts for telemetry, accessibility (WCAG 2.1 AA), and performance (Core Web Vitals).
- End-to-end migration, rollout, and rollback planning.

### Version 8.0.0 (Consolidation Updates)

No changes to Sections 1–3.2 and 4–5.1 from v6 where noted. The following elaborations apply:

- 3.3 System-Initiated Replenishment:
	- Nightly job identifies products below Reorder Point (ROP).
	- Replenishment Controls & Formulas:
		- Reorder Point (ROP): $ROP = Safety\ Stock + (Lead\ Time\ Days \times Forecasted\ Daily\ Usage)$
		- Target On-Hand (Days of Cover): configurable (e.g., 30/60/90 days) per store tier/need-type; `supplyDurationDays` informs target.
		- Order Quantity: raises on-hand to Target On-Hand.
	- Replenishment Modes: Monthly/Weekly batches; On-Demand (ROP-triggered).
	- Initial State: PENDING_FM_APPROVAL; suggestion placed in FM queue for review.

- 3.4 Functional-Need Replenishment & Substitution:
	- Need-Type Grouping: `needGroup` maps products to functional needs (e.g., "GLASS_CLEANER").
	- Equivalent Unit Normalization: Normalize to common unit (e.g., cost per ounce) for comparison.
	- Vendor Substitution Engine Logic:
		- Enforce store minimums (e.g., `min_sprayers_on_hand = 2`).
		- Prefer refills when minimums are satisfied.
		- Select lowest landed cost per Equivalent Unit across vendors meeting lead time.
		- Capture variance: planned vs actual landed cost.

- 3.5 Fulfillment & Logistics Logic:
	- Default routing: Warehouse; SM direct-ship requests require DM approval and FM sign-off.
	- FM-initiated: FM can choose any method.
	- Internal Transit Load Balancing: Batch by route; flag over-capacity; FM may throttle, prioritizing stockout-critical → promo → baseline.
	- Tracking number formats:
		- Warehouse: `300-[StoreID]-[6-digit-ID]-[#of#]` (e.g., `300-12345-A4B1C9-1of2`)
		- Direct-Ship: `[VendorName]-[StoreID]-[VendorTrackingID]-[#of#]` (e.g., `Amazon-12345-123XYZ789-1of1`)

### 📑 Amendment v8.1 — Final Integration Items

1) Store Catalog & UI Logic

- Authenticated catalog portal with search, filters, product details (images/descriptions).
- Restricted items show “Requires DM Approval” badge.
- Bundles flagged with component breakdown.

2) Receiving & Barcode Handling

- Modes: Mass Receive (all), Case Scan, Piece Scan, Manual Entry.
- Barcode Aliases: `vendorSkuMap` supports multiple UPCs.
- Unknown UPC workflow: Warehouse scan → prompt → FM/Admin approval → alias stored.
- Exception dashboard for barcode mismatches.

3) Direct-Ship Fulfillment

- Option across vendors.
- Store-initiated → DM approval → FM final.
- FM-initiated → auto-approved.
- Default = warehouse; FM may override.
- Vendor tracking integrated; supports multiple carriers and partial shipments.

4) Replenishment Controls

- Formulas:
	- $ROP = Safety\ Stock + (Lead\ Time \times Daily\ Usage)$
	- $Target\ On\ Hand = Days\ of\ Cover \times Daily\ Usage$
- Supports 30/60/90-day supply tags; monthly/weekly/on-demand cycles.
- Internal transit load balancing: prioritize stockout-critical > promo > baseline.

5) Analytics & Store Quality Metrics

- KPIs: Cost-to-Serve, SLA %, Days of Cover, Utilization Index, Waste-Risk, Stockout-Risk, Forecast Accuracy.
- Store Quality Metrics: variance rate, receiving timeliness, allotment adherence.
- Role-based dashboards; anomaly detection alerts; SLA breach routing.

6) Allotment Requests

- Stores can request fewer days than default supply duration (e.g., 60 vs 90).
- Schema: `AllotmentRequest { storeId, productId, requestedDays, reasonCode }`.
- FM approves or rejects.

7) Non-Functional Requirements (NFRs)

- Disaster Recovery: RPO = 15m, RTO = 1h.
- Performance: Catalog search p95 < 350ms; Order APIs p95 < 250ms; dashboards < 1s (cached).
- QA: Unit tests ≥ 80%; integration coverage on orders, approvals, receiving, invoices.

8) Acceptance Tests (Additions)

- AT-13: Mass receive full PO with 1 click.
- AT-14: Case scan applies case pack qty.
- AT-15: Unknown UPC workflow creates alias.
- AT-16: Replenishment selects cheapest SKU mix; enforces sprayer minimum.
- AT-17: Transit load balancing prevents over-capacity.
- AT-18: Restricted product shows badge; requires DM/FM chain.

Source doc: https://docs.google.com/document/d/1XdWve6dr-AWw2rU51LMh6paq6UVF4NBcEcGJe_i7h2A/edit?usp=drivesdk

### 📝 Proposed Amendment v8.2 — Store Navigation & UI Sections

1) Store Directory & Profile

- Store Directory: Searchable, filterable list scoped by role (DM district/FM region).
- Store Profile tabs: Overview, Orders & Allotments, Receiving Variances, Notifications & Alerts, Audit & History, Quality Metrics.

2) Navigation Tree (Role-Aware)

- Dashboard → Pending Approvals, SLA Breaches, Cycle Conflicts.
- Stores → Store Directory → Store Profile (tabs above).
- Approvals → My Approval Queue, Escalations, Override History.
- Reports → SLA Dashboards, Store Quality Metrics.
- Settings → Notification Preferences, Role Info (read-only RBAC).

3) Role-Specific Access

- SM: Only their assigned store profile.
- DM: All stores in their district; manages approvals.
- FM: Stores in their region; manages orders, variances, logistics overrides.
- Admin: Global visibility; config-only controls.

4) Acceptance Tests (Additions)

- AT-19: DM only sees stores within their district.
- AT-20: FM override in Store Profile requires reasonCode; logs to audit.
- AT-21: Store Quality Metrics dashboard updates nightly and is visible to FM/DM.
- AT-22: SM accessing another store’s profile returns 403.

