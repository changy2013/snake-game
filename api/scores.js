import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// 确保表存在
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      player_name VARCHAR(50) NOT NULL DEFAULT '匿名',
      score INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await ensureTable();

    if (req.method === 'GET') {
      // 返回 Top 10 排行榜
      const rows = await sql`
        SELECT player_name, score, created_at
        FROM scores
        ORDER BY score DESC
        LIMIT 10
      `;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { player_name, score } = req.body;

      if (typeof score !== 'number' || score < 0) {
        return res.status(400).json({ error: '无效的分数' });
      }

      const name = (player_name || '匿名').toString().slice(0, 50);

      const [row] = await sql`
        INSERT INTO scores (player_name, score)
        VALUES (${name}, ${score})
        RETURNING id, player_name, score, created_at
      `;
      return res.status(201).json(row);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '服务器错误' });
  }
}
