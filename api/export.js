import { neon } from '@neondatabase/serverless';
import * as XLSX from 'xlsx';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const rows = await sql`
      SELECT player_name, score, created_at
      FROM scores
      ORDER BY score DESC
    `;

    const data = rows.map((row, i) => ({
      '排名': i + 1,
      '玩家名': row.player_name,
      '分数': row.score,
      '日期': new Date(row.created_at).toLocaleDateString('zh-CN'),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 8 }, { wch: 14 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '成绩排行榜');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="scores.xlsx"');
    return res.status(200).send(buf);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '导出失败' });
  }
}
