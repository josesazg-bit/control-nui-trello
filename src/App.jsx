import React, { useState, useMemo, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  writeBatch,
} from 'firebase/firestore';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Search,
  TrendingUp,
  Activity,
  Save,
  Edit,
  UserPlus,
  CheckCircle,
  XCircle,
  Layout,
  List,
  Loader2,
  Trash2,
  Database,
  Calendar,
  Layers,
  Wifi,
  ShieldCheck,
  Fingerprint,
  FileUp,
  MoreHorizontal,
  DollarSign,
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE (CON TUS LLAVES) ---
const firebaseConfig = {
  apiKey: 'AIzaSyDyufliI-fEn7iR5kVhKWLlPwUcUR2tSiI',
  authDomain: 'app-fidelizacion-18fcb.firebaseapp.com',
  projectId: 'app-fidelizacion-18fcb',
  storageBucket: 'app-fidelizacion-18fcb.firebasestorage.app',
  messagingSenderId: '337074521389',
  appId: '1:337074521389:web:ca0ea7ff6d4acaaec73fa4',
};
// ----------------------------------------

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'nui-master-v10-identity-verified';

// --- CONSTANTES ---
const COLORS = {
  stages: {
    '2do Pedido': '#6366f1',
    '3er Pedido': '#8b5cf6',
    '4to Pedido': '#ec4899',
    Histórico: '#10b981',
  },
  bgStages: {
    '2do Pedido': 'bg-indigo-50',
    '3er Pedido': 'bg-violet-50',
    '4to Pedido': 'bg-pink-50',
    Histórico: 'bg-emerald-50',
  },
  borderStages: {
    '2do Pedido': 'border-indigo-200',
    '3er Pedido': 'border-violet-200',
    '4to Pedido': 'border-pink-200',
    Histórico: 'border-emerald-200',
  },
};
const MESES = [
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
  'ENERO',
  'FEBRERO',
];
const ETAPAS = ['2do Pedido', '3er Pedido', '4to Pedido', 'Histórico'];
const INITIAL_DATA = [];

// --- PARSER CSV ---
const parseCSV = (text, fileName) => {
  const lines = text.split('\n');
  const result = [];
  const nameUpper = fileName.toUpperCase();
  let etapaArchivo = null;
  if (nameUpper.includes('2 PEDIDO') || nameUpper.includes('PEDIDO 2'))
    etapaArchivo = '2do Pedido';
  if (nameUpper.includes('3 PEDIDO') || nameUpper.includes('PEDIDO 3'))
    etapaArchivo = '3er Pedido';
  if (nameUpper.includes('4 PEDIDO') || nameUpper.includes('PEDIDO 4'))
    etapaArchivo = '4to Pedido';

  let mesArchivo = null;
  MESES.forEach((m) => {
    if (nameUpper.includes(m)) mesArchivo = m;
  });

  if (!etapaArchivo || !mesArchivo) return [];

  lines.forEach((line) => {
    const cols = line.replace(/\r/g, '').split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    if (cols.length < 5) return;
    let codigo = null,
      nombre = null,
      saldo = 0;

    // FORMATO 1
    const c1 = cols[1]?.replace(/"/g, '').trim();
    if (c1 && !isNaN(c1) && c1.length > 5) {
      codigo = c1;
      nombre = cols[2];
      const s = cols[7]?.replace(/"/g, '').trim();
      if (!isNaN(parseFloat(s))) saldo = parseFloat(s);
    }
    // FORMATO 2
    if (!codigo) {
      const c2 = cols[2]?.replace(/"/g, '').trim();
      if (c2 && !isNaN(c2) && c2.length > 5) {
        codigo = c2;
        nombre = cols[3];
      }
    }
    if (codigo && nombre) {
      result.push({
        codigo,
        nombre: nombre.replace(/"/g, '').trim(),
        saldo,
        historyEntry: { [mesArchivo]: etapaArchivo },
        comentario: cols[cols.length - 1]?.replace(/"/g, '') || '',
      });
    }
  });
  return result;
};

// --- COMPONENTES VISUALES ---
const KpiCard = ({ title, value, subtext, color = 'indigo' }) => (
  <div
    className={`bg-white p-4 rounded-xl border border-${color}-100 shadow-sm flex items-start gap-4`}
  >
    <div className={`p-3 rounded-lg bg-${color}-50 text-${color}-600`}>
      <Activity size={24} />
    </div>
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        {title}
      </p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      <p className="text-[10px] text-slate-500 mt-1">{subtext}</p>
    </div>
  </div>
);

const RetentionStep = ({ label, count, percent, isLast, conversionRate }) => {
  let color = 'bg-emerald-500';
  if (conversionRate < 50) color = 'bg-red-500';
  else if (conversionRate < 80) color = 'bg-amber-500';

  return (
    <div className="flex flex-col items-center flex-1 relative z-10">
      <div
        className={`w-14 h-14 rounded-full flex flex-col items-center justify-center text-white font-bold text-sm shadow-md mb-3 ${color} border-4 border-white ring-2 ring-slate-100`}
      >
        <span>{percent}%</span>
      </div>
      <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">
        {label}
      </p>
      <p className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full mt-1">
        {count} Clientes
      </p>
      {!isLast && (
        <div className="absolute top-7 left-1/2 w-full h-1 bg-slate-200 -z-10">
          <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 bg-white px-1 text-[9px] text-slate-400 font-bold border border-slate-100 rounded">
            {conversionRate}% Pasan
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('gestion');
  const [currentMonth, setCurrentMonth] = useState('FEBRERO');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [syncStatus, setSyncStatus] = useState('synced');
  const [lastSaved, setLastSaved] = useState(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'clients')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) setData(INITIAL_DATA);
        else {
          const loadedData = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
          loadedData.sort((a, b) =>
            (b.updatedAt || '').localeCompare(a.updatedAt || '')
          );
          setData(loadedData);
        }
        setLoading(false);
        setLastSaved(new Date());
      },
      (error) => {
        console.error(error);
        setSyncStatus('error');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setIsImporting(true);
    setSyncStatus('saving');
    const batch = writeBatch(db);
    let count = 0;
    const tempMap = new Map();
    data.forEach((d) => tempMap.set(d.codigo, d));

    for (const file of files) {
      const text = await file.text();
      const records = parseCSV(text, file.name);
      records.forEach((rec) => {
        const existing = tempMap.get(rec.codigo) || { history: {} };
        const newHistory = { ...existing.history, ...rec.historyEntry };
        const finalName =
          rec.nombre.length > (existing.nombre || '').length
            ? rec.nombre
            : existing.nombre;
        const merged = {
          ...existing,
          ...rec,
          nombre: finalName,
          history: newHistory,
          etapa:
            newHistory[MESES[MESES.length - 1]] ||
            rec.historyEntry[Object.keys(rec.historyEntry)[0]],
        };
        delete merged.historyEntry;
        tempMap.set(rec.codigo, merged);
      });
    }
    tempMap.forEach((val, key) => {
      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'clients', key);
      batch.set(ref, val);
      count++;
    });
    try {
      await batch.commit();
      setSyncStatus('synced');
      showNotification(`Base actualizada: ${count} verificado.`);
    } catch (e) {
      setSyncStatus('error');
      showNotification('Error al importar', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleAdvanceStage = async (client) => {
    const currentIdx = MESES.indexOf(currentMonth);
    if (currentIdx >= MESES.length - 1)
      return showNotification('No hay mes siguiente', 'error');
    const nextMonth = MESES[currentIdx + 1];
    const nextStageMap = {
      '2do Pedido': '3er Pedido',
      '3er Pedido': '4to Pedido',
      '4to Pedido': 'Histórico',
    };
    const stageNow = client.history?.[currentMonth];
    if (!stageNow || stageNow === 'Histórico') return;
    const nextStage = nextStageMap[stageNow];

    if (
      window.confirm(
        `¿Confirmar pedido de ${client.nombre}? Pasará a ${nextStage} en ${nextMonth}.`
      )
    ) {
      setSyncStatus('saving');
      try {
        const newHistory = { ...client.history, [nextMonth]: nextStage };
        const ref = doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'clients',
          client.id
        );
        await updateDoc(ref, {
          history: newHistory,
          etapa: nextStage,
          updatedAt: new Date().toISOString(),
        });
        setSyncStatus('synced');
        showNotification(`Cliente avanzado a ${nextStage}.`);
      } catch (e) {
        setSyncStatus('error');
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSyncStatus('saving');
    try {
      const docId = formData.codigo || Date.now().toString();
      const docRef = doc(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'clients',
        docId
      );
      let finalData = { ...formData };
      if (editingId === 'NEW') {
        const initialHistory = formData.history || {};
        if (Object.keys(initialHistory).length === 0)
          finalData.history = {
            [currentMonth]: formData.etapa || '2do Pedido',
          };
      }
      await setDoc(
        docRef,
        { ...finalData, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      setSyncStatus('synced');
      showNotification('Guardado.');
      setEditingId(null);
    } catch (e) {
      setSyncStatus('error');
      showNotification('Error al guardar.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!editingId || editingId === 'NEW') {
      setEditingId(null);
      return;
    }
    if (window.confirm('¿Eliminar registro?')) {
      setSyncStatus('saving');
      await deleteDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'clients', editingId)
      );
      setSyncStatus('synced');
      setEditingId(null);
      showNotification('Eliminado.');
    }
  };

  const historicalKPIs = useMemo(() => {
    const currentIdx = MESES.indexOf(currentMonth);
    const startIdx = Math.max(0, currentIdx - 3);
    const selectedMonths = MESES.slice(startIdx, currentIdx + 1);
    const baseMonth = selectedMonths[0];
    const baseData = data.filter((d) => d.history && d.history[baseMonth]);
    const totalBase = baseData.length;
    const steps = selectedMonths.map((m, i) => {
      const count = baseData.filter((d) => d.history[m]).length;
      const retentionBase =
        totalBase > 0 ? Math.round((count / totalBase) * 100) : 0;
      const prevCount =
        i > 0
          ? baseData.filter((d) => d.history[selectedMonths[i - 1]]).length
          : totalBase;
      const conversion =
        prevCount > 0 ? Math.round((count / prevCount) * 100) : 100;
      return { month: m, count, retentionBase, conversion };
    });
    const activeInMonth = data.filter(
      (d) =>
        d.history &&
        d.history[currentMonth] &&
        d.history[currentMonth] !== 'Histórico'
    ).length;
    const moraInMonth = data.filter(
      (d) => d.history && d.history[currentMonth] && d.estado === 'MOR'
    ).length;
    return { steps, totalBase, activeInMonth, moraInMonth };
  }, [data, currentMonth]);

  // Lista global filtrada solo por búsqueda (para repartir en columnas)
  const globalList = useMemo(() => {
    return data.filter((d) => {
      const stageInMonth = d.history?.[currentMonth];
      if (!stageInMonth) return false;
      const matchSearch =
        d.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.codigo.includes(searchTerm);
      return matchSearch;
    });
  }, [data, currentMonth, searchTerm]);

  const handleNewClient = (stagePreset) => {
    setEditingId('NEW');
    setFormData({
      codigo: '',
      nombre: '',
      zona: '',
      saldo: 0,
      estado: 'ACT',
      etapa: stagePreset || '2do Pedido',
      comentario: '',
      history: { [currentMonth]: stagePreset || '2do Pedido' },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 text-white p-2 rounded-lg">
            <Database size={24} />
          </div>
          <div>
            <h1 className="font-black text-xl text-slate-800 tracking-tight">
              CONTROL NUI
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Zona Nathaly
              </p>
              <span className="text-slate-300">|</span>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                CICLO 2025-2026
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-indigo-500 uppercase mb-1 tracking-widest">
            MES DE CIERRE / TRABAJO
          </span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {MESES.map((m) => (
              <button
                key={m}
                onClick={() => setCurrentMonth(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentMonth === m
                    ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {m.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <input
              type="file"
              multiple
              accept=".csv"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
              disabled={isImporting}
            />
            <button className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-700 transition-colors">
              {isImporting ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <FileUp size={16} />
              )}{' '}
              CARGAR CSVs
            </button>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() =>
                setActiveTab(activeTab === 'gestion' ? 'dashboard' : 'gestion')
              }
              className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-indigo-100 transition-colors"
            >
              {activeTab === 'gestion' ? (
                <Layout size={16} />
              ) : (
                <List size={16} />
              )}{' '}
              {activeTab === 'gestion' ? 'VER DASHBOARD' : 'TABLERO'}
            </button>
          </div>
        </div>
      </header>

      {notification && (
        <div className="fixed top-24 right-6 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-xl z-50 font-bold flex items-center gap-3 animate-in slide-in-from-right">
          <CheckCircle /> {notification.msg}
        </div>
      )}

      <main className="flex-1 w-full mx-auto p-4 pb-16 h-[calc(100vh-80px)] overflow-hidden">
        {activeTab === 'gestion' && (
          <div className="flex flex-col h-full gap-4">
            {/* BARRA SUPERIOR DE KPI RÁPIDO Y BÚSQUEDA */}
            <div className="flex items-center justify-between shrink-0">
              <div className="flex gap-4">
                <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <UserPlus size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">
                      Total Activos
                    </p>
                    <p className="text-lg font-black text-slate-700">
                      {globalList.length}
                    </p>
                  </div>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar cliente por nombre o código..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <button
                onClick={() => handleNewClient()}
                className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl shadow-lg hover:bg-emerald-700 transition-transform active:scale-95 flex items-center gap-2 font-bold text-sm"
              >
                <UserPlus size={18} /> NUEVO INGRESO
              </button>
            </div>

            {/* TABLERO KANBAN (TRELLO) */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
              <div className="flex h-full gap-6 min-w-max px-2">
                {ETAPAS.map((stage) => {
                  const clientsInStage = globalList.filter(
                    (c) => c.history[currentMonth] === stage
                  );
                  return (
                    <div
                      key={stage}
                      className={`w-80 flex flex-col rounded-2xl ${COLORS.bgStages[stage]} border ${COLORS.borderStages[stage]} h-full transition-all duration-300`}
                    >
                      {/* HEADER COLUMNA */}
                      <div className="p-4 flex items-center justify-between shrink-0 border-b border-white/50">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS.stages[stage] }}
                          ></div>
                          <h3 className="font-black text-sm text-slate-700 uppercase tracking-tight">
                            {stage}
                          </h3>
                        </div>
                        <span className="bg-white/60 px-2 py-0.5 rounded-md text-xs font-bold text-slate-500 shadow-sm">
                          {clientsInStage.length}
                        </span>
                      </div>

                      {/* LISTA DE TARJETAS (SCROLLABLE) */}
                      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {clientsInStage.map((client) => (
                          <div
                            key={client.id}
                            onClick={() => {
                              setEditingId(client.id);
                              setFormData(client);
                            }}
                            className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group relative animate-in fade-in zoom-in-95"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Fingerprint size={10} /> {client.codigo}
                              </span>
                              {client.estado === 'MOR' && (
                                <span className="text-[9px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase">
                                  MORA
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-800 text-sm leading-tight mb-3">
                              {client.nombre}
                            </h4>

                            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                              <div className="flex flex-col">
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                  Saldo
                                </span>
                                <span className="font-mono text-xs font-bold text-slate-600 flex items-center">
                                  <DollarSign size={10} />
                                  {client.saldo}
                                </span>
                              </div>
                              {stage !== '4to Pedido' &&
                                stage !== 'Histórico' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAdvanceStage(client);
                                    }}
                                    className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                                    title="Avanzar Etapa"
                                  >
                                    <CheckCircle size={16} />
                                  </button>
                                )}
                            </div>
                          </div>
                        ))}

                        {/* Botón rápido para agregar en esta columna */}
                        <button
                          onClick={() => handleNewClient(stage)}
                          className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 text-xs font-bold hover:border-indigo-400 hover:text-indigo-500 hover:bg-white transition-all flex items-center justify-center gap-2"
                        >
                          <PlusIcon /> Agregar a {stage}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MODAL DE EDICIÓN FLOTANTE */}
            {editingId && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                      <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                        {editingId === 'NEW' ? (
                          <UserPlus className="text-emerald-500" />
                        ) : (
                          <Edit className="text-indigo-500" />
                        )}
                        {editingId === 'NEW'
                          ? 'Nuevo Ingreso'
                          : 'Editar Cliente'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Gestionando datos para el mes de{' '}
                        <strong>{currentMonth}</strong>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {editingId !== 'NEW' && (
                        <button
                          onClick={handleDelete}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        <XCircle size={24} />
                      </button>
                    </div>
                  </div>

                  <form
                    onSubmit={handleSave}
                    className="flex-1 overflow-y-auto p-8 space-y-6"
                  >
                    <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2">
                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block mb-2">
                          Nombre Completo
                        </label>
                        <input
                          required
                          className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-700 transition-all"
                          value={formData.nombre || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, nombre: e.target.value })
                          }
                          placeholder="Ej. Juan Pérez"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block mb-2">
                          Código Cliente
                        </label>
                        <input
                          required
                          className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:bg-white outline-none font-medium transition-all"
                          value={formData.codigo || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, codigo: e.target.value })
                          }
                          placeholder="Ej. 1040..."
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block mb-2">
                          Zona / Subzona
                        </label>
                        <input
                          className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:bg-white outline-none font-medium transition-all"
                          value={formData.zona || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, zona: e.target.value })
                          }
                          placeholder="Ej. Zona 1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block mb-2">
                          Saldo Actual ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:bg-white outline-none font-mono font-bold text-slate-700 transition-all"
                          value={formData.saldo || 0}
                          onChange={(e) =>
                            setFormData({ ...formData, saldo: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block mb-2">
                          Estado
                        </label>
                        <select
                          className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:bg-white outline-none font-medium transition-all"
                          value={formData.estado || 'ACT'}
                          onChange={(e) =>
                            setFormData({ ...formData, estado: e.target.value })
                          }
                        >
                          <option value="ACT">Activo</option>
                          <option value="MOR">Mora</option>
                          <option value="PRP">Propuesta</option>
                          <option value="NUI">NUI</option>
                        </select>
                      </div>

                      {/* Selector de Etapa visual para Nuevo Ingreso */}
                      {editingId === 'NEW' && (
                        <div className="col-span-2 bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                          <label className="text-xs font-bold uppercase text-indigo-500 tracking-wider block mb-3 flex items-center gap-2">
                            <Calendar size={14} /> Etapa Inicial en{' '}
                            {currentMonth}
                          </label>
                          <div className="flex gap-3">
                            {ETAPAS.slice(0, 3).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    etapa: st,
                                    history: { [currentMonth]: st },
                                  })
                                }
                                className={`flex-1 py-3 text-xs rounded-xl font-bold border-2 transition-all ${
                                  formData.etapa === st
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105'
                                    : 'bg-white text-indigo-400 border-indigo-100 hover:border-indigo-300'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block mb-2">
                        Bitácora / Comentarios
                      </label>
                      <textarea
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:bg-white outline-none h-32 leading-relaxed transition-all resize-none"
                        value={formData.comentario || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            comentario: e.target.value,
                          })
                        }
                        placeholder="Escribe notas importantes aquí..."
                      />
                    </div>
                  </form>

                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-6 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-white border border-transparent hover:border-slate-200 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={syncStatus === 'saving'}
                      className="px-8 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 transform active:scale-95"
                    >
                      {syncStatus === 'saving' ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <Save size={18} />
                      )}
                      {syncStatus === 'saving'
                        ? 'Guardando...'
                        : 'GUARDAR CAMBIOS'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DASHBOARD ANALÍTICO (Se mantiene igual) */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-300 overflow-y-auto pb-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                  <h3 className="font-black text-2xl text-slate-800 uppercase tracking-tight flex items-center gap-3">
                    <Layers className="text-indigo-600" /> Efectividad
                    Histórica: {historicalKPIs.steps[0].month} - {currentMonth}
                  </h3>
                  <p className="text-slate-500 font-medium mt-1">
                    Analizando la supervivencia de los{' '}
                    <strong>{historicalKPIs.totalBase}</strong> distribuidores
                    que iniciaron en {historicalKPIs.steps[0].month}.
                  </p>
                </div>
                <div className="text-right bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                  <p className="text-xs font-bold text-indigo-400 uppercase">
                    Retención Acumulada
                  </p>
                  <p className="text-3xl font-black text-indigo-600">
                    {
                      historicalKPIs.steps[historicalKPIs.steps.length - 1]
                        .retentionBase
                    }
                    %
                  </p>
                </div>
              </div>
              <div className="flex items-start justify-between gap-2 relative z-10 px-2 overflow-x-auto pb-4">
                {historicalKPIs.steps.map((step, idx) => (
                  <RetentionStep
                    key={idx}
                    label={step.month}
                    count={step.count}
                    percent={step.retentionBase}
                    conversionRate={step.conversion}
                    isLast={idx === historicalKPIs.steps.length - 1}
                  />
                ))}
              </div>
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-50 to-transparent rounded-full -translate-y-1/2 translate-x-1/4 z-0 pointer-events-none"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <KpiCard
                title={`Activos en ${currentMonth}`}
                value={historicalKPIs.activeInMonth}
                subtext="Clientes gestionables"
                color="indigo"
              />
              <KpiCard
                title="Cartera en Riesgo"
                value={historicalKPIs.moraInMonth}
                subtext={`Detectados en ${currentMonth}`}
                color="red"
              />
              <KpiCard
                title="Total Histórico"
                value={data.length}
                subtext="Base de datos acumulada"
                color="emerald"
              />
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h4 className="font-black text-slate-700 uppercase mb-6 flex items-center gap-2">
                <TrendingUp size={18} className="text-slate-400" /> Curva de
                Permanencia ({historicalKPIs.steps[0].month} - {currentMonth})
              </h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalKPIs.steps}>
                    <defs>
                      <linearGradient
                        id="colorRetention"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#6366f1"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#6366f1"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fontWeight: 'bold' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      }}
                    />
                    <CartesianGrid vertical={false} stroke="#f1f5f9" />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRetention)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-2 px-6 flex justify-between items-center text-[10px] uppercase font-bold tracking-widest fixed bottom-0 w-full z-50">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            {syncStatus === 'synced' ? (
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            ) : (
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            )}
            {syncStatus === 'synced'
              ? 'SISTEMA OPERATIVO'
              : syncStatus === 'saving'
              ? 'SINCRONIZANDO...'
              : 'DESCONECTADO'}
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1">
            <ShieldCheck size={10} /> CONEXIÓN SEGURA TLS 1.3
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Wifi
            size={10}
            className={
              syncStatus === 'error' ? 'text-red-500' : 'text-emerald-500'
            }
          />
          {lastSaved
            ? `ÚLTIMA SINCRONIZACIÓN: ${lastSaved.toLocaleTimeString()}`
            : 'INICIANDO...'}
        </div>
      </footer>
    </div>
  );
}

// Icono auxiliar
const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);
