import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  Users, Award, Calendar, Search, 
  Plus, Trash2, Edit3, CheckCircle2, ChevronDown, ChevronUp, LogOut, ArrowRight, KeyRound 
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const salvo = localStorage.getItem('jl_vendedor_ativo');
      if (!salvo) return null;
      const parsed = JSON.parse(salvo);
      return (parsed && parsed.id) ? parsed : null;
    } catch {
      return null;
    }
  });

  // Estados de Autenticação / Recuperação
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'forgot'
  const [authIdentificador, setAuthIdentificador] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authPin, setAuthPin] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Estados Globais
  const [tab, setTab] = useState('dashboard');
  const [settings, setSettings] = useState({ id: null, meta_faturamento: 81000 });
  const [clientes, setClientes] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [positivacoes, setPositivacoes] = useState([]);

  // Modais e Filtros
  const [busca, setBusca] = useState('');
  const [showPositivadosToggle, setShowPositivadosToggle] = useState(false);
  const [modalNovoCliente, setModalNovoCliente] = useState(false);
  const [novoCliente, setNovoCliente] = useState({ nome: '', endereco: '' });

  const [modalPedido, setModalPedido] = useState(null);
  const [valorPedido, setValorPedido] = useState('');

  const [modalPositivacao, setModalPositivacao] = useState(null);
  const [modalNovaMarca, setModalNovaMarca] = useState(false);
  const [novaMarca, setNovaMarca] = useState({ nome: '', meta: '' });
  const [selectedMarca, setSelectedMarca] = useState(null);

  useEffect(() => {
    if (currentUser?.id) {
      carregarDados();
    } else {
      setClientes([]);
      setPedidos([]);
      setPositivacoes([]);
    }
  }, [currentUser]);

  async function carregarDados() {
    if (!currentUser?.id) return;

    const { data: setts } = await supabase
      .from('app_settings')
      .select('*')
      .eq('vendedor_id', currentUser.id)
      .maybeSingle();

    if (setts) {
      setSettings(setts);
    } else {
      const { data: novoSet } = await supabase
        .from('app_settings')
        .insert([{ vendedor_id: currentUser.id, meta_faturamento: 81000 }])
        .select()
        .single();
      if (novoSet) setSettings(novoSet);
    }

    const { data: clis } = await supabase
      .from('clientes')
      .select('*')
      .eq('vendedor_id', currentUser.id)
      .order('nome');
    setClientes(clis || []);

    const { data: mrcs } = await supabase
      .from('marcas')
      .select('*')
      .order('nome');
    setMarcas(mrcs || []);

    const { data: peds } = await supabase
      .from('pedidos')
      .select('*')
      .eq('vendedor_id', currentUser.id);
    setPedidos(peds || []);

    const { data: poss } = await supabase
      .from('positivacoes')
      .select('*')
      .eq('vendedor_id', currentUser.id);
    setPositivacoes(poss || []);
  }

  // --- AUTENTICAÇÃO E RECUPERAÇÃO ---
  async function handleAuth(e) {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    const idLimpo = authIdentificador.trim().toLowerCase();
    const pass = authPassword.trim();
    const pin = authPin.trim();

    try {
      if (authMode === 'register') {
        const { data: existente } = await supabase
          .from('vendedores')
          .select('id')
          .eq('identificador', idLimpo)
          .maybeSingle();

        if (existente) throw new Error('Celular/E-mail já cadastrado.');

        const { data: novo, error: insErr } = await supabase
          .from('vendedores')
          .insert([{ identificador: idLimpo, senha: pass, recuperacao_pin: pin }])
          .select()
          .single();

        if (insErr) throw insErr;

        const sessionObj = { id: novo.id, identificador: novo.identificador };
        localStorage.setItem('jl_vendedor_ativo', JSON.stringify(sessionObj));
        setCurrentUser(sessionObj);
      } else if (authMode === 'login') {
        const { data: user, error: selErr } = await supabase
          .from('vendedores')
          .select('id, identificador')
          .eq('identificador', idLimpo)
          .eq('senha', pass)
          .maybeSingle();

        if (selErr) throw selErr;
        if (!user) throw new Error('Identificador ou senha incorretos.');

        const sessionObj = { id: user.id, identificador: user.identificador };
        localStorage.setItem('jl_vendedor_ativo', JSON.stringify(sessionObj));
        setCurrentUser(sessionObj);
      } else if (authMode === 'forgot') {
        // Redefine a senha verificando o PIN de segurança
        const { data: user, error: pinErr } = await supabase
          .from('vendedores')
          .select('id')
          .eq('identificador', idLimpo)
          .eq('recuperacao_pin', pin)
          .maybeSingle();

        if (pinErr || !user) throw new Error('Identificador ou PIN de recuperação incorretos.');

        const { error: updErr } = await supabase
          .from('vendedores')
          .update({ senha: pass })
          .eq('id', user.id);

        if (updErr) throw updErr;

        setAuthSuccess('Senha redefinida com sucesso! Faça login com sua nova senha.');
        setAuthMode('login');
      }
    } catch (err) {
      setAuthError(err.message || 'Erro na operação.');
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('jl_vendedor_ativo');
    setCurrentUser(null);
  }

  // --- CÁLCULO DE DIAS ÚTEIS E LACUNA ---
  function getDiasUteisRestantes() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();
    let diasUteis = 0;

    for (let dia = hoje.getDate(); dia <= ultimoDia; dia++) {
      const d = new Date(ano, mes, dia);
      const diaSemana = d.getDay();
      if (diaSemana !== 0 && diaSemana !== 6) {
        diasUteis++;
      }
    }
    return diasUteis === 0 ? 1 : diasUteis;
  }

  const faturamentoReal = pedidos.reduce((acc, p) => acc + Number(p.valor || 0), 0);
  const lacunaTotal = Math.max(0, settings.meta_faturamento - faturamentoReal);
  const diasUteisRestantes = getDiasUteisRestantes();
  const lacunaDiaria = lacunaTotal / diasUteisRestantes;
  const lacunaSemanal = lacunaDiaria * Math.min(5, diasUteisRestantes);

  const clientesIdsComPedido = new Set(pedidos.map(p => p.cliente_id));
  const clientesPositivados = clientes.filter(c => clientesIdsComPedido.has(c.id));
  const clientesNaoPositivados = clientes.filter(c => !clientesIdsComPedido.has(c.id));

  // --- GESTÃO DE CLIENTES E PEDIDOS ---
  async function cadastrarCliente(e) {
    e.preventDefault();
    if (!novoCliente.nome.trim() || !currentUser?.id) return;

    const { data, error } = await supabase.from('clientes').insert([{
      vendedor_id: currentUser.id,
      nome: novoCliente.nome.trim(),
      endereco: novoCliente.endereco.trim() || null
    }]).select();

    if (error) {
      alert('Erro ao salvar cliente: ' + error.message);
    } else if (data) {
      setClientes([...clientes, data[0]]);
      setNovoCliente({ nome: '', endereco: '' });
      setModalNovoCliente(false);
    }
  }

  async function salvarPedido(clienteId) {
    const valor = parseFloat(valorPedido);
    if (isNaN(valor) || !currentUser?.id) return;

    const existente = pedidos.find(p => p.cliente_id === clienteId && p.vendedor_id === currentUser.id);
    if (existente) {
      await supabase.from('pedidos').update({ valor }).eq('id', existente.id);
    } else {
      await supabase.from('pedidos').insert([{ 
        vendedor_id: currentUser.id,
        cliente_id: clienteId, 
        valor 
      }]);
    }
    setModalPedido(null);
    setValorPedido('');
    carregarDados();
  }

  async function removerPedido(clienteId) {
    await supabase.from('pedidos').delete().match({ cliente_id: clienteId, vendedor_id: currentUser.id });
    setModalPedido(null);
    carregarDados();
  }

  // --- POSITIVAÇÃO INSTANTÂNEA (ZERO DELAY COM ATUALIZAÇÃO OTIMISTA) ---
  async function alternarPositivacaoMarca(clienteId, marcaId) {
    if (!currentUser?.id) return;
    const jaExiste = positivacoes.find(p => p.cliente_id === clienteId && p.marca_id === marcaId && p.vendedor_id === currentUser.id);

    if (jaExiste) {
      // Remove instantaneamente da interface
      setPositivacoes(positivacoes.filter(p => p.id !== jaExiste.id));
      await supabase.from('positivacoes').delete().eq('id', jaExiste.id);
    } else {
      // Adiciona instantaneamente com ID temporário
      const tempItem = {
        id: 'temp-' + Date.now(),
        vendedor_id: currentUser.id,
        cliente_id: clienteId,
        marca_id: marcaId
      };
      setPositivacoes([...positivacoes, tempItem]);

      const { data } = await supabase.from('positivacoes').insert([{ 
        vendedor_id: currentUser.id,
        cliente_id: clienteId, 
        marca_id: marcaId 
      }]).select().single();

      if (data) {
        setPositivacoes(prev => prev.map(p => p.id === tempItem.id ? data : p));
      }
    }
  }

  async function cadastrarMarca(e) {
    e.preventDefault();
    if (!novaMarca.nome.trim()) return;

    const { data, error } = await supabase.from('marcas').insert([{
      nome: novaMarca.nome.trim(),
      meta_positivacoes: parseInt(novaMarca.meta) || 0
    }]).select();

    if (error) {
      alert('Erro ao salvar marca: ' + error.message);
    } else if (data) {
      setMarcas([...marcas, data[0]]);
      setNovaMarca({ nome: '', meta: '' });
      setModalNovaMarca(false);
    }
  }

  async function atualizarMetaMarca(marcaId, novaMeta) {
    await supabase.from('marcas').update({ meta_positivacoes: parseInt(novaMeta) || 0 }).eq('id', marcaId);
    carregarDados();
  }

  async function excluirMarca(marcaId) {
    if (confirm('Deseja excluir esta marca do sistema?')) {
      await supabase.from('marcas').delete().eq('id', marcaId);
      setSelectedMarca(null);
      carregarDados();
    }
  }

  // --- ECRÃ DE AUTENTICAÇÃO ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl">
          <h1 className="text-2xl font-bold text-slate-800 text-center mb-1">JL Distribuidora</h1>
          <p className="text-slate-500 text-xs text-center mb-5">
            {authMode === 'register' && 'Cadastre-se como vendedor'}
            {authMode === 'login' && 'Acompanhamento Comercial & Metas'}
            {authMode === 'forgot' && 'Redefinição de Senha'}
          </p>

          {authError && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-lg text-xs">
              {authError}
            </div>
          )}
          {authSuccess && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-lg text-xs">
              {authSuccess}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Celular ou E-mail</label>
              <input 
                type="text" 
                required
                placeholder="Ex: 18999999999 ou email@jl.com" 
                value={authIdentificador}
                onChange={e => setAuthIdentificador(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {authMode !== 'login' && (
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  PIN de Recuperação (4 dígitos)
                </label>
                <input 
                  type="text" 
                  maxLength={6}
                  required
                  placeholder="Ex: 1234 (usado para recuperar a senha)" 
                  value={authPin}
                  onChange={e => setAuthPin(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                {authMode === 'forgot' ? 'Nova Senha' : 'Senha'}
              </label>
              <input 
                type="password" 
                required
                minLength={4}
                placeholder="Digite sua senha" 
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button 
              type="submit" 
              disabled={authLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-50 mt-1"
            >
              {authLoading ? 'Processando...' : 
                authMode === 'register' ? 'Cadastrar e Entrar' : 
                authMode === 'forgot' ? 'Redefinir e Salvar' : 'Entrar no Sistema'}
            </button>
          </form>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5 text-center">
            {authMode === 'login' ? (
              <>
                <button 
                  onClick={() => { setAuthMode('register'); setAuthError(''); }}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Novo vendedor? Cadastre-se aqui
                </button>
                <button 
                  onClick={() => { setAuthMode('forgot'); setAuthError(''); }}
                  className="text-[11px] text-slate-400 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </>
            ) : (
              <button 
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                Voltar para o Login
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-slate-100 max-w-md mx-auto md:max-w-4xl shadow-sm">
      {/* HEADER */}
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-20 flex justify-between items-center shadow-md">
        <div>
          <h1 className="text-lg font-bold">JL Distribuidora</h1>
          <p className="text-xs text-slate-400">Vendedor: {currentUser.identificador}</p>
        </div>
        <button onClick={handleLogout} className="text-slate-400 hover:text-white text-xs flex items-center gap-1 bg-slate-800 px-2 py-1.5 rounded">
          <LogOut size={14} /> Sair
        </button>
      </header>

      {/* ABAS */}
      <nav className="flex bg-white border-b border-slate-200">
        <button 
          onClick={() => setTab('dashboard')} 
          className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 ${tab === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
        >
          Dashboard
        </button>
        <button 
          onClick={() => setTab('clientes')} 
          className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 ${tab === 'clientes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
        >
          Clientes & Vendas
        </button>
        <button 
          onClick={() => setTab('marcas')} 
          className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 ${tab === 'marcas' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
        >
          Positivação Marcas
        </button>
      </nav>

      {/* CONTEÚDO */}
      <main className="p-4 space-y-4">
        {tab === 'dashboard' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Minha Meta de Faturamento</span>
                <button 
                  onClick={async () => {
                    const novo = prompt('Defina sua Meta Mensal (R$):', settings.meta_faturamento);
                    if (novo) {
                      const val = parseFloat(novo);
                      await supabase
                        .from('app_settings')
                        .update({ meta_faturamento: val })
                        .eq('vendedor_id', currentUser.id);
                      carregarDados();
                    }
                  }} 
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Edit3 size={12} /> Editar Meta
                </button>
              </div>

              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <span className="text-2xl font-extrabold text-slate-800">
                    R$ {faturamentoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-slate-500 ml-2">
                    de R$ {settings.meta_faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {Math.min(100, ((faturamentoReal / settings.meta_faturamento) * 100) || 0).toFixed(1)}%
                </span>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-2 mb-4 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all" 
                  style={{ width: `${Math.min(100, (faturamentoReal / settings.meta_faturamento) * 100)}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <div className="bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Calendar size={12} /> Dias Úteis Restantes
                  </span>
                  <p className="text-base font-bold text-slate-800 mt-0.5">{diasUteisRestantes} dias</p>
                </div>
                <div className="bg-amber-50 p-2.5 rounded-lg">
                  <span className="text-[10px] font-bold text-amber-700 uppercase">Lacuna Total</span>
                  <p className="text-base font-bold text-amber-900 mt-0.5">
                    R$ {lacunaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Lacuna Semanal</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">
                    R$ {lacunaSemanal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Meta / Dia Útil</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">
                    R$ {lacunaDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <div 
                onClick={() => setShowPositivadosToggle(!showPositivadosToggle)} 
                className="cursor-pointer flex justify-between items-center"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Positivação de Clientes</h3>
                  <p className="text-xs text-slate-500">
                    {clientesPositivados.length} positivados | {clientesNaoPositivados.length} faltam positivar
                  </p>
                </div>
                {showPositivadosToggle ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </div>

              {showPositivadosToggle && (
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-700 uppercase mb-1">Positivados ({clientesPositivados.length})</h4>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {clientesPositivados.map(c => (
                        <div key={c.id} className="text-xs bg-emerald-50 text-emerald-900 p-1.5 rounded flex justify-between">
                          <span>{c.nome}</span>
                          <span className="font-semibold">
                            R$ {(pedidos.find(p => p.cliente_id === c.id)?.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                      {clientesPositivados.length === 0 && <p className="text-xs text-slate-400">Nenhum cliente positivado.</p>}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-rose-700 uppercase mb-1">Faltam Positivar ({clientesNaoPositivados.length})</h4>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {clientesNaoPositivados.map(c => (
                        <div key={c.id} className="text-xs bg-slate-50 text-slate-700 p-1.5 rounded flex justify-between">
                          <span>{c.nome}</span>
                          <span className="text-[10px] text-slate-400">{c.endereco || 'Sem endereço'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setTab('clientes')} 
                className="bg-white border border-slate-200 p-4 rounded-xl text-left hover:border-blue-500 shadow-sm"
              >
                <Users size={20} className="text-blue-600 mb-1" />
                <h4 className="text-sm font-bold text-slate-800">Lançar Pedido</h4>
                <p className="text-[11px] text-slate-500">Cadastre clientes e informe pedidos</p>
              </button>
              <button 
                onClick={() => setTab('marcas')} 
                className="bg-white border border-slate-200 p-4 rounded-xl text-left hover:border-blue-500 shadow-sm"
              >
                <Award size={20} className="text-amber-600 mb-1" />
                <h4 className="text-sm font-bold text-slate-800">Positivação Marcas</h4>
                <p className="text-[11px] text-slate-500">Metas e marcas cadastradas</p>
              </button>
            </div>
          </div>
        )}

        {tab === 'clientes' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar por nome ou endereço..." 
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  className="w-full bg-white border border-slate-300 pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <button 
                onClick={() => setModalNovoCliente(true)} 
                className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1 shadow-sm"
              >
                <Plus size={18} /> Novo
              </button>
            </div>

            <div className="space-y-2">
              {clientes
                .filter(c => 
                  c.nome.toLowerCase().includes(busca.toLowerCase()) || 
                  (c.endereco && c.endereco.toLowerCase().includes(busca.toLowerCase()))
                )
                .map(cli => {
                  const pedido = pedidos.find(p => p.cliente_id === cli.id);
                  const positivadasCli = positivacoes.filter(p => p.cliente_id === cli.id);

                  return (
                    <div key={cli.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">{cli.nome}</h4>
                          <p className="text-xs text-slate-500">{cli.endereco || 'Endereço não informado'}</p>
                        </div>
                        {pedido && (
                          <div className="text-right">
                            <span className="text-xs text-slate-400 block">Pedido:</span>
                            <span className="text-sm font-bold text-emerald-600">
                              R$ {Number(pedido.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </div>

                      {positivadasCli.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {positivadasCli.map(pos => {
                            const m = marcas.find(marca => marca.id === pos.marca_id);
                            return (
                              <span key={pos.id} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                {m?.nome || 'Marca'}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <button 
                          onClick={() => {
                            setModalPedido(cli);
                            setValorPedido(pedido ? pedido.valor : '');
                          }}
                          className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-1.5 rounded text-xs font-semibold"
                        >
                          {pedido ? 'Editar Pedido' : 'Lançar Pedido'}
                        </button>
                        <button 
                          onClick={() => setModalPositivacao(cli)}
                          className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-1.5 rounded text-xs font-semibold"
                        >
                          Positivar ({positivadasCli.length})
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {tab === 'marcas' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">Catálogo das 12 Marcas</h3>
              <button 
                onClick={() => setModalNovaMarca(true)}
                className="text-xs bg-blue-600 text-white font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1"
              >
                <Plus size={14} /> Nova Marca
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {marcas.map(marca => {
                const totalPositivadas = positivacoes.filter(p => p.marca_id === marca.id).length;
                const meta = marca.meta_positivacoes || 0;
                const lacuna = Math.max(0, meta - totalPositivadas);

                return (
                  <div 
                    key={marca.id} 
                    onClick={() => setSelectedMarca(marca)}
                    className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 transition"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-bold text-slate-800 text-xs truncate">{marca.nome}</h4>
                      <ArrowRight size={10} className="text-slate-400" />
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-center pt-1.5 border-t border-slate-100">
                      <div>
                        <span className="text-[9px] text-slate-400 block">Meta</span>
                        <span className="text-xs font-bold text-slate-700">{meta}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-emerald-600 block">Real</span>
                        <span className="text-xs font-bold text-emerald-700">{totalPositivadas}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-amber-600 block">Falta</span>
                        <span className="text-xs font-bold text-amber-700">{lacuna}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* MODAL: NOVO CLIENTE */}
      {modalNovoCliente && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl p-5 shadow-lg">
            <h3 className="text-base font-bold text-slate-800 mb-3">Cadastrar Novo Cliente</h3>
            <form onSubmit={cadastrarCliente} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nome do Cliente *</label>
                <input 
                  type="text" 
                  required 
                  value={novoCliente.nome}
                  onChange={e => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Endereço (Opcional)</label>
                <input 
                  type="text" 
                  value={novoCliente.endereco}
                  onChange={e => setNovoCliente({ ...novoCliente, endereco: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModalNovoCliente(false)} className="flex-1 bg-slate-100 py-2 rounded text-xs font-semibold">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded text-xs font-semibold">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LANÇAR PEDIDO */}
      {modalPedido && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl p-5 shadow-lg">
            <h3 className="text-base font-bold text-slate-800 mb-1">Lançar Pedido</h3>
            <p className="text-xs text-slate-500 mb-4">{modalPedido.nome}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Valor do Pedido (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0,00"
                  value={valorPedido}
                  onChange={e => setValorPedido(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 text-base font-bold focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => removerPedido(modalPedido.id)} 
                  className="bg-rose-50 text-rose-700 px-3 py-2 rounded text-xs font-semibold flex items-center gap-1"
                >
                  <Trash2 size={14} /> Excluir
                </button>
                <button type="button" onClick={() => setModalPedido(null)} className="flex-1 bg-slate-100 py-2 rounded text-xs font-semibold">Fechar</button>
                <button type="button" onClick={() => salvarPedido(modalPedido.id)} className="flex-1 bg-blue-600 text-white py-2 rounded text-xs font-semibold">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: POSITIVAR MARCAS (GRADE COMPACTA COM ATUALIZAÇÃO INSTANTÂNEA) */}
      {modalPositivacao && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-md rounded-2xl p-4 shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-base font-bold text-slate-800">Positivação de Marcas</h3>
              <button onClick={() => setModalPositivacao(null)} className="text-slate-400 p-1 text-sm">✕</button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Cliente: <b className="text-slate-700">{modalPositivacao.nome}</b>. Toque nas marcas para marcar/desmarcar:
            </p>
            
            {/* Grade 3 colunas para ver todas as 12 marcas de uma vez */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto pr-0.5 py-1">
              {marcas.map(marca => {
                const isPositivada = positivacoes.some(p => p.cliente_id === modalPositivacao.id && p.marca_id === marca.id);
                return (
                  <button 
                    key={marca.id} 
                    type="button"
                    onClick={() => alternarPositivacaoMarca(modalPositivacao.id, marca.id)}
                    className={`py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 text-center border active:scale-95 ${
                      isPositivada 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{marca.nome}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isPositivada ? 'bg-blue-500 text-white' : 'text-slate-400'}`}>
                      {isPositivada ? '✓ Positivada' : '+ Positivar'}
                    </span>
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => setModalPositivacao(null)} 
              className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-xl text-xs font-bold mt-4 shadow-md"
            >
              Confirmar e Concluir
            </button>
          </div>
        </div>
      )}

      {/* MODAL: NOVA MARCA */}
      {modalNovaMarca && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl p-5 shadow-lg">
            <h3 className="text-base font-bold text-slate-800 mb-3">Cadastrar Nova Marca</h3>
            <form onSubmit={cadastrarMarca} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nome da Marca *</label>
                <input 
                  type="text" 
                  required 
                  value={novaMarca.nome}
                  onChange={e => setNovaMarca({ ...novaMarca, nome: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Meta Geral</label>
                <input 
                  type="number" 
                  value={novaMarca.meta}
                  onChange={e => setNovaMarca({ ...novaMarca, meta: e.target.value })}
                  placeholder="Ex: 20"
                  className="w-full border border-slate-300 rounded p-2 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModalNovaMarca(false)} className="flex-1 bg-slate-100 py-2 rounded text-xs font-semibold">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded text-xs font-semibold">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETALHES DA MARCA */}
      {selectedMarca && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl p-5 shadow-lg max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-lg font-bold text-slate-800">{selectedMarca.nome}</h3>
              <button onClick={() => setSelectedMarca(null)} className="text-slate-400">✕</button>
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-slate-500">Meta Geral:</span>
              <input 
                type="number" 
                defaultValue={selectedMarca.meta_positivacoes} 
                onBlur={e => atualizarMetaMarca(selectedMarca.id, e.target.value)}
                className="w-20 border border-slate-300 rounded px-2 py-0.5 text-xs font-bold"
              />
              <button onClick={() => excluirMarca(selectedMarca.id)} className="ml-auto text-rose-600 text-xs flex items-center gap-1">
                <Trash2 size={12} /> Excluir Marca
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <h4 className="text-xs font-bold text-emerald-700 uppercase mb-1">
                  Seus Clientes Positivados ({positivacoes.filter(p => p.marca_id === selectedMarca.id).length})
                </h4>
                <div className="space-y-1">
                  {clientes
                    .filter(c => positivacoes.some(p => p.cliente_id === c.id && p.marca_id === selectedMarca.id))
                    .map(c => (
                      <div key={c.id} className="text-xs bg-emerald-50 text-emerald-900 p-2 rounded flex justify-between items-center">
                        <span>{c.nome}</span>
                        <button 
                          onClick={() => alternarPositivacaoMarca(c.id, selectedMarca.id)} 
                          className="text-[10px] text-rose-600 hover:underline"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Seus Clientes Não Positivados</h4>
                <div className="space-y-1">
                  {clientes
                    .filter(c => !positivacoes.some(p => p.cliente_id === c.id && p.marca_id === selectedMarca.id))
                    .map(c => (
                      <div key={c.id} className="text-xs bg-slate-50 text-slate-700 p-2 rounded flex justify-between items-center">
                        <span>{c.nome}</span>
                        <button 
                          onClick={() => alternarPositivacaoMarca(c.id, selectedMarca.id)} 
                          className="text-[10px] text-blue-600 hover:underline font-semibold"
                        >
                          + Positivar
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <button onClick={() => setSelectedMarca(null)} className="w-full bg-slate-100 py-2 rounded text-xs font-semibold mt-3">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}