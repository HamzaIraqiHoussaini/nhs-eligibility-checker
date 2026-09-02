import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import type { ChapterFundEntry, ChapterTreasurySummary } from '../../types/nhs';
import { Coins, Trash2, X, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react';

const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027', '2027-2028', '2028-2029'];

export const ChapterTreasuryLedger: React.FC = () => {
  const { isLeadership, isSupervisor } = useAuth();
  const { confirm, alert } = useConfirm();
  const canManage = isLeadership || isSupervisor;

  const [availableYears, setAvailableYears] = useState<string[]>(ACADEMIC_YEARS);
  const [selectedYear, setSelectedYear] = useState('2025-2026');
  const [customStartYear, setCustomStartYear] = useState('');
  const [entries, setEntries] = useState<ChapterFundEntry[]>([]);
  const [yearlySummary, setYearlySummary] = useState<ChapterTreasurySummary>({
    id: '2025-2026',
    total_funds: 23000,
    total_income: 0,
    as_of_date: 'April 28, 2026',
  });
  const [loading, setLoading] = useState(true);

  // Add Entry Modal (Expense or Income)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<'expense' | 'income'>('expense');
  const [transDate, setTransDate] = useState('Apr 2026');
  const [projectName, setProjectName] = useState('');
  const [who, setWho] = useState('');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Edit Baseline Modal
  const [isBaselineOpen, setIsBaselineOpen] = useState(false);
  const [baseTotalFunds, setBaseTotalFunds] = useState('23000');
  const [baseAsOfDate, setBaseAsOfDate] = useState('April 28, 2026');

  const loadTreasuryData = async (year: string) => {
    setLoading(true);
    try {
      // 1. Load Yearly Baseline
      const { data: sumData } = await supabase
        .from('chapter_yearly_treasury')
        .select('*')
        .eq('academic_year', year)
        .maybeSingle();

      if (sumData) {
        setYearlySummary({
          id: sumData.academic_year,
          total_funds: Number(sumData.starting_funds),
          total_income: 0,
          as_of_date: sumData.as_of_date,
        });
        setBaseTotalFunds(String(sumData.starting_funds));
        setBaseAsOfDate(sumData.as_of_date);
      } else {
        // Default rollover baseline
        setYearlySummary({
          id: year,
          total_funds: 21600,
          total_income: 0,
          as_of_date: `Academic Year ${year}`,
        });
        setBaseTotalFunds('21600');
        setBaseAsOfDate(`Academic Year ${year}`);
      }

      // 2. Load Ledger Entries for this Academic Year
      const { data: entData, error } = await supabase
        .from('chapter_funds')
        .select('*')
        .eq('academic_year', year)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setEntries((entData as ChapterFundEntry[]) || []);
    } catch (err) {
      console.error('Failed to load treasury data for year:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const { data } = await supabase.from('semesters').select('academic_year, is_active');
        if (data) {
          const active = data.find((d: any) => d.is_active);
          if (active?.academic_year) {
            setSelectedYear(active.academic_year);
          }
          const list = Array.from(new Set([...ACADEMIC_YEARS, ...data.map((d: any) => d.academic_year).filter(Boolean)]));
          list.sort();
          setAvailableYears(list);
        }
      } catch (e) {
        console.error('Error fetching academic years:', e);
      }
    };
    fetchYears();
  }, []);

  useEffect(() => {
    loadTreasuryData(selectedYear);
  }, [selectedYear]);

  // Compute calculated metrics
  const expenseEntries = entries.filter((e: any) => e.entry_type !== 'income');
  const incomeEntries = entries.filter((e: any) => e.entry_type === 'income');

  const totalExpensesRecorded = expenseEntries.reduce((acc, curr) => acc + Number(curr.amount_taken_out || 0), 0);
  const totalReimbursedCosts = expenseEntries
    .filter((e) => e.reimbursed === 'YES')
    .reduce((acc, curr) => acc + Number(curr.amount_taken_out || 0), 0);

  const totalDynamicIncome = incomeEntries.reduce((acc, curr) => acc + Number(curr.amount_taken_out || 0), 0) + Number(yearlySummary.total_income || 0);

  // Logical continuation: Final Balance = Total Funds - Reimbursed Costs + Total Income
  const finalBalance = Number(yearlySummary.total_funds) - totalReimbursedCosts + totalDynamicIncome;

  // Toggle Reimbursed Status In-Table
  const handleToggleReimbursed = async (entry: ChapterFundEntry) => {
    if (!canManage) return;
    const newStatus = entry.reimbursed === 'YES' ? 'NO' : 'YES';

    // Optimistic update
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, reimbursed: newStatus } : e))
    );

    try {
      const { error } = await supabase
        .from('chapter_funds')
        .update({ reimbursed: newStatus })
        .eq('id', entry.id);
      if (error) throw error;
    } catch (err) {
      console.error('Failed toggling reimbursed status:', err);
      // Revert on error
      loadTreasuryData(selectedYear);
    }
  };

  const handleOpenAddModal = (type: 'expense' | 'income') => {
    setEntryType(type);
    setTransDate('Apr 2026');
    setProjectName('');
    setWho('');
    setReason('');
    setAmount('');
    setIsModalOpen(true);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      await alert({
        title: 'Invalid Amount',
        message: 'Please enter a valid positive numeric amount.',
        variant: 'warning',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('chapter_funds').insert({
        academic_year: selectedYear,
        entry_type: entryType,
        transaction_date: transDate.trim(),
        project_name: projectName.trim(),
        who: who.trim(),
        reimbursed: 'NO', // Default to NO, toggled in table
        reason: reason.trim(),
        amount_taken_out: numAmount,
      });

      if (error) throw error;

      setIsModalOpen(false);
      await loadTreasuryData(selectedYear);
    } catch (err: any) {
      console.error('Failed saving entry:', err);
      await alert({
        title: 'Save Failed',
        message: err.message || 'Failed to save record.',
        variant: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: 'Delete Funding Line',
      message: `Are you sure you want to delete the financial line for "${name}"?`,
      confirmText: 'Delete Line',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('chapter_funds').delete().eq('id', id);
      if (error) throw error;
      await loadTreasuryData(selectedYear);
    } catch (err: any) {
      await alert({
        title: 'Delete Failed',
        message: err.message || 'Failed to delete record.',
        variant: 'danger',
      });
    }
  };

  const handleSaveBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('chapter_yearly_treasury').upsert({
        academic_year: selectedYear,
        starting_funds: parseFloat(baseTotalFunds) || 0,
        as_of_date: baseAsOfDate.trim(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setIsBaselineOpen(false);
      await loadTreasuryData(selectedYear);
    } catch (err: any) {
      await alert({
        title: 'Baseline Update Failed',
        message: err.message || 'Failed to update treasury baseline.',
        variant: 'danger',
      });
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
            Accounting ledger with academic year timelines, revenue tracking, and in-table reimbursement toggles.
          </p>
        </div>

        {canManage && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
              className="btn-secondary"
              style={{ fontSize: '0.82rem', color: 'var(--color-sage-text)' }}
              onClick={() => handleOpenAddModal('income')}
            >
              <TrendingUp size={14} /> + Record Income
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: '0.82rem' }}
              onClick={() => handleOpenAddModal('expense')}
            >
              <TrendingDown size={14} /> + Record Expense
            </button>
          </div>
        )}
      </div>

      {/* Academic Year Timeline Selector & Balance Bar */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderLeft: '4px solid var(--color-navy)',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.25rem',
      }}>
        {/* Timeline Dropdown & Year Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Academic Year:
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                padding: '0.45rem 0.85rem',
                fontWeight: 700,
                fontSize: '0.92rem',
                color: 'var(--color-navy)',
                border: '2px solid var(--color-oxford)',
                backgroundColor: 'var(--color-canvas)',
                cursor: 'pointer',
              }}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  Academic Year {yr}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>or type start year:</span>
            <input
              type="number"
              placeholder="e.g. 2026"
              value={customStartYear}
              onChange={(e) => {
                const val = e.target.value;
                setCustomStartYear(val);
                const yr = parseInt(val, 10);
                if (!isNaN(yr) && yr >= 2000 && yr <= 2099) {
                  const targetYear = `${yr}-${yr + 1}`;
                  if (!availableYears.includes(targetYear)) {
                    setAvailableYears((prev) => Array.from(new Set([...prev, targetYear])).sort());
                  }
                  setSelectedYear(targetYear);
                }
              }}
              style={{
                width: '105px',
                padding: '0.42rem 0.6rem',
                border: '1px solid var(--color-border)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--color-navy)',
              }}
            />
          </div>
        </div>

        {/* Dynamic Balance Headline */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--color-navy)', fontWeight: 700 }}>
            Balance as of {yearlySummary.as_of_date} ({finalBalance.toLocaleString()} DHS)
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            Sequential fund continuation for {selectedYear}
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="sharp-card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <div className="roster-table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="roster-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#FCE7F3', borderBottom: '2px solid #F472B6' }}>
                <th style={{ color: '#831843', fontWeight: 700, padding: '0.75rem 1rem' }}>Date</th>
                <th style={{ color: '#831843', fontWeight: 700, padding: '0.75rem 1rem' }}>Project / Source</th>
                <th style={{ color: '#831843', fontWeight: 700, padding: '0.75rem 1rem' }}>Who?</th>
                <th style={{ color: '#831843', fontWeight: 700, padding: '0.75rem 1rem', textAlign: 'center' }}>
                  Reimbursed? (Toggle)
                </th>
                <th style={{ color: '#831843', fontWeight: 700, padding: '0.75rem 1rem' }}>Reason / Details</th>
                <th style={{ color: '#831843', fontWeight: 700, padding: '0.75rem 1rem', textAlign: 'right' }}>
                  Amount (DHS)
                </th>
                {canManage && <th style={{ color: '#831843', fontWeight: 700, padding: '0.75rem 1rem', textAlign: 'center' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    Loading financial ledger for {selectedYear}...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                    No expenses or income entries recorded for Academic Year {selectedYear}.
                  </td>
                </tr>
              ) : (
                entries.map((entry: any) => {
                  const isIncome = entry.entry_type === 'income';
                  return (
                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: isIncome ? '#F0FDF4' : undefined }}>
                      <td style={{ fontWeight: 600, color: 'var(--color-navy)', whiteSpace: 'nowrap' }}>
                        {entry.transaction_date}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {entry.project_name}
                        {isIncome && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.15rem 0.4rem', backgroundColor: '#DCFCE7', color: '#166534', fontWeight: 700 }}>
                            INCOME
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{entry.who}</td>
                      
                      {/* IN-TABLE INTERACTIVE TOGGLE */}
                      <td style={{ textAlign: 'center' }}>
                        {isIncome ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>—</span>
                        ) : canManage ? (
                          <button
                            type="button"
                            onClick={() => handleToggleReimbursed(entry)}
                            title="Click to toggle reimbursement status"
                            style={{
                              padding: '0.25rem 0.65rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              borderRadius: '2px',
                              border: entry.reimbursed === 'YES' ? '1px solid #A7F3D0' : '1px solid var(--color-border)',
                              backgroundColor: entry.reimbursed === 'YES' ? 'var(--color-sage-bg)' : '#F1F5F9',
                              color: entry.reimbursed === 'YES' ? 'var(--color-sage-text)' : 'var(--color-text-muted)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {entry.reimbursed} <ArrowRightLeft size={10} style={{ display: 'inline', marginLeft: '3px' }} />
                          </button>
                        ) : (
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
                        )}
                      </td>

                      <td style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{entry.reason}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.92rem', color: isIncome ? '#166534' : 'inherit' }}>
                        {isIncome ? `+${Number(entry.amount_taken_out).toLocaleString()}` : Number(entry.amount_taken_out).toLocaleString()}
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
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#F8FAFC', borderTop: '2px solid var(--color-border)', fontWeight: 700 }}>
                <td colSpan={5} style={{ textAlign: 'right', padding: '0.85rem 1rem', textTransform: 'uppercase', fontSize: '0.82rem', letterSpacing: '0.04em' }}>
                  Total Expenses Recorded ({selectedYear})
                </td>
                <td style={{ textAlign: 'right', padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '1rem', color: 'var(--color-navy)' }}>
                  {totalExpensesRecorded.toLocaleString()} DHS
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
                  Summary ({selectedYear})
                </th>
                <th style={{ textAlign: 'right', padding: '0.75rem 1.25rem', color: '#831843', fontWeight: 700 }}>
                  Amount (DHS)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '0.65rem 1.25rem', color: 'var(--color-navy)', fontWeight: 600 }}>Total Funds (Baseline)</td>
                <td style={{ padding: '0.65rem 1.25rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                  {Number(yearlySummary.total_funds).toLocaleString()}
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
                <td style={{ padding: '0.65rem 1.25rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#166534' }}>
                  +{totalDynamicIncome.toLocaleString()}
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

        {/* Informational Guidance Box & Pending Reimbursements Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', padding: '1.5rem', lineHeight: '1.6' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--color-navy)', margin: '0 0 0.5rem' }}>
              Academic Year Continuation Guidelines
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: '0 0 0.75rem' }}>
              The <strong>Final Balance</strong> of each academic year seamlessly rolls into the starting baseline of the subsequent year.
            </p>
            <ul style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', paddingLeft: '1.25rem', margin: 0 }}>
              <li>Clicking <strong>NO / YES</strong> in the table toggles whether the expenditure has been officially reimbursed.</li>
              <li>Only expenses with <strong>YES</strong> are subtracted from the chapter's master funds.</li>
              <li>Revenues recorded as <strong>Income</strong> augment chapter funds directly.</li>
            </ul>
          </div>

          {/* Stitch Feature: Pending Reimbursements Queue */}
          {expenseEntries.filter((e) => e.reimbursed === 'NO').length > 0 && (
            <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderLeft: '4px solid var(--color-gold)', padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-navy)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Pending Reimbursement Queue ({expenseEntries.filter((e) => e.reimbursed === 'NO').length})
                </div>
                <span style={{ fontSize: '0.76rem', color: '#92400E', fontWeight: 600 }}>
                  Total Awaiting Payout: {expenseEntries.filter((e) => e.reimbursed === 'NO').reduce((a, c) => a + Number(c.amount_taken_out || 0), 0).toLocaleString()} DHS
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {expenseEntries.filter((e) => e.reimbursed === 'NO').map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--color-navy)' }}>{item.project_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Payee: {item.who} • {item.transaction_date}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.88rem', color: 'var(--color-terracotta)' }}>
                        {Number(item.amount_taken_out).toLocaleString()} DHS
                      </span>
                      {canManage && (
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                          onClick={() => handleToggleReimbursed(item)}
                        >
                          Mark Reimbursed
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RECORD ENTRY MODAL (EXPENSE OR INCOME) */}
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
              Record {entryType === 'income' ? 'Chapter Income' : 'Project Expense'} ({selectedYear})
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: '0 0 1.25rem' }}>
              {entryType === 'income'
                ? 'Record funds generated from bake sales, member dues, or CAS institutional grants.'
                : 'Log an expenditure. Reimbursement status (YES/NO) can be toggled directly in the table.'}
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
                    {entryType === 'income' ? 'Income Source / Project *' : 'Project Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={entryType === 'income' ? 'e.g. Bake Sale Proceeds' : 'e.g. CPR Training'}
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  {entryType === 'income' ? 'Organizer / Donor *' : 'Who? (Recipient / Organizer) *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={entryType === 'income' ? 'e.g. NHS Officers, Sponsor' : 'e.g. CAS Nurse, Student Names'}
                  value={who}
                  onChange={(e) => setWho(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    Reason / Details *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={entryType === 'income' ? 'e.g. Spring Bake Sale revenue' : 'e.g. Pizza, Case Packets, Costs Covered'}
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
                    min="1"
                    step="any"
                    placeholder="1000"
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
                  {saving ? 'Saving...' : entryType === 'income' ? 'Record Income' : 'Record Expense'}
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
              Edit Baseline ({selectedYear})
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', margin: '0 0 1.25rem' }}>
              Configure base chapter funding allocation and reporting date for this academic year.
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
