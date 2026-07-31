// Horizon Skills Academy — sauvegarde Google Sheet.
// 1) Ouvre ta Google Sheet → menu Extensions → Apps Script
// 2) Colle TOUT ce code (remplace ce qu'il y a) → Enregistrer
// 3) Déployer → Nouveau déploiement → type "Application Web"
//      - Exécuter en tant que : Moi
//      - Qui a accès : Tout le monde
//    → Déployer → autorise → COPIE l'URL de l'application web → envoie-la moi.
//
// L'app (ou une tâche planifiée Supabase) enverra les données ici automatiquement.
// Les cellules "payé" deviennent vertes, "non payé" rouges.

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tabs = data.tabs || {};

    Object.keys(tabs).forEach(function (name) {
      var tab = tabs[name];
      var headers = tab.headers || [];
      var rows = tab.rows || [];
      var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
      sheet.clear();

      if (headers.length === 0) return;
      var values = [headers].concat(rows);
      sheet.getRange(1, 1, values.length, headers.length).setValues(values);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#dfe3fb");

      // Couleur vert / rouge selon le statut de paiement.
      for (var r = 2; r <= values.length; r++) {
        for (var c = 1; c <= headers.length; c++) {
          var cell = sheet.getRange(r, c);
          var v = String(cell.getValue()).toLowerCase();
          if (v === "payé" || v === "paye") cell.setBackground("#c6efce");
          else if (v === "non payé" || v === "non paye") cell.setBackground("#ffc7ce");
        }
      }
      sheet.autoResizeColumns(1, headers.length);
    });

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test rapide depuis l'éditeur Apps Script (facultatif) : lance testWrite() puis regarde la Sheet.
function testWrite() {
  doPost({ postData: { contents: JSON.stringify({
    tabs: {
      Test: { headers: ["Élève", "Statut"], rows: [["Ahmed", "payé"], ["Lina", "non payé"]] }
    }
  }) } });
}
