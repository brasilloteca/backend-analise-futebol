import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();
app.use(cors());
app.use(express.json());
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

  const prompt = `
Analise o jogo ${casa} x ${fora} obedecendo rigorosamente:

1. Abertura direta contextualizando o jogo
2. Impacto dos desfalques (quem perde mais)
3. Leitura tática objetiva
4. Conclusão com favorito e placar plausível

Regras:
- Linguagem profissional
- Tom seguro
- Sem rodeios
- Curto e direto
`;

  try {

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const r = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "mistralai/Mistral-7B-Instruct-v0.2",
          messages: [
            { role: "user", content: prompt }
          ],
          max_tokens: 1200,
          temperature: 0.7
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
