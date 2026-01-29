// --- CONFIGURATION ---
const SB_URL = 'https://orofxwykbdtwbissglkj.supabase.co';
const SB_KEY = 'sb_publishable_f13beKBpC1m7-heNv2SOxA_47n1nuLP';
const REBRICK_KEY = 'c54e689ff20915c537d968ffe15a3745';
const SEUIL_ALERTE = 5;

const clientSupabase = supabase.createClient(SB_URL, SB_KEY);

window.onload = () => {
    chargerCollection();
    // Ecouter la touche Entrée pour le vrac
    document.getElementById('searchPiece').addEventListener('keypress', (e) => { if(e.key === 'Enter') rechercherPiece(); });
};

// --- GESTION DES SETS ---

async function chargerCollection() {
    const grid = document.getElementById('setsGrid');
    const { data: sets, error } = await clientSupabase.from('sets_possedes').select('*').order('id', { ascending: false });

    if (error) return console.error(error);
    
    grid.innerHTML = "";
    document.getElementById('totalSets').innerText = sets.length;

    sets.forEach(set => {
        const cardId = `set-${set.id}`;
        grid.innerHTML += `
            <div class="set-card" id="${cardId}">
                <div class="qty-badge">${set.quantite}</div>
                <img src="${set.image_url}" alt="Set">
                <div class="set-title">${set.set_num}<br>${set.nom}</div>
                
                <div class="file-actions">
                    <span class="file-link" onclick="ouvrirNotice('${set.set_num}')" title="Notice PDF">📄<span id="pdf-${set.id}" class="status-dot">❌</span></span>
                    <span class="file-link" onclick="exporterInventaireComplet('${set.set_num}')" title="Analyse & Excel">📊</span>
                    <span class="file-link" onclick="genererListeAchatBrickLink('${set.set_num}')" title="Acheter Manquants">🛒</span>
                    <span class="file-link" onclick="ouvrirNotice('${set.set_num}')" title="Notice PDF">📄</span>
    
                    <label class="file-link" title="Prendre une photo">
                        📷
                        <input type="file" accept="image/*" style="display:none" onchange="uploadPhoto(this, '${set.id}')">
                    </label>

                    <span class="file-link" onclick="resetImage('${set.id}', '${set.set_num}')" title="Remettre l'image officielle">🔄</span>
    
                    <span class="file-link" onclick="exporterInventaireComplet('${set.set_num}')" title="Analyse">📊</span>
                </div>

                <div class="qty-control">
                    <button class="qty-btn" onclick="modifierQte('sets_possedes', ${set.id}, -1)">-</button>
                    <button class="qty-btn" onclick="modifierQte('sets_possedes', ${set.id}, 1)">+</button>
                    <button onclick="supprimerElement('sets_possedes', ${set.id})" style="background:none;border:none;cursor:pointer;">🗑️</button>
                </div>
            </div>`;
        verifierFichiersLocaux(set.set_num, set.id);
    });
}

async function rechercherSetAvance() {
    const query = document.getElementById('setSearchInput').value;
    if (!query) return;
    const resp = await fetch(`https://rebrickable.com/api/v3/lego/sets/?search=${query}`, { headers: {'Authorization': `key ${REBRICK_KEY}`} });
    const result = await resp.json();

    if (result.results && result.results.length > 0) {
        const set = result.results[0];
        if (confirm(`Ajouter : ${set.name} (${set.year}) ?`)) {
            await clientSupabase.from('sets_possedes').insert([{ set_num: set.set_num, nom: set.name, image_url: set.set_img_url, quantite: 1 }]);
            chargerCollection();
        }
    }
}

// --- GESTION DU VRAC & ALERTES ---

async function rechercherPiece() {
    const ref = document.getElementById('searchPiece').value;
    const container = document.getElementById('resultatRecherche');
    const { data: pieces } = await clientSupabase.from('pieces_inventaire').select('*').ilike('piece_num', `%${ref}%`);

    container.innerHTML = "";
    let alertCount = 0;
    
    pieces.forEach(p => {
        const estCritique = p.quantite <= SEUIL_ALERTE;
        if(estCritique) alertCount++;
        container.innerHTML += `
            <div class="set-card ${estCritique ? 'stock-critique' : ''}">
                <div class="qty-badge">${p.quantite}</div>
                <img src="${p.image_url}">
                <div class="set-title"><strong>${p.piece_num}</strong></div>
                <div class="qty-control">
                    <button class="qty-btn" onclick="modifierQte('pieces_inventaire', ${p.id}, -1, true)">-</button>
                    <button class="qty-btn" onclick="modifierQte('pieces_inventaire', ${p.id}, 1, true)">+</button>
                </div>
            </div>`;
    });
    document.getElementById('alerteVrac').innerText = alertCount;
}

// --- ANALYSE DES MANQUANTS & EXPORTS ---

async function comparerStockEtSet(setNum) {
    const resp = await fetch(`https://rebrickable.com/api/v3/lego/sets/${setNum}/parts/`, { headers: {'Authorization': `key ${REBRICK_KEY}`} });
    const dataSet = await resp.json();
    const { data: monVrac } = await clientSupabase.from('pieces_inventaire').select('*');

    let rapport = dataSet.results.map(p => {
        const enStock = monVrac.find(v => v.piece_num === p.part.part_num);
        const dispo = enStock ? enStock.quantite : 0;
        return { ref: p.part.part_num, nom: p.part.name, requis: p.quantity, dispo, manque: Math.max(0, p.quantity - dispo) };
    });
    return rapport;
}

async function exporterInventaireComplet(setNum) {
    const rapport = await comparerStockEtSet(setNum);
    let csv = "Reference;Nom;Requis;Stock;Manque\n";
    rapport.forEach(r => { csv += `${r.ref};${r.nom};${r.requis};${r.dispo};${r.manque}\n`; });
    telechargerFichier(csv, `Analyse_${setNum}.csv`, 'text/csv');
}

async function genererListeAchatBrickLink(setNum) {
    const rapport = await comparerStockEtSet(setNum);
    const manquants = rapport.filter(r => r.manque > 0);
    if(manquants.length === 0) return alert("Set complet !");

    let xml = "<INVENTORY>\n" + manquants.map(m => 
        ` <ITEM>\n  <ITEMTYPE>P</ITEMTYPE>\n  <ITEMID>${m.ref}</ITEMID>\n  <MINQTY>${m.manque}</MINQTY>\n  <CONDITION>N</CONDITION>\n </ITEM>`).join('\n') + "\n</INVENTORY>";
    
    telechargerFichier(xml, `BL_Wanted_${setNum}.xml`, 'text/xml');
    window.open("https://www.bricklink.com/v2/wanted/upload.page", "_blank");
}

// --- FONCTIONS SYSTÈME (LIVE SERVER) ---

async function verifierFichiersLocaux(setNum, id) {
    try {
        const resPdf = await fetch(`notices/${setNum}.pdf`, { method: 'HEAD' });
        if(resPdf.ok) document.getElementById(`pdf-${id}`).innerText = "✅";
    } catch(e) {}
}

function ouvrirNotice(setNum) {
    window.open(`notices/${setNum}.pdf`, '_blank');
    setTimeout(() => { if(confirm("Pas de fichier local ? Voir sur LEGO.com ?")) 
        window.open(`https://www.lego.com/fr-fr/service/buildinginstructions/${setNum}`, '_blank'); 
    }, 1000);
}

async function modifierQte(table, id, diff, isVrac = false) {
    const { data } = await clientSupabase.from(table).select('quantite').eq('id', id).single();
    await clientSupabase.from(table).update({ quantite: Math.max(0, (data.quantite || 0) + diff) }).eq('id', id);
    isVrac ? rechercherPiece() : chargerCollection();
}

async function supprimerElement(table, id) {
    if(confirm("Supprimer ?")) { await clientSupabase.from(table).delete().eq('id', id); chargerCollection(); }
}

function telechargerFichier(contenu, nom, type) {
    const blob = new Blob([contenu], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nom;
    link.click();
}
async function uploadPhoto(input, setId) {
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    const fileName = `set_${setId}_${Date.now()}.jpg`; // Nom unique
    
    try {
        // 1. Envoyer l'image au Storage de Supabase
        const { data, error: uploadError } = await clientSupabase.storage
            .from('photos-lego')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        // 2. Récupérer l'URL publique de l'image
        const { data: urlData } = clientSupabase.storage
            .from('photos-lego')
            .getPublicUrl(fileName);
        
        const publicUrl = urlData.publicUrl;

        // 3. Mettre à jour la table 'sets_possedes' avec la nouvelle URL
        const { error: updateError } = await clientSupabase
            .from('sets_possedes')
            .update({ image_url: publicUrl })
            .eq('id', setId);

        if (updateError) throw updateError;

        alert("Photo mise à jour !");
        chargerCollection(); // Rafraîchir l'affichage

    } catch (error) {
        console.error("Erreur d'envoi :", error.message);
        alert("Erreur lors de l'envoi de la photo.");
    }
}
async function resetImage(setId, setNum) {
    if (!confirm("Voulez-vous restaurer l'image officielle de Rebrickable ?")) return;

    try {
        // 1. Chercher l'image officielle sur Rebrickable
        const resp = await fetch(`https://rebrickable.com/api/v3/lego/sets/${setNum}/`, {
            headers: { 'Authorization': `key ${REBRICK_KEY}` }
        });
        const data = await resp.json();

        if (data.set_img_url) {
            // 2. Mettre à jour Supabase avec l'URL officielle
            const { error } = await clientSupabase
                .from('sets_possedes')
                .update({ image_url: data.set_img_url })
                .eq('id', setId);

            if (error) throw error;

            alert("Image officielle restaurée !");
            chargerCollection();
        }
    } catch (error) {
        alert("Erreur lors de la restauration : " + error.message);
    }
}