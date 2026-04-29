import { describe, expect, it } from 'vitest';

import { parseQuestoesComDiagnostico } from './parser';

describe('parseQuestoesComDiagnostico regressions', () => {
  it('separa Bloco 1/Bloco 2 das alternativas de resposta', () => {
    const texto = `1) A integração de tecnologias e práticas de treinamento no gerenciamento de projetos é essencial para a eficiência e eficácia operacional das organizações. As ferramentas tecnológicas não apenas simplificam tarefas, mas também aprimoram a comunicação e colaboração, enquanto os programas de treinamento asseguram que as equipes estejam bem-preparadas para enfrentar os desafios dos projetos. Relacione o primeiro bloco com o segundo e, na sequência, marque a alternativa que traz corretamente a combinação correta entre os itens do primeiro e segundo blocos.
Bloco 1:
A) Implementação de softwares de gerenciamento de projetos.
B) Realização de workshops interativos e sessões de coaching.
C) Utilização de ferramentas de comunicação e colaboração.
Bloco 2:
I – Melhora a preparação das equipes e a aplicação prática dos conceitos de gerenciamento.
II – Facilita a troca de informações em tempo real e melhora a colaboração entre equipes.
III – Auxilia na organização de tarefas e no monitoramento do progresso do projeto.
Alternativas:
A) A – II, B – I, C – III.
B) A – III, B – I, C – II.
C) A – I, B – II, C – III.
D) A – III, B – II, C – I.
E) A – II, B – III, C – I.
Explicação
GABARITO: B`;

    const resultado = parseQuestoesComDiagnostico(texto);
    expect(resultado.erros).toHaveLength(0);
    expect(resultado.questoes).toHaveLength(1);
    expect(resultado.questoes[0]?.respostaCorreta).toBe('B');
    expect(resultado.questoes[0]?.alternativas).toHaveLength(5);
    expect(resultado.questoes[0]?.alternativas[0]?.texto).toContain('A – II, B – I, C – III');
    expect(resultado.questoes[0]?.enunciado).toContain('Bloco 1');
    expect(resultado.questoes[0]?.enunciado).toContain('Bloco 2');
    expect(resultado.avisos).toHaveLength(0);
  });

  it('nao mistura texto da questao seguinte ao avancar blocos', () => {
    const texto = `1) Enunciado da questão 1.
Alternativas:
A) Alternativa A1.
B) Alternativa B1.
C) Alternativa C1.
D) Alternativa D1.
E) Alternativa E1.
Explicação: Detalhe da questão 1.
GABARITO: A

2) Enunciado da questão 2 sem resíduos da anterior.
Alternativas:
A) Alternativa A2 correta.
B) Alternativa B2.
C) Alternativa C2.
D) Alternativa D2.
E) Alternativa E2.
Explicação: Detalhe da questão 2.
GABARITO: A`;

    const resultado = parseQuestoesComDiagnostico(texto);
    expect(resultado.erros).toHaveLength(0);
    expect(resultado.questoes).toHaveLength(2);
    expect(resultado.questoes[1]?.enunciado).toContain('questão 2');
    expect(resultado.questoes[1]?.enunciado).not.toContain('questão 1');
    expect(resultado.questoes[1]?.alternativas[0]?.texto).toContain('Alternativa A2');
  });
});
