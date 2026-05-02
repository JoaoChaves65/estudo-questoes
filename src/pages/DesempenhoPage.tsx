import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { AppSelect, type AppSelectOption } from '../components/AppSelect';
import { Layout } from '../components/Layout';
import { useDesempenhoStore } from '../store/useDesempenhoStore';
import type { Disciplina, EstatQuestao } from '../types';

const OPCOES_ORDENACAO_DESEMPENHO: AppSelectOption[] = [
  { value: 'percErro-desc', label: '% erro (maior primeiro)' },
  { value: 'percErro-asc', label: '% erro (menor primeiro)' },
  { value: 'total-desc', label: 'Total respostas (maior)' },
  { value: 'total-asc', label: 'Total respostas (menor)' },
];

const COLOR_ACERTO = '#4ade80';
const COLOR_ERRO = '#f87171';
const COLOR_PULADA = '#94a3b8';

type LinhaQuestao = {
  disciplinaId: string;
  disciplinaNome: string;
  questaoId: string;
  enunciado: string;
  rotuloCurto: string;
  acertos: number;
  erros: number;
  puladas: number;
  totalRespostas: number;
  percAcerto: number;
  percErro: number;
};

type Ordenacao = 'percErro-desc' | 'percErro-asc' | 'total-desc' | 'total-asc';

type DesempenhoPageProps = {
  disciplinas: Disciplina[];
  onVoltar: () => void;
};

function montarLinhas(
  disciplinas: Disciplina[],
  por: Record<string, Record<string, EstatQuestao>>,
  filtroDisciplinaId: string,
): LinhaQuestao[] {
  const lista: LinhaQuestao[] = [];
  const alvo =
    filtroDisciplinaId.length > 0
      ? disciplinas.filter((d) => d.id === filtroDisciplinaId)
      : disciplinas;

  for (const d of alvo) {
    const mapQuest = por[d.id];
    if (!mapQuest) {
      continue;
    }

    for (const q of d.questoes) {
      const e = mapQuest[q.id];
      if (!e) {
        continue;
      }
      const interacoes = e.acertos + e.erros + e.puladas;
      if (interacoes === 0) {
        continue;
      }
      const totalRespostas = e.acertos + e.erros;
      const percAcerto =
        totalRespostas > 0 ? Math.round((e.acertos / totalRespostas) * 1000) / 10 : 0;
      const percErro =
        totalRespostas > 0 ? Math.round((e.erros / totalRespostas) * 1000) / 10 : 0;

      const rotuloBase = q.enunciado.trim().slice(0, 48);
      const rotuloCurto =
        rotuloBase.length < q.enunciado.trim().length ? `${rotuloBase}…` : rotuloBase;

      lista.push({
        disciplinaId: d.id,
        disciplinaNome: d.nome,
        questaoId: q.id,
        enunciado: q.enunciado,
        rotuloCurto: rotuloCurto || q.id.slice(0, 12),
        acertos: e.acertos,
        erros: e.erros,
        puladas: e.puladas,
        totalRespostas,
        percAcerto,
        percErro,
      });
    }
  }
  return lista;
}

function ordenarLinhas(rows: LinhaQuestao[], ordenacao: Ordenacao): LinhaQuestao[] {
  const next = [...rows];
  const cmp = (a: LinhaQuestao, b: LinhaQuestao, key: 'percErro' | 'total') => {
    if (key === 'percErro') {
      const d = a.percErro - b.percErro;
      return d !== 0 ? d : b.totalRespostas - a.totalRespostas;
    }
    const d = a.totalRespostas - b.totalRespostas;
    return d !== 0 ? d : b.percErro - a.percErro;
  };
  next.sort((a, b) => {
    switch (ordenacao) {
      case 'percErro-desc':
        return -cmp(a, b, 'percErro');
      case 'percErro-asc':
        return cmp(a, b, 'percErro');
      case 'total-desc':
        return -cmp(a, b, 'total');
      case 'total-asc':
        return cmp(a, b, 'total');
      default:
        return 0;
    }
  });
  return next;
}

/** Linha agregada nos gráficos de barras (taxa de erro + empilhado). */
type BarDetalheLinha = {
  rotulo: string;
  percErro: number;
  acertos: number;
  erros: number;
  enunciado: string;
  disciplinaNome: string;
  totalRespostas: number;
};

function useChartsCompacto() {
  const [compacto, setCompacto] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)');
    const aplicar = () => setCompacto(mq.matches);
    aplicar();
    mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  }, []);
  return compacto;
}

function PainelDetalheGrafico({
  children,
  onFechar,
}: {
  children: ReactNode;
  onFechar: () => void;
}) {
  return (
    <div className="desempenho-tap-detail">
      <div className="desempenho-tap-detail__body">{children}</div>
      <button type="button" className="button button--secondary desempenho-tap-detail__fechar" onClick={onFechar}>
        Fechar
      </button>
    </div>
  );
}

export function DesempenhoPage({ disciplinas, onVoltar }: DesempenhoPageProps) {
  const porDisciplina = useDesempenhoStore((s) => s.porDisciplina);

  const chartsCompacto = useChartsCompacto();

  const [filtroDisciplinaId, setFiltroDisciplinaId] = useState('');
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('percErro-desc');
  const [pizzaSelecionada, setPizzaSelecionada] = useState<number | null>(null);
  const [detalheBarraErro, setDetalheBarraErro] = useState<BarDetalheLinha | null>(null);
  const [detalheBarraStack, setDetalheBarraStack] = useState<BarDetalheLinha | null>(null);

  const linhas = useMemo(
    () => montarLinhas(disciplinas, porDisciplina, filtroDisciplinaId),
    [disciplinas, porDisciplina, filtroDisciplinaId],
  );

  const linhasOrdenadas = useMemo(() => ordenarLinhas(linhas, ordenacao), [linhas, ordenacao]);

  const opcoesDisciplinaFiltro = useMemo<AppSelectOption[]>(
    () => [
      { value: '', label: 'Todas as disciplinas' },
      ...disciplinas.map((d) => ({ value: d.id, label: d.nome })),
    ],
    [disciplinas],
  );

  const totais = useMemo(() => {
    let acertos = 0;
    let erros = 0;
    let puladas = 0;
    for (const r of linhas) {
      acertos += r.acertos;
      erros += r.erros;
      puladas += r.puladas;
    }
    const totalRespostas = acertos + erros;
    const taxaAcerto =
      totalRespostas > 0 ? Math.round((acertos / totalRespostas) * 1000) / 10 : 0;
    return { acertos, erros, puladas, totalRespostas, taxaAcerto };
  }, [linhas]);

  const pieData = useMemo(
    () => [
      { name: 'Acertos', value: totais.acertos, fill: COLOR_ACERTO },
      { name: 'Erros', value: totais.erros, fill: COLOR_ERRO },
      { name: 'Puladas', value: totais.puladas, fill: COLOR_PULADA },
    ],
    [totais.acertos, totais.erros, totais.puladas],
  );

  const minRespostas = 2;
  const topPorErro = useMemo(() => {
    const eligible = linhas.filter((r) => r.totalRespostas >= minRespostas);
    const sorted = [...eligible].sort((a, b) => {
      const d = b.percErro - a.percErro;
      return d !== 0 ? d : b.totalRespostas - a.totalRespostas;
    });
    return sorted.slice(0, 10).map((r) => ({
      rotulo: r.rotuloCurto,
      percErro: r.percErro,
      acertos: r.acertos,
      erros: r.erros,
      enunciado: r.enunciado,
      disciplinaNome: r.disciplinaNome,
      totalRespostas: r.totalRespostas,
    }));
  }, [linhas]);

  const topStacked = topPorErro.map((r) => ({
    rotulo: r.rotulo,
    Acertos: r.acertos,
    Erros: r.erros,
    enunciado: r.enunciado,
    disciplinaNome: r.disciplinaNome,
    totalRespostas: r.totalRespostas,
  }));

  useEffect(() => {
    setPizzaSelecionada(null);
    setDetalheBarraErro(null);
    setDetalheBarraStack(null);
  }, [filtroDisciplinaId]);

  const aoClicarFatia = (_state: unknown, index: number | string) => {
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i >= pieData.length) {
      return;
    }
    setPizzaSelecionada((prev) => (prev === i ? null : i));
  };

  const aoClicarBarraErro = (_state: unknown, index: number | string) => {
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i >= topPorErro.length) {
      return;
    }
    const row = topPorErro[i] as BarDetalheLinha;
    setDetalheBarraErro((prev) =>
      prev?.rotulo === row.rotulo && prev.disciplinaNome === row.disciplinaNome ? null : row,
    );
  };

  const aoClicarBarraStack = (_state: unknown, index: number | string) => {
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i >= topPorErro.length) {
      return;
    }
    const row = topPorErro[i] as BarDetalheLinha;
    setDetalheBarraStack((prev) =>
      prev?.rotulo === row.rotulo && prev.disciplinaNome === row.disciplinaNome ? null : row,
    );
  };

  const raioPizza = chartsCompacto ? 68 : 100;
  const altChartPizza = chartsCompacto ? 220 : 280;
  const altChartBarrasH = chartsCompacto ? 260 : 320;
  const altChartStack = chartsCompacto ? 240 : 300;
  const yAxisBarras = chartsCompacto ? 72 : 130;

  const tooltipClasses = {
    contentStyle: {
      backgroundColor: 'rgba(15,23,42,0.95)',
      border: '1px solid rgba(148,163,184,0.25)',
      borderRadius: 8,
    },
    labelStyle: { color: '#e2e8f0' },
    itemStyle: { color: '#e2e8f0' },
  };

  const fatiaDetalhe =
    pizzaSelecionada != null &&
    pizzaSelecionada >= 0 &&
    pizzaSelecionada < pieData.length
      ? pieData[pizzaSelecionada]
      : null;

  return (
    <Layout
      titulo="Desempenho por questão"
      subtitulo="Estatísticas acumuladas do modo estudo e do estudo inteligente. Altere a disciplina ou ordene a tabela para explorar."
      acoes={
        <button type="button" className="button button--secondary" onClick={onVoltar}>
          Voltar
        </button>
      }
    >
      <div className="desempenho-page">
      <section className="card desempenho-filter-card">
        <div className="desempenho-field">
          <label htmlFor="desempenho-disciplina" className="desempenho-field__label">
            Disciplina
          </label>
          <AppSelect
            id="desempenho-disciplina"
            value={filtroDisciplinaId}
            options={opcoesDisciplinaFiltro}
            onChange={(v) => setFiltroDisciplinaId(v)}
            listaAriaLabel="Disciplinas no filtro de desempenho"
          />
        </div>
      </section>

      {linhas.length === 0 ? (
        <section className="card empty-state">
          <p>Ainda não há dados de desempenho registrados para este filtro.</p>
          <p className="muted">Responda ou pule questões no estudo ou no estudo inteligente.</p>
        </section>
      ) : (
        <>
          <section className="stats-grid">
            <div className="card stat-card">
              <span className="muted">Respostas (acerto + erro)</span>
              <strong>{totais.totalRespostas}</strong>
            </div>
            <div className="card stat-card">
              <span className="muted">Puladas</span>
              <strong>{totais.puladas}</strong>
            </div>
            <div className="card stat-card">
              <span className="muted">Taxa de acerto</span>
              <strong className="text-success">{totais.taxaAcerto}%</strong>
            </div>
            <div className="card stat-card">
              <span className="muted">Questões com dados</span>
              <strong>{linhas.length}</strong>
            </div>
          </section>

          <div className="desempenho-charts-grid">
            <section className="card desempenho-chart">
              <h2 className="desempenho-chart__titulo">Distribuição agregada</h2>
              <p className="muted desempenho-chart__hint">
                Proporção entre acertos, erros e pulos no filtro atual.{' '}
                <strong>Toque ou clique numa fatia</strong> para ver os números; no computador também
                funciona ao passar o mouse.
              </p>
              <div className="desempenho-chart__plot" style={{ height: altChartPizza }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={raioPizza}
                      cursor="pointer"
                      labelLine={false}
                      onClick={aoClicarFatia}
                      label={
                        chartsCompacto
                          ? false
                          : (props: { name?: string; value?: number }) =>
                              `${props.name ?? ''}: ${props.value ?? 0}`
                      }
                    >
                      {pieData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.fill}
                          opacity={pizzaSelecionada === null || pizzaSelecionada === i ? 1 : 0.38}
                          stroke={pizzaSelecionada === i ? '#e2e8f0' : 'transparent'}
                          strokeWidth={pizzaSelecionada === i ? 2 : 0}
                        />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipClasses} wrapperStyle={{ zIndex: 5 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {fatiaDetalhe ? (
                <PainelDetalheGrafico onFechar={() => setPizzaSelecionada(null)}>
                  <p className="desempenho-tap-detail__titulo">{fatiaDetalhe.name}</p>
                  <p className="muted" style={{ marginBottom: 0 }}>
                    Quantidade registrada neste filtro: <strong>{fatiaDetalhe.value}</strong>
                  </p>
                </PainelDetalheGrafico>
              ) : null}
            </section>

            <section className="card desempenho-chart">
              <h2 className="desempenho-chart__titulo">
                Maior taxa de erro (mín. {minRespostas} respostas)
              </h2>
              <p className="muted desempenho-chart__hint">
                Até 10 questões. <strong>Toque ou clique numa barra</strong> para ver disciplina,
                enunciado e contagens completas.
              </p>
              <div className="desempenho-chart__plot" style={{ height: altChartBarrasH }}>
                {topPorErro.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={topPorErro}
                      margin={{
                        left: chartsCompacto ? 0 : 8,
                        right: chartsCompacto ? 4 : 16,
                        top: 4,
                        bottom: chartsCompacto ? 8 : 4,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fontSize: chartsCompacto ? 9 : 11 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="rotulo"
                        width={yAxisBarras}
                        tick={{ fontSize: chartsCompacto ? 8 : 10 }}
                        interval={0}
                      />
                      <Tooltip
                        {...tooltipClasses}
                        wrapperStyle={{ zIndex: 5 }}
                        formatter={(value) =>
                          `${typeof value === 'number' ? value : Number(value)}%`
                        }
                        labelFormatter={(_, payload) => {
                          const item = payload?.[0]?.payload as (typeof topPorErro)[0] | undefined;
                          return item ? `${item.disciplinaNome} — ${item.enunciado}` : '';
                        }}
                      />
                      <Bar
                        dataKey="percErro"
                        name="% erro"
                        fill={COLOR_ERRO}
                        radius={[0, 6, 6, 0]}
                        cursor="pointer"
                        onClick={aoClicarBarraErro}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="muted">
                    Nenhuma questão com pelo menos {minRespostas} respostas (acerto ou erro) neste
                    filtro.
                  </p>
                )}
              </div>
              {detalheBarraErro ? (
                <PainelDetalheGrafico onFechar={() => setDetalheBarraErro(null)}>
                  <p className="desempenho-tap-detail__titulo muted">{detalheBarraErro.disciplinaNome}</p>
                  <p style={{ margin: '8px 0 12px', lineHeight: 1.45 }}>{detalheBarraErro.enunciado}</p>
                  <ul className="desempenho-tap-detail__lista">
                    <li>
                      Taxa de erro: <strong className="text-error">{detalheBarraErro.percErro}%</strong>
                    </li>
                    <li>
                      Acertos / erros / respostas:{' '}
                      <strong>
                        {detalheBarraErro.acertos} / {detalheBarraErro.erros} /{' '}
                        {detalheBarraErro.totalRespostas}
                      </strong>
                    </li>
                  </ul>
                </PainelDetalheGrafico>
              ) : null}
            </section>
          </div>

          {topStacked.length > 0 ? (
            <section className="card desempenho-chart">
              <h2 className="desempenho-chart__titulo">
                Acertos vs erros (mesmas questões do gráfico anterior)
              </h2>
              <p className="muted desempenho-chart__hint">
                <strong>Toque numa barra empilhada</strong> para ver a questão com os mesmos dados do
                painel acima.
              </p>
              <div className="desempenho-chart__plot" style={{ height: altChartStack }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topStacked}
                      margin={{
                        left: chartsCompacto ? 0 : 4,
                        right: chartsCompacto ? 4 : 8,
                        bottom: chartsCompacto ? 36 : 16,
                      }}
                    >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="rotulo" hide />
                    <YAxis width={chartsCompacto ? 32 : 44} tick={{ fontSize: chartsCompacto ? 9 : 11 }} />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      wrapperStyle={{
                        paddingTop: 4,
                        width: '100%',
                        fontSize: chartsCompacto ? 10 : 12,
                      }}
                    />
                    <Tooltip
                      {...tooltipClasses}
                      wrapperStyle={{ zIndex: 5 }}
                      labelFormatter={(_, payload) => {
                        const p = payload?.[0]?.payload as (typeof topStacked)[0] | undefined;
                        return p ? `${p.disciplinaNome} — ${p.enunciado}` : '';
                      }}
                    />
                    <Bar
                      dataKey="Acertos"
                      stackId="stack"
                      fill={COLOR_ACERTO}
                      cursor="pointer"
                      onClick={aoClicarBarraStack}
                    />
                    <Bar
                      dataKey="Erros"
                      stackId="stack"
                      fill={COLOR_ERRO}
                      radius={[6, 6, 0, 0]}
                      cursor="pointer"
                      onClick={aoClicarBarraStack}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {detalheBarraStack ? (
                <PainelDetalheGrafico onFechar={() => setDetalheBarraStack(null)}>
                  <p className="desempenho-tap-detail__titulo muted">{detalheBarraStack.disciplinaNome}</p>
                  <p style={{ margin: '8px 0 12px', lineHeight: 1.45 }}>{detalheBarraStack.enunciado}</p>
                  <ul className="desempenho-tap-detail__lista">
                    <li className="text-success">Acertos: {detalheBarraStack.acertos}</li>
                    <li className="text-error">Erros: {detalheBarraStack.erros}</li>
                    <li>Total acerto + erro: {detalheBarraStack.totalRespostas}</li>
                  </ul>
                </PainelDetalheGrafico>
              ) : null}
            </section>
          ) : null}

          <section className="card">
            <div className="desempenho-table-toolbar">
              <label htmlFor="desempenho-ordenacao" className="desempenho-field__label">
                Ordenar tabela
              </label>
              <AppSelect
                id="desempenho-ordenacao"
                value={ordenacao}
                options={OPCOES_ORDENACAO_DESEMPENHO}
                onChange={(v) => setOrdenacao(v as Ordenacao)}
                listaAriaLabel="Critérios de ordenação da tabela"
              />
            </div>
            <div className="table-scroll">
              <table className="desempenho-table">
                <thead>
                  <tr>
                    <th>Disciplina</th>
                    <th>Questão</th>
                    <th>Acertos</th>
                    <th>Erros</th>
                    <th>Puladas</th>
                    <th>Total (A+E)</th>
                    <th>% acerto</th>
                  </tr>
                </thead>
                <tbody>
                  {linhasOrdenadas.map((r) => (
                    <tr key={`${r.disciplinaId}-${r.questaoId}`}>
                      <td>{r.disciplinaNome}</td>
                      <td title={r.enunciado}>{r.rotuloCurto}</td>
                      <td className="text-success">{r.acertos}</td>
                      <td className="text-error">{r.erros}</td>
                      <td>{r.puladas}</td>
                      <td>{r.totalRespostas}</td>
                      <td>{r.totalRespostas > 0 ? `${r.percAcerto}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      </div>
    </Layout>
  );
}
