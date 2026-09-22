import React, { useState } from 'react';
import {
  Users,
  Shield,
  UserPlus,
  Search,
  CheckCircle2,
  X,
  RefreshCw,
  Edit2,
  Mail,
  Phone,
} from 'lucide-react';
import {
  useAdminStaffQuery,
  useUpdateStaffRoleMutation,
  useCreateStaffMemberMutation,
  type StaffMember,
} from '../hooks/api/useAdminPortal';
import { useEscapeKey } from '../utils/useEscapeKey';

const ROLE_DEFINITIONS: Record<string, { label: string; badgeColor: string; description: string }> = {
  ADMIN: {
    label: 'Admin Manager / HR',
    badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
    description: 'Full administrative authority: staff roles, platform settings, broadcast campaigns, and high-level platform oversight.',
  },
  ARBITER: {
    label: 'Dispute Arbiter',
    badgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    description: 'Dispute arbitration, evidence inspection, mediation rulings, refund settlements, and return enforcement.',
  },
  COMPLIANCE_OFFICER: {
    label: 'KYC & Compliance Officer',
    badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    description: 'Seller Ghana Card / NIA verification reviews, fraud monitoring, store suspensions, and appeal evaluations.',
  },
  FINANCE_ADMIN: {
    label: 'Finance Admin / Accountant',
    badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    description: 'Escrow ledger accounting, platform revenue audits, bank account reconciliations, and arbiter batch payouts.',
  },
  SUPPORT_AGENT: {
    label: 'Customer Support Agent',
    badgeColor: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
    description: 'Read-only transaction monitoring, buyer & seller intelligence inspection, customer assistance, and ticket routing.',
  },
  SELLER: {
    label: 'Seller',
    badgeColor: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
    description: 'Regular marketplace seller account.',
  },
  BUYER: {
    label: 'Buyer',
    badgeColor: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30',
    description: 'Standard buyer account.',
  },
};

export const AdminStaffManagement: React.FC = () => {
  const { data: staffList, isLoading, refetch } = useAdminStaffQuery();
  const updateRoleMutation = useUpdateStaffRoleMutation();
  const createStaffMutation = useCreateStaffMemberMutation();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modals state
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [isStaffToggle, setIsStaffToggle] = useState(true);
  const [editSuccessMsg, setEditSuccessMsg] = useState('');
  const [editErrorMsg, setEditErrorMsg] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('ARBITER');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [addSuccessMsg, setAddSuccessMsg] = useState('');
  const [addErrorMsg, setAddErrorMsg] = useState('');

  useEscapeKey(() => setIsAddModalOpen(false), isAddModalOpen);
  useEscapeKey(() => {
    setEditingStaff(null);
    setEditSuccessMsg('');
    setEditErrorMsg('');
  }, Boolean(editingStaff));

  const filteredStaff = (staffList || []).filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      s.username.toLowerCase().includes(q) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.phone_number && s.phone_number.includes(q)) ||
      (s.first_name && s.first_name.toLowerCase().includes(q)) ||
      (s.last_name && s.last_name.toLowerCase().includes(q));

    const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;
    return matchesQuery && matchesRole;
  });

  const handleOpenEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setSelectedRole(staff.role);
    setIsStaffToggle(staff.is_staff);
    setEditSuccessMsg('');
    setEditErrorMsg('');
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setEditSuccessMsg('');
    setEditErrorMsg('');

    try {
      await updateRoleMutation.mutateAsync({
        userId: editingStaff.id,
        role: selectedRole,
        is_staff: isStaffToggle,
      });
      setEditSuccessMsg(`Successfully updated role for @${editingStaff.username} to ${selectedRole}.`);
      setTimeout(() => {
        setEditingStaff(null);
        setEditSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      setEditErrorMsg(err.response?.data?.detail || 'Failed to update staff role.');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSuccessMsg('');
    setAddErrorMsg('');

    if (!newPhone.trim() || !newEmail.trim()) {
      setAddErrorMsg('Email and phone number are required.');
      return;
    }

    try {
      const res = await createStaffMutation.mutateAsync({
        email: newEmail.trim(),
        phone_number: newPhone.trim(),
        role: newRole,
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
      });
      setAddSuccessMsg(res.message || 'Staff member created/promoted successfully!');
      setTimeout(() => {
        setIsAddModalOpen(false);
        setNewEmail('');
        setNewPhone('');
        setNewFirstName('');
        setNewLastName('');
        setNewRole('ARBITER');
        setAddSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      setAddErrorMsg(err.response?.data?.detail || 'Failed to create staff member.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Access Control & Permissions
            </span>
            <span className="text-slate-500 text-xs font-mono">RBAC Engine v2.0</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            Staff & Administrative Role Management
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Assign granular administrative roles to platform team members. Access to dispute rulings, compliance reviews, and finance operations is strictly enforced.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-300 dark:border-slate-700 transition cursor-pointer"
            title="Refresh staff list"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-purple-500' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-purple-500/20 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add / Promote Staff</span>
          </button>
        </div>
      </div>

      {/* Role Matrix Reference Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {(['ADMIN', 'ARBITER', 'COMPLIANCE_OFFICER', 'FINANCE_ADMIN', 'SUPPORT_AGENT'] as const).map((rKey) => {
          const rDef = ROLE_DEFINITIONS[rKey];
          const count = (staffList || []).filter((s) => s.role === rKey).length;
          return (
            <div
              key={rKey}
              onClick={() => setRoleFilter(roleFilter === rKey ? 'ALL' : rKey)}
              className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                roleFilter === rKey
                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 shadow-md ring-1 ring-purple-500'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${rDef.badgeColor}`}>
                    {rKey}
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-500">{count} Active</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">{rDef.label}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{rDef.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Staff Table & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, username, email, phone..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="ALL">All Roles ({staffList?.length || 0})</option>
              <option value="ADMIN">ADMIN ({staffList?.filter((s) => s.role === 'ADMIN').length || 0})</option>
              <option value="ARBITER">ARBITER ({staffList?.filter((s) => s.role === 'ARBITER').length || 0})</option>
              <option value="COMPLIANCE_OFFICER">COMPLIANCE ({staffList?.filter((s) => s.role === 'COMPLIANCE_OFFICER').length || 0})</option>
              <option value="FINANCE_ADMIN">FINANCE ({staffList?.filter((s) => s.role === 'FINANCE_ADMIN').length || 0})</option>
              <option value="SUPPORT_AGENT">SUPPORT ({staffList?.filter((s) => s.role === 'SUPPORT_AGENT').length || 0})</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Current Role</th>
                <th className="py-3 px-4">Status & Permissions</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-500" />
                    Loading staff directory...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Users className="h-8 w-8 text-slate-400 mx-auto mb-2 opacity-50" />
                    No staff members match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const rDef = ROLE_DEFINITIONS[staff.role] || {
                    label: staff.role,
                    badgeColor: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
                    description: '',
                  };
                  const fullName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim();

                  return (
                    <tr key={staff.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-bold text-purple-600 dark:text-purple-400 uppercase text-xs">
                            {staff.username.slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block text-xs">
                              @{staff.username}
                            </span>
                            {fullName && <span className="text-[11px] text-slate-500 block">{fullName}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 space-y-0.5 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span>{staff.email || 'No email'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{staff.phone_number || 'No phone'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border ${rDef.badgeColor}`}>
                          <Shield className="h-3 w-3" />
                          {rDef.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {staff.is_superuser && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              ★ Superuser
                            </span>
                          )}
                          {staff.is_staff ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              ✓ Staff Active
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              Inactive Staff
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {staff.date_joined ? new Date(staff.date_joined).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(staff)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-600 hover:text-white text-slate-700 dark:text-slate-300 font-bold transition text-xs border border-slate-300 dark:border-slate-700 cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Change Role</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: EDIT STAFF ROLE ─────────────────────────────────────────── */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Update Staff Role & Authority
                </h3>
                <p className="text-xs text-slate-500">
                  User: <strong className="text-purple-600 dark:text-purple-400">@{editingStaff.username}</strong>
                </p>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                  Select Administrative Role
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {(['ADMIN', 'ARBITER', 'COMPLIANCE_OFFICER', 'FINANCE_ADMIN', 'SUPPORT_AGENT', 'SELLER', 'BUYER'] as const).map(
                    (roleKey) => {
                      const rDef = ROLE_DEFINITIONS[roleKey];
                      const isSelected = selectedRole === roleKey;
                      return (
                        <div
                          key={roleKey}
                          onClick={() => setSelectedRole(roleKey)}
                          className={`p-3 rounded-xl border cursor-pointer transition flex items-start justify-between gap-3 ${
                            isSelected
                              ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 ring-1 ring-purple-500'
                              : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{rDef.label}</span>
                            <p className="text-[11px] text-slate-500 mt-0.5">{rDef.description}</p>
                          </div>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />}
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isStaffToggle}
                    onChange={(e) => setIsStaffToggle(e.target.checked)}
                    className="h-4 w-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  />
                  <span className="font-bold text-slate-700 dark:text-slate-300">Grant Staff Dashboard Access (is_staff = True)</span>
                </label>
              </div>

              {editSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold">
                  {editSuccessMsg}
                </div>
              )}
              {editErrorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-xl font-bold">
                  {editErrorMsg}
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateRoleMutation.isPending}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition shadow-lg shadow-purple-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {updateRoleMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                  Save Role Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ADD / PROMOTE STAFF ─────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Add or Promote Staff Member
                </h3>
                <p className="text-xs text-slate-500">
                  If the phone/email exists, their role will be updated. Otherwise, a new staff user is created.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">First Name</label>
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="e.g. Kwame"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="e.g. Mensah"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="staff@trust.hendaxis.com"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Ghana Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="024XXXXXXX"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Assigned Administrative Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="ARBITER">⚖️ Dispute Arbiter (ARBITER)</option>
                  <option value="COMPLIANCE_OFFICER">🛡️ KYC & Compliance Officer (COMPLIANCE_OFFICER)</option>
                  <option value="FINANCE_ADMIN">💰 Finance Admin / Accountant (FINANCE_ADMIN)</option>
                  <option value="SUPPORT_AGENT">🎧 Customer Support Agent (SUPPORT_AGENT)</option>
                  <option value="ADMIN">👑 Admin Manager / HR (ADMIN)</option>
                </select>
              </div>

              {addSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold">
                  {addSuccessMsg}
                </div>
              )}
              {addErrorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-xl font-bold">
                  {addErrorMsg}
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createStaffMutation.isPending}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition shadow-lg shadow-purple-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {createStaffMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Confirm Staff Promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
