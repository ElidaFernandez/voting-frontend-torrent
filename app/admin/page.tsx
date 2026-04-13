'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { institutionConfig } from '@/src/lib/institution';

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

type MeResponse = {
  id: number;
  username: string;
  role: string;
};

type Student = {
  id: number;
  dni: string;
  fullName: string;
  course: string;
  enabled: boolean;
};

type StudentFormState = {
  dni: string;
  fullName: string;
  course: string;
  enabled: boolean;
};

type ActionLoading = 'open' | 'close' | 'reset' | null;

const emptyStudentForm: StudentFormState = {
  dni: '',
  fullName: '',
  course: '',
  enabled: true,
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [me, setMe] = useState<MeResponse | null>(null);

  const [results, setResults] = useState<ResultItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [election, setElection] = useState<ElectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<ActionLoading>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');

  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [hasSearchedStudents, setHasSearchedStudents] = useState(false);
  const [studentForm, setStudentForm] =
    useState<StudentFormState>(emptyStudentForm);
  const [studentFormLoading, setStudentFormLoading] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);

  const authHeaders = (jwt: string) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${jwt}`,
  });

  const loadElectionData = async (jwt: string) => {
    setLoading(true);
    setError('');

    try {
      const [resultsRes, statsRes, electionRes] = await Promise.all([
        fetch(`${API}/votes/results`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${jwt}` },
        }),
        fetch(`${API}/votes/stats`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${jwt}` },
        }),
        fetch(`${API}/election`, {
          cache: 'no-store',
        }),
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

  const loadStudents = async (
    jwt: string,
    search: string,
    keepError = false,
  ): Promise<void> => {
    const term = search.trim();

    if (!term) {
      setStudents([]);
      setHasSearchedStudents(false);
      if (!keepError) {
        setStudentsError('');
      }
      return;
    }

    setStudentsLoading(true);
    setHasSearchedStudents(true);

    if (!keepError) {
      setStudentsError('');
    }

    try {
      const query = `?search=${encodeURIComponent(term)}`;

      const res = await fetch(`${API}/students${query}`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        cache: 'no-store',
      });

      const data: Student[] | { message?: string } = await res.json();

      if (!res.ok) {
        const message =
          'message' in data && data.message
            ? data.message
            : 'No se pudieron cargar los alumnos';
        throw new Error(message);
      }

      setStudents(data as Student[]);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setStudentsError(err.message);
      } else {
        setStudentsError('Ocurrió un error al cargar los alumnos');
      }
    } finally {
      setStudentsLoading(false);
    }
  };

  const validateStoredToken = async (storedToken: string) => {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (!res.ok) {
        throw new Error('Sesión inválida');
      }

      const data: MeResponse = await res.json();

      if (data.role !== 'ADMIN') {
        throw new Error('Acceso solo para administrador');
      }

      setToken(storedToken);
      setMe(data);
      setIsAuthenticated(true);
      await loadElectionData(storedToken);
    } catch {
      localStorage.removeItem('admin_token');
      setToken('');
      setMe(null);
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token');

    if (!storedToken) {
      setAuthLoading(false);
      return;
    }

    void validateStoredToken(storedToken);
  }, []);

  const normalizedResults = useMemo(() => {
    return institutionConfig.voteOptions.map((option) => {
      const found = results.find((r) => r.option === option);
      return {
        option,
        total: Number(found?.total ?? 0),
      };
    });
  }, [results]);

  const winnerText = useMemo(() => {
    if (normalizedResults.every((item) => item.total === 0)) {
      return 'Sin votos registrados';
    }

    const maxVotes = Math.max(...normalizedResults.map((item) => item.total));
    const winners = normalizedResults.filter((item) => item.total === maxVotes);

    if (winners.length > 1) {
      return 'Empate';
    }

    return winners[0]?.option ?? 'Sin votos registrados';
  }, [normalizedResults]);

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data: {
        access_token?: string;
        user?: MeResponse;
        message?: string;
      } = await res.json();

      if (!res.ok || !data.access_token || !data.user) {
        throw new Error(data.message || 'No se pudo iniciar sesión');
      }

      localStorage.setItem('admin_token', data.access_token);
      setToken(data.access_token);
      setMe(data.user);
      setIsAuthenticated(true);
      await loadElectionData(data.access_token);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLoginError(err.message);
      } else {
        setLoginError('Error al iniciar sesión');
      }
    } finally {
      setLoginLoading(false);
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken('');
    setMe(null);
    setIsAuthenticated(false);
    setResults([]);
    setStats(null);
    setElection(null);
    setStudents([]);
    setStudentSearch('');
    setHasSearchedStudents(false);
    setStudentForm(emptyStudentForm);
    setEditingStudentId(null);
    setError('');
    setStudentsError('');
    setLastUpdate('');
  };

  const handleOpenVoting = async () => {
    const confirmed = window.confirm('¿Desea abrir la votación?');
    if (!confirmed) return;

    setActionLoading('open');
    setError('');

    try {
      const res = await fetch(`${API}/election/open`, {
        method: 'POST',
        headers: authHeaders(token),
      });

      const data: { message?: string } | null = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || 'No se pudo abrir la votación');
      }

      await loadElectionData(token);
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
        headers: authHeaders(token),
      });

      const data: { message?: string } | null = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || 'No se pudo cerrar la votación');
      }

      await loadElectionData(token);
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
    const firstConfirmation = window.confirm(
      '⚠️ ATENCIÓN: va a reiniciar la votación.\n\nEsta acción eliminará TODOS los votos registrados y volverá a abrir la elección.\n\nEsta operación no se puede deshacer.\n\n¿Desea continuar?',
    );

    if (!firstConfirmation) return;

    const textConfirmation = window.prompt(
      'Para confirmar el reinicio, escriba exactamente la palabra REINICIAR',
      '',
    );

    if (textConfirmation !== 'REINICIAR') {
      window.alert('Confirmación incorrecta. La votación no fue reiniciada.');
      return;
    }

    setActionLoading('reset');
    setError('');

    try {
      const res = await fetch(`${API}/election/reset`, {
        method: 'POST',
        headers: authHeaders(token),
      });

      const data: { message?: string } | null = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || 'No se pudo reiniciar la votación');
      }

      await loadElectionData(token);
      window.alert('✅ La votación fue reiniciada correctamente.');
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

  const handleOpenActa = async () => {
    setPdfLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/votes/acta`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        let message = 'No se pudo generar el acta';

        try {
          const data: { message?: string } = await res.json();
          message = data.message || message;
        } catch {
          // sin acción
        }

        throw new Error(message);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 10000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al generar el acta');
      }
    } finally {
      setPdfLoading(false);
    }
  };

  const handleStudentInputChange = (
    field: keyof StudentFormState,
    value: string | boolean,
  ) => {
    setStudentForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetStudentForm = () => {
    setStudentForm(emptyStudentForm);
    setEditingStudentId(null);
    setStudentsError('');
  };

  const handleStudentSearch = async () => {
    await loadStudents(token, studentSearch);
  };

  const handleStudentSearchReset = () => {
    setStudentSearch('');
    setStudents([]);
    setHasSearchedStudents(false);
    setStudentsError('');
  };

  const handleStudentSubmit = async () => {
    setStudentFormLoading(true);
    setStudentsError('');

    try {
      const payload = {
        dni: studentForm.dni.trim(),
        fullName: studentForm.fullName.trim(),
        course: studentForm.course.trim(),
        enabled: studentForm.enabled,
      };

      const endpoint =
        editingStudentId === null
          ? `${API}/students`
          : `${API}/students/${editingStudentId}`;

      const method = editingStudentId === null ? 'POST' : 'PATCH';

      const res = await fetch(endpoint, {
        method,
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });

      const data: Student | { message?: string } = await res.json();

      if (!res.ok) {
        const message =
          'message' in data && data.message
            ? data.message
            : 'No se pudo guardar el alumno';
        throw new Error(message);
      }

      resetStudentForm();
      await loadElectionData(token);

      if (studentSearch.trim()) {
        await loadStudents(token, studentSearch, true);
      } else {
        setStudents([]);
        setHasSearchedStudents(false);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setStudentsError(err.message);
      } else {
        setStudentsError('Ocurrió un error al guardar el alumno');
      }
    } finally {
      setStudentFormLoading(false);
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudentId(student.id);
    setStudentForm({
      dni: student.dni,
      fullName: student.fullName,
      course: student.course,
      enabled: student.enabled,
    });
    setStudentsError('');
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleToggleStudent = async (student: Student) => {
    const confirmed = window.confirm(
      student.enabled
        ? '¿Desea deshabilitar este alumno?'
        : '¿Desea habilitar este alumno?',
    );

    if (!confirmed) return;

    setStudentsError('');

    try {
      const res = await fetch(`${API}/students/${student.id}/toggle-enabled`, {
        method: 'PATCH',
        headers: authHeaders(token),
      });

      const data: Student | { message?: string } = await res.json();

      if (!res.ok) {
        const message =
          'message' in data && data.message
            ? data.message
            : 'No se pudo actualizar el estado';
        throw new Error(message);
      }

      await loadElectionData(token);

      if (studentSearch.trim()) {
        await loadStudents(token, studentSearch, true);
      } else {
        setStudents([]);
        setHasSearchedStudents(false);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setStudentsError(err.message);
      } else {
        setStudentsError('Ocurrió un error al actualizar el estado');
      }
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    const confirmed = window.confirm(
      `¿Desea dar de baja al alumno ${student.fullName}?`,
    );

    if (!confirmed) return;

    setStudentsError('');

    try {
      const res = await fetch(`${API}/students/${student.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: { message?: string } = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'No se pudo dar de baja al alumno');
      }

      if (editingStudentId === student.id) {
        resetStudentForm();
      }

      await loadElectionData(token);

      if (studentSearch.trim()) {
        await loadStudents(token, studentSearch, true);
      } else {
        setStudents([]);
        setHasSearchedStudents(false);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setStudentsError(err.message);
      } else {
        setStudentsError('Ocurrió un error al dar de baja al alumno');
      }
    }
  };

  const isClosed = election ? !election.isOpen : false;

  if (authLoading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #000000 0%, #4a0000 100%)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            background: '#111',
            padding: '28px 36px',
            borderRadius: '18px',
            fontWeight: 700,
            color: '#ffffff',
            border: '3px solid #d32f2f',
          }}
        >
          Verificando acceso...
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #000000 0%, #4a0000 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '520px',
            background: '#111',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '4px solid #d32f2f',
            boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
          }}
        >
          <header
            style={{
              background: 'linear-gradient(135deg, #000000 0%, #b71c1c 100%)',
              color: 'white',
              padding: '28px 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '14px',
              }}
            >
              <div
                style={{
                  background: '#fff',
                  borderRadius: '14px',
                  padding: '10px',
                }}
              >
                <Image
                  src={institutionConfig.logoPath}
                  alt={`Logo ${institutionConfig.schoolName}`}
                  width={90}
                  height={90}
                  priority
                />
              </div>
            </div>

            <h1 style={{ margin: 0, fontSize: '2rem' }}>Login administrador</h1>
            <p style={{ margin: '8px 0 0 0' }}>
              {institutionConfig.systemName}
            </p>
          </header>

          <section
            style={{
              padding: '32px 28px',
              background: '#1a1a1a',
            }}
          >
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#ffffff',
                  fontWeight: 700,
                }}
              >
                Usuario
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Usuario"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '2px solid #d32f2f',
                  fontSize: '1rem',
                  outline: 'none',
                  background: '#111',
                  color: '#fff',
                }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#ffffff',
                  fontWeight: 700,
                }}
              >
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '2px solid #d32f2f',
                  fontSize: '1rem',
                  outline: 'none',
                  background: '#111',
                  color: '#fff',
                }}
              />
            </div>

            {loginError && (
              <div
                style={{
                  marginBottom: '18px',
                  background: '#330000',
                  border: '2px solid #d32f2f',
                  color: '#ffb3b3',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  fontWeight: 700,
                }}
              >
                {loginError}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loginLoading || !username.trim() || !password.trim()}
              style={{
                width: '100%',
                background:
                  loginLoading || !username.trim() || !password.trim()
                    ? '#666'
                    : '#b71c1c',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                padding: '15px 18px',
                fontSize: '1rem',
                fontWeight: 800,
                cursor:
                  loginLoading || !username.trim() || !password.trim()
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {loginLoading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #000000 0%, #4a0000 100%)',
        padding: '24px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          background: '#111',
          borderRadius: '24px',
          overflow: 'hidden',
          border: '4px solid #d32f2f',
          boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
        }}
      >
        <header
          style={{
            background: 'linear-gradient(135deg, #000000 0%, #b71c1c 100%)',
            color: 'white',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '18px',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
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
                  src={institutionConfig.logoPath}
                  alt={`Logo ${institutionConfig.schoolName}`}
                  width={82}
                  height={82}
                  priority
                />
              </div>

              <div style={{ textAlign: 'center' }}>
                <h1 style={{ margin: 0, fontSize: '2rem' }}>Mesa Electoral</h1>
                <p style={{ margin: '8px 0 0 0', fontSize: '1.05rem' }}>
                  {institutionConfig.schoolName}
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800 }}>Usuario: {me?.username}</div>
              <div style={{ marginTop: '6px' }}>Rol: {me?.role}</div>
              <button
                onClick={handleLogout}
                style={{
                  marginTop: '10px',
                  background: '#ffffff',
                  color: '#b71c1c',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </header>

        <section
          style={{
            padding: '28px',
            background: '#1a1a1a',
            color: '#fff',
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
              <h2 style={{ margin: 0, color: '#ffffff' }}>
                Panel de control y estado
              </h2>
              <p style={{ margin: '8px 0 0 0', color: '#cccccc' }}>
                Última actualización: {lastUpdate || '---'}
              </p>
              {election?.openedAt && (
                <p
                  style={{
                    margin: '8px 0 0 0',
                    color: '#81c784',
                    fontWeight: 700,
                  }}
                >
                  Apertura: {new Date(election.openedAt).toLocaleString('es-AR')}
                </p>
              )}
              {election?.closedAt && (
                <p
                  style={{
                    margin: '8px 0 0 0',
                    color: '#ef5350',
                    fontWeight: 700,
                  }}
                >
                  Cierre: {new Date(election.closedAt).toLocaleString('es-AR')}
                </p>
              )}
            </div>

            <div
              style={{
                padding: '10px 16px',
                borderRadius: '999px',
                fontWeight: 800,
                background: isClosed ? '#330000' : '#1b5e20',
                color: '#fff',
                border: `2px solid ${isClosed ? '#ef5350' : '#81c784'}`,
              }}
            >
              {isClosed ? 'VOTACIÓN CERRADA' : 'VOTACIÓN ABIERTA'}
            </div>
          </div>

          {!isClosed && (
            <div
              style={{
                marginBottom: '18px',
                background: '#2a1a1a',
                border: '2px solid #d32f2f',
                borderRadius: '14px',
                padding: '14px',
                color: '#ffd7d7',
                fontSize: '0.97rem',
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              Los resultados y el ganador se mostrarán una vez finalizada la votación.
            </div>
          )}

          {error && (
            <div
              style={{
                marginBottom: '18px',
                background: '#330000',
                border: '2px solid #d32f2f',
                color: '#ffb3b3',
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
                background: '#111',
                border: '2px solid #d32f2f',
                borderRadius: '18px',
                padding: '20px',
              }}
            >
              <div style={{ color: '#cccccc', fontWeight: 700 }}>Habilitados</div>
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '2.2rem',
                  fontWeight: 900,
                  color: '#ffffff',
                }}
              >
                {stats?.totalStudents ?? 0}
              </div>
            </div>

            <div
              style={{
                background: '#111',
                border: '2px solid #d32f2f',
                borderRadius: '18px',
                padding: '20px',
              }}
            >
              <div style={{ color: '#cccccc', fontWeight: 700 }}>Votos emitidos</div>
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '2.2rem',
                  fontWeight: 900,
                  color: '#ffffff',
                }}
              >
                {stats?.totalVotes ?? 0}
              </div>
            </div>

            <div
              style={{
                background: '#111',
                border: '2px solid #d32f2f',
                borderRadius: '18px',
                padding: '20px',
              }}
            >
              <div style={{ color: '#cccccc', fontWeight: 700 }}>Participación</div>
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '2.2rem',
                  fontWeight: 900,
                  color: '#ffffff',
                }}
              >
                {stats?.participation ?? 0}%
              </div>
            </div>

            {isClosed && (
              <div
                style={{
                  background: '#111',
                  border: '2px solid #d32f2f',
                  borderRadius: '18px',
                  padding: '20px',
                }}
              >
                <div style={{ color: '#cccccc', fontWeight: 700 }}>Ganador</div>
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '1.3rem',
                    fontWeight: 900,
                    color: '#ffffff',
                  }}
                >
                  {winnerText}
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 0.8fr',
              gap: '20px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                background: '#111',
                border: '2px solid #d32f2f',
                borderRadius: '18px',
                padding: '24px',
              }}
            >
              <h3 style={{ marginTop: 0, color: '#ffffff' }}>
                Resultados por lista
              </h3>

              {loading ? (
                <p style={{ color: '#cccccc' }}>Cargando resultados...</p>
              ) : isClosed ? (
                <div style={{ display: 'grid', gap: '14px' }}>
                  {normalizedResults.map((item) => (
                    <div
                      key={item.option}
                      style={{
                        background: '#1c1c1c',
                        border: '2px solid #d32f2f',
                        borderRadius: '16px',
                        padding: '18px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: '#cccccc',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                          }}
                        >
                          Lista participante
                        </div>
                        <div
                          style={{
                            color: '#ffffff',
                            fontSize: '1.2rem',
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
                          background: '#b71c1c',
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
              ) : (
                <div
                  style={{
                    padding: '20px',
                    background: '#2a1a1a',
                    border: '2px solid #d32f2f',
                    borderRadius: '14px',
                    color: '#ffd7d7',
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                >
                  Los resultados se mostrarán una vez finalizada la votación.
                </div>
              )}
            </div>

            <div
              style={{
                background: '#111',
                border: '2px solid #d32f2f',
                borderRadius: '18px',
                padding: '24px',
              }}
            >
              <h3 style={{ marginTop: 0, color: '#ffffff' }}>
                Acciones de mesa
              </h3>

              <div style={{ display: 'grid', gap: '14px' }}>
                <button
                  onClick={() => void loadElectionData(token)}
                  style={{
                    background: '#b71c1c',
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

                {isClosed && (
                  <button
                    onClick={() => void handleOpenActa()}
                    disabled={pdfLoading}
                    style={{
                      background: pdfLoading ? '#666' : '#000000',
                      color: 'white',
                      border: '2px solid #d32f2f',
                      borderRadius: '14px',
                      padding: '15px 18px',
                      fontSize: '1rem',
                      fontWeight: 800,
                      cursor: pdfLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {pdfLoading ? 'Generando acta...' : 'Ver acta PDF'}
                  </button>
                )}

                <button
                  onClick={() => void handleOpenVoting()}
                  disabled={!isClosed || actionLoading !== null}
                  style={{
                    background:
                      !isClosed || actionLoading !== null ? '#666' : '#1b5e20',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '15px 18px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    cursor:
                      !isClosed || actionLoading !== null
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {actionLoading === 'open' ? 'Abriendo...' : 'Abrir votación'}
                </button>

                <button
                  onClick={() => void handleCloseVoting()}
                  disabled={isClosed || actionLoading !== null}
                  style={{
                    background:
                      isClosed || actionLoading !== null ? '#666' : '#c62828',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '15px 18px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    cursor:
                      isClosed || actionLoading !== null
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {actionLoading === 'close' ? 'Cerrando...' : 'Cerrar votación'}
                </button>

                <button
                  onClick={() => void handleResetVoting()}
                  disabled={actionLoading !== null}
                  style={{
                    background: actionLoading !== null ? '#666' : '#ef6c00',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '15px 18px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    cursor: actionLoading !== null ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actionLoading === 'reset'
                    ? 'Reiniciando...'
                    : 'Reiniciar votación'}
                </button>
              </div>

              <div
                style={{
                  marginTop: '18px',
                  background: '#2a1a1a',
                  border: '2px solid #d32f2f',
                  borderRadius: '14px',
                  padding: '14px',
                  color: '#ffd7d7',
                  fontSize: '0.97rem',
                  lineHeight: 1.5,
                }}
              >
                <b>Reiniciar votación</b> elimina todos los votos registrados y
                vuelve a abrir la elección.
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.3fr 0.7fr',
              gap: '20px',
            }}
          >
            <div
              style={{
                background: '#111',
                border: '2px solid #d32f2f',
                borderRadius: '18px',
                padding: '24px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                  marginBottom: '18px',
                }}
              >
                <h3 style={{ margin: 0, color: '#ffffff' }}>
                  Gestión de alumnos
                </h3>

                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  <input
  value={studentSearch}
  onChange={(e) => setStudentSearch(e.target.value)}
  placeholder="Buscar por DNI, apellido, nombre o curso"
  style={{
    padding: '12px 14px',
    borderRadius: '12px',
    border: '2px solid #d32f2f',
    color: '#fff',
    background: '#111',
    width: '260px',
  }}
/>

<button
  onClick={() => void handleStudentSearch()}
  style={{
    background: '#b71c1c',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 16px',
    fontWeight: 800,
    cursor: 'pointer',
  }}
>
  Buscar
</button>

<button
  onClick={handleStudentSearchReset}
  style={{
    background: '#333',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 16px',
    fontWeight: 800,
    cursor: 'pointer',
  }}
>
  Limpiar
</button>
</div>
</div>

{studentsError && (
  <p style={{ color: '#ff6b6b', marginBottom: 12 }}>
    {studentsError}
  </p>
)}

{studentsLoading && <p>Cargando alumnos...</p>}

{students.length > 0 && (
  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <thead>
      <tr style={{ background: '#222' }}>
        <th>DNI</th>
        <th>Nombre</th>
        <th>Curso</th>
        <th>Estado</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>
      {students.map((s) => (
        <tr key={s.id}>
          <td>{s.dni}</td>
          <td>{s.fullName}</td>
          <td>{s.course}</td>
          <td>{s.enabled ? 'Activo' : 'Inactivo'}</td>
          <td>
            <button onClick={() => handleEditStudent(s)}>Editar</button>
            <button onClick={() => handleToggleStudent(s)}>Toggle</button>
            <button onClick={() => handleDeleteStudent(s)}>Baja</button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
)}
</div>

{/* FORMULARIO */}

<div
  style={{
    background: '#111',
    border: '2px solid #d32f2f',
    borderRadius: '18px',
    padding: '24px',
  }}
>
  <h3>{editingStudentId ? 'Editar alumno' : 'Nuevo alumno'}</h3>

  <input
    placeholder="DNI"
    value={studentForm.dni}
    onChange={(e) => handleStudentInputChange('dni', e.target.value)}
  />

  <input
    placeholder="Nombre"
    value={studentForm.fullName}
    onChange={(e) =>
      handleStudentInputChange('fullName', e.target.value)
    }
  />

  <input
    placeholder="Curso"
    value={studentForm.course}
    onChange={(e) =>
      handleStudentInputChange('course', e.target.value)
    }
  />

  <button onClick={handleStudentSubmit}>
    Guardar
  </button>

  {editingStudentId && (
    <button onClick={resetStudentForm}>Cancelar</button>
  )}
</div>

</div>

<footer
  style={{
    marginTop: 24,
    textAlign: 'center',
    color: '#ccc',
  }}
>
  {'Colegio Secundario "Dr. Juan Eusebio Torrent"'}
</footer>

</section>
</div>
</main>
);
}