// =======================
// Configuração Firebase
// =======================
const firebaseConfig = {
    apiKey: "AIzaSyClGuPVykO9JYXCCTipC-sHsXVZ0aDmFpE",
    authDomain: "painel-barbeiro.firebaseapp.com",
    databaseURL: "https://painel-barbeiro-default-rtdb.firebaseio.com",
    projectId: "painel-barbeiro",
    storageBucket: "painel-barbeiro.firebasestorage.app",
    messagingSenderId: "705166711606",
    appId: "1:705166711606:web:8efe81000b76b968807197"
};

// =======================
// Estado da aplicação
// =======================
let agendamentos = [];
let currentFilter = 'Todos';
let searchTerm = '';

// =======================
// Elementos DOM
// =======================
const tableBody = document.getElementById('tableBody');
const appointmentsTable = document.getElementById('appointmentsTable');
const mainLoader = document.getElementById('mainLoader');
const statsHoje = document.getElementById('statsHoje');
const statsPendentes = document.getElementById('statsPendentes');
const statsTotal = document.getElementById('statsTotal');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');

const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const openSidebarBtn = document.getElementById('openSidebar');
const closeSidebarBtn = document.getElementById('closeSidebar');

// =======================
// Carregamento inicial
// =======================
document.addEventListener('DOMContentLoaded', () => {
    const dateOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    document.getElementById('currentDateDisplay').textContent =
        new Date().toLocaleDateString('pt-BR', dateOptions);

    setupEventListeners();
    initFirebase();
});

// =======================
// Eventos
// =======================
function setupEventListeners() {
    openSidebarBtn.addEventListener('click', toggleSidebar);
    closeSidebarBtn.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.classList.remove('active', 'bg-[#c5a059]', 'text-black');
                b.classList.add('bg-black/40', 'text-gray-400');
            });

            btn.classList.add('active', 'bg-[#c5a059]', 'text-black');
            btn.classList.remove('bg-black/40', 'text-gray-400');

            currentFilter = btn.dataset.barber;
            renderDashboard();
        });
    });

    searchInput.addEventListener('input', e => {
        searchTerm = e.target.value.toLowerCase();
        renderDashboard();
    });
}

function toggleSidebar() {
    sidebar.classList.toggle('sidebar-hidden');
    sidebarOverlay.classList.toggle('hidden');
}

// =======================
// Firebase
// =======================
function initFirebase() {
    if (typeof firebase === 'undefined') {
        console.error('Firebase não carregado');
        return;
    }

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // 🔥 LIMPEZA AUTOMÁTICA AO ABRIR O PAINEL
    apagarAgendamentosAntigos(db);

    const q = db.collection("agendamentos_barber").orderBy("data", "desc");

    q.onSnapshot(snapshot => {
        agendamentos = [];
        snapshot.forEach(doc => {
            agendamentos.push({
                id: doc.id,
                ...doc.data()
            });
        });

        renderDashboard();
        updateStats();

        mainLoader.classList.add('hidden');
        appointmentsTable.classList.remove('hidden');
    }, error => {
        console.error("Erro Firebase:", error);
        mainLoader.innerHTML = '<p class="text-red-400">Erro ao carregar dados</p>';
    });
}

// =======================
// 🔥 FUNÇÃO DE LIMPEZA
// =======================
async function apagarAgendamentosAntigos(db) {
    const hoje = new Date().toISOString().split('T')[0];

    if (localStorage.getItem('limpezaFeita') === hoje) return;

    try {
        const snapshot = await db
            .collection("agendamentos_barber")
            .where("data", "<", hoje)
            .get();

        if (snapshot.empty) {
            localStorage.setItem('limpezaFeita', hoje);
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        console.log(`Agendamentos antigos apagados: ${snapshot.size}`);
        localStorage.setItem('limpezaFeita', hoje);
    } catch (err) {
        console.error("Erro ao limpar agendamentos:", err);
    }
}

// =======================
// Estatísticas
// =======================
function updateStats() {
    const hojeStr = new Date().toISOString().split('T')[0];

    statsHoje.textContent = agendamentos.filter(a => a.data === hojeStr).length;
    statsPendentes.textContent = agendamentos.filter(a => !a.concluido).length;
    statsTotal.textContent = agendamentos.length;
}

// =======================
// Renderização
// =======================
function renderDashboard() {
    tableBody.innerHTML = '';

    const filtrados = agendamentos.filter(item => {
        const matchesSearch =
            searchTerm === '' ||
            item.cliente?.toLowerCase().includes(searchTerm) ||
            item.telefone?.includes(searchTerm);

        const matchesBarber =
            currentFilter === 'Todos' || item.barbeiro === currentFilter;

        return matchesSearch && matchesBarber;
    });

    if (!filtrados.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="py-20 text-center text-gray-500">
                    Nenhum resultado encontrado.
                </td>
            </tr>
        `;
        return;
    }

    filtrados.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="py-5 px-2">${item.cliente || 'Sem nome'}</td>
            <td class="py-5 px-2">${item.servico || 'Corte'}</td>
            <td class="py-5 px-2 text-center">${item.data} ${item.hora}</td>
            <td class="py-5 px-2 text-center">
                ${item.concluido ? '✓' : '...'}
            </td>
            <td class="py-5 px-2 text-right">
                <button class="btn-delete text-red-400">Excluir</button>
            </td>
        `;

        tr.querySelector('.btn-delete').onclick = () => deleteAppointment(item);
        tableBody.appendChild(tr);
    });
}

// =======================
// Ações
// =======================
function deleteAppointment(item) {
    if (!confirm(`Excluir agendamento de ${item.cliente}?`)) return;

    const db = firebase.firestore();
    db.collection("agendamentos_barber")
        .doc(item.id)
        .delete()
        .catch(err => alert("Erro ao excluir"));
}
