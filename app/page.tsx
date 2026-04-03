'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type Student = {
  id: number;
  dni: string;
  fullName: string;
  course: string;
  enabled: boolean;
};

type Step = 'dni' | 'confirm' | 'vote' | 'done';

export default function Home() {
  const [dni, setDni] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [step, setStep] = useState<Step>('dni');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API = 'http://localhost:3000';

  const reset = () => {
    setDni('');
    setStudent(null);
    setStep('dni');
    setError('');
    setLoading(false);
  };

  useEffect(() => {
    if (step === 'done') {
      const timer = setTimeout(() => {
        reset();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleSearch = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/students/dni/${dni}`);

      if (!res.ok) {
        throw new Error('Alumno no encontrado');
      }

      const data: Student = await res.json();
      setStudent(data);
      setStep('confirm');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al buscar el alumno');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (option: 'Lista 10' | 'Lista 15') => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni, option }),
      });

      const data: { message?: string } = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Error al registrar el voto');
      }

      setStep('done');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al votar');
      }
      setStep('dni');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg, #0d47a1 0%, #1565c0 18%, #eaf3ff 18%, #f7fbff 100%)',
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
          maxWidth: '920px',
          background: '#ffffff',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
          border: '4px solid #bbdefb',
        }}
      >
        <header
          style={{
            background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)',
            color: 'white',
            padding: '28px 24px 20px 24px',
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
                background: 'white',
                borderRadius: '16px',
                padding: '10px',
                boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
              }}
            >
              <Image
                src="/logo-escuela.png"
                alt="Logo Escuela Técnica Valentín Virasoro"
                width={110}
                height={110}
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: '2.1rem',
              fontWeight: 800,
              letterSpacing: '0.5px',
            }}
          >
            Elecciones Centro de Estudiantes
          </h1>

          <p
            style={{
              marginTop: '10px',
              marginBottom: 0,
              fontSize: '1.1rem',
              opacity: 0.98,
            }}
          >
            Escuela Técnica Valentín Virasoro · Goya
          </p>
        </header>

        <section
          style={{
            padding: '36px 28px 44px 28px',
            background: 'linear-gradient(180deg, #fafdff 0%, #eef6ff 100%)',
            textAlign: 'center',
          }}
        >
          {step === 'dni' && (
            <>
              <div
                style={{
                  maxWidth: '680px',
                  margin: '0 auto',
                  background: '#ffffff',
                  border: '2px solid #d7e8ff',
                  borderRadius: '20px',
                  padding: '34px 24px',
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    color: '#0d47a1',
                    fontSize: '1.9rem',
                  }}
                >
                  Ingreso de votante
                </h2>

                <p
                  style={{
                    color: '#4a6482',
                    fontSize: '1.05rem',
                    marginBottom: '26px',
                  }}
                >
                  Ingrese su DNI para verificar identidad y emitir su voto
                </p>

                <input
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="Ingrese su DNI"
                  style={{
                    width: '100%',
                    maxWidth: '380px',
                    fontSize: '2rem',
                    padding: '16px 18px',
                    borderRadius: '14px',
                    border: '2px solid #90caf9',
                    outline: 'none',
                    textAlign: 'center',
                    color: '#0d47a1',
                    fontWeight: 700,
                    background: '#f9fcff',
                  }}
                />

                <div style={{ marginTop: '26px' }}>
                  <button
                    onClick={handleSearch}
                    disabled={loading || !dni.trim()}
                    style={{
                      background: loading ? '#90a4ae' : '#1565c0',
                      color: 'white',
                      border: 'none',
                      borderRadius: '14px',
                      padding: '16px 34px',
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      minWidth: '210px',
                      boxShadow: '0 8px 18px rgba(21, 101, 192, 0.25)',
                    }}
                  >
                    {loading ? 'Buscando...' : 'Verificar identidad'}
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 'confirm' && student && (
            <>
              <div
                style={{
                  maxWidth: '720px',
                  margin: '0 auto',
                  background: '#ffffff',
                  border: '2px solid #d7e8ff',
                  borderRadius: '20px',
                  padding: '34px 24px',
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    color: '#0d47a1',
                    fontSize: '1.9rem',
                  }}
                >
                  Confirmación de identidad
                </h2>

                <div
                  style={{
                    marginTop: '28px',
                    background: '#f4f9ff',
                    border: '2px solid #bbdefb',
                    borderRadius: '18px',
                    padding: '24px',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 10px 0',
                      fontSize: '2rem',
                      fontWeight: 800,
                      color: '#0d47a1',
                    }}
                  >
                    {student.fullName}
                  </p>

                  <p
                    style={{
                      margin: '8px 0',
                      fontSize: '1.3rem',
                      color: '#234',
                    }}
                  >
                    Curso: <b>{student.course}</b>
                  </p>

                  <p
                    style={{
                      margin: '8px 0 0 0',
                      fontSize: '1.1rem',
                      color: '#4a6482',
                    }}
                  >
                    DNI: {student.dni}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '14px',
                    flexWrap: 'wrap',
                    marginTop: '28px',
                  }}
                >
                  <button
                    onClick={() => setStep('vote')}
                    style={{
                      background: '#1565c0',
                      color: 'white',
                      border: 'none',
                      borderRadius: '14px',
                      padding: '16px 28px',
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      minWidth: '190px',
                    }}
                  >
                    Confirmar identidad
                  </button>

                  <button
                    onClick={reset}
                    style={{
                      background: '#ffffff',
                      color: '#1565c0',
                      border: '2px solid #90caf9',
                      borderRadius: '14px',
                      padding: '16px 28px',
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      minWidth: '190px',
                    }}
                  >
                    Volver
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 'vote' && (
            <>
              <div
                style={{
                  maxWidth: '780px',
                  margin: '0 auto',
                  background: '#ffffff',
                  border: '2px solid #d7e8ff',
                  borderRadius: '20px',
                  padding: '34px 24px',
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                    color: '#0d47a1',
                    fontSize: '2rem',
                  }}
                >
                  Emisión del voto
                </h2>

                <p
                  style={{
                    color: '#4a6482',
                    fontSize: '1.1rem',
                    marginBottom: '28px',
                  }}
                >
                  Seleccione la lista de su preferencia
                </p>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '24px',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    onClick={() => handleVote('Lista 10')}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '18px',
                      padding: '28px 34px',
                      width: '280px',
                      minHeight: '160px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 10px 24px rgba(21, 101, 192, 0.25)',
                    }}
                  >
                    <div style={{ fontSize: '1rem', opacity: 0.9 }}>Opción</div>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, marginTop: '8px' }}>
                      Lista 10
                    </div>
                  </button>

                  <button
                    onClick={() => handleVote('Lista 15')}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '18px',
                      padding: '28px 34px',
                      width: '280px',
                      minHeight: '160px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 10px 24px rgba(21, 101, 192, 0.25)',
                    }}
                  >
                    <div style={{ fontSize: '1rem', opacity: 0.95 }}>Opción</div>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, marginTop: '8px' }}>
                      Lista 15
                    </div>
                  </button>
                </div>

                {loading && (
                  <p
                    style={{
                      marginTop: '24px',
                      color: '#1565c0',
                      fontWeight: 700,
                      fontSize: '1.1rem',
                    }}
                  >
                    Registrando voto...
                  </p>
                )}
              </div>
            </>
          )}

          {step === 'done' && (
            <>
              <div
                style={{
                  maxWidth: '680px',
                  margin: '0 auto',
                  background: '#ffffff',
                  border: '2px solid #c8e6c9',
                  borderRadius: '20px',
                  padding: '38px 24px',
                }}
              >
                <div style={{ fontSize: '4rem', marginBottom: '10px' }}>✅</div>

                <h2
                  style={{
                    marginTop: 0,
                    color: '#1b5e20',
                    fontSize: '2rem',
                  }}
                >
                  Voto registrado correctamente
                </h2>

                <p
                  style={{
                    color: '#3d5f45',
                    fontSize: '1.15rem',
                    marginBottom: '10px',
                  }}
                >
                  Gracias por participar de la elección
                </p>

                <p
                  style={{
                    color: '#607d8b',
                    fontSize: '1rem',
                    marginTop: '18px',
                  }}
                >
                  La pantalla volverá al inicio automáticamente en unos segundos
                </p>
              </div>
            </>
          )}

          {error && (
            <div
              style={{
                maxWidth: '680px',
                margin: '22px auto 0 auto',
                background: '#fff3f3',
                border: '2px solid #ffcdd2',
                color: '#b71c1c',
                borderRadius: '14px',
                padding: '16px 18px',
                fontWeight: 700,
                fontSize: '1.05rem',
              }}
            >
              {error}
            </div>
          )}
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
          Escuela Técnica Valentín Virasoro · Sistema de votación estudiantil
        </footer>
      </div>
    </main>
  );
}
