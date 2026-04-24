# Phase 9 Strategic Proposal: Unified Admin & Granular RBAC

Consolidate the administrative experience and introduce Multi-Admin support with Role-Based Access Controls (RBAC).

## 1. Objective

Currently, administrative tools are fragmented (`/admin/kyc`, `/admin/audit`) and restricted to a binary admin role. Phase 9 will unify these into a central hub where specific administrators (e.g., KYC Officers, Compliance Managers) have individual accounts with tailored permissions.

## 2. Proposed Features

### Unified Admin Dashboard (`/admin`)

- **Central Hub**: A single landing page with high-level stats (Pending KYCs, Active Consultations, Recent Security Alerts).
- **Global Sidebar**: A consistent navigation system across all admin tools.
- **Admin Layout**: Shared UI components for a professional, high-integrity back-office experience.

### Granular RBAC (Role-Based Access Control)

- **Individual Admin Accounts**: No more shared "admin" credentials. Every administrator has their own account.
- **Permission System**:
  - `kyc_full`: Approve/Reject lawyer certifications.
  - `audit_read`: View system-wide security logs.
  - `payment_release`: Force release of escrow funds in disputes (High-Value Payments).
  - `compliance_admin`: Handle DSR (Data Subject Requests) and Breach incidents.

### High-Value Payment Oversight

- Integration of the newly added Monnify Virtual Accounts into the admin panel for manual verification and reconciliation of transactions ≥ ₦1M.

## 3. Implementation Roadmap

1. **Database Migration**: Add `permissions` (JSON/Text) to the `users` table.
2. **Backend Security**: Update `require_admin` to a more granular `require_permission(p)` dependency.
3. **Frontend Architecture**: Implement a shared `AdminLayout` and the `/admin` root dashboard.
4. **Handoff & Training**: Document the permission sets for the operational team.

## 4. Expected Outcome

A secure, scalable administrative foundation that allows the Nigeria Legal Marketplace team to delegate tasks safely while maintaining a complete audit trail of all actions.
