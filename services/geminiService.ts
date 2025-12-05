
import { GoogleGenAI } from "@google/genai";
import { Customer, Installation, InventoryItem, ProductCategory } from "../types";

// Helper to lazily get the AI instance
const getAI = () => {
  let apiKey = '';
  try {
    // Safely attempt to access process.env
    // This prevents "ReferenceError: process is not defined" in browser environments lacking polyfills
    if (typeof process !== 'undefined' && process.env) {
      apiKey = process.env.API_KEY || '';
    }
  } catch (e) {
    console.warn("Could not access process.env.API_KEY");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateCustomerEmail = async (customer: Customer, installation: Installation): Promise<string> => {
  try {
    const ai = getAI();
    // Re-check api key availability (though SDK handles empty key gracefully usually, prompts fail)
    let hasKey = false;
    try {
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) hasKey = true;
    } catch {}
    
    if (!hasKey) return "Brak klucza API. Skonfiguruj klucz, aby używać asystenta AI.";

    const prompt = `
      Jesteś asystentem w firmie fotowoltaicznej "SolarCRM". 
      Napisz profesjonalną i uprzejmą wiadomość email (tylko treść) do klienta ${customer.name}.
      
      Kontekst:
      - Status instalacji: ${installation.status}
      - Moc instalacji: ${installation.systemSizeKw} kWp
      - Adres: ${installation.address}
      
      Cel wiadomości: Poinformuj klienta o aktualnym etapie prac i podziękuj za cierpliwość. 
      Jeśli status to "Nowy", podziękuj za kontakt.
      Jeśli "Audyt", poproś o potwierdzenie terminu (nie podawaj konkretnego).
      Jeśli "Montaż", poinformuj że ekipa szykuje się do wyjazdu.
      Jeśli "Zgłoszenie OSD", poinformuj że dokumenty zostały wysłane do operatora.
      Jeśli "Zgłoszenie do dotacji", poinformuj że wniosek o dofinansowanie został złożony i czekamy na decyzję.
      Jeśli "Zakończone", podziękuj za współpracę i życz dużych uzysków energii.
      
      Użyj języka polskiego. Bądź zwięzły.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Nie udało się wygenerować wiadomości.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Wystąpił błąd podczas generowania wiadomości.";
  }
};

export const analyzeInventory = async (inventory: InventoryItem[]): Promise<string> => {
  try {
    const ai = getAI();
    let hasKey = false;
    try {
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) hasKey = true;
    } catch {}
    
    if (!hasKey) return "Brak klucza API.";

    const inventoryData = inventory.map(item => 
      `${item.name} (${item.category}): ${item.quantity} ${item.unit}. Min: ${item.minQuantity}. Gwarancja: ${item.warranty}.${item.power ? ` Moc: ${item.power}${item.category === ProductCategory.PANEL ? 'W' : 'kW'}.` : ''}${item.capacity ? ` Pojemność: ${item.capacity}kWh.` : ''}${item.url ? ` Link: ${item.url}` : ''}`
    ).join('\n');

    const prompt = `
      Jesteś kierownikiem magazynu firmy fotowoltaicznej. Przeanalizuj poniższy stan magazynowy i napisz krótki raport (maks 3-4 zdania).
      Zwróć uwagę na produkty, których stan jest poniżej minimum lub bliski zera.
      Weź pod uwagę, czy mamy wystarczająco dużo paneli i falowników.
      Pamiętaj, że dla falowników (Inwertery) i magazynów energii moc jest podawana w kW, a dla paneli w W.
      Zasugeruj co należy domówić i w razie potrzeby użyj dostępnych linków do produktów w sugestiach.
      
      Stan magazynowy:
      ${inventoryData}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Nie udało się wygenerować raportu.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Błąd analizy.";
  }
};
