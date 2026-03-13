import React, { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { clsx } from 'clsx';
import confetti from 'canvas-confetti';
import { format } from 'date-fns';
import { colord } from 'colord';
import { nanoid } from 'nanoid';
import slugify from 'slugify';
import pluralize from 'pluralize';
import prettyBytes from 'pretty-bytes';
import prettyMs from 'pretty-ms';

// ============================================================================
// 10-Import Stress Test — External Package Resolution
// Tests: lucide-react, clsx, canvas-confetti, date-fns, colord,
//        nanoid, slugify, pluralize, pretty-bytes, pretty-ms
// ============================================================================

function ImportTestCard({ name, testFn, children }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runTest = () => {
    try {
      const val = testFn();
      setResult(val);
      setError(null);
    } catch (e) {
      setError(e.message);
      setResult(null);
    }
  };

  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '0.75rem',
      backgroundColor: error ? '#fef2f2' : result !== null ? '#f0fdf4' : '#ffffff',
      transition: 'background-color 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>{name}</strong>
        <button
          onClick={runTest}
          style={{
            padding: '0.25rem 0.75rem',
            fontSize: '0.75rem',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#f8fafc',
            cursor: 'pointer',
          }}
        >
          Test
        </button>
      </div>
      {children}
      {result !== null && (
        <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#dcfce7', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
          <Check size={14} style={{ display: 'inline', verticalAlign: 'middle', color: '#16a34a' }} /> {String(result)}
        </div>
      )}
      {error && (
        <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#fee2e2', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace', color: '#dc2626' }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default function TenImportStressTest() {
  const [allResults, setAllResults] = useState([]);

  const runAll = () => {
    const tests = [
      { name: 'lucide-react', fn: () => typeof Copy === 'function' ? 'Icons loaded (Copy, Check, etc.)' : 'FAIL' },
      { name: 'clsx', fn: () => clsx('foo', { bar: true, baz: false }) },
      { name: 'date-fns', fn: () => format(new Date(2026, 1, 22), 'PPPP') },
      { name: 'colord', fn: () => colord('#3b82f6').toHslString() },
      { name: 'nanoid', fn: () => `Generated ID: ${nanoid(10)}` },
      { name: 'slugify', fn: () => slugify('Hello World Test 2026!', { lower: true }) },
      { name: 'pluralize', fn: () => `1 ${pluralize('mouse', 1)}, 5 ${pluralize('mouse', 5)}` },
      { name: 'pretty-bytes', fn: () => prettyBytes(1_500_000_000) },
      { name: 'pretty-ms', fn: () => prettyMs(3_661_000, { verbose: true }) },
      { name: 'canvas-confetti', fn: () => typeof confetti === 'function' ? 'confetti() available' : 'FAIL' },
    ];

    const results = tests.map(t => {
      try {
        return { name: t.name, result: t.fn(), ok: true };
      } catch (e) {
        return { name: t.name, result: e.message, ok: false };
      }
    });
    setAllResults(results);
  };

  const passCount = allResults.filter(r => r.ok).length;
  const failCount = allResults.filter(r => !r.ok).length;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '700px', margin: '0 auto', padding: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem', color: '#0f172a' }}>
        10-Import Stress Test
      </h1>
      <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Tests external npm package resolution via esm.sh CDN
      </p>

      <button
        onClick={() => { runAll(); }}
        style={{
          padding: '0.5rem 1.5rem',
          fontSize: '0.9rem',
          fontWeight: 600,
          borderRadius: '6px',
          border: 'none',
          backgroundColor: '#3b82f6',
          color: '#fff',
          cursor: 'pointer',
          marginBottom: '1rem',
        }}
      >
        Run All Tests
      </button>

      {allResults.length > 0 && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          borderRadius: '6px',
          backgroundColor: failCount === 0 ? '#dcfce7' : '#fef9c3',
          border: `1px solid ${failCount === 0 ? '#86efac' : '#fde68a'}`,
          fontSize: '0.85rem',
          fontWeight: 600,
        }}>
          {failCount === 0
            ? <><Check size={16} style={{ display: 'inline', verticalAlign: 'middle', color: '#16a34a' }} /> All {passCount}/10 tests passed!</>
            : <><Info size={16} style={{ display: 'inline', verticalAlign: 'middle', color: '#ca8a04' }} /> {passCount} passed, {failCount} failed</>
          }
        </div>
      )}

      {allResults.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          {allResults.map((r, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.4rem 0.75rem',
              borderBottom: '1px solid #f1f5f9',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              backgroundColor: r.ok ? 'transparent' : '#fef2f2',
            }}>
              <span>{r.ok ? '\u2705' : '\u274c'} {r.name}</span>
              <span style={{ color: r.ok ? '#16a34a' : '#dc2626' }}>{r.result}</span>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: '#334155' }}>Individual Tests</h2>

      <ImportTestCard name="1. lucide-react" testFn={() => typeof Copy === 'function' ? 'Icons: Copy, Check, ChevronDown, ChevronUp, Info' : 'FAIL'}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Copy size={20} />
          <Check size={20} />
          <ChevronDown size={20} />
          <ChevronUp size={20} />
          <Info size={20} />
        </div>
      </ImportTestCard>

      <ImportTestCard name="2. clsx" testFn={() => clsx('base', { active: true, disabled: false, 'text-lg': true })}>
        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Conditional class builder</p>
      </ImportTestCard>

      <ImportTestCard name="3. date-fns" testFn={() => format(new Date(2026, 1, 22), "EEEE, MMMM do yyyy")}>
        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Date formatting</p>
      </ImportTestCard>

      <ImportTestCard name="4. colord" testFn={() => {
        const c = colord('#3b82f6');
        return `HSL: ${c.toHslString()} | RGB: ${c.toRgbString()}`;
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: '#3b82f6' }} />
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Color manipulation</span>
        </div>
      </ImportTestCard>

      <ImportTestCard name="5. nanoid" testFn={() => `IDs: ${nanoid(8)}, ${nanoid(8)}, ${nanoid(8)}`}>
        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Unique ID generation</p>
      </ImportTestCard>

      <ImportTestCard name="6. slugify" testFn={() => slugify('React External Imports Test 2026!', { lower: true, strict: true })}>
        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>URL slug generation</p>
      </ImportTestCard>

      <ImportTestCard name="7. pluralize" testFn={() => `1 ${pluralize('child', 1)}, 3 ${pluralize('child', 3)}, 1 ${pluralize('octopus', 1)}, 2 ${pluralize('octopus', 2)}`}>
        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>English pluralization</p>
      </ImportTestCard>

      <ImportTestCard name="8. pretty-bytes" testFn={() => `${prettyBytes(0)}, ${prettyBytes(1024)}, ${prettyBytes(1_048_576)}, ${prettyBytes(1_073_741_824)}`}>
        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Human-readable file sizes</p>
      </ImportTestCard>

      <ImportTestCard name="9. pretty-ms" testFn={() => `${prettyMs(100)}, ${prettyMs(60_000)}, ${prettyMs(3_661_000, { verbose: true })}`}>
        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Human-readable durations</p>
      </ImportTestCard>

      <ImportTestCard name="10. canvas-confetti" testFn={() => {
        if (typeof confetti !== 'function') return 'FAIL: not a function';
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        return 'Confetti launched!';
      }}>
        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Canvas confetti animation</p>
      </ImportTestCard>
    </div>
  );
}
