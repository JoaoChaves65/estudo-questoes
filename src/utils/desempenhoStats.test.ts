import { describe, expect, it } from 'vitest';

import type { DesempenhoSnapshot } from '../types';
import { sanitizarDesempenho } from './backup';
import { estatVazia, registrarNoEstat } from './desempenhoStats';

describe('registrarNoEstat', () => {
  it('incrementa campo correto a partir do vazio', () => {
    expect(registrarNoEstat(undefined, 'acerto')).toEqual({
      acertos: 1,
      erros: 0,
      puladas: 0,
    });
    expect(registrarNoEstat(undefined, 'erro')).toEqual({
      acertos: 0,
      erros: 1,
      puladas: 0,
    });
    expect(registrarNoEstat(undefined, 'pular')).toEqual({
      acertos: 0,
      erros: 0,
      puladas: 1,
    });
  });

  it('mantem e acumula valores anteriores', () => {
    const base = { acertos: 2, erros: 1, puladas: 3 };
    expect(registrarNoEstat(base, 'acerto')).toEqual({
      acertos: 3,
      erros: 1,
      puladas: 3,
    });
    expect(estatVazia()).toEqual({
      acertos: 0,
      erros: 0,
      puladas: 0,
    });
  });
});

describe('sanitizarDesempenho', () => {
  it('trunca IDs e forca numeros >= 0 inteiros', () => {
    const raw: DesempenhoSnapshot = {
      porDisciplina: {
        ' disc1 ': {
          ' q1 ': { acertos: 1.9, erros: -2, puladas: 3.2 },
        },
      },
    };
    expect(sanitizarDesempenho(raw)).toEqual({
      porDisciplina: {
        disc1: {
          q1: { acertos: 1, erros: 0, puladas: 3 },
        },
      },
    });
  });
});
