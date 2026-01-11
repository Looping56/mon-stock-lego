
      // Remplacez par vos vraies clés
    const REBRICKABLE_KEY = 'c54e689ff20915c537d968ffe15a3745';

    async function ajouterNouveauSet() {
        const input = document.querySelector('.search-container input');
        const setNum = input.value; // ex: 75192

        if (!setNum) return alert("Veuillez entrer un numéro de set");

        // 1. Appeler Rebrickable
        const response = await fetch(`https://rebrickable.com/api/v3/lego/sets/${setNum}/`, {
            headers : { 'Authorization': `key ${REBRICKABLE_KEY}`}
        });
    
        if (!response.ok) return alert("Set non trouvé sur Rebrickable");
        const data = await response.json();

        // 2. Sauvegarder dans Supabase
        const { data: dbData, error } = await supabase
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
            // 3. Ajouter visuellement la carte sur la page
            ajouterCarteAuDom(dbData[0]);
            input.value = ""; // Vider le champ
        } 
    }   
 function genererEtiquette(pieceNum, nomPiece, emplacementNom) {
    const container = document.getElementById('etiqContainer');
    
    // Créer l'élément de l'étiquette
    const label = document.createElement('div');
    label.className = 'label-card';
    label.innerHTML = `
        <div class="label-info">
            <div style="font-weight:bold; font-size:14px;">${pieceNum}</div>
            <div style="font-size:10px;">${nomPiece}</div>
            <div style="color:red; font-weight:bold; margin-top:5px;">${emplacementNom}</div>
        </div>
        <div id="qrcode-${pieceNum}" class="label-qr"></div>
    `;
    container.appendChild(label);

    // Générer le QR Code (on y stocke l'URL de votre appli + la réf)
    new QRCode(document.getElementById(`qrcode-${pieceNum}`), {
        text: `https://votre-appli.com/piece?ref=${pieceNum}`,
        width: 50,
        height: 50
    });
}
async function onScanSuccess(decodedText) {
    console.log("Code EAN détecté :", decodedText);
    
    // On cherche le set correspondant sur Rebrickable via le paramètre de recherche
    // Rebrickable accepte les codes barres dans sa recherche de sets
    const response = await fetch(`https://rebrickable.com/api/v3/lego/sets/?search=${decodedText}`, {
        headers: { 'Authorization': `key ${REBRICKABLE_KEY}` }
    });

    const data = await response.json();

    if (data.results && data.results.length > 0) {
        const set = data.results[0]; // On prend le premier résultat trouvé
        const confirmer = confirm(`Ajouter le set : ${set.name} (${set.set_num}) ?`);
        
        if (confirmer) {
            sauvegarderDansSupabase(set);
        }
    } else {
        alert("Ce code-barre ne correspond à aucun set Lego connu.");
    }
}
    // Configuration de votre connexion
    const SUPABASE_URL = 'https://orofxwykbdtwbissglkj.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_f13beKBpC1m7-heNv2SOxA_47n1nuLP';
    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Fonction pour charger vos sets depuis la base de données au démarrage
    async function chargerStock() {
        const { data, error } = await supabase
            .from('sets_possedes')
            .select('*');

        if (data) {
            console.log("Données chargées :", data);
            // Ici, on pourrait générer les cartes HTML automatiquement
        }
    }

    chargerStock();
    
async function rechercherPiece() {
    const ref = document.getElementById('searchPiece').value;
    const container = document.getElementById('resultatRecherche');
    container.innerHTML = "Recherche en cours...";

    // Requête complexe : on récupère la pièce ET les infos de son emplacement
    const { data, error } = await supabase
        .from('pieces_inventaire')
        .select(`
            *,
            emplacements (
                nom,
                parent_id
            )
        `)
        .eq('piece_num', ref);

    if (data && data.length > 0) {
        container.innerHTML = "";
        data.forEach(item => {
            container.innerHTML += `
                <div class="piece-row" style="background:white; padding:15px; border-radius:10px; display:flex; align-items:center; margin-bottom:10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <img src="${item.image_url}" width="60" style="margin-right:20px;">
                    <div style="flex:1;">
                        <div style="font-weight:bold;">${item.nom_piece} (${item.piece_num})</div>
                        <div style="color: #d32f2f; font-size:0.9em;">📍 Emplacement : ${item.emplacements.nom}</div>
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
