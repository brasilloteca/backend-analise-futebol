import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();
app.use(cors());
app.use(express.json());

// Limitação de requisições
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { erro: "Muitas requisições. Aguarde 1 minuto." }
});
app.use(limiter);

app.post("/analisar", async (req, res) => {
  const { casa, fora } = req.body;

  if (!casa || !fora) {
    return res.status(400).json({ erro: "Times não informados" });
  }

  // PROMPT MESTRE — GESTÃO DE BANCA v3.1
  const prompt = `
GESTÃO DE BANCA — PROMPT MESTRE v3.1 (WEB-VALIDADO)

Analise a partida REAL entre ${casa} x ${fora} obedecendo rigorosamente as etapas e regras:

ETAPA 0 — REGRA ABSOLUTA
• Tratar toda partida como REAL e OFICIAL
• Abortos apenas por erro estrutural

ETAPA 1 — IDENTIFICAÇÃO AUTOMÁTICA (WEB)
• Buscar na web: competição oficial, país, liga/torneio, data/hora, tipo de jogo, fase da competição

ETAPA 2 — COLETA ESTRUTURAL (WEB + BASE)
• Gols marcados/sofridos (temporada atual)
• xG/xGA recentes
• Forma últimos 5 jogos
• Desfalques relevantes
• Estabilidade tática
• Ranking da liga
• Mando de campo
• Consistência estatística

ETAPA 3 — MODELO MATEMÁTICO
• Probabilidade Real = (xG estrutural + média histórica + força relativa + ajuste de variância) ÷ 4

ETAPA 4 — CLASSIFICAÇÃO
• ELITE → ≥72%
• FORTE → 64–71%
• MÉDIO → 55–63%
• FRACO → <55%

ETAPA 5 — PLACAR PROVÁVEL
• Usar Poisson ajustado por ataque vs defesa, mando, variância

ETAPA 6 — ESCOLHA DE MERCADO
• Selecionar SOMENTE o maior valor probabilístico de: Resultado, Dupla Chance, Over/Under, Ambas Marcam

ETAPA 7 — FORMATO DE SAÍDA (FIXO)
Para este jogo, retorne EXATAMENTE:
JOGO:
COMPETIÇÃO:
DATA/HORA:
PROBABILIDADE:
CLASSIFICAÇÃO:
MERCADO:
PLACAR:
STATUS: (se cobertura <70%, indicar BAIXA CONFIABILIDADE)
`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const r = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "meta-llama/Llama-3.1-8B-Instruct",
          messages: [
            { role: "user", content: prompt }
          ],
          max_tokens: 2000,
          temperature: 0.0 // determinístico
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeout);

    const text = await r.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.log("RESPOSTA NÃO JSON:", text);
      return res.json({ texto: "Erro de resposta da IA: " + text });
    }

    let texto = "não foi possível gerar análise";

    if (data.choices?.[0]?.message?.content) {
      texto = data.choices[0].message.content;
    } else if (data.error) {
      texto = "IA indisponível: " + data.error.message;
    }

    res.json({ texto });

  } catch (e) {
    if (e.name === "AbortError") {
      return res.json({ texto: "IA demorou demais para responder." });
    }

    console.error("ERRO:", e);
    res.status(500).json({ erro: "Falha na IA" });
  }
});

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
