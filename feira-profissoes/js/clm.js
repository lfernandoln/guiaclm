// ==========================
// CONFIGURAÇÃO DO MAPA
// ==========================

const map = L.map('map', {
    maxZoom: 19,
    minZoom: 15
}).setView(
    [-23.106485, -50.360471], // Centralizado por padrão no Prédio Central
    18
);

L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        attribution: '© OpenStreetMap'
    }
).addTo(map);

// ==========================
// VARIÁVEIS GLOBAIS
// ==========================

let usuarioLat = null;
let usuarioLng = null;
let rotaAtual = null;

const lista = document.getElementById('lista-cursos');
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menu-btn');

// Modal de Detalhes
const modal = document.getElementById('modal-detalhes');
const modalFechar = document.getElementById('modal-fechar');

// ==========================
// NOMES DOS GRUPOS (TIPO)
// ==========================

const nomesTipo = {
    'curso': 'Cursos',
    'infraestrutura': 'Infraestrutura de Apoio'
};

// ==========================
// MENU MOBILE
// ==========================

if (menuBtn) {
    menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('aberto');
    });
}

// ==========================
// LOCALIZAÇÃO DO VISITANTE
// ==========================

navigator.geolocation.getCurrentPosition(
    pos => {
        usuarioLat = pos.coords.latitude;
        usuarioLng = pos.coords.longitude;

        console.log("Precisão:", pos.coords.accuracy, "metros");

        L.circleMarker(
            [usuarioLat, usuarioLng],
            {
                radius: 8,
                color: '#ffffff',
                weight: 2,
                fillColor: '#0066ff',
                fillOpacity: 1
            }
        )
        .addTo(map)
        .bindPopup(`📍 Você está aqui<br>Precisão: ${Math.round(pos.coords.accuracy)} m`);
    },
    erro => {
        console.warn("Geolocalização não concedida ou indisponível:", erro);
    },
    {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    }
);

// ==========================
// FUNÇÃO PARA EXIBIR MODAL DE SETORES
// ==========================

function abrirModalSetores(local) {
    if (!modal) return;

    document.getElementById('modal-titulo').innerText = local.nome;
    document.getElementById('modal-descricao').innerText = local.descricao || "";

    const conteinerSetores = document.getElementById('modal-setores-container');
    conteinerSetores.innerHTML = "";

    if (local.setores && local.setores.length > 0) {
        local.setores.forEach(grupo => {
            const bloco = document.createElement('div');
            bloco.className = 'grupo-setor';

            const tituloGrupo = document.createElement('h4');
            tituloGrupo.innerText = grupo.categoria;
            bloco.appendChild(tituloGrupo);

            const ul = document.createElement('ul');
            grupo.itens.forEach(itemText => {
                const li = document.createElement('li');
                li.innerText = itemText;
                ul.appendChild(li);
            });

            bloco.appendChild(ul);
            conteinerSetores.appendChild(bloco);
        });
    }

    const linkRota = document.getElementById('modal-link-rota');
    if (linkRota) {
        linkRota.href = `https://www.google.com/maps/dir/?api=1&destination=${local.lat},${local.lng}`;
    }

    modal.classList.remove('oculto');
}

if (modalFechar) {
    modalFechar.addEventListener('click', () => {
        modal.classList.add('oculto');
    });
}

// ==========================
// CRIA UM BOTÃO DE LOCAL
// ==========================

function criarBotaoLocal(local) {

    // MARCADOR NO MAPA
    const marker = L.marker([local.lat, local.lng]).addTo(map);

    // CONTEÚDO DO POPUP INTERNO DO LEAFLET
    let popupConteudo = `
        <div style="min-width:200px">
            <h3 style="margin:0 0 8px 0;">${local.nome}</h3>
    `;

    if (local.setores) {
        popupConteudo += `
            <button onclick="window.abrirModalGlobal('${local.nome}')" style="width:100%; margin-bottom:6px; padding:6px; cursor:pointer;">
                📋 Ver Setores e Departamentos
            </button>
        `;
    }

    popupConteudo += `
        <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${local.lat},${local.lng}', '_blank')" style="width:100%; padding:6px; cursor:pointer;">
            🚶 Como Chegar (Google Maps)
        </button>
    `;

    if (local.site) {
        popupConteudo += `
            <button onclick="window.open('${local.site}', '_blank')" style="width:100%; margin-top:6px; padding:6px; cursor:pointer;">
                🌐 Acessar Página
            </button>
        `;
    }

    popupConteudo += `</div>`;
    marker.bindPopup(popupConteudo);

    // BOTÃO LATERAL (SIDEBAR)
    const botao = document.createElement('button');
    botao.className = 'curso';
    botao.innerHTML = '📍 ' + local.nome;

    botao.onclick = () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('aberto');
        }

        document.querySelectorAll('.curso').forEach(btn => btn.classList.remove('ativo'));
        botao.classList.add('ativo');

        map.flyTo([local.lat, local.lng], 18, { duration: 1.5 });
        marker.openPopup();

        // Se o local possui setores detalhados, abre o modal direto ao clicar na sidebar
        if (local.setores) {
            abrirModalSetores(local);
        }

        // Traz a linha da rota visual
        if (rotaAtual) map.removeLayer(rotaAtual);

        if (usuarioLat !== null && usuarioLng !== null) {
            rotaAtual = L.polyline(
                [[usuarioLat, usuarioLng], [local.lat, local.lng]],
                { color: '#1976d2', weight: 5, opacity: 0.8 }
            ).addTo(map);
        }
    };

    // Guarda referência para acionar via window se necessário
    window.locaisCache = window.locaisCache || {};
    window.locaisCache[local.nome] = local;

    return botao;
}

// Atalho global para abrir modal de dentro do HTML do Popup
window.abrirModalGlobal = function(nomeLocal) {
    if (window.locaisCache && window.locaisCache[nomeLocal]) {
        abrirModalSetores(window.locaisCache[nomeLocal]);
    }
};

// ==========================
// CARREGA O CAMPUS.JSON
// ==========================

fetch('json/campus.json')
.then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
})
.then(locais => {
    const grupos = new Map();

    locais.forEach(local => {
        const chave = local.tipo || 'outros';
        if (!grupos.has(chave)) grupos.set(chave, []);
        grupos.get(chave).push(local);
    });

    const ordemTipos = [
        ...Object.keys(nomesTipo),
        ...[...grupos.keys()].filter(t => !(t in nomesTipo))
    ];

    ordemTipos.forEach(chave => {
        const locaisDoGrupo = grupos.get(chave);
        if (!locaisDoGrupo || locaisDoGrupo.length === 0) return;

        const separador = document.createElement('div');
        separador.className = 'separador-menu';
        separador.textContent = nomesTipo[chave] || chave;
        lista.appendChild(separador);

        locaisDoGrupo.forEach(local => {
            const botao = criarBotaoLocal(local);
            lista.appendChild(botao);
        });
    });
})
.catch(erro => {
    console.error('Erro ao carregar campus.json:', erro);
    lista.innerHTML = `<p style="padding:10px;">Não foi possível carregar os locais do campus.</p>`;
});