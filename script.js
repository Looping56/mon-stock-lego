
 // CONFIGURATION
const SUPABASE_URL = 'https://orofxwykbdtwbissglkj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_f13beKBpC1m7-heNv2SOxA_47n1nuLP';
const REBRICKABLE_KEY = 'c54e689ff20915c537d968ffe15a3745';

// Initialisation du client (attention au nom pour éviter les conflits)
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.onload = async () => {
    console.log("Appli chargée");
    await chargerCollection();
};

// --- FONCTION POUR LES BOUTONS + ET - ---
async function ajusterQuantite(table, id, changement) {
    // 1. Récupérer la ligne actuelle
    const { data, error } = await sb.from(table).select('quantite').eq('id', id).single();
    
    if (error) return console.error(error);

    const nouvelleQte = Math.max(0, (data.quantite || 0) + changement);

    // 2. Mise à jour
    const { error: updateError } = await sb.from(table).update({ quantite: nouvelleQte }).eq('id', id);

    if (!updateError) {
        // Au lieu de recharger toute la page, on rafraîchit juste les données
        chargerCollection(); 
    }
}

// --- CHARGER LES SETS DEPUIS SUPABASE ---
async function chargerCollection() {
    const { data: sets, error } = await sb.from('sets_possedes').select('*');
    const grid = document.getElementById('setsGrid');
    
    if (!grid) return;
    grid.innerHTML = ""; // On vide pour reconstruire

    if (sets) {
        sets.forEach(set => {
            grid.innerHTML += `
                <div class="set-card">
                    <img src="${set.image_url}" alt="${set.nom}">
                    <div class="set-info">
                        <div class="set-title">${set.set_num} - ${set.nom}</div>
                            <div class="qty-control">
                                <button class="qty-btn" onclick="modifierQte(${set.id}, -1)">-</button>
                                <span>${set.quantite}</span>
                                <button class="qty-btn" onclick="modifierQte(${set.id}, 1)">+</button>
                                <button onclick="supprimerElement('sets_possedes', ${set.id})" style="margin-left:10px; background:none; border:none; cursor:pointer;">🗑️</button>
                            </div>
                    </div>
                </div>
            `;
        });
    }
}

// --- AJOUTER UN NOUVEAU SET ---
async function ajouterNouveauSet() {
    const input = document.getElementById('setSearchInput');
    const setNum = input.value;
    if (!setNum) return;

    // Fetch Rebrickable
    const resp = await fetch(`https://rebrickable.com/api/v3/lego/sets/${setNum}/`, {
        headers: { 'Authorization': `key ${REBRICKABLE_KEY}` }
    });
    const data = await resp.json();

    if (data.set_num) {
        const { error } = await sb.from('sets_possedes').insert([{
            set_num: data.set_num,
            nom: data.name,
            image_url: data.set_img_url,
            quantite: 1
        }]);
        
        if (!error) {
            input.value = "";
            chargerCollection();
        }
    }
}
// --- FONCTION SUPPRIMER (Sets ou Pièces) ---
async function supprimerElement(table, id) {
    const confirmer = confirm("Voulez-vous vraiment supprimer cet élément ?");
    if (!confirmer) return;

    const { error } = await clientSupabase.from(table).delete().eq('id', id);

    if (error) {
        alert("Erreur lors de la suppression : " + error.message);
    } else {
        // Rafraîchir l'affichage selon la table
        if (table === 'sets_possedes') await chargerCollection();
        else await rechercherPiece(); 
    }
}

// --- RECHERCHE DE PIÈCE (Vrac) ---
async function rechercherPiece() {
    const input = document.getElementById('searchPiece');
    const ref = input.value;
    const container = document.getElementById('resultatRecherche');
    
    if (!ref) return alert("Entrez une référence de pièce !");
    container.innerHTML = "Recherche en cours...";

// On récupère la pièce ET on joint le nom de l'emplacement
    const { data, error } = await clientSupabase
        .from('pieces_inventaire')
        .select(`*, emplacements(nom)`)
        .ilike('piece_num', `%${ref}%`); // Recherche flexible

    if (error) return container.innerHTML = "Erreur : " + error.message;

    container.innerHTML = ""; 
    data.forEach(item => {
        container.innerHTML += `
            <div class="piece-row" style="display: flex; align-items: center; background: white; margin-bottom: 10px; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <img src="${item.image_url}" width="50" style="margin-right: 20px;">
                <div style="flex: 1;">
                    <div style="font-weight: bold;">${item.nom_piece || 'Pièce'} (${item.piece_num})</div>
                    <div style="font-size: 0.8em; color: #666;">
                        📍 Emplacement : <span style="color: #d32f2f; font-weight: bold;">${item.emplacements?.nom || 'Non classé'}</span>
                    </div>
                </div>
                <div class="qty-control">
                    <button class="qty-btn" onclick="modifierQteVrac(${item.id}, -1)">-</button>
                    <strong>${item.quantite}</strong>
                    <button class="qty-btn" onclick="modifierQteVrac(${item.id}, 1)">+</button>
                    <button onclick="supprimerElement('pieces_inventaire', ${item.id})" style="margin-left:15px; background:none; border:none; cursor:pointer; color:#f44336;">🗑️</button>
                </div>
            </div>`;
    });
}

// --- MODIFIER QTE VRAC ---
async function modifierQteVrac(id, diff) {
    const { data } = await clientSupabase.from('pieces_inventaire').select('quantite').eq('id', id).single();
    const nouvelleQte = Math.max(0, (data.quantite || 0) + diff);
    await clientSupabase.from('pieces_inventaire').update({ quantite: nouvelleQte }).eq('id', id);
    await rechercherPiece();
}
let zoomLevel = 1.0;

function changerTaille(facteur) {
    zoomLevel *= facteur;
    // On limite pour ne pas que ce soit trop petit ou trop grand
    if (zoomLevel < 0.5) zoomLevel = 0.5;
    if (zoomLevel > 2.0) zoomLevel = 2.0;

    // On applique la nouvelle taille à la grille
    const grid = document.getElementById('setsGrid');
    if (grid) {
        // On modifie la largeur des colonnes de la grille
        grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${200 * zoomLevel}px, 1fr))`;
    }
    
    // On peut aussi réduire les images spécifiquement
    const images = document.querySelectorAll('.set-card img');
    images.forEach(img => {
        img.style.maxHeight = `${150 * zoomLevel}px`;
    });
}
