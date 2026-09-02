import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { ChapterFundEntry, ChapterTreasurySummary } from '../../types/nhs';
import { Coins, Plus, Trash2, X } from 'lucide-react';

export const ChapterTreasuryLedger: React.FC = () => {
  const { isLeadership, isSupervisor } = useAuth();
  const canManage = isLeadership || isSupervisor;

  const [entries, setEntries] = useState<ChapterFundEntry[]>([]);
  const [summary, setSummary] = useState<ChapterTreasurySummary>({
    id: 'main',
    total_funds: 23000,
    total_income: 0,
    as_of_date: 'April 28, 2026',
  });
  const [loading, setLoading] = useState(true);

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [transDate, setTransDate] = useState('Apr 2026');
  const [projectName, setProjectName] = useState('');
  const [who, setWho] = useState('');
  const [reimbursed, setReimbursed] = useState<'YES' | 'NO'>('NO');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Edit Baseline Modal
  const [isBaselineOpen, setIsBaselineOpen] = useState(false);
  const [baseTotalFunds, setBaseTotalFunds] = useState('23000');
  const [baseTotalIncome, setBaseTotalIncome] = useState('0');
  const [baseAsOfDate, setBaseAsOfDate] = useState('April 28, 2026');

  const loadTreasuryData = async () => {
    setLoading(true);
    try {
      // 1. Load Summary
      const { data: sumData } = await supabase
        .from('chapter_treasury_summary')
        .select('*')
        .eq('id', 'main')
        .single();
      if (sumData) {
        setSummary(sumData as ChapterTreasurySummary);
        setBaseTotalFunds(String(sumData.total_funds));
        setBaseTotalIncome(String(sumData.total_income));
        setBaseAsOfDate(sumData.as_of_date);
      }

      // 2. Load Ledger Entries
      const { data: entData, error } = await supabase
        .from('chapter_funds')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setEntries((entData as ChapterFundEntry[]) || []);
    } catch (err) {
      console.error('Failed to load treasury data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTreasuryData();
  }, []);

  // Compute calculated metrics
  const totalAmountTakenOut = entries.reduce((acc, curr) => acc + Number(curr.amount_taken_out || 0), 0);
  const totalReimbursedCosts = entries
    .filter((e) => e.reimbursed === 'YES')
    .reduce((acc, curr) => acc + Number(curr.amount_taken_out || 0), 0);

  // Final Balance = Total Funds - Reimbursed Costs + Total Income
  const finalBalance = Number(summary.total_funds) - totalReimbursedCosts + Number(summary.total_income);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setTransDate('Apr 2026');
    setProjectName('');
    setWho('');
    setReimbursed('NO');
    setReason('');
    setAmount('');
    setIsModalOpen(true);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      alert('Please enter a valid numeric amount.');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('chapter_funds')
          .update({
            transaction_date: transDate.trim(),
            project_name: projectName.trim(),
            who: who.trim(),
            reimbursed,
            reason: reason.trim(),
            amount_taken_out: numAmount,
          })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('chapter_funds').insert({
          transaction_date: transDate.trim(),
          project_name: projectName.trim(),
          who: who.trim(),
          reimbursed,
          reason: reason.trim(),
          amount_taken_out: numAmount,
        });
        if (error) throw error;
      }

      setIsModalOpen(false);
      await loadTreasuryData();
    } catch (err: any) {
      console.error('Failed saving funding entry:', err);
      alert(err.message || 'Failed to save funding record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string, name: string) => {
    if (!confirm(`Delete funding line for ${name}?`)) return;
    try {
      const { error } = await supabase.from('chapter_funds').delete().eq('id', id);
      if (error) throw error;
      await loadTreasuryData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete record.');
    }
  };

  const handleSaveBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('chapter_treasury_summary').upsert({
        id: 'main',
        total_funds: parseFloat(baseTotalFunds) || 0,
        total_income: parseFloat(baseTotalIncome) || 0,
        as_of_date: baseAsOfDate.trim(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setIsBaselineOpen(false);
      await loadTreasuryData();
    } catch (err: any) {
      alert(err.message || 'Failed to update treasury baseline.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '1.5rem 0 3.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-oxford)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
            <Coins size={16} /> Chapter Treasury & Financial Ledger
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: 'var(--color-navy)', margin: 0 }}>
            Project Funding & Reimbursements
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem' }}>
            Official accounting ledger for Casablanca American School National Honor Society chapter funds.
          </p>
        </div>

        {canManage && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.82rem' }}
              onClick={() => setIsBaselineOpen(true)}
            >
              Edit Baseline Funds
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: '0.82rem' }}
              onClick={handleOpenAddModal}
            >
              <Plus size={14} /> Record Project Expense
            </button>
          </div>
        )}
      </div>

      {/* Official Balance Title Banner */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderLeft: '4px solid var(--color-navy)',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-navy)', fontWeight: 700 }}>
          Balance as of {summary.as_of_date} ({finalBalance.toLocaleString()} DHS)
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          Audited under CAS NHS Financial Regulations
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="sharp-card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <div className="roster-table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="roster-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#FCE7F3', borderBottom: '2px solid #F472B6' }}>
                <th style={{ color: '#831843', fontWeight: 700, padding: '0.75rem 1rem' }}>Date</th>
                <th style={{ color: '#831843', fontWeight: 700, padding: '0.75rem 1rem' }}>Project</th>
                <th style={{ color: '#831843', fontWeight: 700, padding: '0.75rem 1rem' }}>Who?</th>
                <th style={{ color: '#831843', fontWeight: 700, padding: '0.75rem 1rem', textAlign: 'center' }}>Reimbursed?</th>
                <th style={{ color: '#831843', fontWeight: 700, padding: '0.75rem 1rem' }}>Reason</th>
                <th style={{ color: '#831843', fontWeight: 700, padding: '0.75rem 1rem', textAlign: 'right' }}>Amount Taken Out (DHS)</th>
                {canManage && <th style={{ color: '#831843', fontWeight: 700, padding: '0.75rem 1rem', textAlign: 'center' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    Loading financial ledger...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    No expenses recorded in chapter treasury.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ fontWeight: 600, color: 'var(--color-navy)', whiteSpace: 'nowrap' }}>
                      {entry.transaction_date}
                    </td>
                    <td style={{ fontWeight: 600 }}>{entry.project_name}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{entry.who}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          borderRadius: '2px',
                          backgroundColor: entry.reimbursed === 'YES' ? 'var(--color-sage-bg)' : '#F1F5F9',
                          color: entry.reimbursed === 'YES' ? 'var(--color-sage-text)' : 'var(--color-text-muted)',
                          border: entry.reimbursed === 'YES' ? '1px solid #A7F3D0' : '1px solid var(--color-border)',
                        }}
                      >
                        {entry.reimbursed}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{entry.reason}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.92rem' }}>
                      {Number(entry.amount_taken_out).toLocaleString()}
                    </td>
                    {canManage && (
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn-inspect"
                          style={{ color: 'var(--color-terracotta)', padding: '0.25rem 0.5rem' }}
                          title="Delete line"
                          onClick={() => handleDeleteEntry(entry.id, entry.project_name)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#F8FAFC', borderTop: '2px solid var(--color-border)', fontWeight: 700 }}>
                <td colSpan={5} style={{ textAlign: 'right', padding: '0.85rem 1rem', textTransform: 'uppercase', fontSize: '0.82rem', letterSpacing: '0.04em' }}>
                  Total Expenses Recorded
                </td>
                <td style={{ textAlign: 'right', padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '1rem', color: 'var(--color-navy)' }}>
                  {totalAmountTakenOut.toLocaleString()} DHS
                </td>
                {canManage && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Required policy statement */}
        <div style={{ marginTop: '1rem', fontSize: '0.76rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          *Permission granted from all leadership members and supervisors
        </div>
      </div>

      {/* Summary Box (matching Excel layout) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '2rem', alignItems: 'start' }}>
        <div className="sharp-card" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#FCE7F3', borderBottom: '2px solid #F472B6' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem 1.25rem', color: '#831843', fontWeight: 700 }}>
                  Summary
                </th>
                <th style={{ textAlign: 'right', padding: '0.75rem 1.25rem', color: '#831843', fontWeight: 700 }}>
                  Amount (DHS)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '0.65rem 1.25rem', color: 'var(--color-navy)', fontWeight: 600 }}>Total Funds</td>
                <td style={{ padding: '0.65rem 1.25rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                  {Number(summary.total_funds).toLocaleString()}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '0.65rem 1.25rem', color: 'var(--color-navy)', fontWeight: 600 }}>
                  Costs (Reimbursed)
                </td>
                <td style={{ padding: '0.65rem 1.25rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-terracotta)' }}>
                  {totalReimbursedCosts > 0 ? `-${totalReimbursedCosts.toLocaleString()}` : '0'}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '0.65rem 1.25rem', color: 'var(--color-navy)', fontWeight: 600 }}>Total Income</td>
                <td style={{ padding: '0.65rem 1.25rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                  {Number(summary.total_income).toLocaleString()}
                </td>
              </tr>
              {/* Highlighted Yellow Final Balance Row */}
              <tr style={{ backgroundColor: '#FEF08A', borderTop: '2px solid #FACC15' }}>
                <td style={{ padding: '0.85rem 1.25rem', fontWeight: 800, color: '#000', fontSize: '1rem' }}>
                  Final Balance
                </td>
                <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#000', fontSize: '1.15rem' }}>
                  {finalBalance.toLocaleString()} DHS
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Informational Guidance Box */}
        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', padding: '1.5rem', lineHeight: '1.6' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
            CAS Chapter Reimbursement Guidelines
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: '0 0 0.75rem' }}>
            All expenditures must be pre-approved during the 2-stage project proposal process (Leadership Review followed by Chapter Supervisor approval).
          </p>
          <ul style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', paddingLeft: '1.25rem', margin: 0 }}>
            <li>Original receipts and itemized proof of purchase must be filed with the CAS Nurse or Faculty Sponsor.</li>
            <li>Reimbursements marked <strong>YES</strong> are immediately deducted against the chapter's master fund.</li>
            <li>All withdrawals require consensus from both Chapter Leadership and Chapter Supervisors.</li>
          </ul>
        </div>
      </div>

      {/* RECORD EXPENSE MODAL */}
      {isModalOpen && (
        <div className="drawer-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="sharp-card"
            style={{
              width: '100%',
              maxWidth: '520px',
              margin: 'auto',
              backgroundColor: 'var(--color-surface)',
              padding: '2rem',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--color-navy)', margin: '0 0 0.25rem' }}>
              Record Project Expense
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: '0 0 1.25rem' }}>
              Add an itemized expenditure to the official CAS NHS ledger.
            </p>

            <form onSubmit={handleSaveEntry} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Date *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Apr 2026"
                    value={transDate}
                    onChange={(e) => setTransDate(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CPR Training, Spelling Bee"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Who? (Recipient / Organizer) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CAS Nurse, Student Names"
                    value={who}
                    onChange={(e) => setWho(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Reimbursed? *
                  </label>
                  <select
                    value={reimbursed}
                    onChange={(e) => setReimbursed(e.target.value as 'YES' | 'NO')}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                  >
                    <option value="NO">NO (Pending / Non-reimbursed)</option>
                    <option value="YES">YES (Deducted from Funds)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Reason *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pizza, Case Packets, Costs Covered"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Amount (DHS) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    placeholder="1400"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Add to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BASELINE MODAL */}
      {isBaselineOpen && (
        <div className="drawer-backdrop" onClick={() => setIsBaselineOpen(false)}>
          <div
            className="sharp-card"
            style={{
              width: '100%',
              maxWidth: '460px',
              margin: 'auto',
              backgroundColor: 'var(--color-surface)',
              padding: '2rem',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsBaselineOpen(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--color-navy)', margin: '0 0 0.25rem' }}>
              Edit Treasury Baseline
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: '0 0 1.25rem' }}>
              Configure base chapter funding allocation and reporting date.
            </p>

            <form onSubmit={handleSaveBaseline} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Total Allocated Funds (DHS) *
                </label>
                <input
                  type="number"
                  required
                  value={baseTotalFunds}
                  onChange={(e) => setBaseTotalFunds(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Total Income / Sponsorships (DHS) *
                </label>
                <input
                  type="number"
                  required
                  value={baseTotalIncome}
                  onChange={(e) => setBaseTotalIncome(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Balance As Of (Header Text) *
                </label>
                <input
                  type="text"
                  required
                  value={baseAsOfDate}
                  onChange={(e) => setBaseAsOfDate(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsBaselineOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Updating...' : 'Save Baseline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
