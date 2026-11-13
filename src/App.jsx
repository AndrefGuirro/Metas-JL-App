import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import LevantamentoEstoque from './LevantamentoEstoque.jsx';
import AbasNav from './AbasNav.jsx';
import { getMesRef, formatarMesRef } from './mesReferencia.js';
import {
  Users, Award, Calendar, Search, 
  Plus, Trash2, Edit3, Pencil, CheckCircle2, ChevronDown, ChevronUp, LogOut, ArrowRight, KeyRound, X 
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

  // Mês corrente ("AAAA-MM"). Pedidos e positivações são separados por mês.
  const [mesRef, setMesRef] = useState(() => getMesRef());

  // Modais e Filtros
  const [busca, setBusca] = useState('');
  const [showPositivadosToggle, setShowPositivadosToggle] = useState(false);
  const [modalNovoCliente, setModalNovoCliente] = useState(false);
  const [novoCliente, setNovoCliente] = useState({ nome: '', endereco: '' });

  // Edição / exclusão de cliente (guarda o cliente aberto e os dados do formulário)
  const [clienteEditando, setClienteEditando] = useState(null);
  const [dadosEdicaoCliente, setDadosEdicaoCliente] = useState({ nome: '', endereco: '' });
  const [salvandoCliente, setSalvandoCliente] = useState(false);

  const [modalPedido, setModalPedido] = useState(null);
  const [valorPedido, setValorPedido] = useState('');

  // Lista de pedidos de um cliente (vários pedidos no mês)
  const [modalListaPedidos, setModalListaPedidos] = useState(null);
  const [valorNovoPedido, setValorNovoPedido] = useState('');
  const [pedidoEmEdicao, setPedidoEmEdicao] = useState(null);
  const [valorEdicao, setValorEdicao] = useState('');

  const [modalPositivacao, setModalPositivacao] = useState(null);
  const [modalNovaMarca, setModalNovaMarca] = useState(false);
  const [novaMarca, setNovaMarca] = useState({ nome: '', meta: '' });
  const [selectedMarca, setSelectedMarca] = useState(null);

  // Faturamento por marca: valor vendido (por cliente/marca/mês) e meta em R$ (por vendedor/marca)
  const [vendasMarcas, setVendasMarcas] = useState([]);
  const [metasMarcas, setMetasMarcas] = useState([]);
  const [modalValorMarca, setModalValorMarca] = useState(null); // { cliente, marca }
  const [valorMarcaInput, setValorMarcaInput] = useState('');
  const [salvandoValorMarca, setSalvandoValorMarca] = useState(false);
  const [selectedFatMarca, setSelectedFatMarca] = useState(null);
  const [metaFatInput, setMetaFatInput] = useState('');
  const [salvandoMetaFat, setSalvandoMetaFat] = useState(false);
  const [metaFatSalva, setMetaFatSalva] = useState(false);

  // Detecta a virada do mês (inclusive com o app aberto ou voltando do segundo plano)
  useEffect(() => {
    function verificarVirada() {
      const atual = getMesRef();
      setMesRef(anterior => (anterior === atual ? anterior : atual));
    }

    const timer = setInterval(verificarVirada, 60 * 1000);
    document.addEventListener('visibilitychange', verificarVirada);
    window.addEventListener('focus', verificarVirada);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', verificarVirada);
      window.removeEventListener('focus', verificarVirada);
    };
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      carregarDados();
    } else {
      setClientes([]);
      setPedidos([]);
      setPositivacoes([]);
      setVendasMarcas([]);
      setMetasMarcas([]);
    }
  }, [currentUser, mesRef]);

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
      .eq('vendedor_id', currentUser.id)
      .eq('mes_ref', mesRef)
      .order('id'); // ordem estável: editar um pedido não muda a posição na lista
    setPedidos(peds || []);

    const { data: poss } = await supabase
      .from('positivacoes')
      .select('*')
      .eq('vendedor_id', currentUser.id)
      .eq('mes_ref', mesRef);
    setPositivacoes(poss || []);

    // Valor vendido por marca (só do mês corrente)
    const { data: vendas } = await supabase
      .from('vendas_marcas')
      .select('*')
      .eq('vendedor_id', currentUser.id)
      .eq('mes_ref', mesRef);
    setVendasMarcas(vendas || []);

    // Meta de faturamento por marca (vale para todos os meses, até o vendedor alterar)
    const { data: metasFat } = await supabase
      .from('metas_marcas')
      .select('*')
      .eq('vendedor_id', currentUser.id);
    setMetasMarcas(metasFat || []);
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

  // Total de pedidos do mês por cliente (um cliente pode ter vários pedidos)
  const totalPedidosPorCliente = pedidos.reduce((acc, p) => {
    acc[p.cliente_id] = (acc[p.cliente_id] || 0) + Number(p.valor || 0);
    return acc;
  }, {});

  const formatarMoeda = (valor) =>
    Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  // Pedidos e total do cliente aberto na lista de pedidos
  const pedidosModal = modalListaPedidos
    ? pedidos.filter(p => p.cliente_id === modalListaPedidos.id)
    : [];
  const totalModal = modalListaPedidos ? (totalPedidosPorCliente[modalListaPedidos.id] || 0) : 0;

  // --- FATURAMENTO POR MARCA ---
  const getVendaMarcaCliente = (clienteId, marcaId) =>
    vendasMarcas.find(v => v.cliente_id === clienteId && v.marca_id === marcaId);

  const getValorVendidoMarca = (marcaId) =>
    vendasMarcas
      .filter(v => v.marca_id === marcaId)
      .reduce((acc, v) => acc + Number(v.valor || 0), 0);

  const getMetaFatMarca = (marcaId) =>
    Number(metasMarcas.find(m => m.marca_id === marcaId)?.meta_faturamento || 0);

  const totalVendidoMarcas = marcas.reduce((acc, m) => acc + getValorVendidoMarca(m.id), 0);
  const totalMetaMarcas = marcas.reduce((acc, m) => acc + getMetaFatMarca(m.id), 0);

  function abrirValorMarca(cliente, marca) {
    const atual = getVendaMarcaCliente(cliente.id, marca.id);
    setModalValorMarca({ cliente, marca });
    setValorMarcaInput(atual ? String(atual.valor) : '');
  }

  function fecharValorMarca() {
    setModalValorMarca(null);
    setValorMarcaInput('');
  }

  // Salva o valor vendido da marca para o cliente. Valor 0 (ou "Remover") apaga o lançamento.
  async function salvarValorMarca(e, remover = false) {
    if (e) e.preventDefault();
    if (!modalValorMarca || !currentUser?.id || salvandoValorMarca) return;

    const valor = remover ? 0 : parseFloat(valorMarcaInput);
    if (isNaN(valor) || valor < 0) {
      alert('Informe um valor válido (zero ou maior).');
      return;
    }

    const { cliente, marca } = modalValorMarca;
    const existente = getVendaMarcaCliente(cliente.id, marca.id);
    setSalvandoValorMarca(true);

    let erro = null;
    if (valor === 0) {
      if (existente) {
        ({ error: erro } = await supabase
          .from('vendas_marcas')
          .delete()
          .eq('id', existente.id)
          .eq('vendedor_id', currentUser.id));
        if (!erro) setVendasMarcas(prev => prev.filter(v => v.id !== existente.id));
      }
    } else if (existente) {
      const { data, error } = await supabase
        .from('vendas_marcas')
        .update({ valor })
        .eq('id', existente.id)
        .eq('vendedor_id', currentUser.id)
        .select()
        .single();
      erro = error;
      if (!erro && data) setVendasMarcas(prev => prev.map(v => (v.id === existente.id ? data : v)));
    } else {
      const { data, error } = await supabase
        .from('vendas_marcas')
        .insert([{
          vendedor_id: currentUser.id,
          cliente_id: cliente.id,
          marca_id: marca.id,
          valor,
          mes_ref: mesRef
        }])
        .select()
        .single();
      erro = error;
      if (!erro && data) setVendasMarcas(prev => [...prev, data]);
    }

    setSalvandoValorMarca(false);
    if (erro) {
      alert('Erro ao salvar o valor vendido: ' + erro.message);
      return;
    }
    fecharValorMarca();
  }

  function abrirDetalheFatMarca(marca) {
    const meta = getMetaFatMarca(marca.id);
    setSelectedFatMarca(marca);
    setMetaFatInput(meta ? String(meta) : '');
    setMetaFatSalva(false);
  }

  function fecharDetalheFatMarca() {
    setSelectedFatMarca(null);
    setMetaFatInput('');
    setMetaFatSalva(false);
  }

  async function salvarMetaFatMarca(e) {
    e.preventDefault();
    if (!selectedFatMarca || !currentUser?.id || salvandoMetaFat) return;

    const meta = metaFatInput === '' ? 0 : parseFloat(metaFatInput);
    if (isNaN(meta) || meta < 0) {
      alert('Informe uma meta válida (zero ou maior).');
      return;
    }

    const existente = metasMarcas.find(m => m.marca_id === selectedFatMarca.id);
    setSalvandoMetaFat(true);
    setMetaFatSalva(false);

    let erro = null;
    if (existente) {
      const { data, error } = await supabase
        .from('metas_marcas')
        .update({ meta_faturamento: meta })
        .eq('id', existente.id)
        .eq('vendedor_id', currentUser.id)
        .select()
        .single();
      erro = error;
      if (!erro && data) setMetasMarcas(prev => prev.map(m => (m.id === existente.id ? data : m)));
    } else {
      const { data, error } = await supabase
        .from('metas_marcas')
        .insert([{
          vendedor_id: currentUser.id,
          marca_id: selectedFatMarca.id,
          meta_faturamento: meta
        }])
        .select()
        .single();
      erro = error;
      if (!erro && data) setMetasMarcas(prev => [...prev, data]);
    }

    setSalvandoMetaFat(false);
    if (erro) {
      alert('Erro ao salvar a meta: ' + erro.message);
      return;
    }
    setMetaFatInput(meta ? String(meta) : '');
    setMetaFatSalva(true);
    setTimeout(() => setMetaFatSalva(false), 2500);
  }

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

  function abrirEdicaoCliente(cliente) {
    setClienteEditando(cliente);
    setDadosEdicaoCliente({ nome: cliente.nome || '', endereco: cliente.endereco || '' });
  }

  function fecharEdicaoCliente() {
    setClienteEditando(null);
    setDadosEdicaoCliente({ nome: '', endereco: '' });
  }

  async function salvarEdicaoCliente(e) {
    e.preventDefault();
    const nome = dadosEdicaoCliente.nome.trim();
    if (!nome || !clienteEditando || !currentUser?.id || salvandoCliente) return;

    setSalvandoCliente(true);
    const { data, error } = await supabase
      .from('clientes')
      .update({ nome, endereco: dadosEdicaoCliente.endereco.trim() || null })
      .eq('id', clienteEditando.id)
      .eq('vendedor_id', currentUser.id)
      .select();
    setSalvandoCliente(false);

    if (error) {
      alert('Erro ao salvar cliente: ' + error.message);
    } else if (!data || data.length === 0) {
      alert('Não foi possível salvar as alterações deste cliente. Tente novamente.');
    } else {
      setClientes(prev =>
        prev
          .map(c => (c.id === data[0].id ? data[0] : c))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      );
      fecharEdicaoCliente();
    }
  }

  async function excluirCliente() {
    if (!clienteEditando || !currentUser?.id || salvandoCliente) return;

    const cliente = clienteEditando;
    const pedidosDoCliente = pedidos.filter(p => p.cliente_id === cliente.id).length;
    const aviso = pedidosDoCliente > 0
      ? `Excluir "${cliente.nome}"?\n\nOs pedidos e as positivações deste cliente também serão apagados. Esta ação não pode ser desfeita.`
      : `Excluir "${cliente.nome}"?\n\nAs positivações deste cliente também serão apagadas. Esta ação não pode ser desfeita.`;
    if (!confirm(aviso)) return;

    setSalvandoCliente(true);

    // Apaga primeiro o que está ligado ao cliente (todos os meses) e por último o cliente
    const filtro = { cliente_id: cliente.id, vendedor_id: currentUser.id };
    const { error: errPed } = await supabase.from('pedidos').delete().match(filtro);
    const { error: errPos } = errPed ? { error: null } : await supabase.from('positivacoes').delete().match(filtro);
    // Valores vendidos por marca deste cliente (se a tabela ainda não existir, segue normalmente)
    if (!errPed && !errPos) await supabase.from('vendas_marcas').delete().match(filtro);
    const { error: errCli } = (errPed || errPos)
      ? { error: null }
      : await supabase.from('clientes').delete().eq('id', cliente.id).eq('vendedor_id', currentUser.id);

    setSalvandoCliente(false);

    const erro = errPed || errPos || errCli;
    if (erro) {
      alert('Erro ao excluir cliente: ' + erro.message);
      carregarDados();
      return;
    }

    fecharEdicaoCliente();
    carregarDados();
  }

  // pedidoId: id do pedido que está sendo editado (vazio = pedido novo)
  async function salvarPedido(clienteId, pedidoId = null) {
    const valor = parseFloat(valorPedido);
    if (isNaN(valor) || !currentUser?.id) return;

    if (pedidoId) {
      await supabase.from('pedidos').update({ valor }).eq('id', pedidoId).eq('vendedor_id', currentUser.id);
    } else {
      await supabase.from('pedidos').insert([{
        vendedor_id: currentUser.id,
        cliente_id: clienteId,
        valor,
        mes_ref: mesRef
      }]);
    }
    setModalPedido(null);
    setValorPedido('');
    carregarDados();
  }

  // Remove apenas o pedido informado (os demais pedidos do cliente e de outros meses ficam)
  async function removerPedido(pedidoId) {
    if (pedidoId && currentUser?.id) {
      await supabase.from('pedidos').delete().eq('id', pedidoId).eq('vendedor_id', currentUser.id);
    }
    setModalPedido(null);
    carregarDados();
  }

  // --- LISTA DE PEDIDOS DO CLIENTE ---
  function abrirListaPedidos(cliente) {
    setModalListaPedidos(cliente);
    setValorNovoPedido('');
    setPedidoEmEdicao(null);
    setValorEdicao('');
  }

  function fecharListaPedidos() {
    setModalListaPedidos(null);
    setValorNovoPedido('');
    setPedidoEmEdicao(null);
    setValorEdicao('');
  }

  async function adicionarPedido(clienteId) {
    const valor = parseFloat(valorNovoPedido);
    if (isNaN(valor) || !currentUser?.id) return;

    await supabase.from('pedidos').insert([{
      vendedor_id: currentUser.id,
      cliente_id: clienteId,
      valor,
      mes_ref: mesRef
    }]);
    setValorNovoPedido('');
    carregarDados();
  }

  async function salvarEdicaoPedido(pedidoId) {
    const valor = parseFloat(valorEdicao);
    if (isNaN(valor) || !currentUser?.id) return;

    await supabase.from('pedidos').update({ valor }).eq('id', pedidoId).eq('vendedor_id', currentUser.id);
    setPedidoEmEdicao(null);
    setValorEdicao('');
    carregarDados();
  }

  async function excluirPedidoDaLista(pedido) {
    if (!confirm(`Excluir o pedido de R$ ${formatarMoeda(pedido.valor)}?`)) return;
    if (pedidoEmEdicao === pedido.id) {
      setPedidoEmEdicao(null);
      setValorEdicao('');
    }
    await supabase.from('pedidos').delete().eq('id', pedido.id).eq('vendedor_id', currentUser.id);
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
        marca_id: marcaId,
        mes_ref: mesRef
      };
      setPositivacoes([...positivacoes, tempItem]);

      const { data } = await supabase.from('positivacoes').insert([{
        vendedor_id: currentUser.id,
        cliente_id: clienteId,
        marca_id: marcaId,
        mes_ref: mesRef
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

      {/* ABAS (rolagem lateral no celular) */}
      <AbasNav
        ativa={tab}
        onChange={setTab}
        abas={[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'clientes', label: 'Clientes & Vendas' },
          { id: 'marcas', label: 'Positivação Marcas' },
          { id: 'fat_marcas', label: 'Faturamento Marcas' },
          { id: 'levantamento', label: 'Levantamento e Sugestão' },
        ]}
      />

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

              <p className="text-[11px] text-slate-400 mb-2">
                Mês de referência: <b className="text-slate-600 capitalize">{formatarMesRef(mesRef)}</b>
              </p>

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
                            R$ {formatarMoeda(totalPedidosPorCliente[c.id])}
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
                  className="w-full bg-white border border-slate-300 pl-9 pr-10 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                {busca && (
                  <button
                    type="button"
                    onClick={() => setBusca('')}
                    aria-label="Limpar pesquisa de clientes"
                    title="Limpar pesquisa"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
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
                  const pedidosCli = pedidos.filter(p => p.cliente_id === cli.id);
                  const pedido = pedidosCli[0];
                  const totalCli = totalPedidosPorCliente[cli.id] || 0;
                  const positivadasCli = positivacoes.filter(p => p.cliente_id === cli.id);

                  return (
                    <div key={cli.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-slate-800 break-words">{cli.nome}</h4>
                          <p className="text-xs text-slate-500 break-words">{cli.endereco || 'Endereço não informado'}</p>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <button
                            type="button"
                            onClick={() => abrirEdicaoCliente(cli)}
                            aria-label={`Editar cliente ${cli.nome}`}
                            title="Editar cliente"
                            className="-mt-2 -mr-2 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-600 active:text-blue-700"
                          >
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                          {pedidosCli.length > 0 && (
                            <div className="text-right -mt-1">
                              <span className="text-xs text-slate-400 block">
                                {pedidosCli.length > 1 ? `Total (${pedidosCli.length} pedidos):` : 'Pedido:'}
                              </span>
                              <span className="text-sm font-bold text-emerald-600">
                                R$ {formatarMoeda(totalCli)}
                              </span>
                            </div>
                          )}
                        </div>
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

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                        {/* Sem pedido: lança o primeiro. Com 1 pedido: edita. Com vários: abre a lista. */}
                        {pedidosCli.length <= 1 ? (
                          <button
                            onClick={() => {
                              setModalPedido({ ...cli, pedidoId: pedido ? pedido.id : null });
                              setValorPedido(pedido ? pedido.valor : '');
                            }}
                            className="bg-slate-50 hover:bg-slate-100 text-slate-700 py-1.5 rounded text-xs font-semibold"
                          >
                            {pedido ? 'Editar Pedido' : 'Lançar Pedido'}
                          </button>
                        ) : (
                          <button
                            onClick={() => abrirListaPedidos(cli)}
                            className="bg-slate-50 hover:bg-slate-100 text-slate-700 py-1.5 rounded text-xs font-semibold"
                          >
                            Pedidos ({pedidosCli.length})
                          </button>
                        )}
                        {pedidosCli.length > 0 && (
                          <button
                            onClick={() => abrirListaPedidos(cli)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-1.5 rounded text-xs font-semibold flex items-center justify-center gap-1"
                          >
                            <Plus size={14} /> Novo Pedido
                          </button>
                        )}
                        <button
                          onClick={() => setModalPositivacao(cli)}
                          className={`bg-blue-50 hover:bg-blue-100 text-blue-700 py-1.5 rounded text-xs font-semibold ${pedidosCli.length > 0 ? 'col-span-2' : ''}`}
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
              <h3 className="text-sm font-bold text-slate-800">Metas de Positivações</h3>
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

        {tab === 'fat_marcas' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Faturamento por Marca</h3>
              <p className="text-[11px] text-slate-400">
                Mês de referência: <b className="text-slate-600 capitalize">{formatarMesRef(mesRef)}</b>
              </p>
            </div>

            {/* Resumo geral de todas as marcas */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total vendido nas marcas</span>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-xl font-extrabold text-slate-800">R$ {formatarMoeda(totalVendidoMarcas)}</span>
                {totalMetaMarcas > 0 && (
                  <span className="text-xs text-slate-500">de R$ {formatarMoeda(totalMetaMarcas)}</span>
                )}
              </div>
              {totalMetaMarcas > 0 ? (
                <>
                  <div className="w-full bg-slate-200 rounded-full h-2 my-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (totalVendidoMarcas / totalMetaMarcas) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-amber-700 font-semibold">
                    {totalVendidoMarcas >= totalMetaMarcas
                      ? 'Metas das marcas atingidas'
                      : `Faltam R$ ${formatarMoeda(totalMetaMarcas - totalVendidoMarcas)} para as metas`}
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-slate-400 mt-1">Toque em uma marca para definir a meta em R$.</p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {marcas.map(marca => {
                const meta = getMetaFatMarca(marca.id);
                const vendido = getValorVendidoMarca(marca.id);
                const falta = Math.max(0, meta - vendido);
                const pct = meta > 0 ? Math.min(100, (vendido / meta) * 100) : 0;

                return (
                  <button
                    type="button"
                    key={marca.id}
                    onClick={() => abrirDetalheFatMarca(marca)}
                    className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-left hover:border-blue-400 active:bg-slate-50 transition"
                  >
                    <div className="flex justify-between items-center mb-1.5 gap-1">
                      <h4 className="font-bold text-slate-800 text-xs truncate">{marca.nome}</h4>
                      <ArrowRight size={10} className="text-slate-400 shrink-0" />
                    </div>

                    <div className="space-y-0.5 pt-1.5 border-t border-slate-100 text-[11px]">
                      <div className="flex justify-between gap-1">
                        <span className="text-slate-400">Meta</span>
                        <span className="font-bold text-slate-700">{meta > 0 ? `R$ ${formatarMoeda(meta)}` : '—'}</span>
                      </div>
                      <div className="flex justify-between gap-1">
                        <span className="text-emerald-600">Real</span>
                        <span className="font-bold text-emerald-700">R$ {formatarMoeda(vendido)}</span>
                      </div>
                      <div className="flex justify-between gap-1">
                        <span className="text-amber-600">Falta</span>
                        <span className="font-bold text-amber-700">{meta > 0 ? `R$ ${formatarMoeda(falta)}` : '—'}</span>
                      </div>
                    </div>

                    {meta > 0 && (
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {marcas.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">Nenhuma marca cadastrada.</p>
            )}

            <p className="text-[11px] text-slate-400">
              As marcas são as mesmas da aba Positivação Marcas. O valor vendido é lançado em Clientes & Vendas, no botão Positivar de cada cliente.
            </p>
          </div>
        )}

        {tab === 'levantamento' && <LevantamentoEstoque />}

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

      {/* MODAL: EDITAR / EXCLUIR CLIENTE */}
      {clienteEditando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl p-5 shadow-lg max-h-[90dvh] overflow-y-auto">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-base font-bold text-slate-800">Editar Cliente</h3>
              <button
                type="button"
                onClick={fecharEdicaoCliente}
                aria-label="Fechar"
                className="text-slate-400 p-2 -mr-2 -mt-2 text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={salvarEdicaoCliente} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  value={dadosEdicaoCliente.nome}
                  onChange={e => setDadosEdicaoCliente({ ...dadosEdicaoCliente, nome: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Endereço (Opcional)</label>
                <input
                  type="text"
                  value={dadosEdicaoCliente.endereco}
                  onChange={e => setDadosEdicaoCliente({ ...dadosEdicaoCliente, endereco: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={fecharEdicaoCliente} className="flex-1 bg-slate-100 py-3 rounded-lg text-xs font-semibold">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoCliente}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {salvandoCliente ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
              <button
                type="button"
                onClick={excluirCliente}
                disabled={salvandoCliente}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 py-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <Trash2 size={14} /> Excluir Cliente
              </button>
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
                {modalPedido.pedidoId && (
                  <button
                    type="button"
                    onClick={() => removerPedido(modalPedido.pedidoId)}
                    className="bg-rose-50 text-rose-700 px-3 py-2 rounded text-xs font-semibold flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                )}
                <button type="button" onClick={() => setModalPedido(null)} className="flex-1 bg-slate-100 py-2 rounded text-xs font-semibold">Fechar</button>
                <button type="button" onClick={() => salvarPedido(modalPedido.id, modalPedido.pedidoId)} className="flex-1 bg-blue-600 text-white py-2 rounded text-xs font-semibold">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PEDIDOS DO CLIENTE (TODOS OS PEDIDOS, COM EDITAR/EXCLUIR EM CADA UM) */}
      {modalListaPedidos && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-md rounded-2xl p-4 shadow-xl flex flex-col max-h-[90dvh]">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-800">Pedidos do cliente</h3>
                <p className="text-xs text-slate-500 truncate">{modalListaPedidos.nome}</p>
              </div>
              <button
                type="button"
                onClick={fecharListaPedidos}
                aria-label="Fechar"
                className="text-slate-400 p-2 -mr-2 -mt-1 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-emerald-50 rounded-xl p-3 flex justify-between items-center my-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">Total dos pedidos</span>
                <span className="text-[11px] text-emerald-700">
                  {pedidosModal.length} {pedidosModal.length === 1 ? 'pedido lançado' : 'pedidos lançados'}
                </span>
              </div>
              <span className="text-lg font-extrabold text-emerald-800">R$ {formatarMoeda(totalModal)}</span>
            </div>

            <form
              onSubmit={e => { e.preventDefault(); adicionarPedido(modalListaPedidos.id); }}
              className="flex gap-2 mb-3"
            >
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="Valor do novo pedido (R$)"
                value={valorNovoPedido}
                onChange={e => setValorNovoPedido(e.target.value)}
                className="flex-1 min-w-0 border border-slate-300 rounded-lg p-2.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-3 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
              >
                <Plus size={16} /> Adicionar
              </button>
            </form>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">
              {pedidosModal.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Nenhum pedido lançado.</p>
              )}
              {pedidosModal.map(ped => (
                <div key={ped.id} className="border border-slate-200 rounded-xl p-2.5">
                  {pedidoEmEdicao === ped.id ? (
                    <div className="space-y-2">
                      <input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={valorEdicao}
                        onChange={e => setValorEdicao(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setPedidoEmEdicao(null); setValorEdicao(''); }}
                          className="flex-1 bg-slate-100 py-2.5 rounded-lg text-xs font-semibold"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => salvarEdicaoPedido(ped.id)}
                          className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-xs font-semibold"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-emerald-700">R$ {formatarMoeda(ped.valor)}</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setPedidoEmEdicao(ped.id); setValorEdicao(ped.valor); }}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <Edit3 size={14} /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => excluirPedidoDaLista(ped)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <Trash2 size={14} /> Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={fecharListaPedidos}
              className="w-full bg-slate-100 py-3 rounded-xl text-xs font-bold mt-3"
            >
              Fechar
            </button>
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
              Cliente: <b className="text-slate-700">{modalPositivacao.nome}</b>. Toque na parte de cima para positivar e na faixa de baixo para lançar o valor vendido:
            </p>
            
            {/* Grade 3 colunas para ver todas as 12 marcas de uma vez */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto pr-0.5 py-1">
              {marcas.map(marca => {
                const isPositivada = positivacoes.some(p => p.cliente_id === modalPositivacao.id && p.marca_id === marca.id);
                const venda = getVendaMarcaCliente(modalPositivacao.id, marca.id);
                const temValor = !!venda && Number(venda.valor) > 0;
                return (
                  <div
                    key={marca.id}
                    className={`rounded-xl border overflow-hidden flex flex-col shadow-sm ${
                      isPositivada ? 'border-blue-600' : 'border-slate-200'
                    }`}
                  >
                    {/* Metade de cima: positivar (funciona como antes) */}
                    <button
                      type="button"
                      onClick={() => alternarPositivacaoMarca(modalPositivacao.id, marca.id)}
                      className={`flex-1 py-3 px-2 text-xs font-bold transition-colors flex flex-col items-center justify-center gap-1 text-center active:brightness-95 ${
                        isPositivada
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{marca.nome}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isPositivada ? 'bg-blue-500 text-white' : 'text-slate-400'}`}>
                        {isPositivada ? '✓ Positivada' : '+ Positivar'}
                      </span>
                    </button>

                    {/* Metade de baixo: lançar o valor vendido da marca */}
                    <button
                      type="button"
                      onClick={() => abrirValorMarca(modalPositivacao, marca)}
                      aria-label={`Valor vendido de ${marca.nome}`}
                      className={`py-2.5 px-2 text-[11px] font-bold border-t transition-colors flex items-center justify-center gap-1 active:brightness-95 ${
                        temValor
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {temValor ? `R$ ${formatarMoeda(venda.valor)}` : '+ Lançar valor'}
                    </button>
                  </div>
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

      {/* MODAL: DETALHE DO FATURAMENTO DA MARCA (META EM R$ E CLIENTES) */}
      {selectedFatMarca && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-md rounded-2xl p-4 shadow-xl flex flex-col max-h-[90dvh]">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-800 truncate">{selectedFatMarca.nome}</h3>
                <p className="text-[11px] text-slate-400 capitalize">{formatarMesRef(mesRef)}</p>
              </div>
              <button
                type="button"
                onClick={fecharDetalheFatMarca}
                aria-label="Fechar"
                className="text-slate-400 p-2 -mr-2 -mt-2 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-0.5 mt-3">
              {(() => {
                const meta = getMetaFatMarca(selectedFatMarca.id);
                const vendido = getValorVendidoMarca(selectedFatMarca.id);
                const falta = Math.max(0, meta - vendido);
                const pct = meta > 0 ? Math.min(100, (vendido / meta) * 100) : 0;
                return (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Meta</span>
                        <span className="text-xs font-bold text-slate-700">{meta > 0 ? `R$ ${formatarMoeda(meta)}` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 block">Vendido</span>
                        <span className="text-xs font-bold text-emerald-700">R$ {formatarMoeda(vendido)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-600 block">Falta</span>
                        <span className="text-xs font-bold text-amber-700">{meta > 0 ? `R$ ${formatarMoeda(falta)}` : '—'}</span>
                      </div>
                    </div>
                    {meta > 0 && (
                      <>
                        <div className="w-full bg-slate-200 rounded-full h-2 mt-2.5 overflow-hidden">
                          <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 text-right">
                          {pct.toFixed(1)}% da meta{vendido >= meta ? ' · meta atingida' : ''}
                        </p>
                      </>
                    )}
                  </div>
                );
              })()}

              <form onSubmit={salvarMetaFatMarca}>
                <label className="text-xs font-bold text-slate-600 block mb-1">Meta de faturamento (R$)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={metaFatInput}
                    onChange={e => { setMetaFatInput(e.target.value); setMetaFatSalva(false); }}
                    placeholder="Ex: 10000"
                    className="flex-1 min-w-0 border border-slate-300 rounded-lg p-2.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="submit"
                    disabled={salvandoMetaFat}
                    className="bg-blue-600 text-white px-4 rounded-lg text-xs font-bold shrink-0 disabled:opacity-50"
                  >
                    {salvandoMetaFat ? 'Salvando...' : 'Salvar meta'}
                  </button>
                </div>
                <p className="text-[11px] mt-1 h-4 text-emerald-600 font-semibold">
                  {metaFatSalva ? 'Meta salva. Ela continua valendo nos próximos meses.' : ''}
                </p>
              </form>

              <div>
                <h4 className="text-xs font-bold text-emerald-700 uppercase mb-1">
                  Clientes com valor lançado ({clientes.filter(c => getVendaMarcaCliente(c.id, selectedFatMarca.id)).length})
                </h4>
                <div className="space-y-1">
                  {clientes
                    .filter(c => getVendaMarcaCliente(c.id, selectedFatMarca.id))
                    .map(c => (
                      <div key={c.id} className="text-xs bg-emerald-50 text-emerald-900 p-2 rounded flex justify-between items-center gap-2">
                        <span className="truncate">{c.nome}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-bold">R$ {formatarMoeda(getVendaMarcaCliente(c.id, selectedFatMarca.id).valor)}</span>
                          <button
                            type="button"
                            onClick={() => abrirValorMarca(c, selectedFatMarca)}
                            className="text-[11px] text-blue-600 font-semibold py-1 px-1"
                          >
                            Editar
                          </button>
                        </div>
                      </div>
                    ))}
                  {clientes.every(c => !getVendaMarcaCliente(c.id, selectedFatMarca.id)) && (
                    <p className="text-xs text-slate-400">Nenhum valor lançado neste mês.</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Clientes sem valor lançado</h4>
                <div className="space-y-1">
                  {clientes
                    .filter(c => !getVendaMarcaCliente(c.id, selectedFatMarca.id))
                    .map(c => (
                      <div key={c.id} className="text-xs bg-slate-50 text-slate-700 p-2 rounded flex justify-between items-center gap-2">
                        <span className="truncate">{c.nome}</span>
                        <button
                          type="button"
                          onClick={() => abrirValorMarca(c, selectedFatMarca)}
                          className="text-[11px] text-blue-600 font-semibold py-1 px-1 shrink-0"
                        >
                          + Lançar valor
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={fecharDetalheFatMarca}
              className="w-full bg-slate-100 py-3 rounded-xl text-xs font-bold mt-3"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* MODAL: LANÇAR VALOR VENDIDO DA MARCA PARA O CLIENTE (fica por cima das outras janelas) */}
      {modalValorMarca && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-xl p-5 shadow-lg">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-base font-bold text-slate-800">Valor vendido</h3>
              <button
                type="button"
                onClick={fecharValorMarca}
                aria-label="Fechar"
                className="text-slate-400 p-2 -mr-2 -mt-2 text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Marca: <b className="text-slate-700">{modalValorMarca.marca.nome}</b>
              <br />
              Cliente: <b className="text-slate-700">{modalValorMarca.cliente.nome}</b>
              <br />
              Mês: <b className="text-slate-700 capitalize">{formatarMesRef(mesRef)}</b>
            </p>
            <form onSubmit={salvarValorMarca} className="space-y-3">
              <input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                autoFocus
                value={valorMarcaInput}
                onChange={e => setValorMarcaInput(e.target.value)}
                placeholder="Valor vendido da marca (R$)"
                className="w-full border border-slate-300 rounded-lg p-2.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <div className="flex gap-2">
                <button type="button" onClick={fecharValorMarca} className="flex-1 bg-slate-100 py-3 rounded-lg text-xs font-semibold">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoValorMarca}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {salvandoValorMarca ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
              {getVendaMarcaCliente(modalValorMarca.cliente.id, modalValorMarca.marca.id) && (
                <button
                  type="button"
                  onClick={() => salvarValorMarca(null, true)}
                  disabled={salvandoValorMarca}
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 py-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Trash2 size={14} /> Remover valor
                </button>
              )}
            </form>
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