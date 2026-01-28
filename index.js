import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/analisar", async (req, res) => {
  const { casa, fora } = req.body;

  if (!casa || !fora) {
    return res.status(400).json({ erro: "Times não informados" });
  }

  const prompt = `
Analise o jogo ${casa} x ${fora} obedecendo rigorosamente:

- Desfalques reais e confirmados
- Quem é mais prejudicado
- Impacto tático direto
- Linguagem objetiva e profissional
- Conclusão com favorito e placar plausível
Texto curto (até 1 minuto).
`;

  try {
    const r = await fetch("https://api-inference.huggingface.co/models/google/flan-t5-large", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: prompt })
    });

    const data = await r.json();

    // Hugging Face às vezes retorna um array de objetos ou objeto diferente
    let texto = "";
    if (Array.isArray(data)) {
      if (data[0]?.generated_text) texto = data[0].generated_text;
      else if (data[0]?.generated_texts) texto = data[0].generated_texts[0];
    } else if (data.generated_text) {
      texto = data.generated_text;
    }

    if (!texto) texto = "Não foi possível gerar a análise.";

    res.json({ texto });

  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Falha na IA" });
  }
});

app.listen(3000, () => console.log("Servidor rodando"));
