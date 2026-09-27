document.addEventListener("DOMContentLoaded", () => {

  // ==========================
  // CONFIGURAÇÃO DO MAPA
  // ==========================
  const map = L.map('map', {
    maxZoom: 19,
    minZoom: 15
  }).setView([-23.106485, -50.360471], 18);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  // ==========================
  // VARIÁVEIS GLOBAIS
  // ==========================
  let usuarioLat = null;
  let usuarioLng = null;
  let rotaAtual = null;

  const listaContainer = document.getElementById('lista-cursos');
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.getElementById('menu-btn');

  // Elementos do Modal
  const modal = document.getElementById('modal-detalhes');
  const modalFechar = document.getElementById('modal-fechar');

  // ==========================
  // MENU MOBILE
  // ==========================
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('aberto');
    });
  }

  // ==========================
  // GEOLOCALIZAÇÃO DO VISITANTE
  // ==========================
  navigator.geolocation.getCurrentPosition(
    pos => {
      usuarioLat = pos.coords.latitude;
      usuarioLng = pos.coords.longitude;

      L.circleMarker([usuarioLat, usuarioLng], {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: '#0066ff',
        fillOpacity: 1
      })
      .addTo(map)
      .bindPopup(`📍 Você está aqui<br>Precisão: ${Math.round(pos.coords.accuracy)} m`);
    },
    erro => {
      console.warn("Geolocalização não concedida:", erro);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );

  // ==========================
  // FUNÇÕES DO MODAL
  // ==========================
  function abrirModalPredio(predio) {
    if (!modal) return;

    document.getElementById('modal-titulo').innerText = predio.nome;
    document.getElementById('modal-descricao').innerText = predio.descricao || "";

    const conteinerSetores = document.getElementById('modal-setores-container');
    conteinerSetores.innerHTML = "";

    // Renderiza as categorias e itens do setor
    if (predio.setores && predio.setores.length > 0) {
      predio.setores.forEach(setor => {
        const blocoSetor = document.createElement('div');
        blocoSetor.className = 'grupo-setor';

        const tituloCategoria = document.createElement('h4');
        tituloCategoria.innerText = `🏢 ${setor.categoria}`;
        blocoSetor.appendChild(tituloCategoria);

        const ul = document.createElement('ul');
        setor.itens.forEach(item => {
          const li = document.createElement('li');
          li.innerHTML = `<strong>${item}</strong>`;
          ul.appendChild(li);
        });

        blocoSetor.appendChild(ul);
        conteinerSetores.appendChild(blocoSetor);
      });
    }

    // Link para rotas no Google Maps
    const linkRota = document.getElementById('modal-link-rota');
    if (linkRota) {
      linkRota.href = `https://www.google.com/maps/dir/?api=1&destination=${predio.lat},${predio.lng}`;
    }

    modal.classList.remove('oculto');
  }

  if (modalFechar) {
    modalFechar.addEventListener('click', () => {
      modal.classList.add('oculto');
    });
  }

  // ==========================
  // CARREGAR DADOS DE CAMPUS.JSON
  // ==========================
  
  // Adicione junto à inicialização dos seletores:
const sidebarFechar = document.getElementById('sidebar-fechar');

if (sidebarFechar) {
  sidebarFechar.addEventListener('click', () => {
    sidebar.classList.remove('aberto');
  });
}
  
  fetch('json/campus.json')
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(predios => {
      if (!predios || predios.length === 0) return;

      predios.forEach(predio => {
        // 1. Criar Marcador no Mapa Leaflet
        const marker = L.marker([predio.lat, predio.lng]).addTo(map);

        const popupConteudo = `
          <div style="min-width:200px">
            <h3 style="margin:0 0 8px 0;">${predio.nome}</h3>
            <p style="margin:0 0 10px 0; font-size:12px; color:#555;">${predio.descricao}</p>
            <button id="btn-ver-setores" style="width:100%; padding:8px; cursor:pointer; background:#1976d2; color:white; border:none; border-radius:4px;">
              📋 Ver Setores e Salas
            </button>
          </div>
        `;

        marker.bindPopup(popupConteudo);

        // Evento do botão dentro do popup do Leaflet
        marker.on('popupopen', () => {
          const btn = document.getElementById('btn-ver-setores');
          if (btn) {
            btn.onclick = () => abrirModalPredio(predio);
          }
        });

        // 2. Renderizar no Menu Lateral (Sidebar)
        const botaoPredio = document.createElement('button');
        botaoPredio.className = 'curso';
        botaoPredio.innerHTML = `📍 ${predio.nome}`;

        botaoPredio.onclick = () => {
          if (window.innerWidth <= 768) {
            sidebar.classList.remove('aberto');
          }

          document.querySelectorAll('.curso').forEach(b => b.classList.remove('ativo'));
          botaoPredio.classList.add('ativo');

          // Move o mapa e abre as informações
          map.flyTo([predio.lat, predio.lng], 18, { duration: 1.5 });
          marker.openPopup();
          abrirModalPredio(predio);

          // Traçar linha da geolocalização até o prédio
          if (rotaAtual) map.removeLayer(rotaAtual);

          if (usuarioLat !== null && usuarioLng !== null) {
            rotaAtual = L.polyline(
              [[usuarioLat, usuarioLng], [predio.lat, predio.lng]],
              { color: '#1976d2', weight: 5, opacity: 0.8 }
            ).addTo(map);
          }
        };

        listaContainer.appendChild(botaoPredio);
      });
    })
    .catch(erro => {
      console.error('Erro ao carregar json/campus.json:', erro);
      listaContainer.innerHTML = `<p style="padding:10px; color:red;">Não foi possível carregar os dados do Prédio Central.</p>`;
    });
});