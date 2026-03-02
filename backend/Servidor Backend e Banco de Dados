import express from 'express';
import pkg from 'pg';
import cors from 'cors';

const { Pool } = pkg;
const app = express();

app.use(express.json());
app.use(cors());

// Conexão com o banco de dados via variáveis do Docker
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres-db',
  user: process.env.DB_USER || 'mzadmin',
  password: process.env.DB_PASS || 'mzsenha2026',
  database: process.env.DB_NAME || 'mz_importados',
  port: 5432,
});

// Inicialização das tabelas automaticamente
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        description TEXT NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        quantity INTEGER NOT NULL,
        image_link TEXT
      );
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        full_name TEXT,
        cpf TEXT,
        birth_date TEXT,
        address TEXT,
        whatsapp TEXT
      );
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        order_number TEXT,
        date TEXT,
        customer_json JSONB,
        items_json JSONB,
        total NUMERIC(10,2),
        payment_method TEXT,
        installments INTEGER,
        warranty TEXT
      );
    `);
    console.log("Banco de dados pronto!");
  } catch (err) {
    console.error("Erro ao iniciar DB:", err);
  }
};
initDB();

// --- ROTAS DE PRODUTOS ---
app.get('/products', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM products ORDER BY id DESC');
  res.json(rows.map(r => ({ ...r, imageLink: r.image_link })));
});

app.post('/products', async (req, res) => {
  const { description, price, quantity, imageLink } = req.body;
  await pool.query(
    'INSERT INTO products (description, price, quantity, image_link) VALUES ($1, $2, $3, $4)',
    [description, price, quantity, imageLink]
  );
  res.json({ success: true });
});

app.put('/products/:id', async (req, res) => {
  const { description, price, quantity, imageLink } = req.body;
  await pool.query(
    'UPDATE products SET description=$1, price=$2, quantity=$3, image_link=$4 WHERE id=$5',
    [description, price, quantity, imageLink, req.params.id]
  );
  res.json({ success: true });
});

app.delete('/products/:id', async (req, res) => {
  await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// --- ROTAS DE CLIENTES ---
app.get('/customers', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM customers ORDER BY id DESC');
  res.json(rows.map(r => ({
    id: r.id, fullName: r.full_name, cpf: r.cpf, birthDate: r.birth_date, address: r.address, whatsapp: r.whatsapp
  })));
});

app.post('/customers', async (req, res) => {
  const { fullName, cpf, birthDate, address, whatsapp } = req.body;
  await pool.query(
    'INSERT INTO customers (full_name, cpf, birth_date, address, whatsapp) VALUES ($1, $2, $3, $4, $5)',
    [fullName, cpf, birthDate, address, whatsapp]
  );
  res.json({ success: true });
});

app.put('/customers/:id', async (req, res) => {
  const { fullName, cpf, birthDate, address, whatsapp } = req.body;
  await pool.query(
    'UPDATE customers SET full_name=$1, cpf=$2, birth_date=$3, address=$4, whatsapp=$5 WHERE id=$6',
    [fullName, cpf, birthDate, address, whatsapp, req.params.id]
  );
  res.json({ success: true });
});

app.delete('/customers/:id', async (req, res) => {
  await pool.query('DELETE FROM customers WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// --- ROTAS DE VENDAS ---
app.get('/sales', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM sales ORDER BY id DESC');
  res.json(rows.map(r => ({
    id: r.id, orderNumber: r.order_number, date: r.date, 
    customer: r.customer_json, items: r.items_json, total: r.total, 
    paymentMethod: r.payment_method, installments: r.installments, warranty: r.warranty
  })));
});

app.post('/sales', async (req, res) => {
  const { orderNumber, date, customer, items, total, paymentMethod, installments, warranty } = req.body;
  
  try {
    await pool.query('BEGIN'); // Inicia a transação
    
    // Salva a venda
    await pool.query(
      'INSERT INTO sales (order_number, date, customer_json, items_json, total, payment_method, installments, warranty) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [orderNumber, date, JSON.stringify(customer), JSON.stringify(items), total, paymentMethod, installments, warranty]
    );

    // Desconta o estoque
    for (const item of items) {
      await pool.query('UPDATE products SET quantity = quantity - $1 WHERE id = $2', [item.quantity, item.product.id]);
    }

    await pool.query('COMMIT'); // Conclui com sucesso
    res.json({ success: true });
  } catch (error) {
    await pool.query('ROLLBACK'); // Desfaz se houver erro
    res.status(500).json({ error: error.message });
  }
});

app.listen(3333, () => console.log('🚀 Backend rodando na porta 3333'));
