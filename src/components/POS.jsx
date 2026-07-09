import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas';
import Email from '../utils/smtp';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Search, ShoppingCart, Trash2, Plus, Minus, CheckCircle, Package, X, Mail, Loader2, Printer, Copy } from 'lucide-react';

const POS = ({ products, setProducts, sales, setSales, wholesaleCustomers, commonCustomers, setCommonCustomers, settings }) => {
    const getImageUrl = (imagePath, productId) => {
        if (!imagePath || imagePath === 'LOCAL_IMAGE') {
            return localStorage.getItem(`img_${productId}`) || '';
        }
        if (imagePath.startsWith('http') || imagePath.startsWith('data:') || imagePath.startsWith('file:')) {
            return imagePath;
        }
        if (/^[a-zA-Z]:\\/.test(imagePath) || imagePath.startsWith('\\')) {
            return `file:///${imagePath.replace(/\\/g, '/')}`;
        }
        return imagePath;
    };
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [selectionProduct, setSelectionProduct] = useState(null);
    const [customerName, setCustomerName] = useState('');
    const [copyingImage, setCopyingImage] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [copyingWholesale, setCopyingWholesale] = useState(false);
    const [copySuccessWholesale, setCopySuccessWholesale] = useState(false);
    const productCardRef = useRef(null);
    const quotationCardRef = useRef(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailStatus, setEmailStatus] = useState(null); // 'sending', 'success', 'error'
    const [emailErrorMessage, setEmailErrorMessage] = useState('');
    const [showRegisterCommon, setShowRegisterCommon] = useState(false);
    const [newCommonData, setNewCommonData] = useState({ phone: '', email: '' });

    // Close suggestions when clicking outside
    React.useEffect(() => {
        const handleClickOutside = () => setShowSuggestions(false);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    // Cerrar ventana de selección con la tecla Escape
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setSelectionProduct(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) && p.quantity > 0
    );

    const isCustomerWholesale = (name) => {
        if (!name) return false;
        return wholesaleCustomers.some(c => {
            const customerNameInDb = typeof c === 'string' ? c : c.name;
            return customerNameInDb.trim().toLowerCase() === name.trim().toLowerCase();
        });
    };

    const isCustomerCommon = (name) => {
        if (!name) return false;
        return commonCustomers.some(c => {
            const customerNameInDb = typeof c === 'string' ? c : c.name;
            return customerNameInDb.trim().toLowerCase() === name.trim().toLowerCase();
        });
    };

    const addToCart = (product) => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setSelectionProduct(product);
        setCopySuccess(false);
    };

    const copyProductImage = async () => {
        if (!quotationCardRef.current || copyingImage) return;
        setCopyingImage(true);
        // Make the hidden card briefly visible for html2canvas
        const el = quotationCardRef.current;
        el.style.left = '-9999px';
        el.style.visibility = 'visible';
        try {
            const canvas = await html2canvas(el, {
                useCORS: true,
                allowTaint: true,
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false
            });
            el.style.visibility = 'hidden';
            canvas.toBlob(async (blob) => {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 3000);
                } catch (err) {
                    console.error('Error copiando al portapapeles:', err);
                    alert('No se pudo copiar. Asegúrate de usar la app en Electron.');
                } finally {
                    setCopyingImage(false);
                }
            }, 'image/png');
        } catch (err) {
            console.error('Error capturando imagen:', err);
            el.style.visibility = 'hidden';
            setCopyingImage(false);
        }
    };

    const copyWholesaleImage = async () => {
        if (!productCardRef.current || copyingWholesale) return;
        setCopyingWholesale(true);
        try {
            const canvas = await html2canvas(productCardRef.current, {
                useCORS: true,
                allowTaint: true,
                scale: 2,
                backgroundColor: '#1e1e2e',
                logging: false
            });
            canvas.toBlob(async (blob) => {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    setCopySuccessWholesale(true);
                    setTimeout(() => setCopySuccessWholesale(false), 3000);
                } catch (err) {
                    console.error('Error copiando al portapapeles:', err);
                    alert('No se pudo copiar.');
                } finally {
                    setCopyingWholesale(false);
                }
            }, 'image/png');
        } catch (err) {
            console.error('Error capturando imagen:', err);
            setCopyingWholesale(false);
        }
    };

    const confirmAddToCart = (product, priceType) => {
        const existing = cart.find(item => item.id === product.id && item.priceType === priceType);
        if (existing) {
            if (existing.cartQuantity < product.quantity) {
                setCart(cart.map(item =>
                    (item.id === product.id && item.priceType === priceType) ? { ...item, cartQuantity: item.cartQuantity + 1 } : item
                ));
            }
        } else {
            setCart([...cart, { ...product, cartQuantity: 1, priceType }]);
        }
        setSelectionProduct(null);
    };

    const updateQuantity = (id, priceType, delta) => {
        setCart(cart.map(item => {
            if (item.id === id && item.priceType === priceType) {
                const product = products.find(p => p.id === id);
                const newQty = item.cartQuantity + delta;
                if (newQty > 0 && newQty <= product.quantity) {
                    return { ...item, cartQuantity: newQty };
                }
            }
            return item;
        }));
    };

    const togglePriceType = (id) => {
        setCart(cart.map(item => {
            if (item.id === id) {
                return { ...item, priceType: item.priceType === 'retail' ? 'wholesale' : 'retail' };
            }
            return item;
        }));
    };

    const getItemPrice = (item) => item.priceType === 'wholesale' ? item.wholesalePrice : item.price;

    const total = cart.reduce((sum, item) => sum + (getItemPrice(item) * item.cartQuantity), 0);

    const finalizeSale = () => {
        if (sendingEmail) return; // Prevent double clicks while sending

        const isWholesale = cart.some(item => item.priceType === 'wholesale');

        if (isWholesale) {
            if (!customerName.trim()) {
                alert('Por favor, ingresa el nombre del cliente para ventas de mayoreo.');
                return;
            }
            if (!isCustomerWholesale(customerName)) {
                alert(`El cliente "${customerName}" no está registrado en la base de datos de mayoreo. La venta no puede generarse.`);
                return;
            }
        }

        // Identificar al cliente y su email
        const customer = [...wholesaleCustomers, ...commonCustomers].find(c => {
            const name = typeof c === 'string' ? c : c.name;
            return name.toLowerCase() === (customerName.trim() || 'Cliente General').toLowerCase();
        }) || { name: customerName.trim() || 'Cliente General' };

        const saleItems = cart.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.cartQuantity,
            price: getItemPrice(item),
            priceType: item.priceType,
            cost: item.cost || 0
        }));

        const totalCost = saleItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0);

        const newSale = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            customer: customer,
            customerName: typeof customer === 'string' ? customer : (customer.name || 'Cliente General'),
            items: saleItems,
            total,
            totalCost,
            profit: total - totalCost
        };

        setSales([...sales, newSale]);
        setProducts(products.map(p => {
            const saleItem = cart.find(item => item.id === p.id);
            if (saleItem) {
                return { ...p, quantity: p.quantity - saleItem.cartQuantity };
            }
            return p;
        }));

        setCart([]);
        setCustomerName('');
        setShowSuccess(newSale);

        // Generar y Enviar PDF
        if (customer && customer.email && settings.smtpHost && settings.smtpUsername && settings.smtpPassword) {
            setSendingEmail(true);
            setEmailStatus('sending');
            setEmailErrorMessage('');

            try {
                const doc = new jsPDF();
                const margin = 20;

                // Estilo del PDF (el mismo de antes)
                doc.setFont("helvetica", "bold");
                doc.setFontSize(22);
                doc.setTextColor(109, 40, 217);
                doc.text(settings.businessName || "Florería", margin, 30);

                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.setFont("helvetica", "normal");
                doc.text(`Nota de Venta: #${newSale.id.slice(-6)}`, margin, 38);
                doc.text(`Fecha: ${new Date().toLocaleDateString()}`, margin, 43);

                doc.setFont("helvetica", "bold");
                doc.setTextColor(0);
                doc.text("CLIENTE:", margin, 55);
                doc.setFont("helvetica", "normal");
                doc.text(customer.name || customer, margin + 20, 55);

                const tableData = newSale.items.map(i => [
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
                doc.text(`TOTAL: $${newSale.total.toFixed(2)}`, 200 - margin, finalY, { align: 'right' });

                // PDF a Base64
                const pdfBase64 = doc.output('datauristring');

                const itemsListHtml = newSale.items.map(i => `
                    <tr>
                        <td style="padding: 5px;">${i.name} ${i.priceType === 'wholesale' ? '(Mayoreo)' : ''}</td>
                        <td style="padding: 5px; text-align: center;">${i.quantity}</td>
                        <td style="padding: 5px; text-align: right;">$${(i.price * i.quantity).toFixed(2)}</td>
                    </tr>
                `).join('');

                Email.send({
                    host: settings.smtpHost,
                    username: settings.smtpUsername,
                    password: settings.smtpPassword,
                    to: customer.email,
                    from: settings.smtpUsername,
                    fromName: settings.smtpSenderName, // Agregado
                    subject: `Tu recibo de ${settings.businessName || 'Florería'} - Folio #${newSale.id.slice(-6)}`,
                    body: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                            <h2 style="color: #6d28d9; text-align: center;">${settings.businessName || 'Florería'}</h2>
                            <p>Hola <strong>${customer.name || customer}</strong>,</p>
                            <p>Gracias por tu compra. Aquí tienes el detalle de tu pedido:</p>
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
                                TOTAL: $${newSale.total.toFixed(2)}
                            </div>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                            <p style="font-size: 0.8rem; color: #777; text-align: center;">
                                ${settings.businessAddress || ''}<br/>
                                ${settings.businessPhone || ''}
                            </p>
                            <p style="font-size: 0.8rem; color: #999; text-align: center;">Se adjunta el recibo PDF oficial a este correo.</p>
                        </div>
                    `,
                    attachments: [
                        {
                            name: `Recibo_${newSale.id.slice(-6)}.pdf`,
                            data: pdfBase64
                        }
                    ]
                }).then(message => {
                    if (message === "OK") {
                        setEmailStatus('success');
                    } else {
                        setEmailStatus('error');
                        setEmailErrorMessage(message);
                    }

                    setTimeout(() => {
                        setSendingEmail(false);
                        setEmailStatus(null);
                        setShowSuccess(false);
                    }, 3000);
                });
            } catch (err) {
                console.error("Error generating PDF:", err);
                setEmailStatus('error');
                setEmailErrorMessage(err.message);
                setTimeout(() => setSendingEmail(false), 4000);
            }
        }

        // Auto-imprimir Recibo Físico (Formato Hoja Normal)
        setTimeout(() => {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Recibo - ${settings.businessName || 'Florería'}</title>
                        <style>
                            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                            .header { text-align: center; border-bottom: 2px solid #6d28d9; padding-bottom: 20px; margin-bottom: 30px; }
                            .business-name { color: #6d28d9; font-size: 28px; font-weight: bold; margin: 0; }
                            .details { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; }
                            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                            th { background-color: #f3f4f6; text-align: left; padding: 12px; border-bottom: 2px solid #e5e7eb; }
                            td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
                            .total-section { text-align: right; font-size: 20px; font-weight: bold; color: #6d28d9; }
                            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
                            @media print {
                                body { padding: 0; }
                                .no-print { display: none; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1 class="business-name">${settings.businessName || 'FLORERÍA'}</h1>
                            <p style="margin: 5px 0;">${settings.businessAddress || ''}</p>
                            <p style="margin: 0;">Tel: ${settings.businessPhone || ''}</p>
                        </div>
                        
                        <div class="details">
                            <div>
                                <strong>CLIENTE:</strong> ${typeof customer === 'string' ? customer : customer.name}<br>
                                <strong>FECHA:</strong> ${new Date().toLocaleString()}
                            </div>
                            <div style="text-align: right;">
                                <strong>NOTA DE VENTA:</strong> #${newSale.id.slice(-6)}
                            </div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>Descripción</th>
                                    <th style="text-align: center;">Cantidad</th>
                                    <th style="text-align: right;">Precio Unit.</th>
                                    <th style="text-align: right;">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${newSale.items.map(i => `
                                    <tr>
                                        <td>${i.name} ${i.priceType === 'wholesale' ? '<span style="color: #e67e22; font-size: 10px;">(MAYOREO)</span>' : ''}</td>
                                        <td style="text-align: center;">${i.quantity}</td>
                                        <td style="text-align: right;">$${i.price.toFixed(2)}</td>
                                        <td style="text-align: right;">$${(i.price * i.quantity).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <div class="total-section">
                            TOTAL A PAGAR: $${newSale.total.toFixed(2)}
                        </div>

                        <div class="footer">
                            <p>¡Gracias por confiar en nosotros!</p>
                            <p>Este documento es un comprobante de venta digital.</p>
                        </div>

                        <script>
                            window.onload = function() {
                                window.print();
                                // Pequeño retraso para asegurar que el diálogo de impresión se abra antes de cerrar
                                setTimeout(() => {
                                    window.close();
                                }, 1000);
                            };
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }, 800);
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
                    <title>Recibo de Venta #${sale.id.slice(-6)}</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 15px; }
                        .header h1 { margin: 0; font-size: 24px; color: #6d28d9; }
                        .header p { margin: 5px 0; font-size: 14px; color: #666; }
                        .info { margin-bottom: 20px; font-size: 14px; }
                        .info div { margin-bottom: 5px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        th { border-bottom: 1px solid #eee; padding: 10px 0; text-align: left; font-size: 14px; }
                        .total { text-align: right; border-top: 2px solid #eee; padding-top: 15px; }
                        .total h2 { margin: 0; color: #6d28d9; }
                        @media print {
                            body { padding: 0; }
                            button { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>${settings.businessName || 'Florería App'}</h1>
                        ${settings.businessAddress ? `<p>${settings.businessAddress}</p>` : ''}
                        ${settings.businessPhone ? `<p>Tel: ${settings.businessPhone}</p>` : ''}
                        ${settings.businessEmail ? `<p>${settings.businessEmail}</p>` : ''}
                    </div>
                    
                    <div class="info">
                        <div><strong>Folio:</strong> #${sale.id.slice(-6)}</div>
                        <div><strong>Fecha:</strong> ${new Date(sale.date).toLocaleString()}</div>
                        <div><strong>Cliente:</strong> ${sale.customerName}</div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Descripción</th>
                                <th style="text-align: center;">Cant.</th>
                                <th style="text-align: right;">Precio</th>
                                <th style="text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div class="total">
                        <p style="margin: 0; color: #666;">Total a Pagar</p>
                        <h2>$${sale.total.toFixed(2)}</h2>
                    </div>

                    <div style="margin-top: 40px; text-align: center; color: #888; font-size: 12px;">
                        ¡Gracias por su compra!
                    </div>
                    
                    <script>
                        window.onload = function() {
                            window.print();
                            // window.close(); // Optional: close window after printing
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Punto de Venta</h1>
                {sendingEmail && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.8)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <div className="glass card" style={{
                            width: '320px',
                            textAlign: 'center',
                            padding: '3rem 2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1.5rem',
                            animation: 'slideUp 0.4s ease-out'
                        }}>
                            {emailStatus === 'sending' && (
                                <>
                                    <div className="status-circle" style={{ background: 'var(--primary-light)', padding: '1.5rem', borderRadius: '50%' }}>
                                        <Loader2 size={48} className="spin" color="var(--primary)" />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Enviando Nota</h3>
                                        <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Tu recibo digital está en camino...</p>
                                    </div>
                                </>
                            )}
                            {emailStatus === 'success' && (
                                <>
                                    <div className="status-circle" style={{ background: '#2ecc7122', padding: '1.5rem', borderRadius: '50%', animation: 'pop 0.5s ease-out' }}>
                                        <CheckCircle size={48} color="#2ecc71" />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: '#2ecc71' }}>¡Venta Exitosa!</h3>
                                        <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>La nota de venta fue enviada correctamente al cliente.</p>
                                    </div>
                                </>
                            )}
                            {emailStatus === 'error' && (
                                <>
                                    <div className="status-circle" style={{ background: '#e74c3c22', padding: '1.5rem', borderRadius: '50%' }}>
                                        <X size={48} color="#e74c3c" />
                                    </div>
                                    <div style={{ padding: '0 1rem' }}>
                                        <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: '#e74c3c' }}>Error de Envío</h3>
                                        <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '1rem' }}>No pudimos enviar el correo digital.</p>
                                        <div style={{
                                            background: '#e74c3c11',
                                            padding: '0.8rem',
                                            borderRadius: '8px',
                                            fontSize: '0.75rem',
                                            color: '#c0392b',
                                            border: '1px solid #e74c3c22',
                                            wordBreak: 'break-word'
                                        }}>
                                            <strong>Motivo:</strong> {emailErrorMessage || 'Error desconocido'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSendingEmail(false)}
                                        style={{ marginTop: '0.5rem', background: '#eee', color: '#333', padding: '0.5rem 1rem' }}
                                    >
                                        Cerrar
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>
                <div>
                    <div className="glass card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '3rem' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                        {filteredProducts.map(product => (
                            <div
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className="glass card"
                                style={{ cursor: 'pointer', padding: '1rem' }}
                            >
                                <div style={{ height: '120px', borderRadius: '6px', overflow: 'hidden', marginBottom: '0.8rem', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {product.image || localStorage.getItem(`img_${product.id}`) ? (
                                        <img src={getImageUrl(product.image, product.id)} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', background: 'rgba(0,0,0,0.03)' }} />
                                    ) : (
                                        <Package size={32} style={{ opacity: 0.2 }} />
                                    )}
                                </div>
                                <h4 style={{ fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</h4>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                    <span style={{ fontWeight: '700', color: 'var(--primary)' }}>${product.price.toFixed(2)}</span>
                                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Stock: {product.quantity}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass card" style={{ position: 'sticky', top: '2rem', height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                        <ShoppingCart size={24} />
                        <h2 style={{ fontSize: '1.4rem' }}>Caja Registradora</h2>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.8rem',
                            color: cart.some(i => i.priceType === 'wholesale') && !customerName ? '#e67e22' : 'var(--text-muted)',
                            marginBottom: '0.5rem',
                            marginLeft: '0.2rem',
                            fontWeight: cart.some(i => i.priceType === 'wholesale') ? '700' : 'normal'
                        }}>
                            {cart.some(i => i.priceType === 'wholesale') ? '👤 Nombre del Cliente (Obligatorio para Mayoreo)' : 'Nombre del Cliente'}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Ej. Juan Pérez..."
                                value={customerName}
                                onChange={(e) => {
                                    setCustomerName(e.target.value);
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                style={{
                                    width: '100%',
                                    padding: '0.8rem',
                                    border: cart.some(i => i.priceType === 'wholesale') && !customerName ? '2px solid #e67e22' : '1px solid var(--glass-border)'
                                }}
                            />

                            {showSuggestions && customerName.trim() && (
                                <div className="glass" style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    zIndex: 10,
                                    marginTop: '0.5rem',
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    background: 'var(--background)',
                                    boxShadow: 'var(--shadow)',
                                    padding: '0.5rem'
                                }}>
                                    {/* Mostrar Clientes de Mayoreo */}
                                    {wholesaleCustomers
                                        .filter(c => (typeof c === 'string' ? c : c.name).toLowerCase().includes(customerName.toLowerCase()))
                                        .map((customer, index) => {
                                            const name = typeof customer === 'string' ? customer : customer.name;
                                            return (
                                                <div
                                                    key={`ws-${index}`}
                                                    onClick={() => {
                                                        setCustomerName(name);
                                                        setShowSuggestions(false);
                                                    }}
                                                    style={{
                                                        padding: '0.8rem',
                                                        cursor: 'pointer',
                                                        borderRadius: '6px',
                                                        borderBottom: '1px solid var(--glass-border)',
                                                        background: customerName === name ? 'var(--primary-light)' : 'transparent'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontWeight: '700' }}>{name}</span>
                                                        <span style={{ fontSize: '0.65rem', background: '#e67e22', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>MAYOREO</span>
                                                    </div>
                                                    {typeof customer !== 'string' && (
                                                        <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{customer.phone}</div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    }

                                    {/* Mostrar Clientes Comunes */}
                                    {commonCustomers
                                        .filter(c => (typeof c === 'string' ? c : c.name).toLowerCase().includes(customerName.toLowerCase()))
                                        .map((customer, index) => {
                                            const name = typeof customer === 'string' ? customer : customer.name;
                                            return (
                                                <div
                                                    key={`cc-${index}`}
                                                    onClick={() => {
                                                        setCustomerName(name);
                                                        setShowSuggestions(false);
                                                    }}
                                                    style={{
                                                        padding: '0.8rem',
                                                        cursor: 'pointer',
                                                        borderRadius: '6px',
                                                        borderBottom: '1px solid var(--glass-border)',
                                                        background: customerName === name ? 'var(--primary-light)' : 'transparent'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontWeight: '600' }}>{name}</span>
                                                        <span style={{ fontSize: '0.65rem', background: '#3498db', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>COMÚN</span>
                                                    </div>
                                                    {typeof customer !== 'string' && (
                                                        <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{customer.phone}</div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    }

                                    {!isCustomerWholesale(customerName) && !isCustomerCommon(customerName) && (
                                        <div
                                            onClick={() => setShowRegisterCommon(true)}
                                            style={{ padding: '1rem', cursor: 'pointer', background: 'var(--primary-light)', borderRadius: '6px', textAlign: 'center', color: 'var(--primary)', fontWeight: '600' }}
                                        >
                                            + Registrar "{customerName}" como cliente común
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Registro Común */}
                        {showRegisterCommon && (
                            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, backdropFilter: 'blur(4px)' }}>
                                <div className="glass card" style={{ width: '350px', background: 'var(--background)' }}>
                                    <h3 style={{ marginBottom: '1.5rem' }}>Nuevo Cliente Común</h3>
                                    <p style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>Nombre: <strong>{customerName}</strong></p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <input
                                            type="tel"
                                            placeholder="Teléfono (Opcional)"
                                            value={newCommonData.phone}
                                            onChange={(e) => setNewCommonData({ ...newCommonData, phone: e.target.value })}
                                        />
                                        <input
                                            type="email"
                                            placeholder="Correo (Opcional)"
                                            value={newCommonData.email}
                                            onChange={(e) => setNewCommonData({ ...newCommonData, email: e.target.value })}
                                        />
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                            <button className="ghost" style={{ flex: 1 }} onClick={() => setShowRegisterCommon(false)}>Cancelar</button>
                                            <button style={{ flex: 1 }} onClick={() => {
                                                const trimmedName = customerName.trim();
                                                setCommonCustomers([...commonCustomers, {
                                                    name: trimmedName,
                                                    phone: newCommonData.phone.trim(),
                                                    email: newCommonData.email.trim()
                                                }]);
                                                setCustomerName(trimmedName);
                                                setShowRegisterCommon(false);
                                                setShowSuggestions(false);
                                                setNewCommonData({ phone: '', email: '' });
                                            }}>Guardar</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {cart.some(i => i.priceType === 'wholesale') && (
                            <p style={{
                                color: isCustomerWholesale(customerName) ? '#2ecc71' : (customerName ? '#d00' : '#e67e22'),
                                fontSize: '0.75rem',
                                marginTop: '0.4rem',
                                marginLeft: '0.2rem',
                                fontWeight: '600'
                            }}>
                                {customerName
                                    ? (isCustomerWholesale(customerName) ? '✓ Cliente autorizado para mayoreo' : '✗ Cliente NO registrado para mayoreo')
                                    : 'Por favor, ingresa el nombre para ventas de mayoreo.'
                                }
                            </p>
                        )}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem' }}>
                        {cart.length === 0 ? (
                            <div style={{ textAlign: 'center', marginTop: '4rem', opacity: 0.5 }}>
                                <p>El carrito está vacío</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {cart.map(item => (
                                    <div key={`${item.id}-${item.priceType}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.8rem', borderBottom: '1px solid var(--glass-border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <h4 style={{ fontSize: '0.95rem' }}>{item.name}</h4>
                                                <p style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.9rem', marginTop: '0.4rem' }}>
                                                    ${(getItemPrice(item) * item.cartQuantity).toFixed(2)}
                                                    <span style={{ fontSize: '0.7rem', opacity: 0.6, marginLeft: '0.5rem' }}>
                                                        ({item.priceType === 'wholesale' ? 'Mayoreo' : 'Menudeo'})
                                                    </span>
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <button className="ghost" onClick={() => updateQuantity(item.id, item.priceType, -1)} style={{ padding: '0.2rem' }}><Minus size={14} /></button>
                                                <span style={{ width: '2rem', textAlign: 'center', fontWeight: '600' }}>{item.cartQuantity}</span>
                                                <button className="ghost" onClick={() => updateQuantity(item.id, item.priceType, 1)} style={{ padding: '0.2rem' }}><Plus size={14} /></button>
                                                <button className="ghost" onClick={() => {
                                                    setCart(cart.filter(i => !(i.id === item.id && i.priceType === item.priceType)));
                                                }} style={{ padding: '0.2rem', color: '#d00', marginLeft: '0.5rem' }}><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '1.5rem 0', borderTop: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: '700' }}>
                            <span>Total</span>
                            <span style={{ color: 'var(--primary)' }}>${total.toFixed(2)}</span>
                        </div>
                        <button
                            onClick={finalizeSale}
                            disabled={cart.length === 0}
                            style={{
                                width: '100%',
                                padding: '1.2rem',
                                marginTop: '2rem',
                                fontSize: '1.1rem',
                                background: cart.length === 0 ? '#ccc' : (cart.some(i => i.priceType === 'wholesale') && !isCustomerWholesale(customerName) ? '#d00' : 'var(--primary)')
                            }}
                        >
                            Completar Venta
                        </button>
                    </div>
                </div>
            </div>

            {selectionProduct && createPortal(
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>

                        {/* Tarjeta capturable */}
                        <div ref={productCardRef} className="glass card" style={{
                            width: '600px',
                            padding: '0',
                            position: 'relative',
                            background: 'var(--background)',
                            display: 'flex',
                            overflow: 'hidden',
                            borderRadius: '24px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                        }}>
                            <button className="ghost" onClick={() => setSelectionProduct(null)} style={{ position: 'absolute', right: '1rem', top: '1rem', zIndex: 10 }}><X size={20} /></button>

                            {/* Lado Izquierdo: Opciones */}
                            <div style={{ padding: '2.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <h2 style={{ marginBottom: '0.5rem', fontSize: '1.6rem' }}>¿Cómo será la venta?</h2>
                                <p style={{ marginBottom: '2rem', color: 'var(--primary)', fontWeight: '600', fontSize: '1.1rem' }}>{selectionProduct.name}</p>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <button
                                        onClick={() => confirmAddToCart(selectionProduct, 'retail')}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.6rem',
                                            padding: '1.5rem',
                                            borderRadius: '16px',
                                            border: '2px solid transparent',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <span style={{ fontSize: '0.85rem', fontWeight: '600', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Menudeo</span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: '800' }}>${selectionProduct.price.toFixed(2)}</span>
                                    </button>
                                    <button
                                        onClick={() => confirmAddToCart(selectionProduct, 'wholesale')}
                                        className="secondary"
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.6rem',
                                            padding: '1.5rem',
                                            borderRadius: '16px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <span style={{ fontSize: '0.85rem', fontWeight: '600', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mayoreo</span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: '800' }}>${selectionProduct.wholesalePrice.toFixed(2)}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Lado Derecho: Foto del Producto */}
                            <div style={{
                                width: '240px',
                                background: 'var(--accent)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderLeft: '1px solid var(--glass-border)',
                                position: 'relative',
                                minHeight: '240px'
                            }}>
                                {selectionProduct.image || localStorage.getItem(`img_${selectionProduct.id}`) ? (
                                    <img
                                        src={getImageUrl(selectionProduct.image, selectionProduct.id)}
                                        alt={selectionProduct.name}
                                        crossOrigin="anonymous"
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'contain',
                                            padding: '1rem',
                                            filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))'
                                        }}
                                    />
                                ) : (
                                    <div style={{ textAlign: 'center', opacity: 0.2 }}>
                                        <Package size={64} />
                                        <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Sin imagen</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Botón copiar FUERA de la tarjeta para no aparecer en la imagen */}
                        <button
                            onClick={copyProductImage}
                            disabled={copyingImage}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                padding: '0.8rem 2rem',
                                borderRadius: '50px',
                                background: copySuccess ? '#2ecc71' : 'rgba(255,255,255,0.15)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.3)',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                cursor: copyingImage ? 'wait' : 'pointer',
                                backdropFilter: 'blur(10px)',
                                transition: 'all 0.3s',
                                boxShadow: copySuccess ? '0 4px 20px rgba(46,204,113,0.4)' : 'none'
                            }}
                        >
                            <Copy size={18} />
                            {copyingImage ? 'Capturando...' : copySuccess ? '¡Copiado! Pega con Ctrl+V' : 'Copiar Imagen para Cotización'}
                        </button>

                        {/* Botón 2: Copiar con precio de mayoreo (captura la tarjeta visible) */}
                        <button
                            onClick={copyWholesaleImage}
                            disabled={copyingWholesale}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                padding: '0.8rem 2rem',
                                borderRadius: '50px',
                                background: copySuccessWholesale ? '#e67e22' : 'rgba(255,255,255,0.1)',
                                color: 'white',
                                border: '1px solid rgba(255,255,255,0.2)',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                cursor: copyingWholesale ? 'wait' : 'pointer',
                                backdropFilter: 'blur(10px)',
                                transition: 'all 0.3s',
                                boxShadow: copySuccessWholesale ? '0 4px 20px rgba(230,126,34,0.4)' : 'none'
                            }}
                        >
                            <Copy size={18} />
                            {copyingWholesale ? 'Capturando...' : copySuccessWholesale ? '¡Copiado! Pega con Ctrl+V' : 'Copia imagen con precio de mayoreo'}
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* Tarjeta verde oculta OFF-SCREEN — solo para capturar con html2canvas */}
            {selectionProduct && createPortal(
                <div
                    ref={quotationCardRef}
                    style={{
                        position: 'fixed',
                        top: '0',
                        left: '-9999px',
                        visibility: 'hidden',
                        width: '560px',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        fontFamily: 'Segoe UI, Arial, sans-serif',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        display: 'flex',
                        zIndex: -1
                    }}
                >
                    {/* Lado izquierdo verde */}
                    <div style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #1a7a3f 0%, #2ecc71 100%)',
                        padding: '2.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '1.5rem'
                    }}>
                        <div>
                            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.4rem' }}>
                                Precio de Menudeo
                            </p>
                            <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: '900', margin: 0, lineHeight: 1.2 }}>
                                {selectionProduct.name}
                            </h2>
                        </div>
                        <div style={{
                            background: 'rgba(255,255,255,0.15)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            padding: '1.5rem 2rem',
                            display: 'inline-block',
                            border: '1px solid rgba(255,255,255,0.3)'
                        }}>
                            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', margin: '0 0 0.3rem 0', fontWeight: '600' }}>PRECIO</p>
                            <p style={{ color: 'white', fontSize: '3rem', fontWeight: '900', margin: 0, lineHeight: 1 }}>
                                ${selectionProduct.price.toFixed(2)}
                            </p>
                        </div>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.25)', paddingTop: '1rem' }}>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', margin: 0 }}>
                                🌸 Florería · Cotización
                            </p>
                        </div>
                    </div>
                    {/* Lado derecho: imagen del producto */}
                    <div style={{
                        width: '220px',
                        background: '#f0faf4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                    }}>
                        {selectionProduct.image || localStorage.getItem(`img_${selectionProduct.id}`) ? (
                            <img
                                src={getImageUrl(selectionProduct.image, selectionProduct.id)}
                                alt={selectionProduct.name}
                                crossOrigin="anonymous"
                                style={{ width: '100%', height: '200px', objectFit: 'contain' }}
                            />
                        ) : (
                            <div style={{ textAlign: 'center', opacity: 0.3 }}>
                                <p style={{ fontSize: '3rem' }}>🌺</p>
                                <p style={{ fontSize: '0.8rem', color: '#666' }}>Sin imagen</p>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default POS;
