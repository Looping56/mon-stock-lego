// scripts/backup.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function runBackup() {
    const tables = ['sets_possedes', 'pieces_inventaire', 'emplacements'];
    const date = new Date().toISOString().split('T')[0];
    
    if (!fs.existsSync('./backups')) fs.mkdirSync('./backups');

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (!error) {
            fs.writeFileSync(`./backups/${date}_${table}.json`, JSON.stringify(data, null, 2));
            console.log(`Sauvegarde de ${table} réussie.`);
        }
    }
}

runBackup();