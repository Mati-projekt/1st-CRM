
import { GoogleGenAI } from "@google/genai";
import { Customer, Installation, InventoryItem, ProductCategory } from "../types";

// Helper to safely get the API key without crashing if process is undefined
const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return '';
};

export const generateCustomerEmail = async (customer: Customer, installation: Installation): Promise<string> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error("API Key is missing. Please set API_KEY in your environment variables.");
      return "Błąd: Brak klucza API. Skontaktuj się z administratorem.";
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
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
    return "Wystąpił błąd podczas generowania wiadomości. Sprawdź konfigurację API Key.";
  }
};

export const analyzeInventory = async (inventory: InventoryItem[]): Promise<string> => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error("API Key is missing.");
      return "Błąd: Brak klucza API.";
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });

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
    return "Błąd analizy. Sprawdź konfigurację API Key.";
  }
};
