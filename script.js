import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, onSnapshot, updateDoc, doc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyClGuPVykO9JYXCCTipC-sHsXVZ0aDmFpE",
  authDomain: "painel-barbeiro.firebaseapp.com",
  databaseURL: "https://painel-barbeiro-default-rtdb.firebaseio.com",
  projectId: "painel-barbeiro",
  storageBucket: "painel-barbeiro.firebasestorage.app",
  messagingSenderId: "705166711606",
  appId: "1:705166711606:web:8efe81000b76b968807197"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const agendamentosRef = collection(db, "agendamentos");

// Função para formatar a data vinda do site
const formatarData = (dataStr) => {
    try {
        const data = new Date(dataStr);
        return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return dataStr; }
};

function monitorarAgendamentos() {
    const q = query(agendamentosRef, orderBy("data", "desc"));
    
    onSnapshot(q, (snapshot) => {
        const tabela = document.getElementById("tabela-agendamentos");
        if(!tabela) return;
        
        tabela.innerHTML = "";
        let pendentes = 0;
        let concluidos = 0;

        snapshot.forEach((docSnapshot) => {
            const item = docSnapshot.data();
            const id = docSnapshot.id;

            if (item.status === 'pendente') pendentes++;
            else concluidos++;

            const tr = document.createElement("tr");
            tr.className = "hover:bg-gray-50 transition-colors";
            tr.innerHTML = `
                <td class="px-6 py-4 font-medium text-gray-900">
                    ${item.nomeCliente}<br>
                    <span class="text-xs text-gray-500">${item.telefone || 'Sem telefone'}</span>
                </td>
                <td class="px-6 py-4 text-gray-600">
                    <span class="font-semibold">${item.servico}</span><br>
                    <span class="text-xs italic text-yellow-600">Barbeiro: ${item.nomeBarbeiro || 'Não selecionado'}</span>
                </td>
                <td class="px-6 py-4 text-gray-600">${formatarData(item.data)}</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded-full text-xs ${item.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}">
                        ${item.status}
                    </span>
                </td>
                <td class="px-6 py-4 text-center">
                    ${item.status === 'pendente' ? 
                        `<button onclick="marcarComoConcluido('${id}')" class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition">Concluir</button>` : 
                        `<i class="fas fa-check-circle text-green-500"></i>`
                    }
                </td>
            `;
            tabela.appendChild(tr);
        });

        // Atualiza os contadores no topo do painel
        if(document.getElementById("total-pendentes")) document.getElementById("total-pendentes").innerText = pendentes;
        if(document.getElementById("total-concluidos")) document.getElementById("total-concluidos").innerText = concluidos;
        if(document.getElementById("total-hoje")) document.getElementById("total-hoje").innerText = snapshot.size;
    });
}

// Função global para o botão de concluir
window.marcarComoConcluido = async (id) => {
    try {
        const docRef = doc(db, "agendamentos", id);
        await updateDoc(docRef, { status: "concluido" });
    } catch (error) {
        console.error("Erro ao atualizar status:", error);
    }
};

// Inicia a escuta automática
monitorarAgendamentos();
