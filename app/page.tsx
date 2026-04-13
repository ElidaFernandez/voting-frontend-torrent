'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { institutionConfig, type VoteOption } from '@/src/lib/institution';

type Student = {
  id: number;
  dni: string;
  fullName: string;
  course: string;
  enabled: boolean;
};

type Step = 'dni' | 'confirm' | 'vote' | 'done';

type ApiErrorResponse = {
  message?: string;
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export default function Home() {
  const [dni, setDni] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [step, setStep] = useState<Step>('dni');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      setError(getErrorMessage(err, 'Ocurrió un error al buscar el alumno'));
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (option: VoteOption) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni, option }),
      });

      const data: ApiErrorResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Error al registrar el voto');
      }

      setStep('done');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Ocurrió un error al votar'));
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
          'linear-gradient(180deg, #111111 0%, #1a1a1a 20%, #2b0000 20%, #450000 100%)',
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
          maxWidth: '980px',
          background: '#111111',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
          border: '4px solid #b71c1c',
        }}
      >
        <header
          style={{
            background: 'linear-gradient(135deg, #000000 0%, #8b0000 100%)',
            color: 'white',
            padding: '28px 24px 20px 24px',
            textAlign: 'center',
            borderBottom: '2px solid #d32f2f',
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
                boxShadow: '0 6px 18px rgba(0,0,0,0.3)',
              }}
            >
              <Image
                src={institutionConfig.logoPath}
                alt={`Logo ${institutionConfig.schoolName}`}
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
            {institutionConfig.votingTitle}
          </h1>

          <p
            style={{
              marginTop: '10px',
              marginBottom: 0,
              fontSize: '1.1rem',
              opacity: 0.98,
            }}
          >
            {institutionConfig.schoolName} · {institutionConfig.city}
          </p>
        </header>

        <section
          style={{
            padding: '36px 28px 44px 28px',
            background: 'linear-gradient(180deg, #171717 0%, #220000 100%)',
            textAlign: 'center',
            color: 'white',
          }}
        >
          {step === 'dni' && (
            <div
              style={{
                maxWidth: '680px',
                margin: '0 auto',
                background: '#1b1b1b',
                border: '2px solid #7f1d1d',
                borderRadius: '20px',
                padding: '34px 24px',
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  color: '#ff5252',
                  fontSize: '1.9rem',
                }}
              >
                Ingreso de votante
              </h2>

              <p
                style={{
                  color: '#f1caca',
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
                  border: '2px solid #d32f2f',
                  outline: 'none',
                  textAlign: 'center',
                  color: '#b71c1c',
                  fontWeight: 700,
                  background: '#ffffff',
                }}
              />

              <div style={{ marginTop: '26px' }}>
                <button
                  onClick={handleSearch}
                  disabled={loading || !dni.trim()}
                  style={{
                    background: loading ? '#666666' : '#b71c1c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '16px 34px',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    minWidth: '210px',
                    boxShadow: '0 8px 18px rgba(183, 28, 28, 0.35)',
                  }}
                >
                  {loading ? 'Buscando...' : 'Verificar identidad'}
                </button>
              </div>
            </div>
          )}

          {step === 'confirm' && student && (
            <div
              style={{
                maxWidth: '720px',
                margin: '0 auto',
                background: '#1b1b1b',
                border: '2px solid #7f1d1d',
                borderRadius: '20px',
                padding: '34px 24px',
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  color: '#ff5252',
                  fontSize: '1.9rem',
                }}
              >
                Confirmación de identidad
              </h2>

              <div
                style={{
                  marginTop: '28px',
                  background: '#2a0d0d',
                  border: '2px solid #b71c1c',
                  borderRadius: '18px',
                  padding: '24px',
                }}
              >
                <p
                  style={{
                    margin: '0 0 10px 0',
                    fontSize: '2rem',
                    fontWeight: 800,
                    color: '#ffffff',
                  }}
                >
                  {student.fullName}
                </p>

                <p
                  style={{
                    margin: '8px 0',
                    fontSize: '1.3rem',
                    color: '#f5d3d3',
                  }}
                >
                  Curso: <b>{student.course}</b>
                </p>

                <p
                  style={{
                    margin: '8px 0 0 0',
                    fontSize: '1.1rem',
                    color: '#f1baba',
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
                    background: '#b71c1c',
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
                    color: '#b71c1c',
                    border: '2px solid #d32f2f',
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
          )}

          {step === 'vote' && (
            <div
              style={{
                maxWidth: '860px',
                margin: '0 auto',
                background: '#1b1b1b',
                border: '2px solid #7f1d1d',
                borderRadius: '20px',
                padding: '34px 24px',
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  color: '#ff5252',
                  fontSize: '2rem',
                }}
              >
                Emisión del voto
              </h2>

              <p
                style={{
                  color: '#f1caca',
                  fontSize: '1.1rem',
                  marginBottom: '28px',
                }}
              >
                Seleccione la lista de su preferencia
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: '18px',
                  maxWidth: '720px',
                  margin: '0 auto',
                }}
              >
                {institutionConfig.voteOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleVote(option)}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #000000 0%, #8b0000 100%)',
                      color: 'white',
                      border: '2px solid #d32f2f',
                      borderRadius: '18px',
                      padding: '24px 28px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 10px 24px rgba(183, 28, 28, 0.28)',
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      textAlign: 'center',
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {loading && (
                <p
                  style={{
                    marginTop: '24px',
                    color: '#ff8a80',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                  }}
                >
                  Registrando voto...
                </p>
              )}
            </div>
          )}

          {step === 'done' && (
            <div
              style={{
                maxWidth: '680px',
                margin: '0 auto',
                background: '#1b1b1b',
                border: '2px solid #388e3c',
                borderRadius: '20px',
                padding: '38px 24px',
              }}
            >
              <div style={{ fontSize: '4rem', marginBottom: '10px' }}>✅</div>

              <h2
                style={{
                  marginTop: 0,
                  color: '#66bb6a',
                  fontSize: '2rem',
                }}
              >
                Voto registrado correctamente
              </h2>

              <p
                style={{
                  color: '#d9f5da',
                  fontSize: '1.15rem',
                  marginBottom: '10px',
                }}
              >
                Gracias por participar de la elección
              </p>

              <p
                style={{
                  color: '#cccccc',
                  fontSize: '1rem',
                  marginTop: '18px',
                }}
              >
                La pantalla volverá al inicio automáticamente en unos segundos
              </p>
            </div>
          )}

          {error && (
            <div
              style={{
                maxWidth: '680px',
                margin: '22px auto 0 auto',
                background: '#3b0a0a',
                border: '2px solid #d32f2f',
                color: '#ff8a80',
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
            background: '#000000',
            color: '#ff8a80',
            textAlign: 'center',
            padding: '14px 18px',
            fontWeight: 700,
            borderTop: '2px solid #b71c1c',
          }}
        >
          {institutionConfig.footerVoting}
        </footer>
      </div>
    </main>
  );
}