import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, Users, LayoutDashboard, LogOut, PackageSearch, 
  Plus, Trash2, Edit, Printer, Calendar, DollarSign, TrendingUp, AlertCircle
} from 'lucide-react';

// A URL da API. Usaremos /api/ que será redirecionada pelo Nginx (Docker) para o Backend
const API_URL = '/api';

export default function App() {
  // --- ESTADOS DE AUTENTICAÇÃO E NAVEGAÇÃO ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // --- ESTADOS DO LOGIN ---
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- ESTADOS DE DADOS (Agora vindo do PostgreSQL) ---
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);

  // --- ESTADOS DE MODAIS E FORMULÁRIOS ---
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ description: '', price: '', quantity: '', imageLink: '' });

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState({ fullName: '', cpf: '', birthDate: '', address: '', whatsapp: '' });

  // --- ESTADOS DO PDV ---
  const [pdvCart, setPdvCart] = useState([]);
  const [pdvSelectedProduct, setPdvSelectedProduct] = useState('');
  const [pdvSelectedQuantity, setPdvSelectedQuantity] = useState(1);
  const [pdvSelectedCustomer, setPdvSelectedCustomer] = useState('');
  const [pdvPaymentMethod, setPdvPaymentMethod] = useState('pix');
  const [pdvInstallments, setPdvInstallments] = useState(1);
  const [pdvWarranty, setPdvWarranty] = useState('90 dias');
  const [receiptData, setReceiptData] = useState(null);
  const [printTrigger, setPrintTrigger] = useState(false);

  // --- FUNÇÃO PARA BUSCAR DADOS DO BACKEND ---
  const loadData = async () => {
    try {
      const [prodRes, custRes, salesRes] = await Promise.all([
        fetch(`${API_URL}/products`),
        fetch(`${API_URL}/customers`),
        fetch(`${API_URL}/sales`)
      ]);
      
      if (prodRes.ok) setProducts(await prodRes.json());
      if (custRes.ok) setCustomers(await custRes.json());
      if (salesRes.ok) setSales(await salesRes.json());
    } catch (error) {
      console.error("Erro ao buscar dados da API:", error);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
    }
  }, [isLoggedIn]);

  // --- FUNÇÕES DE LOGIN ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'administrador' && password === 'mzcajuru2026') {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Usuário ou senha incorretos.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setActiveTab('dashboard');
  };

  // --- FUNÇÕES DE PRODUTOS ---
  const saveProduct = async (e) => {
    e.preventDefault();
    
    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct ? `${API_URL}/products/${editingProduct.id}` : `${API_URL}/products`;

    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: productForm.description,
          price: parseFloat(productForm.price),
          quantity: parseInt(productForm.quantity),
          imageLink: productForm.imageLink || '',
        })
      });
      
      await loadData();
      setIsProductModalOpen(false);
      setProductForm({ description: '', price: '', quantity: '', imageLink: '' });
      setEditingProduct(null);
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
    }
  };

  const deleteProduct = async (id) => {
    try {
      await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (error) {
      console.error("Erro ao deletar produto:", error);
    }
  };

  // --- FUNÇÕES DE CLIENTES ---
  const saveCustomer = async (e) => {
    e.preventDefault();
    
    const method = editingCustomer ? 'PUT' : 'POST';
    const url = editingCustomer ? `${API_URL}/customers/${editingCustomer.id}` : `${API_URL}/customers`;

    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerForm)
      });
      
      await loadData();
      setIsCustomerModalOpen(false);
      setCustomerForm({ fullName: '', cpf: '', birthDate: '', address: '', whatsapp: '' });
      setEditingCustomer(null);
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
    }
  };

  const deleteCustomer = async (id) => {
    try {
      await fetch(`${API_URL}/customers/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (error) {
      console.error("Erro ao deletar cliente:", error);
    }
  };

  // --- FUNÇÕES DO PDV ---
  const addToCart = () => {
    if (!pdvSelectedProduct) return;
    const product = products.find(p => p.id === parseInt(pdvSelectedProduct) || p.id === pdvSelectedProduct);
    if (!product) return;

    const qty = parseInt(pdvSelectedQuantity);
    if (qty > product.quantity) {
      alert("Quantidade maior que o estoque disponível!");
      return; 
    }

    const existingItem = pdvCart.find(item => item.product.id === product.id);
    if (existingItem) {
      setPdvCart(pdvCart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + qty }
          : item
      ));
    } else {
      setPdvCart([...pdvCart, { product, quantity: qty }]);
    }
    
    setPdvSelectedProduct('');
    setPdvSelectedQuantity(1);
  };

  const removeFromCart = (productId) => {
    setPdvCart(pdvCart.filter(item => item.product.id !== productId));
  };

  const cartTotal = pdvCart.reduce((total, item) => total + (item.product.price * item.quantity), 0);

  const finalizeSale = async () => {
    if (pdvCart.length === 0) return;

    const orderNumber = String(sales.length).padStart(3, '0');
    const customer = customers.find(c => c.id === parseInt(pdvSelectedCustomer) || c.id === pdvSelectedCustomer) || { fullName: 'Consumidor Final' };
    
    const saleData = {
      orderNumber,
      date: new Date().toISOString(),
      customer: customer,
      items: pdvCart,
      total: cartTotal,
      paymentMethod: pdvPaymentMethod,
      installments: pdvPaymentMethod === 'credito' ? pdvInstallments : 1,
      warranty: pdvWarranty
    };

    try {
      await fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
      });

      await loadData(); // Recarrega os estoques e vendas atualizadas
      
      setReceiptData(saleData);
      setPdvCart([]);
      setPdvSelectedCustomer('');
      setPdvPaymentMethod('pix');
      setPdvInstallments(1);
      setPdvWarranty('90 dias');

      setPrintTrigger(true);
    } catch (error) {
      console.error("Erro ao finalizar venda:", error);
    }
  };

  // --- MEMOS E CÁLCULOS DO DASHBOARD ---
  const dashboardStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlySales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    });
    const monthlyTotal = monthlySales.reduce((acc, sale) => acc + parseFloat(sale.total), 0);

    const totalStock = products.reduce((acc, product) => acc + parseInt(product.quantity), 0);

    const productSalesMap = {};
    monthlySales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productSalesMap[item.product.id]) {
          productSalesMap[item.product.id] = { name: item.product.description, qty: 0 };
        }
        productSalesMap[item.product.id].qty += item.quantity;
      });
    });
    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const birthdays = customers.filter(customer => {
      if (!customer.birthDate) return false;
      const [year, month, day] = customer.birthDate.split('-');
      return parseInt(month) === currentMonth + 1;
    });

    return { monthlyTotal, totalStock, topProducts, birthdays };
  }, [sales, products, customers]);

  // --- DISPARO DE IMPRESSÃO SEGURO ---
  useEffect(() => {
    if (printTrigger && receiptData) {
      const timer = setTimeout(() => {
        window.print();
        setPrintTrigger(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printTrigger, receiptData]);


  // ==========================================
  // RENDERIZAÇÃO DE PÁGINAS (COMPONENTS)
  // ==========================================

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-yellow-600 rounded-xl p-8 w-full max-w-md shadow-[0_0_15px_rgba(202,138,4,0.3)]">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-yellow-500 mb-2">MZ Importados</h1>
            <p className="text-zinc-400">Sistema de Gestão</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            {loginError && (
              <div className="bg-red-950 border border-red-500 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle size={20} />
                <span>{loginError}</span>
              </div>
            )}
            
            <div>
              <label className="block text-yellow-500 text-sm mb-2">Usuário</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 rounded-lg p-3 focus:outline-none focus:border-yellow-500 transition-colors"
                placeholder="Digite o usuário"
              />
            </div>
            
            <div>
              <label className="block text-yellow-500 text-sm mb-2">Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 rounded-lg p-3 focus:outline-none focus:border-yellow-500 transition-colors"
                placeholder="Digite a senha"
              />
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 rounded-lg transition-colors mt-4"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  const renderReceipt = () => {
    if (!receiptData) return null;
    return (
      <div id="printable-receipt" className="hidden print:block text-black bg-white p-8 w-full max-w-[80mm] mx-auto text-sm font-mono absolute top-0 left-0 right-0 z-[9999]">
        <div className="text-center border-b border-black pb-4 mb-4">
          <h1 className="font-bold text-xl">MZ IMPORTADOS</h1>
          <p className="font-bold mt-2">PEDIDO Nº {receiptData.orderNumber}</p>
          <p className="text-xs mt-1">*** SEM VALOR FISCAL ***</p>
          <p className="text-xs mt-2">{new Date(receiptData.date).toLocaleString('pt-BR')}</p>
        </div>

        <div className="border-b border-black pb-4 mb-4">
          <p><strong>Cliente:</strong> {receiptData.customer.fullName}</p>
          {receiptData.customer.cpf && <p><strong>CPF:</strong> {receiptData.customer.cpf}</p>}
        </div>

        <div className="border-b border-black pb-4 mb-4">
          <div className="grid grid-cols-12 font-bold mb-2">
            <span className="col-span-2">Qtd</span>
            <span className="col-span-6">Descrição</span>
            <span className="col-span-4 text-right">Total</span>
          </div>
          {receiptData.items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 mb-1">
              <span className="col-span-2">{item.quantity}</span>
              <span className="col-span-6 truncate">{item.product.description}</span>
              <span className="col-span-4 text-right">
                R$ {(item.product.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-b border-black pb-4 mb-4">
          <div className="flex justify-between font-bold text-lg">
            <span>TOTAL:</span>
            <span>R$ {receiptData.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="mb-8">
          <p><strong>Forma de Pagto:</strong> {receiptData.paymentMethod.toUpperCase()}</p>
          {receiptData.paymentMethod === 'credito' && <p><strong>Parcelas:</strong> {receiptData.installments}x</p>}
          <p className="mt-2"><strong>Garantia:</strong> {receiptData.warranty}</p>
        </div>

        <div className="text-center text-xs border-t border-black pt-4">
          <p>Obrigado pela preferência!</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col md:flex-row font-sans print:bg-white">
      {renderReceipt()}

      <aside className="w-full md:w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col print:hidden">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-2xl font-bold text-yellow-500 tracking-tight">MZ Importados</h2>
          <p className="text-zinc-400 mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Olá Michel
          </p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-yellow-600 text-black font-semibold' : 'hover:bg-zinc-900 text-zinc-300'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'products' ? 'bg-yellow-600 text-black font-semibold' : 'hover:bg-zinc-900 text-zinc-300'}`}>
            <PackageSearch size={20} /> Produtos
          </button>
          <button onClick={() => setActiveTab('pdv')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'pdv' ? 'bg-yellow-600 text-black font-semibold' : 'hover:bg-zinc-900 text-zinc-300'}`}>
            <ShoppingBag size={20} /> PDV (Vendas)
          </button>
          <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'customers' ? 'bg-yellow-600 text-black font-semibold' : 'hover:bg-zinc-900 text-zinc-300'}`}>
            <Users size={20} /> Clientes
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-950/30 transition-colors">
            <LogOut size={20} /> Sair do Sistema
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-10 overflow-auto bg-zinc-900 print:hidden">
        
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-yellow-500">Visão Geral</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-sm">Vendas do Mês</p>
                  <p className="text-3xl font-bold text-white mt-1">R$ {dashboardStats.monthlyTotal.toFixed(2)}</p>
                </div>
                <div className="bg-yellow-600/20 p-4 rounded-full text-yellow-500"><TrendingUp size={28} /></div>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-sm">Estoque Total (Itens)</p>
                  <p className="text-3xl font-bold text-white mt-1">{dashboardStats.totalStock}</p>
                </div>
                <div className="bg-blue-600/20 p-4 rounded-full text-blue-500"><PackageSearch size={28} /></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl">
                <h3 className="text-xl font-bold text-yellow-500 mb-4 flex items-center gap-2"><ShoppingBag size={20} /> Produtos Mais Vendidos (Mês)</h3>
                {dashboardStats.topProducts.length === 0 ? (
                  <p className="text-zinc-500">Nenhuma venda registrada este mês.</p>
                ) : (
                  <div className="space-y-4">
                    {dashboardStats.topProducts.map((prod, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                        <span className="text-zinc-200">{prod.name}</span>
                        <span className="bg-yellow-600 text-black text-xs font-bold px-3 py-1 rounded-full">{prod.qty} un</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl">
                <h3 className="text-xl font-bold text-yellow-500 mb-4 flex items-center gap-2"><Calendar size={20} /> Aniversários Próximos (Mês)</h3>
                {dashboardStats.birthdays.length === 0 ? (
                  <p className="text-zinc-500">Nenhum aniversariante este mês.</p>
                ) : (
                  <div className="space-y-4">
                    {dashboardStats.birthdays.map((bday, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                        <span className="text-zinc-200">{bday.fullName}</span>
                        <span className="text-zinc-400 text-sm">{bday.birthDate.split('-').reverse().join('/')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PRODUTOS */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-yellow-500">Estoque de Produtos</h2>
              <button 
                onClick={() => { setEditingProduct(null); setProductForm({ description: '', price: '', quantity: '', imageLink: '' }); setIsProductModalOpen(true); }}
                className="bg-yellow-600 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
              ><Plus size={20} /> Novo Produto</button>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-zinc-800 text-yellow-600">
                      <th className="p-4 font-semibold">Descrição</th>
                      <th className="p-4 font-semibold">Preço (R$)</th>
                      <th className="p-4 font-semibold">Estoque</th>
                      <th className="p-4 font-semibold">Link (Drive)</th>
                      <th className="p-4 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr><td colSpan="5" className="p-8 text-center text-zinc-500">Nenhum produto cadastrado.</td></tr>
                    ) : products.map(product => (
                      <tr key={product.id} className="border-b border-zinc-800 hover:bg-zinc-900/50">
                        <td className="p-4 text-zinc-200">{product.description}</td>
                        <td className="p-4 text-zinc-300">R$ {parseFloat(product.price).toFixed(2)}</td>
                        <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${product.quantity > 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>{product.quantity} un</span></td>
                        <td className="p-4">{product.imageLink ? <a href={product.imageLink} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-sm">Ver Foto</a> : '-'}</td>
                        <td className="p-4 flex justify-end gap-2">
                          <button onClick={() => { setEditingProduct(product); setProductForm(product); setIsProductModalOpen(true); }} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded"><Edit size={16} /></button>
                          <button onClick={() => deleteProduct(product.id)} className="p-2 bg-red-950 hover:bg-red-900 text-red-400 rounded"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CLIENTES */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-yellow-500">Cadastro de Clientes</h2>
              <button 
                onClick={() => { setEditingCustomer(null); setCustomerForm({ fullName: '', cpf: '', birthDate: '', address: '', whatsapp: '' }); setIsCustomerModalOpen(true); }}
                className="bg-yellow-600 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
              ><Plus size={20} /> Novo Cliente</button>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-zinc-800 text-yellow-600">
                      <th className="p-4 font-semibold">Nome Completo</th>
                      <th className="p-4 font-semibold">WhatsApp</th>
                      <th className="p-4 font-semibold">Nascimento</th>
                      <th className="p-4 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length === 0 ? (
                      <tr><td colSpan="4" className="p-8 text-center text-zinc-500">Nenhum cliente cadastrado.</td></tr>
                    ) : customers.map(customer => (
                      <tr key={customer.id} className="border-b border-zinc-800 hover:bg-zinc-900/50">
                        <td className="p-4 text-zinc-200">{customer.fullName || '-'}</td>
                        <td className="p-4 text-zinc-300">{customer.whatsapp || '-'}</td>
                        <td className="p-4 text-zinc-300">{customer.birthDate ? customer.birthDate.split('-').reverse().join('/') : '-'}</td>
                        <td className="p-4 flex justify-end gap-2">
                          <button onClick={() => { setEditingCustomer(customer); setCustomerForm(customer); setIsCustomerModalOpen(true); }} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded"><Edit size={16} /></button>
                          <button onClick={() => deleteCustomer(customer.id)} className="p-2 bg-red-950 hover:bg-red-900 text-red-400 rounded"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PDV (VENDAS) */}
        {activeTab === 'pdv' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-yellow-500">Ponto de Venda (PDV)</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl space-y-4">
                  <h3 className="text-xl font-semibold text-white mb-4">Adicionar Produto</h3>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <select value={pdvSelectedProduct} onChange={(e) => setPdvSelectedProduct(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-lg p-3 focus:outline-none focus:border-yellow-500">
                        <option value="">Selecione um produto...</option>
                        {products.filter(p => p.quantity > 0).map(p => (
                          <option key={p.id} value={p.id}>{p.description} - R$ {parseFloat(p.price).toFixed(2)} (Estoque: {p.quantity})</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full md:w-32">
                      <input type="number" min="1" value={pdvSelectedQuantity} onChange={(e) => setPdvSelectedQuantity(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-lg p-3 focus:outline-none focus:border-yellow-500" />
                    </div>
                    <button onClick={addToCart} className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-6 py-3 rounded-lg transition-colors">Adicionar</button>
                  </div>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl min-h-[300px]">
                  <h3 className="text-xl font-semibold text-white mb-4">Carrinho</h3>
                  {pdvCart.length === 0 ? (
                    <p className="text-zinc-500 text-center mt-10">O carrinho está vazio.</p>
                  ) : (
                    <div className="space-y-3">
                      {pdvCart.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                          <div>
                            <p className="font-semibold text-zinc-200">{item.product.description}</p>
                            <p className="text-sm text-zinc-400">{item.quantity}x R$ {parseFloat(item.product.price).toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-yellow-500">R$ {(item.quantity * item.product.price).toFixed(2)}</span>
                            <button onClick={() => removeFromCart(item.product.id)} className="text-red-400 hover:text-red-300"><Trash2 size={18} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl space-y-6 h-fit">
                <h3 className="text-xl font-semibold text-white">Finalização</h3>
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Cliente (Opcional)</label>
                  <select value={pdvSelectedCustomer} onChange={(e) => setPdvSelectedCustomer(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-lg p-3 focus:outline-none focus:border-yellow-500">
                    <option value="">Consumidor Final</option>
                    {customers.map(c => (<option key={c.id} value={c.id}>{c.fullName}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Forma de Pagamento</label>
                  <select value={pdvPaymentMethod} onChange={(e) => setPdvPaymentMethod(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-lg p-3 focus:outline-none focus:border-yellow-500">
                    <option value="pix">PIX</option><option value="dinheiro">Dinheiro</option><option value="debito">Cartão de Débito</option><option value="credito">Cartão de Crédito</option>
                  </select>
                </div>
                {pdvPaymentMethod === 'credito' && (
                  <div>
                    <label className="block text-zinc-400 text-sm mb-2">Parcelamento</label>
                    <select value={pdvInstallments} onChange={(e) => setPdvInstallments(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-lg p-3 focus:outline-none focus:border-yellow-500">
                      {[...Array(18)].map((_, i) => (<option key={i+1} value={i+1}>{i+1}x</option>))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-zinc-400 text-sm mb-2">Garantia</label>
                  <input type="text" value={pdvWarranty} onChange={(e) => setPdvWarranty(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-lg p-3 focus:outline-none focus:border-yellow-500" placeholder="Ex: 90 dias, 1 ano..." />
                </div>
                <div className="pt-4 border-t border-zinc-800">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-zinc-300 text-lg">Total a Pagar</span>
                    <span className="text-3xl font-bold text-yellow-500">R$ {cartTotal.toFixed(2)}</span>
                  </div>
                  <button onClick={finalizeSale} disabled={pdvCart.length === 0} className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-4 rounded-lg flex justify-center items-center gap-2 transition-colors">
                    <Printer size={20} /> Finalizar e Baixar PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* --- MODAIS --- */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-2xl font-bold text-yellow-500 mb-6">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
            <form onSubmit={saveProduct} className="space-y-4">
              <div><label className="block text-zinc-400 text-sm mb-1">Descrição</label><input required type="text" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-zinc-400 text-sm mb-1">Valor (R$)</label><input required type="number" step="0.01" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white" /></div>
                <div><label className="block text-zinc-400 text-sm mb-1">Quantidade</label><input required type="number" value={productForm.quantity} onChange={e => setProductForm({...productForm, quantity: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white" /></div>
              </div>
              <div><label className="block text-zinc-400 text-sm mb-1">Link Foto (Drive) - Opcional</label><input type="url" value={productForm.imageLink} onChange={e => setProductForm({...productForm, imageLink: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white" /></div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
                <button type="submit" className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-4 py-2 rounded">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-2xl font-bold text-yellow-500 mb-6">{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</h3>
            <form onSubmit={saveCustomer} className="space-y-4">
              <div><label className="block text-zinc-400 text-sm mb-1">Nome Completo</label><input type="text" value={customerForm.fullName} onChange={e => setCustomerForm({...customerForm, fullName: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-zinc-400 text-sm mb-1">CPF</label><input type="text" value={customerForm.cpf} onChange={e => setCustomerForm({...customerForm, cpf: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white" /></div>
                <div><label className="block text-zinc-400 text-sm mb-1">Data de Nascimento</label><input type="date" value={customerForm.birthDate} onChange={e => setCustomerForm({...customerForm, birthDate: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white style-color-scheme-dark" /></div>
              </div>
              <div><label className="block text-zinc-400 text-sm mb-1">Endereço</label><input type="text" value={customerForm.address} onChange={e => setCustomerForm({...customerForm, address: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white" /></div>
              <div><label className="block text-zinc-400 text-sm mb-1">WhatsApp</label><input type="text" value={customerForm.whatsapp} onChange={e => setCustomerForm({...customerForm, whatsapp: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white" /></div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
                <button type="submit" className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-4 py-2 rounded">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
