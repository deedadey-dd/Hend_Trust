import { describe, it, expect } from 'vitest';
import { isStaffUser, getRoleDetails, STAFF_ROLES } from './roleUtils';

describe('roleUtils', () => {
  describe('isStaffUser', () => {
    it('returns false for null or undefined user', () => {
      expect(isStaffUser(null)).toBe(false);
      expect(isStaffUser(undefined)).toBe(false);
    });

    it('returns false for regular BUYER and SELLER', () => {
      expect(isStaffUser({ role: 'BUYER' })).toBe(false);
      expect(isStaffUser({ role: 'SELLER' })).toBe(false);
    });

    it('returns true if is_superuser or is_staff is true', () => {
      expect(isStaffUser({ role: 'BUYER', is_superuser: true })).toBe(true);
      expect(isStaffUser({ role: 'SELLER', is_staff: true })).toBe(true);
    });

    it('returns true for all recognized staff role enums', () => {
      STAFF_ROLES.forEach((role) => {
        expect(isStaffUser({ role })).toBe(true);
        expect(isStaffUser({ role: role.toLowerCase() })).toBe(true);
      });
    });
  });

  describe('getRoleDetails', () => {
    it('returns Guest details for unauthenticated / empty user', () => {
      const details = getRoleDetails(null);
      expect(details.key).toBe('GUEST');
      expect(details.label).toBe('Guest');
      expect(details.isStaff).toBe(false);
    });

    it('prioritizes superuser identity', () => {
      const details = getRoleDetails({ role: 'ARBITER', is_superuser: true });
      expect(details.key).toBe('SUPERUSER');
      expect(details.label).toBe('Super Administrator');
      expect(details.shortLabel).toBe('Superuser');
      expect(details.isStaff).toBe(true);
    });

    it('returns specific labels for Arbiter', () => {
      const details = getRoleDetails({ role: 'ARBITER' });
      expect(details.label).toBe('Dispute Arbiter');
      expect(details.shortLabel).toBe('Dispute Arbiter');
      expect(details.portalTitle).toBe('Dispute Arbitration Hub');
      expect(details.isStaff).toBe(true);
    });

    it('returns specific labels for Customer Support Agent', () => {
      const details = getRoleDetails({ role: 'SUPPORT_AGENT' });
      expect(details.label).toBe('Customer Support Agent');
      expect(details.shortLabel).toBe('Support Agent');
      expect(details.portalTitle).toBe('Customer Support Desk');
      expect(details.isStaff).toBe(true);
    });

    it('returns specific labels for Compliance Officer', () => {
      const details = getRoleDetails({ role: 'COMPLIANCE_OFFICER' });
      expect(details.label).toBe('KYC & Compliance Officer');
      expect(details.shortLabel).toBe('Compliance Officer');
      expect(details.portalTitle).toBe('KYC & Compliance Desk');
      expect(details.isStaff).toBe(true);
    });

    it('returns specific labels for Finance Admin', () => {
      const details = getRoleDetails({ role: 'FINANCE_ADMIN' });
      expect(details.label).toBe('Finance Admin / Accountant');
      expect(details.shortLabel).toBe('Finance Admin');
      expect(details.portalTitle).toBe('Finance & Treasury Desk');
      expect(details.isStaff).toBe(true);
    });

    it('returns specific labels for Admin Manager', () => {
      const adminDetails = getRoleDetails({ role: 'ADMIN' });
      expect(adminDetails.label).toBe('Admin Manager / HR');
      expect(adminDetails.shortLabel).toBe('Admin Manager');
      expect(adminDetails.isStaff).toBe(true);

      const managerDetails = getRoleDetails({ role: 'MANAGER' });
      expect(managerDetails.label).toBe('Admin Manager / HR');
    });

    it('handles regular buyer and seller accounts', () => {
      const buyerDetails = getRoleDetails({ role: 'BUYER' });
      expect(buyerDetails.label).toBe('Buyer');
      expect(buyerDetails.isStaff).toBe(false);

      const sellerDetails = getRoleDetails({ role: 'SELLER' });
      expect(sellerDetails.label).toBe('Verified Merchant');
      expect(sellerDetails.isStaff).toBe(false);
    });
  });
});
