import { Router } from "express";
import fs from "fs";

const router = Router();

const DB_PATH = "server/data.json";

interface Analysis {
  id: string;
  crop: string;
  disease: string;
  severity: number;
  date: string;
  location?: string;
}

// 📥 Ler dados
const readDB = (): Analysis[] => {
  try {
    const data = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
};

// 💾 Salvar dados
const writeDB = (data: Analysis[]) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

// 🔍 LISTAR
router.get("/", (req, res) => {
  const { sort } = req.query;
  let data = readDB();

  if (sort === "severity") {
    data.sort((a, b) => b.severity - a.severity);
  } else {
    data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  res.json(data);
});

// ➕ CRIAR
router.post("/", (req, res) => {
  const data = readDB();

  const newItem: Analysis = {
    id: Date.now().toString(),
    ...req.body,
    date: new Date().toISOString(),
  };

  data.push(newItem);
  writeDB(data);

  res.status(201).json(newItem);
});

// ❌ DELETAR
router.delete("/:id", (req, res) => {
  const data = readDB().filter(a => a.id !== req.params.id);
  writeDB(data);
  res.json({ ok: true });
});

export default router;