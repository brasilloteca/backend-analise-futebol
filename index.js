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
    const r = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 200 }
      })
    });

    const data = await r.json();

    if (!data || !data[0]?.generated_text) {
      res.json({ texto: "não foi possível gerar análise" });
    } else {
      res.json({ texto: data[0].generated_text });
    }

  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Falha na IA" });
  }
});

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
