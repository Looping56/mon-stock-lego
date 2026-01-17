
 // CONFIGURATION
const SB_URL = 'https://orofxwykbdtwbissglkj.supabase.co';
const SB_KEY = 'sb_publishable_f13beKBpC1m7-heNv2SOxA_47n1nuLP';
const REBRICK_KEY = 'c54e689ff20915c537d968ffe15a3745';

const clientSupabase = supabase.createClient(SB_URL, SB_KEY);

window.onload = async () => {
    console.log("Système prêt !");
    await chargerCollection();
    await calculerFinance();
};

// --- GESTION DES SETS ---

async function chargerCollection() {
    const grid = document.getElementById('setsGrid');
    const { data: sets, error } = await clientSupabase
        .from('sets_possedes')
        .select('*')
        .order('id', { ascending: false });

    if (error) return console.error(error);
    
    grid.innerHTML = "";
    sets.forEach(set => {
        grid.innerHTML += `
            <div class="set-card">
                <div class="qty-badge">${set.quantite}</div>
                <img src="${set.image_url}" alt="Set">
                <div class="set-title">${set.set_num}<br>${set.nom}</div>
                <div class="qty-control">
                    <button class="qty-btn" onclick="modifierQte('sets_possedes', ${set.id}, -1)">-</button>
                    <button class="qty-btn" onclick="modifierQte('sets_possedes', ${set.id}, 1)">+</button>
                </div>
                <button onclick="supprimerElement('sets_possedes', ${set.id})" class="btn-delete">🗑️</button>
            </div>`;
    });
}

async function ajouterNouveauSet() {
    const input = document.getElementById('setSearchInput');
    const setNum = input.value;
    if (!setNum) return;

    const resp = await fetch(`https://rebrickable.com/api/v3/lego/sets/${setNum}/`, {
        headers: { 'Authorization': `key ${REBRICK_KEY}` }
    });
    const data = await resp.json();

    if (!data.set_num) return alert("Set non trouvé !");

    const { error } = await clientSupabase.from('sets_possedes').insert([{
        set_num: data.set_num,
        nom: data.name,
        image_url: data.set_img_url,
        quantite: 1
    }]);

    if (!error) {
        input.value = "";
        await chargerCollection();
        await calculerFinance();
    }
}

// --- GESTION DU VRAC ---

async function rechercherPiece() {
    const ref = document.getElementById('searchPiece').value;
    const container = document.getElementById('resultatRecherche');
    if (!ref) return;

    const { data, error } = await clientSupabase
        .from('pieces_inventaire')
        .select('*, emplacements(nom)')
        .ilike('piece_num', `%${ref}%`);

    container.innerHTML = "";
    if (data.length === 0) container.innerHTML = "<p>Aucune pièce.</p>";

    data.forEach(item => {
        container.innerHTML += `
            <div class="set-card">
                <div class="qty-badge">${item.quantite}</div>
                <img src="${item.image_url}" alt="Pièce">
                <div class="set-title"><strong>${item.piece_num}</strong><br><small>${item.emplacements?.nom || 'Vrac'}</small></div>
                <div class="qty-control">
                    <button class="qty-btn" onclick="modifierQte('pieces_inventaire', ${item.id}, -1, true)">-</button>
                    <button class="qty-btn" onclick="modifierQte('pieces_inventaire', ${item.id}, 1, true)">+</button>
                </div>
                <button onclick="supprimerElement('pieces_inventaire', ${item.id})" class="btn-delete">🗑️</button>
            </div>`;
    });
}

async function ajouterPieceVrac() {
    const ref = document.getElementById('searchPiece').value;
    if (!ref) return alert("Entrez une réf !");

    const resp = await fetch(`https://rebrickable.com/api/v3/lego/parts/${ref}/`, {
        headers: { 'Authorization': `key ${REBRICK_KEY}` }
    });
    const data = await resp.json();

    if (!data.part_num) return alert("Pièce inconnue !");

    const { error } = await clientSupabase.from('pieces_inventaire').insert([{
        piece_num: data.part_num,
        nom_piece: data.name,
        image_url: data.part_img_url,
        quantite: 1
    }]);

    if (!error) rechercherPiece();
}

// --- FONCTIONS UNIVERSELLES ---

async function modifierQte(table, id, diff, isVrac = false) {
    const { data } = await clientSupabase.from(table).select('quantite').eq('id', id).single();
    const nouvelleQte = Math.max(0, (data.quantite || 0) + diff);
    
    await clientSupabase.from(table).update({ quantite: nouvelleQte }).eq('id', id);
    
    if (isVrac) rechercherPiece();
    else {
        await chargerCollection();
        await calculerFinance();
    }
}

async function supprimerElement(table, id) {
    if (!confirm("Supprimer définitivement ?")) return;
    await clientSupabase.from(table).delete().eq('id', id);
    if (table === 'sets_possedes') chargerCollection();
    else rechercherPiece();
}

async function calculerFinance() {
    const { data } = await clientSupabase.from('sets_possedes').select('quantite');
    if (data) {
        const total = data.reduce((sum, item) => sum + item.quantite, 0);
        // On peut ajouter ici les calculs de prix si tu as les colonnes prix_achat
    }
}