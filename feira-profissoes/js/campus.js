// ==========================
// CONFIGURAÇÃO DO MAPA
// ==========================

const map = L.map('map', {
    maxZoom: 19,
    minZoom: 17
}).setView(
    [-23.1075, -50.3598],
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
// NOMES DOS GRUPOS (TIPO)
// ==========================
// A ORDEM DAS CHAVES AQUI DEFINE A ORDEM DE EXIBIÇÃO NO MENU,
// independente da ordem dos itens no campus.json.

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

        console.log(
            "Precisão:",
            pos.coords.accuracy,
            "metros"
        );

        map.setView(
            [usuarioLat, usuarioLng],
            18
        );

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

    erro => {

        console.error(erro);

    },

    {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    }

);

// ==========================
// CRIA UM BOTÃO DE LOCAL
// ==========================

function criarBotaoLocal(local) {

    // MARCADOR
    const marker = L.marker([
        local.lat,
        local.lng
    ]).addTo(map);

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

            ${
                local.site
                ? `
                <br><br>

                <button onclick="
                    window.open(
                        '${local.site}',
                        '_blank'
                    )
                ">
                    🌐 Conhecer o Curso
                </button>
                `
                : ''
            }

        </div>
    `);

    // BOTÃO LATERAL
    const botao = document.createElement('button');

    botao.className = 'curso';

    botao.innerHTML = '📍 ' + local.nome;

    botao.onclick = () => {

        // Fecha menu em telas pequenas

        if (window.innerWidth <= 768) {

            sidebar.classList.remove('aberto');

        }

        // Remove destaque anterior

        document
            .querySelectorAll('.curso')
            .forEach(btn =>
                btn.classList.remove('ativo')
            );

        // Destaca o atual

        botao.classList.add('ativo');

        // Move o mapa

        map.flyTo(
            [local.lat, local.lng],
            18,
            { duration: 1.5 }
        );

        // Abre popup

        marker.openPopup();

        // Remove rota anterior

        if (rotaAtual) {

            map.removeLayer(rotaAtual);

        }

        // Cria rota até o destino

        if (
            usuarioLat !== null &&
            usuarioLng !== null
        ) {

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
// CARREGA O CAMPUS
// ==========================

fetch('json/campus.json')

.then(response => {

    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status}`
        );
    }

    return response.json();

})

.then(locais => {

    console.log(
        'Campus carregado:',
        locais
    );

    // Agrupa os locais por tipo, sem depender da ordem do JSON
    const grupos = new Map();

    locais.forEach(local => {

        const chave = local.tipo || 'outros';

        if (!grupos.has(chave)) {
            grupos.set(chave, []);
        }

        grupos.get(chave).push(local);

    });

    // Ordem de exibição: primeiro os tipos conhecidos
    // (na ordem declarada em nomesTipo), depois qualquer outro
    // tipo que apareça no JSON e não esteja mapeado.
    const ordemTipos = [
        ...Object.keys(nomesTipo),
        ...[...grupos.keys()].filter(t => !(t in nomesTipo))
    ];

    ordemTipos.forEach(chave => {

        const locaisDoGrupo = grupos.get(chave);

        if (!locaisDoGrupo || locaisDoGrupo.length === 0) return;

        // SEPARADOR DO GRUPO
        const separador = document.createElement('div');
        separador.className = 'separador-menu';
        separador.textContent = nomesTipo[chave] || chave;
        lista.appendChild(separador);

        // BOTÕES DO GRUPO
        locaisDoGrupo.forEach(local => {
            const botao = criarBotaoLocal(local);
            lista.appendChild(botao);
        });

    });

})

.catch(erro => {

    console.error(
        'Erro ao carregar campus.json:',
        erro
    );

    lista.innerHTML = `
        <p>
            Não foi possível carregar os locais do campus.
        </p>
    `;

});