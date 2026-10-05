import { describe, expect, it } from 'vitest';

import {
  ALL_DEPARTMENT_ROLES,
  DEPARTMENT_KEYS,
  DEPARTMENT_ROLES,
  SYSTEM_ROLES,
  adminSectionAllowed,
  createSectionPermission,
  departmentOfRole,
  isDepartmentRole,
  isStaffRole,
  isSuperAdmin,
  normalizeAdminAccess,
  resolveStaffAdminAccess,
} from './index';

/** Minimal staff-access template (everything off) — easy to assert against. */
const template = normalizeAdminAccess({});

describe('resolveStaffAdminAccess (ADM-1 unified access issuance)', () => {
  it('lets a per-user override win over the role matrix and site template', () => {
    const override = { ...template, payments: createSectionPermission(true, true, true) };
    const role = { ...template, payments: createSectionPermission(true, false, false) };
    const resolved = resolveStaffAdminAccess(override, role, template);
    expect(resolved.payments.manage).toBe(true);
    expect(resolved.payments.edit).toBe(true);
  });

  it('falls back to the custom role matrix when there is no user override', () => {
    const role = { ...template, tickets: createSectionPermission(true, true, true) };
    const resolved = resolveStaffAdminAccess(null, role, template);
    expect(resolved.tickets.edit).toBe(true);
  });

  it('falls back to the site template when neither override nor role matrix exists', () => {
    expect(resolveStaffAdminAccess(null, null, template)).toEqual(template);
  });

  it('normalizes legacy boolean flags inside the role matrix', () => {
    const legacyRole = { users: true };
    const resolved = resolveStaffAdminAccess(null, legacyRole, template);
    expect(resolved.users).toEqual({ view: true, manage: true, edit: true });
  });

  it('ignores non-object overrides and role matrices', () => {
    expect(resolveStaffAdminAccess('garbage', 42, template)).toEqual(template);
  });
});

describe('adminSectionAllowed', () => {
  it('checks the requested level', () => {
    const access = normalizeAdminAccess({ users: { view: true, manage: true, edit: false } });
    expect(adminSectionAllowed(access, 'users', 'view')).toBe(true);
    expect(adminSectionAllowed(access, 'users', 'manage')).toBe(true);
    expect(adminSectionAllowed(access, 'users', 'edit')).toBe(false);
    expect(adminSectionAllowed(access, 'audit')).toBe(false);
  });
});

describe('platform roles', () => {
  it('keeps the canonical system role list', () => {
    expect(SYSTEM_ROLES).toEqual(['LEARNER', 'ADMIN', 'SUPER_ADMIN']);
  });

  it('treats every non-learner role as staff', () => {
    expect(isStaffRole('SUPER_ADMIN')).toBe(true);
    expect(isStaffRole('ADMIN')).toBe(true);
    expect(isStaffRole('CUSTOM_ROLE')).toBe(true);
    expect(isStaffRole('LEARNER')).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
    expect(isStaffRole(null)).toBe(false);
  });

  it('identifies super admins', () => {
    expect(isSuperAdmin('SUPER_ADMIN')).toBe(true);
    expect(isSuperAdmin('ADMIN')).toBe(false);
  });
});

describe('department taxonomy', () => {
  it('covers all six departments with the platform-standard roles', () => {
    expect(DEPARTMENT_KEYS).toEqual([
      'academy',
      'work',
      'material',
      'labs',
      'events',
      'community',
    ]);
    expect(DEPARTMENT_ROLES.academy).toContain('INSTRUCTOR');
    expect(DEPARTMENT_ROLES.work).toContain('EMPLOYER');
    expect(DEPARTMENT_ROLES.material).toContain('CURATOR');
    expect(DEPARTMENT_ROLES.labs).toContain('RESEARCHER');
    expect(DEPARTMENT_ROLES.events).toContain('ORGANIZER');
    expect(DEPARTMENT_ROLES.community).toContain('MODERATOR');
  });

  it('keeps department roles unique across departments', () => {
    expect(new Set(ALL_DEPARTMENT_ROLES).size).toBe(ALL_DEPARTMENT_ROLES.length);
  });

  it('maps roles back to their owning department', () => {
    expect(isDepartmentRole('events', 'JUDGE')).toBe(true);
    expect(isDepartmentRole('events', 'EMPLOYER')).toBe(false);
    expect(departmentOfRole('CURATOR')).toBe('material');
    expect(departmentOfRole('LEARNER')).toBeNull();
  });
});
