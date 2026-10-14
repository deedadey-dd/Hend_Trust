export interface RoleDetails {
  key: string;
  label: string;
  shortLabel: string;
  portalTitle: string;
  badgeClass: string;
  isStaff: boolean;
  description: string;
}

export const STAFF_ROLES = [
  'ADMIN',
  'ARBITER',
  'COMPLIANCE_OFFICER',
  'FINANCE_ADMIN',
  'SUPPORT_AGENT',
  'MANAGER',
] as const;

export function isStaffUser(user?: { role?: string; is_staff?: boolean; is_superuser?: boolean } | null): boolean {
  if (!user) return false;
  if (user.is_superuser || user.is_staff) return true;
  const role = (user.role || '').toUpperCase();
  return STAFF_ROLES.includes(role as any);
}

export function getRoleDetails(user?: { role?: string; is_staff?: boolean; is_superuser?: boolean } | null): RoleDetails {
  if (!user) {
    return {
      key: 'GUEST',
      label: 'Guest',
      shortLabel: 'Guest',
      portalTitle: 'HendAxis Trust',
      badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
      isStaff: false,
      description: 'Public visitor',
    };
  }

  const isSuperUser = Boolean(user.is_superuser);
  const rawRole = (user.role || '').toUpperCase();

  if (isSuperUser) {
    return {
      key: 'SUPERUSER',
      label: 'Super Administrator',
      shortLabel: 'Superuser',
      portalTitle: 'Super Admin Operations',
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
      isStaff: true,
      description: 'Root platform superuser with full administrative, system settings and database oversight.',
    };
  }

  switch (rawRole) {
    case 'SUPPORT_AGENT':
      return {
        key: 'SUPPORT_AGENT',
        label: 'Customer Support Agent',
        shortLabel: 'Support Agent',
        portalTitle: 'Customer Support Desk',
        badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
        isStaff: true,
        description: 'Read-only transaction monitoring, buyer & seller inquiries, customer assistance, and ticket routing.',
      };

    case 'ARBITER':
      return {
        key: 'ARBITER',
        label: 'Dispute Arbiter',
        shortLabel: 'Dispute Arbiter',
        portalTitle: 'Dispute Arbitration Hub',
        badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
        isStaff: true,
        description: 'Dispute arbitration, evidence inspection, mediation rulings, refund settlements, and return enforcement.',
      };

    case 'COMPLIANCE_OFFICER':
      return {
        key: 'COMPLIANCE_OFFICER',
        label: 'KYC & Compliance Officer',
        shortLabel: 'Compliance Officer',
        portalTitle: 'KYC & Compliance Desk',
        badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        isStaff: true,
        description: 'Seller Ghana Card / NIA verification reviews, fraud monitoring, store suspensions, and appeal evaluations.',
      };

    case 'FINANCE_ADMIN':
      return {
        key: 'FINANCE_ADMIN',
        label: 'Finance Admin / Accountant',
        shortLabel: 'Finance Admin',
        portalTitle: 'Finance & Treasury Desk',
        badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
        isStaff: true,
        description: 'Escrow ledger accounting, platform revenue audits, bank account reconciliations, and arbiter batch payouts.',
      };

    case 'ADMIN':
    case 'MANAGER':
      return {
        key: 'ADMIN',
        label: 'Admin Manager / HR',
        shortLabel: 'Admin Manager',
        portalTitle: 'Operations & Management',
        badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
        isStaff: true,
        description: 'Full administrative authority: staff roles, platform settings, broadcast campaigns, and high-level platform oversight.',
      };

    case 'BUYER':
      return {
        key: 'BUYER',
        label: 'Buyer',
        shortLabel: 'Buyer',
        portalTitle: 'Buyer Hub',
        badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
        isStaff: false,
        description: 'Standard buyer account.',
      };

    case 'SELLER':
    default:
      if (user.is_staff) {
        return {
          key: 'STAFF',
          label: 'Platform Operations Staff',
          shortLabel: 'Staff',
          portalTitle: 'Platform Operations',
          badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
          isStaff: true,
          description: 'Authorized platform operations staff member.',
        };
      }
      return {
        key: 'SELLER',
        label: 'Verified Merchant',
        shortLabel: 'Merchant',
        portalTitle: 'Merchant Workspace',
        badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
        isStaff: false,
        description: 'Regular marketplace merchant and seller account.',
      };
  }
}
