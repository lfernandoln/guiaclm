// ==========================
// CONFIGURAÇÃO DO MAPA
// ==========================

const map = L.map('map', {
    maxZoom: 19,
    minZoom: 17
}).setView(
    [-23.108147, -50.358959],
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

// ==========================
// NOMES DOS GRUPOS (CAMPUS)
// ==========================
// A ORDEM DAS CHAVES AQUI DEFINE A ORDEM DE EXIBIÇÃO NO MENU,
// independente da ordem dos itens no stands.json.

const nomesCampus = {
    'CCP': 'Campus Cornélio Procópio',
    'CJ': 'Campus Jacarezinho',
    'CEEP': 'Instituições Parceiras'
};

// ==========================
// MENU MOBILE
// ==========================

menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('aberto');
});

// ==========================
// LOCALIZAÇÃO DO VISITANTE
// ==========================

navigator.geolocation.getCurrentPosition(

    pos => {
        usuarioLat = pos.coords.latitude;
        usuarioLng = pos.coords.longitude;

        map.setView([usuarioLat, usuarioLng], 18);

        L.circleMarker(
            [usuarioLat, usuarioLng],
            {
                radius: 10,
                color: '#0066ff',
                fillColor: '#0066ff',
                fillOpacity: 1
            }
        )
            .addTo(map)
            .bindPopup(
                `📍 Você está aqui<br>
                 Precisão: ${Math.round(pos.coords.accuracy)} m`
            );
    },

    erro => console.error(erro),

    {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    }
);

// ==========================
// CRIA UM BOTÃO DE STAND
// ==========================

function criarBotaoStand(local) {

    // MARCADOR NO MAPA
    const marker = L.marker([local.lat, local.lng]).addTo(map);

    marker.bindPopup(`
        <div style="min-width:220px">
            <h3>${local.nome}</h3>
            <button onclick="
                window.open(
                    'https://www.google.com/maps/dir/?api=1&destination=${local.lat},${local.lng}',
                    '_blank'
                )
            ">
                🚶 Como Chegar
            </button>
        </div>
    `);

    // BOTÃO LATERAL
    const botao = document.createElement('button');
    botao.className = 'curso';
    botao.innerHTML = '📍 ' + local.nome;

    botao.onclick = () => {

        if (window.innerWidth <= 768) {
            sidebar.classList.remove('aberto');
        }

        document.querySelectorAll('.curso')
            .forEach(btn => btn.classList.remove('ativo'));

        botao.classList.add('ativo');

        map.flyTo([local.lat, local.lng], 18, { duration: 1.5 });

        marker.openPopup();

        if (rotaAtual) {
            map.removeLayer(rotaAtual);
        }

        if (usuarioLat !== null && usuarioLng !== null) {
            rotaAtual = L.polyline(
                [
                    [usuarioLat, usuarioLng],
                    [local.lat, local.lng]
                ],
                {
                    color: '#1976d2',
                    weight: 5,
                    opacity: 0.8
                }
            ).addTo(map);
        }
    };

    return botao;
}

// ==========================
// CARREGA OS STANDS
// ==========================

fetch('json/stands.json')

    .then(response => response.json())

    .then(locais => {

        // Agrupa os stands por campus, sem depender da ordem do JSON
        const grupos = new Map();

        locais.forEach(local => {
            const chave = local.campus || 'OUTROS';

            if (!grupos.has(chave)) {
                grupos.set(chave, []);
            }

            grupos.get(chave).push(local);
        });

        // Define a ordem de exibição: primeiro os campus conhecidos
        // (na ordem declarada em nomesCampus), depois qualquer outro
        // campus que apareça no JSON e não esteja mapeado.
        const ordemCampus = [
            ...Object.keys(nomesCampus),
            ...[...grupos.keys()].filter(c => !(c in nomesCampus))
        ];

        ordemCampus.forEach(chave => {

            const stands = grupos.get(chave);

            if (!stands || stands.length === 0) return;

            // SEPARADOR DO GRUPO
            const separador = document.createElement('div');
            separador.className = 'separador-menu';
            separador.textContent = nomesCampus[chave] || chave;
            lista.appendChild(separador);

            // BOTÕES DOS STANDS DO GRUPO
            stands.forEach(local => {
                const botao = criarBotaoStand(local);
                lista.appendChild(botao);
            });
        });

    })

    .catch(erro => console.error('Erro ao carregar stands:', erro));