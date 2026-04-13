export const institutionConfig = {
  schoolName: 'Colegio Secundario "Dr. Juan Eusebio Torrent"',
  city: 'Goya, Corrientes',
  systemName: 'Sistema de Votación Institucional',
  votingTitle: 'Elecciones Centro de Estudiantes',
  adminPanelTitle: 'Mesa Electoral',
  adminLoginTitle: 'Login administrador',
  logoPath: '/logo-torrent.png',
  footerVoting: 'Colegio Secundario "Dr. Juan Eusebio Torrent" · Sistema de votación estudiantil',
  footerAdmin: 'Colegio Secundario "Dr. Juan Eusebio Torrent" · Mesa electoral',
  voteOptions: [
    'Lista N°1 Ayelen Ponce (presidente)',
    'Lista N°7 Facundo Molina (presidente)',
    'Lista N°10 Carolina Grachot (presidente)',
  ] as const,
};

export type VoteOption = (typeof institutionConfig.voteOptions)[number];