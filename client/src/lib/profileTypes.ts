export interface AgronomistaProfile {
  nome: string;
  crea: string;
  empresa: string;
  email: string;
  telefone: string;
}

export interface Propriedade {
  id: string;
  nome: string;
  municipio: string;
  uf: string;
  talhoes: string[];
}

export const profileVazio: AgronomistaProfile = {
  nome: '', crea: '', empresa: '', email: '', telefone: '',
};
