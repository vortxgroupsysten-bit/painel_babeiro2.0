// Configuração Firebase
const firebaseConfig = {
    apiKey: "AIzaSyClGuPVykO9JYXCCTipC-sHsXVZ0aDmFpE",
    authDomain: "painel-barbeiro.firebaseapp.com",
    databaseURL: "https://painel-barbeiro-default-rtdb.firebaseio.com",
    projectId: "painel-barbeiro",
    storageBucket: "painel-barbeiro.firebasestorage.app",
    messagingSenderId: "705166711606",
    appId: "1:705166711606:web:8efe81000b76b968807197"
};

// Estado da aplicação
let agendamentos = [];
let currentFilter = 'Todos';
let searchTerm = '';

// Elementos DOM
const tableBody = document.getElementById('tableBody');
const appointmentsTable = document.getElementById('appointmentsTable');
const mainLoader = document.getElementById('mainLoader');
const statsHoje = document.getElementById('statsHoje');
const statsPendentes = document.getElementById('statsPendentes');
const statsTotal = document.getElementById('statsTotal');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');

// Elementos Sidebar
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const openSidebarBtn = document.getElementById('openSidebar');
const closeSidebarBtn = document.getElementById('closeSidebar');

// Quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    // Configurar data atual
    const dateOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    document.getElementById('currentDateDisplay').textContent = 
        new Date().toLocaleDateString('pt-BR', dateOptions);
    
    // Configurar eventos
    setupEventListeners();
    
    // Iniciar Firebase
    initFirebase();
});

// Configurar eventos
function setupEventListeners() {
    // Sidebar mobile
    openSidebarBtn.addEventListener('click', toggleSidebar);
    closeSidebarBtn.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);
    
    // Filtros
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remover active de todos
            filterBtns.forEach(b => {
                b.classList.remove('active', 'bg-[#c5a059]', 'text-black');
                b.classList.add('bg-black/40', 'text-gray-400');
            });
            
            // Adicionar active ao clicado
            btn.classList.add('active', 'bg-[#c5a059]', 'text-black');
            btn.classList.remove('bg-black/40', 'text-gray-400');
            
            currentFilter = btn.dataset.barber;
            renderDashboard();
        });
    });
    
    // Busca
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        renderDashboard();
    });
}

// Alternar sidebar
function toggleSidebar() {
    sidebar.classList.toggle('sidebar-hidden');
    sidebarOverlay.classList.toggle('hidden');
}

// Inicializar Firebase
function initFirebase() {
    // Verificar se Firebase está disponível
    if (typeof firebase === 'undefined') {
        console.error('Firebase não carregado');
        return;
    }
    
    try {
        // Inicializar app Firebase
        const app = firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();
        
        // Configurar listener em tempo real
        const q = db.collection("agendamentos_barber").orderBy("data", "desc");
        
        q.onSnapshot((snapshot) => {
            agendamentos = [];
            snapshot.forEach((doc) => {
                agendamentos.push({ 
                    id: doc.id, 
                    ...doc.data() 
                });
            });
            
            renderDashboard();
            updateStats();
            
            // Esconder loader e mostrar tabela
            mainLoader.classList.add('hidden');
            appointmentsTable.classList.remove('hidden');
        }, (error) => {
            console.error("Erro Firebase:", error);
            mainLoader.innerHTML = '<p class="text-red-400">Erro ao carregar dados</p>';
        });
        
    } catch (error) {
        console.error("Erro ao inicializar Firebase:", error);
    }
}

// Atualizar estatísticas
function updateStats() {
    const hojeStr = new Date().toISOString().split('T')[0];
    const hoje = agendamentos.filter(a => a.data === hojeStr).length;
    const pendentes = agendamentos.filter(a => !a.concluido).length;
    
    statsHoje.textContent = hoje;
    statsPendentes.textContent = pendentes;
    statsTotal.textContent = agendamentos.length;
}

// Renderizar tabela
function renderDashboard() {
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // Filtrar dados
    const filtrados = agendamentos.filter(item => {
        const matchesSearch = searchTerm === '' || 
            (item.cliente && item.cliente.toLowerCase().includes(searchTerm)) || 
            (item.telefone && item.telefone.includes(searchTerm));
        
        const matchesBarber = currentFilter === 'Todos' || item.barbeiro === currentFilter;
        
        return matchesSearch && matchesBarber;
    });

    // Se não houver resultados
    if (filtrados.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="py-20 text-center text-gray-500">
                    Nenhum resultado encontrado.
                </td>
            </tr>
        `;
        return;
    }

    // Adicionar cada item à tabela
    filtrados.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "group hover:bg-white/[0.02] transition-all";
        
        tr.innerHTML = `
            <td class="py-5 px-2">
                <div class="flex items-center gap-3">
                    <div class="h-9 w-9 rounded-full bg-[#c5a059] flex items-center justify-center font-bold text-black uppercase text-xs">
                        ${item.cliente ? item.cliente.charAt(0) : '?'}
                    </div>
                    <div>
                        <p class="font-semibold text-sm truncate max-w-[120px] md:max-w-none">
                            ${item.cliente || 'Sem Nome'}
                        </p>
                        <p class="text-[10px] text-gray-500">${item.telefone || '-'}</p>
                    </div>
                </div>
            </td>
            <td class="py-5 px-2">
                <p class="text-xs font-medium">${item.servico || 'Corte'}</p>
                <p class="text-[9px] gold-text font-bold">${item.barbeiro || 'Não especificado'}</p>
            </td>
            <td class="py-5 px-2 text-center">
                <div class="inline-block bg-black/40 border border-white/5 px-2 py-1 rounded-lg">
                    <p class="text-xs font-bold text-white">${item.hora || '--:--'}</p>
                    <p class="text-[9px] text-gray-500">${item.data || '--/--/----'}</p>
                </div>
            </td>
            <td class="py-5 px-2 text-center">
                <span class="status-badge ${item.concluido ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}">
                    ${item.concluido ? '✓' : '...'}
                </span>
            </td>
            <td class="py-5 px-2 text-right">
                <div class="flex items-center justify-end gap-1">
                    <button class="btn-whatsapp p-2 hover:bg-green-500/10 text-green-400 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/>
                            <path d="M9 10a.5.5 0 0 0 1 0V4a3.5 3.5 0 0 0-7 0v11a4.5 4.5 0 0 0 9 0V9.5"/>
                        </svg>
                    </button>
                    <button class="btn-toggle p-2 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 6 9 17l-5-5"/>
                        </svg>
                    </button>
                    <button class="btn-delete p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </td>
        `;

        // Adicionar eventos aos botões
        const whatsappBtn = tr.querySelector('.btn-whatsapp');
        const toggleBtn = tr.querySelector('.btn-toggle');
        const deleteBtn = tr.querySelector('.btn-delete');

        if (whatsappBtn && item.telefone) {
            whatsappBtn.addEventListener('click', () => {
                const msg = encodeURIComponent(
                    `Olá ${item.cliente}, confirmamos a sua marcação para hoje às ${item.hora}. Tudo certo?`
                );
                const tel = item.telefone.replace(/\D/g, '');
                window.open(`https://wa.me/55${tel}?text=${msg}`, '_blank');
            });
        }

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => toggleStatus(item));
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteAppointment(item));
        }

        tableBody.appendChild(tr);
    });
}

// Alternar status do agendamento
function toggleStatus(item) {
    if (!firebase.apps.length) return;
    
    const db = firebase.firestore();
    const ref = db.collection("agendamentos_barber").doc(item.id);
    
    ref.update({
        concluido: !item.concluido
    }).catch(error => {
        console.error("Erro ao atualizar status:", error);
        alert("Erro ao atualizar status do agendamento.");
    });
}

// Excluir agendamento
function deleteAppointment(item) {
    if (!confirm(`Eliminar marcação de ${item.cliente}?`)) return;
    
    if (!firebase.apps.length) return;
    
    const db = firebase.firestore();
    const ref = db.collection("agendamentos_barber").doc(item.id);
    
    ref.delete().catch(error => {
        console.error("Erro ao excluir:", error);
        alert("Erro ao excluir agendamento.");
    });
}
