'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

type ResultItem = {
  option: string;
  total: string;
};

type Stats = {
  totalStudents: number;
  totalVotes: number;
  participation: number;
};

type ElectionStatus = {
  id: number;
  isOpen: boolean;
  openedAt: string | null;
  closedAt: string | null;
};

export default function AdminPage() {
  const [results, setResults] = useState<ResultItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [election, setElection] = useState<ElectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<
    'open' | 'close' | 'reset' | null
  >(null);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');

  const API = 'http://localhost:3000';

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [resultsRes, statsRes, electionRes] = await Promise.all([
        fetch(`${API}/votes/results`, { cache: 'no-store' }),
        fetch(`${API}/votes/stats`, { cache: 'no-store' }),
        fetch(`${API}/election`, { cache: 'no-store' }),
      ]);

      if (!resultsRes.ok || !statsRes.ok || !electionRes.ok) {
        throw new Error('No se pudieron obtener los datos de la elección');
      }

      const resultsData: ResultItem[] = await resultsRes.json();
      const statsData: Stats = await statsRes.json();
      const electionData: ElectionStatus = await electionRes.json();

      setResults(resultsData);
      setStats(statsData);
      setElection(electionData);
      setLastUpdate(new Date().toLocaleString('es-AR'));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al cargar los datos');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const normalizedResults = useMemo(() => {
    const list10 = results.find((r) => r.option === 'Lista 10');
    const list15 = results.find((r) => r.option === 'Lista 15');

    return [
      { option: 'Lista 10', total: Number(list10?.total ?? 0) },
      { option: 'Lista 15', total: Number(list15?.total ?? 0) },
    ];
  }, [results]);

  const winnerText = useMemo(() => {
    const [a, b] = normalizedResults;

    if (a.total === 0 && b.total === 0) {
      return 'Sin votos registrados';
    }

    if (a.total === b.total) {
      return 'Empate parcial';
    }

    return a.total > b.total ? 'Lista 10' : 'Lista 15';
  }, [normalizedResults]);

  const handleOpenVoting = async () => {
    const confirmed = window.confirm('¿Desea abrir la votación?');
    if (!confirmed) return;

    setActionLoading('open');
    setError('');

    try {
      const res = await fetch(`${API}/election/open`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('No se pudo abrir la votación');
      }

      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al abrir la votación');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleCloseVoting = async () => {
    const confirmed = window.confirm(
      '¿Desea cerrar la votación? Luego no se podrán registrar nuevos votos.',
    );
    if (!confirmed) return;

    setActionLoading('close');
    setError('');

    try {
      const res = await fetch(`${API}/election/close`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('No se pudo cerrar la votación');
      }

      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al cerrar la votación');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetVoting = async () => {
    const confirmed = window.confirm(
      '¿Desea reiniciar la votación? Esta acción eliminará todos los votos registrados y volverá a abrir la elección.',
    );
    if (!confirmed) return;

    setActionLoading('reset');
    setError('');

    try {
      const res = await fetch(`${API}/election/reset`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('No se pudo reiniciar la votación');
      }

      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al reiniciar la votación');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const isClosed = election ? !election.isOpen : false;

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg, #0d47a1 0%, #1565c0 18%, #eaf3ff 18%, #f7fbff 100%)',
        padding: '24px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          background: '#fff',
          borderRadius: '24px',
          overflow: 'hidden',
          border: '4px solid #bbdefb',
          boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
        }}
      >
        <header
          style={{
            background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)',
            color: 'white',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '18px',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: '14px',
                padding: '8px',
              }}
            >
              <Image
                src="/logo-escuela.png"
                alt="Logo Escuela Técnica Valentín Virasoro"
                width={82}
                height={82}
                priority
              />
            </div>

            <div style={{ textAlign: 'center' }}>
              <h1 style={{ margin: 0, fontSize: '2rem' }}>
                Mesa Electoral
              </h1>
              <p style={{ margin: '8px 0 0 0', fontSize: '1.05rem' }}>
                Escuela Técnica Valentín Virasoro · Centro de Estudiantes
              </p>
            </div>
          </div>
        </header>

        <section
          style={{
            padding: '28px',
            background: 'linear-gradient(180deg, #fafdff 0%, #eef6ff 100%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '22px',
            }}
          >
            <div>
              <h2 style={{ margin: 0, color: '#0d47a1' }}>
                Panel de control y estado
              </h2>
              <p style={{ margin: '8px 0 0 0', color: '#4a6482' }}>
                Última actualización: {lastUpdate || '---'}
              </p>
              {election?.openedAt && (
                <p style={{ margin: '8px 0 0 0', color: '#2e7d32', fontWeight: 700 }}>
                  Apertura: {new Date(election.openedAt).toLocaleString('es-AR')}
                </p>
              )}
              {election?.closedAt && (
                <p style={{ margin: '8px 0 0 0', color: '#c62828', fontWeight: 700 }}>
                  Cierre: {new Date(election.closedAt).toLocaleString('es-AR')}
                </p>
              )}
            </div>

            <div
              style={{
                padding: '10px 16px',
                borderRadius: '999px',
                fontWeight: 800,
                background: isClosed ? '#ffebee' : '#e8f5e9',
                color: isClosed ? '#c62828' : '#2e7d32',
                border: `2px solid ${isClosed ? '#ef9a9a' : '#a5d6a7'}`,
              }}
            >
              {isClosed ? 'VOTACIÓN CERRADA' : 'VOTACIÓN ABIERTA'}
            </div>
          </div>

          {error && (
            <div
              style={{
                marginBottom: '18px',
                background: '#fff3f3',
                border: '2px solid #ffcdd2',
                color: '#b71c1c',
                borderRadius: '14px',
                padding: '14px 16px',
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '18px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                background: '#fff',
                border: '2px solid #d7e8ff',
                borderRadius: '18px',
                padding: '20px',
              }}
            >
              <div style={{ color: '#4a6482', fontWeight: 700 }}>Habilitados</div>
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '2.2rem',
                  fontWeight: 900,
                  color: '#0d47a1',
                }}
              >
                {stats?.totalStudents ?? 0}
              </div>
            </div>

            <div
              style={{
                background: '#fff',
                border: '2px solid #d7e8ff',
                borderRadius: '18px',
                padding: '20px',
              }}
            >
              <div style={{ color: '#4a6482', fontWeight: 700 }}>Votos emitidos</div>
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '2.2rem',
                  fontWeight: 900,
                  color: '#0d47a1',
                }}
              >
                {stats?.totalVotes ?? 0}
              </div>
            </div>

            <div
              style={{
                background: '#fff',
                border: '2px solid #d7e8ff',
                borderRadius: '18px',
                padding: '20px',
              }}
            >
              <div style={{ color: '#4a6482', fontWeight: 700 }}>Participación</div>
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '2.2rem',
                  fontWeight: 900,
                  color: '#0d47a1',
                }}
              >
                {stats?.participation ?? 0}%
              </div>
            </div>

            <div
              style={{
                background: '#fff',
                border: '2px solid #d7e8ff',
                borderRadius: '18px',
                padding: '20px',
              }}
            >
              <div style={{ color: '#4a6482', fontWeight: 700 }}>
                Ganador provisional
              </div>
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '2rem',
                  fontWeight: 900,
                  color: '#0d47a1',
                }}
              >
                {winnerText}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 0.8fr',
              gap: '20px',
            }}
          >
            <div
              style={{
                background: '#fff',
                border: '2px solid #d7e8ff',
                borderRadius: '18px',
                padding: '24px',
              }}
            >
              <h3 style={{ marginTop: 0, color: '#0d47a1' }}>
                Resultados por lista
              </h3>

              {loading ? (
                <p style={{ color: '#4a6482' }}>Cargando resultados...</p>
              ) : (
                <div style={{ display: 'grid', gap: '14px' }}>
                  {normalizedResults.map((item) => (
                    <div
                      key={item.option}
                      style={{
                        background: '#f4f9ff',
                        border: '2px solid #bbdefb',
                        borderRadius: '16px',
                        padding: '18px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: '#4a6482',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                          }}
                        >
                          Lista participante
                        </div>
                        <div
                          style={{
                            color: '#0d47a1',
                            fontSize: '1.5rem',
                            fontWeight: 900,
                            marginTop: '4px',
                          }}
                        >
                          {item.option}
                        </div>
                      </div>

                      <div
                        style={{
                          minWidth: '90px',
                          textAlign: 'center',
                          background: '#1565c0',
                          color: '#fff',
                          borderRadius: '14px',
                          padding: '12px 16px',
                        }}
                      >
                        <div style={{ fontSize: '0.9rem', opacity: 0.95 }}>
                          Votos
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>
                          {item.total}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                background: '#fff',
                border: '2px solid #d7e8ff',
                borderRadius: '18px',
                padding: '24px',
              }}
            >
              <h3 style={{ marginTop: 0, color: '#0d47a1' }}>
                Acciones de mesa
              </h3>

              <div style={{ display: 'grid', gap: '14px' }}>
                <button
                  onClick={loadData}
                  style={{
                    background: '#1565c0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '15px 18px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Actualizar resultados
                </button>

                <button
                  onClick={handleOpenVoting}
                  disabled={!isClosed || actionLoading !== null}
                  style={{
                    background: !isClosed || actionLoading !== null ? '#b0bec5' : '#2e7d32',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '15px 18px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    cursor: !isClosed || actionLoading !== null ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actionLoading === 'open' ? 'Abriendo...' : 'Abrir votación'}
                </button>

                <button
                  onClick={handleCloseVoting}
                  disabled={isClosed || actionLoading !== null}
                  style={{
                    background: isClosed || actionLoading !== null ? '#b0bec5' : '#c62828',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '15px 18px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    cursor: isClosed || actionLoading !== null ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actionLoading === 'close' ? 'Cerrando...' : 'Cerrar votación'}
                </button>

                <button
                  onClick={handleResetVoting}
                  disabled={actionLoading !== null}
                  style={{
                    background: actionLoading !== null ? '#b0bec5' : '#ef6c00',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '15px 18px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    cursor: actionLoading !== null ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actionLoading === 'reset' ? 'Reiniciando...' : 'Reiniciar votación'}
                </button>
              </div>

              <div
                style={{
                  marginTop: '18px',
                  background: '#fff8e1',
                  border: '2px solid #ffe082',
                  borderRadius: '14px',
                  padding: '14px',
                  color: '#6d4c41',
                  fontSize: '0.97rem',
                  lineHeight: 1.5,
                }}
              >
                <b>Reiniciar votación</b> elimina todos los votos registrados y vuelve a abrir la elección.
              </div>
            </div>
          </div>
        </section>

        <footer
          style={{
            background: '#e3f2fd',
            color: '#0d47a1',
            textAlign: 'center',
            padding: '14px 18px',
            fontWeight: 700,
            borderTop: '2px solid #bbdefb',
          }}
        >
          Escuela Técnica Valentín Virasoro · Mesa electoral
        </footer>
      </div>
    </main>
  );
}