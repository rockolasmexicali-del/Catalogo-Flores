import React, { useState } from 'react';
import { LayoutDashboard, Flower2, ShoppingCart, History, Settings, Package, DollarSign, TrendingUp, Calendar, Search, Trash2, Printer, Mail, Loader2 } from 'lucide-react';
import Email from './utils/smtp';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Inventory from './components/Inventory';
import POS from './components/POS';
import SettingsTab from './components/Settings';

const getLocalDateString = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};


const Dashboard = ({ products, sales }) => {
  const today = getLocalDateString();
  const todaySales = sales.filter(s => getLocalDateString(s.date) === today);


  const totalSales = todaySales.reduce((sum, s) => sum + s.total, 0);
  const totalProfit = todaySales.reduce((sum, s) => sum + (s.profit || 0), 0);
  const inventoryValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  const totalItems = products.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <div className="fade-in">
      <h1 style={{ marginBottom: '2rem' }}>Resumen del Negocio</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="glass card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Ventas de Hoy</h3>
              <p style={{ fontSize: '2.2rem', fontWeight: '800', marginTop: '0.5rem', color: 'var(--primary)' }}>${totalSales.toFixed(2)}</p>
            </div>
            <div style={{ background: 'var(--primary-light)', padding: '0.6rem', borderRadius: '10px', color: 'var(--primary)' }}>
              <DollarSign size={24} />
            </div>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <TrendingUp size={14} /> <span>{todaySales.length} ventas hoy</span>
          </div>
        </div>

        <div className="glass card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Productos en Stock</h3>
              <p style={{ fontSize: '2.2rem', fontWeight: '800', marginTop: '0.5rem' }}>{totalItems}</p>
            </div>
            <div style={{ background: 'var(--secondary)', padding: '0.6rem', borderRadius: '10px', color: 'var(--text)' }}>
              <Package size={24} />
            </div>
          </div>
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{products.length} tipos de productos</p>
        </div>

        <div className="glass card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Utilidad de Hoy</h3>
              <p style={{ fontSize: '2.2rem', fontWeight: '800', marginTop: '0.5rem', color: '#2ecc71' }}>${totalProfit.toFixed(2)}</p>
            </div>
            <div style={{ background: '#2ecc7122', padding: '0.6rem', borderRadius: '10px', color: '#2ecc71' }}>
              <TrendingUp size={24} />
            </div>
          </div>
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ganancia neta del día</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="glass card">
          <h3 style={{ marginBottom: '1.5rem' }}>Ventas de Hoy</h3>
          {todaySales.length === 0 ? (
            <p style={{ opacity: 0.5, textAlign: 'center', padding: '2rem' }}>No hay ventas registradas hoy.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {todaySales.slice().reverse().map(sale => (
                <div key={sale.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', borderBottom: '1px solid var(--glass-border)' }}>
                  <div>
                    <p style={{ fontWeight: '600' }}>{sale.customerName}</p>
                    <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <p style={{ fontWeight: '700', color: 'var(--primary)' }}>${sale.total.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass card">
          <h3 style={{ marginBottom: '1.5rem' }}>Stock Bajo</h3>
          {products.filter(p => p.quantity <= 5).length === 0 ? (
            <p style={{ opacity: 0.5, textAlign: 'center', padding: '2rem' }}>Todo el inventario está al día.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {products.filter(p => p.quantity <= 5).map(product => (
                <div key={product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', borderBottom: '1px solid var(--glass-border)' }}>
                  <p style={{ fontWeight: '600' }}>{product.name}</p>
                  <span style={{ color: '#d00', fontWeight: '700', background: '#ffebeb', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.9rem' }}>
                    {product.quantity} disp.
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SalesHistory = ({ sales, setSales, products, setProducts, settings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const deleteSale = (saleId) => {
    if (window.confirm('¿Estás seguro de eliminar esta venta? Esta acción devolverá los productos al inventario.')) {
      const saleToDelete = sales.find(s => s.id === saleId);
      if (!saleToDelete) return;

      const updatedProducts = products.map(p => {
        const soldItem = saleToDelete.items.find(item => item.id === p.id);
        if (soldItem) {
          return { ...p, quantity: p.quantity + soldItem.quantity };
        }
        return p;
      });

      setProducts(updatedProducts);
      setSales(sales.filter(s => s.id !== saleId));
    }
  };

  const printReceipt = (sale) => {
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    const itemsHtml = sale.items.map(item => `
        <tr>
            <td style="padding: 5px 0;">
                ${item.name}<br/>
                <small style="color: #666;">${item.priceType === 'wholesale' ? 'Mayoreo' : 'Menudeo'}</small>
            </td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: right;">$${item.price.toFixed(2)}</td>
            <td style="text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
    `).join('');

    printWindow.document.write(`
        <html>
            <head>
                <title>Reimpresión Recibo #${sale.id.slice(-6)}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
                    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; }
                    th { border-bottom: 1px solid #eee; padding: 5px 0; text-align: left; }
                    .total { text-align: right; border-top: 2px solid #eee; padding-top: 10px; font-weight: bold; font-size: 1.2rem; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${settings.businessName || 'Florería App'}</h1>
                    <p>${settings.businessAddress || ''}</p>
                </div>
                <p><strong>Folio:</strong> #${sale.id.slice(-6)} (REIMPRESIÓN)</p>
                <p><strong>Fecha:</strong> ${new Date(sale.date).toLocaleString()}</p>
                <p><strong>Cliente:</strong> ${sale.customerName}</p>
                <table>
                    <thead><tr><th>Desc.</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                <div class="total">Total: $${sale.total.toFixed(2)}</div>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
        </html>
    `);
    printWindow.document.close();
  };

  const [sendingEmailId, setSendingEmailId] = useState(null);

  const sendEmail = async (sale) => {
    if (!sale.customer || !sale.customer.email) {
      alert('Este cliente no tiene un correo electrónico registrado.');
      return;
    }

    if (!settings.smtpHost || !settings.smtpUsername || !settings.smtpPassword) {
      alert('Configura el servidor SMTP en la pestaña de ajustes primero.');
      return;
    }

    setSendingEmailId(sale.id);

    try {
      const doc = new jsPDF();
      const margin = 20;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(109, 40, 217);
      doc.text(settings.businessName || "Florería", margin, 30);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text(`Nota de Venta: #${sale.id.slice(-6)}`, margin, 38);
      doc.text(`Fecha: ${new Date(sale.date).toLocaleDateString()}`, margin, 43);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("CLIENTE:", margin, 55);
      doc.setFont("helvetica", "normal");
      doc.text(sale.customerName || (typeof sale.customer === 'string' ? sale.customer : sale.customer.name), margin + 20, 55);

      const tableData = sale.items.map(i => [
        i.name + (i.priceType === 'wholesale' ? ' (Mayoreo)' : ''),
        i.quantity.toString(),
        `$${i.price.toFixed(2)}`,
        `$${(i.price * i.quantity).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 65,
        head: [['Producto', 'Cant.', 'Precio', 'Subtotal']],
        body: tableData,
        headStyles: { fillColor: [109, 40, 217] },
        margin: { left: margin, right: margin }
      });

      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`TOTAL: $${sale.total.toFixed(2)}`, 200 - margin, finalY, { align: 'right' });

      const pdfBase64 = doc.output('datauristring');

      const itemsListHtml = sale.items.map(i => `
        <tr>
          <td style="padding: 5px;">${i.name} ${i.priceType === 'wholesale' ? '(Mayoreo)' : ''}</td>
          <td style="padding: 5px; text-align: center;">${i.quantity}</td>
          <td style="padding: 5px; text-align: right;">$${(i.price * i.quantity).toFixed(2)}</td>
        </tr>
      `).join('');

      await Email.send({
        host: settings.smtpHost,
        username: settings.smtpUsername,
        password: settings.smtpPassword,
        to: sale.customer.email,
        from: settings.smtpUsername,
        fromName: settings.smtpSenderName,
        subject: `Tu recibo de ${settings.businessName || 'Florería'} - Folio #${sale.id.slice(-6)}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #6d28d9; text-align: center;">${settings.businessName || 'Florería'}</h2>
            <p>Hola <strong>${sale.customerName}</strong>,</p>
            <p>Aquí tienes el detalle de tu compra realizada el ${new Date(sale.date).toLocaleDateString()}:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead style="background: #f8f8f8;">
                <tr>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Producto</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Cant.</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsListHtml}
              </tbody>
            </table>
            <div style="text-align: right; font-size: 1.2rem; font-weight: bold; margin-top: 10px;">
              TOTAL: $${sale.total.toFixed(2)}
            </div>
            <p style="text-align: center; margin-top: 20px; color: #666;">Se adjunta el recibo PDF oficial.</p>
          </div>
        `,
        attachments: [
          {
            name: `Recibo_${sale.id.slice(-6)}.pdf`,
            data: pdfBase64
          }
        ]
      });

      alert('¡Correo enviado con éxito!');
    } catch (err) {
      alert('Error al enviar correo: ' + (err.message || err));
    } finally {
      setSendingEmailId(null);
    }
  };


  const filteredSales = sales.filter(sale => {
    const matchesName = (sale.customerName || 'Cliente General').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !dateFilter || getLocalDateString(sale.date) === dateFilter;
    return matchesName && matchesDate;
  });

  const totalSalesSum = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const totalProfitSum = filteredSales.reduce((sum, s) => sum + (s.profit || 0), 0);

  const exportToExcel = () => {
    const headers = ['Folio', 'Fecha', 'Cliente', 'Articulos', 'Venta', 'Utilidad'];
    const csvContent = [
      headers.join(','),
      ...filteredSales.map(s => [
        `#${s.id.slice(-6)}`,
        new Date(s.date).toLocaleString().replace(',', ''),
        (s.customerName || 'Cliente General').replace(',', ''),
        s.items.map(i => `${i.name} (${i.quantity})`).join('; ').replace(',', ''),
        s.total.toFixed(2),
        (s.profit || 0).toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_ventas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    const rows = filteredSales.map(s => `
      <tr>
        <td>#${s.id.slice(-6)}</td>
        <td>${new Date(s.date).toLocaleString()}</td>
        <td>${s.customerName || 'Cliente General'}</td>
        <td style="text-align: right;">$${s.total.toFixed(2)}</td>
        <td style="text-align: right; color: #2ecc71;">$${(s.profit || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Reporte de Ventas</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { color: #6d28d9; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
            th { background: #f8f9fa; }
            .totals { margin-top: 20px; text-align: right; font-weight: bold; font-size: 16px; }
          </style>
        </head>
        <body>
          <h1>Reporte de Ventas</h1>
          <p>Generado el: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th style="text-align: right;">Venta</th>
                <th style="text-align: right;">Utilidad</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="totals">
            <p>Suma de Ventas: $${totalSalesSum.toFixed(2)}</p>
            <p style="color: #2ecc71;">Suma de Utilidad: $${totalProfitSum.toFixed(2)}</p>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Historial de Ventas</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass card" style={{ padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Search size={18} style={{ opacity: 0.5 }} />
          <input
            type="text"
            placeholder="Buscar por cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'none', padding: 0 }}
          />
        </div>
        <div className="glass card" style={{ padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Calendar size={18} style={{ opacity: 0.5 }} />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ border: 'none', background: 'none', padding: 0, width: '100%' }}
          />
        </div>
        <button onClick={exportToPDF} className="secondary" style={{ padding: '0.8rem' }}>Exportar PDF</button>
        <button onClick={exportToExcel} className="secondary" style={{ padding: '0.8rem' }}>Exportar Excel</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="glass card" style={{ background: 'var(--primary-light)', borderColor: 'var(--primary)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Suma Total en Ventas</span>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary)' }}>${totalSalesSum.toFixed(2)}</div>
        </div>
        <div className="glass card" style={{ background: '#2ecc7111', borderColor: '#2ecc71' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Suma Total en Utilidad</span>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#2ecc71' }}>${totalProfitSum.toFixed(2)}</div>
        </div>
      </div>

      <div className="glass card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ textAlign: 'left', padding: '1rem' }}>Folio</th>
              <th style={{ textAlign: 'left', padding: '1rem' }}>Fecha</th>
              <th style={{ textAlign: 'left', padding: '1rem' }}>Cliente</th>
              <th style={{ textAlign: 'left', padding: '1rem' }}>Artículos</th>
              <th style={{ textAlign: 'right', padding: '1rem' }}>Venta</th>
              <th style={{ textAlign: 'right', padding: '1rem' }}>Utilidad</th>
              <th style={{ textAlign: 'center', padding: '1rem' }}>Acciones</th>
            </tr>

          </thead>
          <tbody>
            {filteredSales.slice().reverse().map(sale => (
              <tr key={sale.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '1rem' }}>#{sale.id.slice(-6)}</td>
                <td style={{ padding: '1rem' }}>{new Date(sale.date).toLocaleString()}</td>
                <td style={{ padding: '1rem', fontWeight: '500' }}>
                  {sale.customerName || (sale.customer && (typeof sale.customer === 'string' ? sale.customer : sale.customer.name)) || 'Cliente General'}
                  {sale.items.some(i => i.priceType === 'wholesale') && (
                    <span style={{
                      marginLeft: '0.5rem',
                      fontSize: '0.7rem',
                      background: '#e67e22',
                      color: 'white',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      verticalAlign: 'middle'
                    }}>
                      MAYOREO
                    </span>
                  )}
                </td>
                <td style={{ padding: '1rem' }}>
                  {sale.items.map(i => `${i.name} (${i.quantity})`).join(', ')}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700' }}>
                  ${sale.total.toFixed(2)}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700', color: '#2ecc71' }}>
                  +${(sale.profit || 0).toFixed(2)}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button
                      onClick={() => printReceipt(sale)}
                      title="Reimprimir Ticket"
                      className="ghost"
                      style={{ padding: '0.4rem', color: 'var(--primary)' }}
                    >
                      <Printer size={18} />
                    </button>
                    <button
                      onClick={() => sendEmail(sale)}
                      disabled={sendingEmailId === sale.id}
                      title="Enviar por Correo"
                      className="ghost"
                      style={{ padding: '0.4rem', color: '#3498db' }}
                    >
                      {sendingEmailId === sale.id ? <Loader2 size={18} className="spin" /> : <Mail size={18} />}
                    </button>
                    <button
                      onClick={() => deleteSale(sale.id)}
                      title="Eliminar Venta"
                      className="ghost"
                      style={{ padding: '0.4rem', color: '#d00' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>

            ))}
            {filteredSales.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                  {sales.length === 0 ? 'No hay ventas en el historial.' : 'No se encontraron resultados para la búsqueda.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Analytics = ({ sales }) => {
  const [timeframe, setTimeframe] = useState('daily');

  const processData = () => {
    const now = new Date();
    const data = [];

    if (timeframe === 'daily') {
      const today = getLocalDateString(now);
      const hours = Array.from({ length: 24 }, (_, i) => ({ label: `${i}:00`, value: 0, profit: 0 }));
      sales.forEach(s => {
        if (getLocalDateString(s.date) === today) {
          const hour = new Date(s.date).getHours();
          hours[hour].value += s.total;
          hours[hour].profit += (s.profit || 0);
        }
      });
      return hours;
    }

    if (timeframe === 'weekly') {
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const weekData = days.map(label => ({ label, value: 0, profit: 0 }));
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      sales.forEach(s => {
        const d = new Date(s.date);
        if (d >= startOfWeek) {
          const dayIndex = d.getDay();
          weekData[dayIndex].value += s.total;
          weekData[dayIndex].profit += (s.profit || 0);
        }
      });
      return weekData;
    }

    if (timeframe === 'monthly') {
      const monthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const monthData = Array.from({ length: Math.ceil(monthDays / 7) }, (_, i) => ({ label: `Sem ${i + 1}`, value: 0, profit: 0 }));

      sales.forEach(s => {
        const d = new Date(s.date);
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
          const weekIndex = Math.floor((d.getDate() - 1) / 7);
          if (monthData[weekIndex]) {
            monthData[weekIndex].value += s.total;
            monthData[weekIndex].profit += (s.profit || 0);
          }
        }
      });
      return monthData;
    }

    if (timeframe === 'yearly') {
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const yearData = months.map(label => ({ label, value: 0, profit: 0 }));

      sales.forEach(s => {
        const d = new Date(s.date);
        if (d.getFullYear() === now.getFullYear()) {
          const monthIndex = d.getMonth();
          yearData[monthIndex].value += s.total;
          yearData[monthIndex].profit += (s.profit || 0);
        }
      });
      return yearData;
    }
    return [];
  };

  const chartData = processData();
  const maxValue = Math.max(...chartData.map(d => d.value), 1);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Análisis de Ventas</h1>
        <div className="glass card" style={{ display: 'flex', gap: '0.5rem', padding: '0.4rem' }}>
          {['daily', 'weekly', 'monthly', 'yearly'].map(t => (
            <button
              key={t}
              className={timeframe === t ? '' : 'ghost'}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', textTransform: 'capitalize' }}
              onClick={() => setTimeframe(t)}
            >
              {t === 'daily' ? 'Hoy' : t === 'weekly' ? 'Semana' : t === 'monthly' ? 'Mes' : 'Año'}
            </button>
          ))}
        </div>
      </div>

      <div className="glass card" style={{ height: '450px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '1rem', padding: '2rem 1rem 1rem 1rem' }}>
          {chartData.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem', height: '100%', justifyContent: 'flex-end' }}>
              <div
                className="chart-bar"
                style={{
                  width: '100%',
                  height: `${(d.value / maxValue) * 100}%`,
                  background: 'linear-gradient(to top, var(--primary), var(--primary-light))',
                  borderRadius: '6px 6px 0 0',
                  position: 'relative',
                  transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                title={`Venta: $${d.value.toFixed(2)}\nGanancia: $${d.profit.toFixed(2)}`}
              >
                {d.value > 0 && (
                  <div className="bar-tooltip" style={{ position: 'absolute', top: '-2.5rem', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    ${d.value > 1000 ? (d.value / 1000).toFixed(1) + 'k' : d.value.toFixed(0)}
                  </div>
                )}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '2rem' }}>
        <div className="glass card">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Venta Total</p>
          <p style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.5rem', color: 'var(--primary)' }}>
            ${chartData.reduce((sum, d) => sum + d.value, 0).toFixed(2)}
          </p>
        </div>
        <div className="glass card">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Utilidad Total</p>
          <p style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.5rem', color: '#2ecc71' }}>
            ${chartData.reduce((sum, d) => sum + d.profit, 0).toFixed(2)}
          </p>
        </div>
        <div className="glass card">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Promedio</p>
          <p style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.5rem' }}>
            ${(chartData.reduce((sum, d) => sum + d.value, 0) / chartData.filter(d => d.value > 0).length || 0).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};

import { useFirebaseSync } from './hooks/useFirebaseSync';
import { useLocalDatabase, checkNeedsMigration, importFirebaseData } from './hooks/useLocalDatabase';
import { useEffect } from 'react';

const isElectron = typeof window !== 'undefined' && /electron/i.test(navigator.userAgent);

// Elegir el hook correcto según el entorno
const useDataSync = isElectron ? useLocalDatabase : useFirebaseSync;

function App() {
  const [activeTab, setActiveTab] = useState('pos');
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState('');

  // Usamos un identificador único para el negocio. 
  const businessId = "negocio_floria_principal";

  const defaultSettings = {
    retailPercentage: 50,
    wholesalePercentage: 30,
    businessName: '',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    emailjsServiceId: '',
    emailjsTemplateId: '',
    emailjsPublicKey: '',
    smtpSenderName: ''
  };

  const [products, setProducts, loadingProducts] = useDataSync('inventory', businessId, []);
  const [sales, setSales, loadingSales] = useDataSync('sales', businessId, []);
  const [settings, setSettings, loadingSettings] = useDataSync('settings', businessId, defaultSettings);
  const [wholesaleCustomers, setWholesaleCustomers] = useDataSync('wholesale_customers', businessId, []);
  const [commonCustomers, setCommonCustomers] = useDataSync('common_customers', businessId, []);

  // ==================== MIGRACIÓN AUTOMÁTICA DESDE FIREBASE ====================
  useEffect(() => {
    if (!isElectron) return;
    if (loadingProducts || loadingSales) return;

    const runMigration = async () => {
      try {
        const needsMigration = await checkNeedsMigration();
        if (!needsMigration) return;

        // Si la BD local está vacía, intentamos migrar desde Firebase
        setMigrating(true);
        setMigrationStatus('Conectando con Firebase para traer tus datos...');

        // Importar Firebase dinámicamente solo para la migración
        const { db } = await import('./firebase');
        const { doc, getDoc } = await import('firebase/firestore');

        setMigrationStatus('Descargando productos...');
        const productsSnap = await getDoc(doc(db, 'inventory', businessId));
        const firebaseProducts = productsSnap.exists() ? productsSnap.data().value : [];

        setMigrationStatus('Descargando ventas...');
        const salesSnap = await getDoc(doc(db, 'sales', businessId));
        const firebaseSales = salesSnap.exists() ? salesSnap.data().value : [];

        setMigrationStatus('Descargando configuración...');
        const settingsSnap = await getDoc(doc(db, 'settings', businessId));
        const firebaseSettings = settingsSnap.exists() ? settingsSnap.data().value : null;

        setMigrationStatus('Descargando clientes mayoreo...');
        const wholesaleSnap = await getDoc(doc(db, 'wholesale_customers', businessId));
        const firebaseWholesale = wholesaleSnap.exists() ? wholesaleSnap.data().value : [];

        setMigrationStatus('Descargando clientes comunes...');
        const commonSnap = await getDoc(doc(db, 'common_customers', businessId));
        const firebaseCommon = commonSnap.exists() ? commonSnap.data().value : [];

        const totalItems = (firebaseProducts?.length || 0) + (firebaseSales?.length || 0) +
          (firebaseWholesale?.length || 0) + (firebaseCommon?.length || 0);

        if (totalItems === 0) {
          console.log('No hay datos en Firebase para migrar');
          setMigrating(false);
          return;
        }

        setMigrationStatus(`Guardando ${totalItems} registros en la base de datos local...`);
        const result = await importFirebaseData({
          products: firebaseProducts || [],
          sales: firebaseSales || [],
          settings: firebaseSettings || defaultSettings,
          wholesaleCustomers: firebaseWholesale || [],
          commonCustomers: firebaseCommon || []
        });

        if (result.success) {
          setMigrationStatus('¡Migración completada! Recargando...');
          // Recargar la ventana para que los hooks lean los datos nuevos
          setTimeout(() => window.location.reload(), 1500);
        } else {
          console.error('Error en migración:', result.error);
          setMigrationStatus('Error en la migración. La app funcionará sin datos previos.');
          setTimeout(() => setMigrating(false), 3000);
        }
      } catch (error) {
        console.error('Error en migración:', error);
        setMigrationStatus('No se pudo conectar a Firebase. La app funcionará sin datos previos.');
        setTimeout(() => setMigrating(false), 3000);
      }
    };

    runMigration();
  }, [loadingProducts, loadingSales]);

  // Pantalla de migración
  if (migrating) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', color: 'var(--primary)' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <Flower2 size={48} className="spin" style={{ marginBottom: '1rem' }} />
          <h2 style={{ marginBottom: '1rem' }}>Migrando datos de la nube</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{migrationStatus}</p>
          <div style={{ marginTop: '1.5rem', height: '4px', background: 'var(--glass-border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--primary)', borderRadius: '2px', animation: 'migrationBar 2s ease-in-out infinite' }} />
          </div>
          <style>{`
            @keyframes migrationBar {
              0% { width: 0%; }
              50% { width: 70%; }
              100% { width: 100%; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (loadingProducts || loadingSales) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', color: 'var(--primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <Flower2 size={48} className="spin" style={{ marginBottom: '1rem' }} />
          <h2>{isElectron ? 'Cargando datos locales...' : 'Conectando con la nube...'}</h2>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'pos', label: 'Venta', icon: <ShoppingCart size={20} /> },
    { id: 'inventory', label: 'Inventario', icon: <Flower2 size={20} /> },
    { id: 'history', label: 'Historial', icon: <History size={20} /> },
    { id: 'dashboard', label: 'Resumen del negocio', icon: <LayoutDashboard size={20} /> },
    { id: 'analytics', label: 'Gráficos', icon: <TrendingUp size={20} /> },
    { id: 'settings', label: 'Configuración', icon: <Settings size={20} /> },
  ];

  return (
    <div className="app-container">
      <aside className="sidebar glass">
        <div style={{ padding: '0 1rem 2rem 1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ background: 'var(--primary)', color: 'white', padding: '0.4rem', borderRadius: '8px' }}>
            <Flower2 size={24} />
          </div>
          <span style={{ fontWeight: '700', fontSize: '1.2rem', color: 'var(--text)' }}>Florería App</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={activeTab === item.id ? '' : 'ghost'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                justifyContent: 'flex-start',
                padding: '0.8rem 1rem',
                width: '100%'
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

      </aside>

      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard products={products} sales={sales} />}
        {activeTab === 'inventory' && <Inventory products={products} setProducts={setProducts} settings={settings} />}
        {activeTab === 'pos' && <POS products={products} setProducts={setProducts} sales={sales} setSales={setSales} wholesaleCustomers={wholesaleCustomers} commonCustomers={commonCustomers} setCommonCustomers={setCommonCustomers} settings={settings} />}
        {activeTab === 'history' && <SalesHistory sales={sales} setSales={setSales} products={products} setProducts={setProducts} settings={settings} />}
        {activeTab === 'analytics' && <Analytics sales={sales} />}
        {activeTab === 'settings' && <SettingsTab settings={settings} setSettings={setSettings} products={products} setProducts={setProducts} wholesaleCustomers={wholesaleCustomers} setWholesaleCustomers={setWholesaleCustomers} commonCustomers={commonCustomers} setCommonCustomers={setCommonCustomers} sales={sales} setSales={setSales} />}
      </main>
    </div>
  );
}

export default App;
