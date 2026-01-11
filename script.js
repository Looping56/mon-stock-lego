
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
                            <span>Stock: <strong>${set.quantite}</strong></span>
                            <div>
                                <button class="qty-btn" onclick="ajusterQuantite('sets_possedes', ${set.id}, -1)">-</button>
                                <button class="qty-btn" onclick="ajusterQuantite('sets_possedes', ${set.id}, 1)">+</button>
                            </div>
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
    // Fonction pour augmenter ou diminuer la quantité d'un set ou d'une pièce
async function ajusterQuantite(table, id, changement) {
    console.log(`Ajustement de ${table} ID ${id} de ${changement}`);

    // 1. Récupérer la quantité actuelle depuis Supabase
    const { data, error: fetchError } = await supabaseClient
        .from(table)
        .select('quantite')
        .eq('id', id)
        .single();

    if (fetchError) return console.error("Erreur fetch:", fetchError.message);

    const nouvelleQte = Math.max(0, (data.quantite || 0) + changement);

    // 2. Mettre à jour la nouvelle quantité
    const { error: updateError } = await supabaseClient
        .from(table)
        .update({ quantite: nouvelleQte })
        .eq('id', id);

    if (updateError) {
        alert("Erreur mise à jour : " + updateError.message);
    } else {
        console.log("Quantité mise à jour !");
        // On rafraîchit l'affichage
        location.reload(); 
    }
}
}