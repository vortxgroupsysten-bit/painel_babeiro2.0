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
// Estado
// =======================
let agendamentos = [];
let currentFilter = 'Todos';
let searchTerm = '';

// =======================
// DOM
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
// Inicialização
// =======================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('currentDateDisplay').textContent =
        new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

    setupEventListeners();
    initFirebase();
});

// =======================
// Eventos
// =======================
function setupEventListeners() {
    openSidebarBtn.onclick = toggleSidebar;
    closeSidebarBtn.onclick = toggleSidebar;
    sidebarOverlay.onclick = toggleSidebar;

    filterBtns.forEach(btn => {
        btn.onclick = () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.barber;
            renderDashboard();
        };
    });

    searchInput.oninput = e => {
        searchTerm = e.target.value.toLowerCase();
        renderDashboard();
    };
}

function toggleSidebar() {
    sidebar.classList.toggle('sidebar-hidden');
    sidebarOverlay.classList.toggle('hidden');
}

// =======================
// Firebase
// =======================
function initFirebase() {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const db = firebase.firestore();

    // 🔥 Limpeza automática ao abrir o painel
    apagarAgendamentosAntigos(db);

    db.collection("agendamentos_barber")
        .orderBy("data", "desc")
        .onSnapshot(snapshot => {
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
        });
}

// =======================
// 🔥 Limpeza automática
// =======================
async function apagarAgendamentosAntigos(db) {
    const hoje = new Date().toISOString().split('T')[0];
    if (localStorage.getItem('limpezaFeita') === hoje) return;

    const snap = await db
        .collection("agendamentos_barber")
        .where("data", "<", hoje)
        .get();

    if (snap.empty) {
        localStorage.setItem('limpezaFeita', hoje);
        return;
    }

    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    localStorage.setItem('limpezaFeita', hoje);
    console.log(`Apagados ${snap.size} agendamentos antigos`);
}

// =======================
// Estatísticas
// =======================
function updateStats() {
    const hoje = new Date().toISOString().split('T')[0];
    statsHoje.textContent = agendamentos.filter(a => a.data === hoje).length;
    statsPendentes.textContent = agendamentos.filter(a => !a.concluido).length;
    statsTotal.textContent = agendamentos.length;
}

// =======================
// Renderização
// =======================
function renderDashboard() {
    tableBody.innerHTML = '';

    const filtrados = agendamentos.filter(item => {
        const matchBusca =
            !searchTerm ||
            item.cliente?.toLowerCase().includes(searchTerm) ||
            item.telefone?.includes(searchTerm);

        const matchBarber =
            currentFilter === 'Todos' || item.barbeiro === currentFilter;

        return matchBusca && matchBarber;
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
        tr.className = "hover:bg-white/[0.02]";

        tr.innerHTML = `
            <td class="py-5 px-2">
                <div>
                    <p class="font-semibold text-sm">
                        ${item.cliente || 'Sem nome'}
                    </p>
                    <p class="text-xs text-gray-400">
                        ${item.telefone || 'Sem telefone'}
                    </p>
                </div>
            </td>

            <td class="py-5 px-2">
                <p class="text-sm">${item.servico || 'Corte'}</p>
                <p class="text-xs text-gray-400">${item.barbeiro || '-'}</p>
            </td>

            <td class="py-5 px-2 text-center">
                <p class="text-sm font-bold">${item.hora || '--:--'}</p>
                <p class="text-xs text-gray-500">${item.data}</p>
            </td>

            <td class="py-5 px-2 text-center">
                <span class="${item.concluido ? 'text-green-400' : 'text-orange-400'}">
                    ${item.concluido ? '✓' : '...'}
                </span>
            </td>

            <td class="py-5 px-2 text-right">
                <button class="btn-whatsapp text-green-400 mr-2">Whats</button>
                <button class="btn-toggle text-blue-400 mr-2">✓</button>
                <button class="btn-delete text-red-400">🗑</button>
            </td>
        `;

        // WhatsApp
        tr.querySelector('.btn-whatsapp').onclick = () => {
            const tel = (item.telefone || '').replace(/\D/g, '');
            if (tel.length >= 10) {
                window.open(`https://wa.me/55${tel}`, '_blank');
            }
        };

        // Toggle status
        tr.querySelector('.btn-toggle').onclick = () => toggleStatus(item);

        // Delete
        tr.querySelector('.btn-delete').onclick = () => deleteAppointment(item);

        tableBody.appendChild(tr);
    });
}

// =======================
// Ações
// =======================
function toggleStatus(item) {
    firebase.firestore()
        .collection("agendamentos_barber")
        .doc(item.id)
        .update({ concluido: !item.concluido });
}

function deleteAppointment(item) {
    if (!confirm(`Excluir agendamento de ${item.cliente}?`)) return;

    firebase.firestore()
        .collection("agendamentos_barber")
        .doc(item.id)
        .delete();
}
