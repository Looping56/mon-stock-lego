// 1. CONFIGURATION (Toujours en premier)
const SUPABASE_URL = 'https://orofxwykbdtwbissglkj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_f13beKBpC1m7-heNv2SOxA_47n1nuLP';
const REBRICKABLE_KEY = 'c54e689ff20915c537d968ffe15a3745';

// Utilisation d'un nom différent pour ne pas confondre avec la bibliothèque
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

alert("Script chargé et connecté !");

// 2. FONCTIONS DE CHARGEMENT
async function chargerStock() {
    console.log("Tentative de chargement du stock...");
    const { data, error } = await supabaseClient
        .from('sets_possedes')
        .select('*');

    if (error) console.error("Erreur chargement :", error.message);
    if (data) {
        console.log("Données chargées :", data);
        // Ici tu pourras appeler une fonction pour afficher tes cartes
    }
}

// Lancer le chargement une fois que tout est prêt
window.onload = () => {
    chargerStock();
    if(document.getElementById('totalInvesti')) calculerFinance();
};

// 3. AJOUT DE SET
async function ajouterNouveauSet() {
    // On essaie de trouver l'input par ID, c'est plus sûr
    const input = document.getElementById('setSearchInput') || document.querySelector('input');
    const setNum = input.value; 

    if (!setNum) return alert("Veuillez entrer un numéro de set");

    console.log("Recherche du set :", setNum);

    const response = await fetch(`https://rebrickable.com/api/v3/lego/sets/${setNum}/`, {
        headers : { 'Authorization': `key ${REBRICKABLE_KEY}`}
    });

    if (!response.ok) return alert("Set non trouvé sur Rebrickable");
    const data = await response.json();

    const { data: dbData, error } = await supabaseClient
        .from('sets_possedes')
        .insert([{ 
            set_num: data.set_num, 
            nom: data.name, 
            image_url: data.set_img_url,
            nb_pieces: data.num_parts,
            quantite: 1 
        }])
        .select();

    if (error) {
        alert("Erreur Supabase : " + error.message);
    } else {
        alert("Set ajouté !");
        location.reload(); // Recharge la page pour voir le nouveau set
    } 
}

// 4. RECHERCHE DE PIÈCE
async function rechercherPiece() {
    const input = document.getElementById('searchPiece');
    if(!input) return;
    const ref = input.value;
    const container = document.getElementById('resultatRecherche');
    
    container.innerHTML = "Recherche en cours...";

    const { data, error } = await supabaseClient
        .from('pieces_inventaire')
        .select(`*, emplacements (nom, parent_id)`)
        .eq('piece_num', ref);

    if (data && data.length > 0) {
        container.innerHTML = "";
        data.forEach(item => {
            container.innerHTML += `
                <div class="piece-row" style="background:white; padding:15px; border-radius:10px; display:flex; align-items:center; margin-bottom:10px; shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <img src="${item.image_url}" width="60" style="margin-right:20px;">
                    <div style="flex:1;">
                        <div style="font-weight:bold;">${item.nom_piece} (${item.piece_num})</div>
                        <div style="color: #d32f2f; font-size:0.9em;">📍 Emplacement : ${item.emplacements?.nom || 'Non défini'}</div>
                        <div style="font-size:0.8em; color:#888;">Couleur : ${item.couleur}</div>
                    </div>
                    <div style="font-size:1.5em; font-weight:bold;">x${item.quantite}</div>
                </div>
            `;
        });
    } else {
        container.innerHTML = "<p>Vous n'avez pas cette pièce en stock.</p>";
    }
}

// ... Garde tes autres fonctions (exporterExcel, etc.) en remplaçant 'supabase' par 'supabaseClient'
