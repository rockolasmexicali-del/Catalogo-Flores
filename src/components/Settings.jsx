import React, { useState } from 'react';
import Email from '../utils/smtp';
import { Percent, Users, UserPlus, Trash2, Phone, Mail, FileText, Pencil, X, Printer, History, CheckCircle } from 'lucide-react';

const isElectron = typeof window !== 'undefined' && /electron/i.test(navigator.userAgent);

const Settings = ({ settings, setSettings, products, setProducts, wholesaleCustomers, setWholesaleCustomers, commonCustomers, setCommonCustomers, sales, setSales }) => {
    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
    const [historyCustomer, setHistoryCustomer] = useState(null);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [editType, setEditType] = useState(null); // 'wholesale' or 'common'

    // Memoria local para evitar que se borren letras al escribir (flickering de Firebase)
    const [localSettings, setLocalSettings] = useState(settings);

    // Actualizar memoria local si cambian los settings desde otro lugar
    React.useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    // Sincronizar cambios locales con la nube después de 1 segundo de inactividad
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (JSON.stringify(localSettings) !== JSON.stringify(settings)) {
                setSettings(localSettings);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [localSettings]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const numericFields = ['retailPercentage', 'wholesalePercentage'];
        setLocalSettings(prev => ({
            ...prev,
            [name]: numericFields.includes(name) ? (parseInt(value) || 0) : value
        }));
    };

    const addWholesaleCustomer = (e) => {
        e.preventDefault();
        if (!newCustomer.name.trim() || !newCustomer.phone.trim() || !newCustomer.email.trim()) {
            alert('Por favor, ingresa nombre, teléfono y correo electrónico.');
            return;
        }

        // Handle both old string format and new object format for duplication check
        if (isWholesaleName(newCustomer.name)) {
            alert('Este cliente ya está en la lista de mayoreo.');
            return;
        }

        setWholesaleCustomers([...wholesaleCustomers, {
            name: newCustomer.name.trim(),
            phone: newCustomer.phone.trim(),
            email: newCustomer.email.trim()
        }]);
        setNewCustomer({ name: '', phone: '', email: '' });
    };

    const isWholesaleName = (name) => {
        return wholesaleCustomers.some(c => {
            const targetName = typeof c === 'string' ? c : c.name;
            return targetName.trim().toLowerCase() === name.trim().toLowerCase();
        });
    };

    const isCommonName = (name) => {
        return commonCustomers.some(c => {
            const targetName = typeof c === 'string' ? c : c.name;
            return targetName.trim().toLowerCase() === name.trim().toLowerCase();
        });
    };

    const removeWholesaleCustomer = (customer) => {
        const name = typeof customer === 'string' ? customer : customer.name;
        if (window.confirm(`¿Eliminar a ${name} de los clientes de mayoreo?`)) {
            setWholesaleCustomers(wholesaleCustomers.filter(c => {
                const targetName = typeof c === 'string' ? c : c.name;
                return targetName !== name;
            }));
        }
    };

    const removeCommonCustomer = (customer) => {
        const name = typeof customer === 'string' ? customer : customer.name;
        if (window.confirm(`¿Eliminar a ${name} de los clientes comunes?`)) {
            setCommonCustomers(commonCustomers.filter(c => {
                const targetName = typeof c === 'string' ? c : c.name;
                return targetName !== name;
            }));
        }
    };

    const importToWholesale = async (customer) => {
        const name = typeof customer === 'string' ? customer : customer.name;
        const trimmedName = name.trim();

        if (isWholesaleName(trimmedName)) {
            alert('Este cliente ya es mayorista.');
            return;
        }

        if (window.confirm(`¿Promover a ${trimmedName} a cliente de mayoreo?`)) {
            const customerObj = typeof customer === 'string'
                ? { name: trimmedName, phone: '', email: '' }
                : { ...customer, name: trimmedName };

            // 1. Agregar a la lista de mayoristas
            await setWholesaleCustomers((prev) => [...prev, customerObj]);

            // 2. Quitar de la lista de clientes comunes
            await setCommonCustomers((prev) => prev.filter(c => {
                const targetName = typeof c === 'string' ? c : c.name;
                return targetName.trim().toLowerCase() !== trimmedName.toLowerCase();
            }));

            alert(`✅ ${trimmedName} ha sido promovido exitosamente.\n\nYa puedes buscarlo en la pantalla de ventas como cliente de mayoreo.`);
        }
    };

    const calculateRoundedPrice = (cost, percentage) => {
        if (!cost || isNaN(cost)) return 0;
        const rawPrice = cost * (1 + (percentage / 100));
        return Math.ceil(rawPrice / 5) * 5;
    };

    const recalculateAllPrices = () => {
        if (window.confirm('¿Deseas recalcular todos los precios de venta basados en los nuevos porcentajes? Esto sobrescribirá los precios actuales.')) {
            const updatedProducts = products.map(p => ({
                ...p,
                price: calculateRoundedPrice(p.cost, settings.retailPercentage),
                wholesalePrice: calculateRoundedPrice(p.cost, settings.wholesalePercentage)
            }));
            setProducts(updatedProducts);
            alert('Precios actualizados con éxito.');
        }
    };

    const updateCustomerProfile = (e) => {
        e.preventDefault();

        if (editType === 'wholesale') {
            setWholesaleCustomers(wholesaleCustomers.map(c => {
                const cName = typeof c === 'string' ? c : c.name;
                return cName === editingCustomer.originalName ? {
                    name: editingCustomer.name,
                    phone: editingCustomer.phone,
                    email: editingCustomer.email
                } : c;
            }));
        } else {
            setCommonCustomers(commonCustomers.map(c => {
                const cName = typeof c === 'string' ? c : c.name;
                return cName === editingCustomer.originalName ? {
                    name: editingCustomer.name,
                    phone: editingCustomer.phone,
                    email: editingCustomer.email
                } : c;
            }));
        }

        if (historyCustomer && historyCustomer.name === editingCustomer.originalName) {
            setHistoryCustomer({ ...editingCustomer });
        }

        setEditingCustomer(null);
        alert('Perfil actualizado con éxito.');
    };

    const deleteSale = (saleId) => {
        if (window.confirm('¿Estás seguro de eliminar esta venta? Esta acción devolverá los productos al inventario.')) {
            const saleToDelete = sales.find(s => s.id === saleId);

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
                    <p><strong>Folio:</strong> #${sale.id.slice(-4)} (REIMPRESIÓN)</p>
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

    return (
        <div className="fade-in">
            <h1 style={{ marginBottom: '2rem' }}>Configuración</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="glass card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                            <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '8px' }}>
                                <Percent size={20} />
                            </div>
                            <h2 style={{ fontSize: '1.2rem' }}>Márgenes de Ganancia</h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block', fontWeight: '500' }}>
                                    Porcentaje de Menudeo (%)
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        name="retailPercentage"
                                        value={localSettings.retailPercentage}
                                        onChange={handleInputChange}
                                        placeholder="Ej: 50"
                                    />
                                    <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>%</span>
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block', fontWeight: '500' }}>
                                    Porcentaje de Mayoreo (%)
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        name="wholesalePercentage"
                                        value={localSettings.wholesalePercentage}
                                        onChange={handleInputChange}
                                        placeholder="Ej: 30"
                                    />
                                    <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>%</span>
                                </div>
                            </div>

                            <button
                                onClick={recalculateAllPrices}
                                className="secondary"
                                style={{ marginTop: '1rem', width: '100%' }}
                            >
                                Recalcular todo el inventario
                            </button>
                        </div>
                    </div>

                    <div className="glass card" style={{ background: 'var(--primary-light)', borderColor: 'var(--primary)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Regla de Redondeo</h3>
                        <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                            El sistema aplica automáticamente una regla de redondeo "al 0 o 5 superior":
                        </p>
                        <ul style={{ fontSize: '0.9rem', marginTop: '1rem', marginLeft: '1.5rem', lineHeight: '1.8' }}>
                            <li>Si el costo + % da <strong>$161</strong>, sube a <strong>$165</strong></li>
                            <li>Si el costo + % da <strong>$162</strong>, sube a <strong>$165</strong></li>
                            <li>Si el costo + % da <strong>$166</strong>, sube a <strong>$170</strong></li>
                        </ul>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="glass card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                            <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '8px' }}>
                                <Users size={20} />
                            </div>
                            <h2 style={{ fontSize: '1.2rem' }}>Datos de la Empresa</h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div>
                                <label style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block' }}>Nombre de la Empresa</label>
                                <input
                                    name="businessName"
                                    value={localSettings.businessName || ''}
                                    onChange={handleInputChange}
                                    placeholder="Nombre que aparecerá en el ticket"
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block' }}>Dirección</label>
                                <input
                                    name="businessAddress"
                                    value={localSettings.businessAddress || ''}
                                    onChange={handleInputChange}
                                    placeholder="Calle, Número, Colonia..."
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block' }}>Teléfono</label>
                                    <input
                                        name="businessPhone"
                                        value={localSettings.businessPhone || ''}
                                        onChange={handleInputChange}
                                        placeholder="Número de contacto"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block' }}>Correo / Web</label>
                                    <input
                                        name="businessEmail"
                                        value={localSettings.businessEmail || ''}
                                        onChange={handleInputChange}
                                        placeholder="Ej: contacto@ejemplo.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass card" style={{ borderColor: 'var(--primary-light)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                            <div style={{ background: '#3498db22', color: '#3498db', padding: '0.5rem', borderRadius: '8px' }}>
                                <Mail size={20} />
                            </div>
                            <h2 style={{ fontSize: '1.2rem' }}>Configuración de Correo (SMTP Real)</h2>
                        </div>

                        <div style={{ background: '#3498db11', borderLeft: '4px solid #3498db', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                            <p style={{ fontSize: '0.85rem', color: '#2c3e50', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                Instrucciones SMTP:
                            </p>
                            <ul style={{ fontSize: '0.8rem', color: '#34495e', paddingLeft: '1.2rem', lineHeight: '1.4' }}>
                                <li>Usa tu servidor (ej: <strong>smtp.gmail.com</strong>).</li>
                                <li>Para Gmail, usa una <strong>Contraseña de Aplicación</strong>.</li>
                                <li>El puerto recomendado por defecto es el 587.</li>
                                <li>Asegúrate de que el Host acepte conexiones externas.</li>
                            </ul>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div>
                                <label style={{ fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Nombre del Remitente (Alias)</label>
                                <input
                                    name="smtpSenderName"
                                    value={localSettings.smtpSenderName || ''}
                                    onChange={handleInputChange}
                                    placeholder="Ej: Florería La Orquídea"
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Servidor SMTP (Host)</label>
                                <input
                                    name="smtpHost"
                                    value={localSettings.smtpHost || ''}
                                    onChange={handleInputChange}
                                    placeholder="ej: smtp.gmail.com"
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Usuario / Correo</label>
                                <input
                                    name="smtpUsername"
                                    value={localSettings.smtpUsername || ''}
                                    onChange={handleInputChange}
                                    placeholder="tu-correo@ejemplo.com"
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Contraseña (Pass)</label>
                                <input
                                    type="password"
                                    name="smtpPassword"
                                    value={localSettings.smtpPassword || ''}
                                    onChange={handleInputChange}
                                    placeholder="********"
                                />
                            </div>

                            <button
                                type="button"
                                className="secondary"
                                style={{ marginTop: '0.5rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}
                                onClick={() => {
                                    if (!localSettings.smtpHost || !localSettings.smtpUsername || !localSettings.smtpPassword) {
                                        alert('Por favor, rellena los campos SMTP antes de probar.');
                                        return;
                                    }

                                    const btn = document.activeElement;
                                    const originalText = btn.innerHTML;
                                    btn.innerHTML = '<span class="spin">⌛</span> Enviando prueba...';
                                    btn.disabled = true;

                                    Email.send({
                                        host: localSettings.smtpHost,
                                        username: localSettings.smtpUsername,
                                        password: localSettings.smtpPassword,
                                        to: localSettings.businessEmail || localSettings.smtpUsername,
                                        from: localSettings.smtpUsername,
                                        fromName: localSettings.smtpSenderName,
                                        subject: "Prueba de Conexión SMTP - " + (localSettings.businessName || "Florería App"),
                                        body: `
                                            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                                                <h1 style="color: #6d28d9;">¡Conexión Exitosa!</h1>
                                                <p>Hola, este es un correo de prueba de tu sistema <strong>${localSettings.businessName || "Florería App"}</strong>.</p>
                                                <p>Si recibiste esto, significa que tu configuración SMTP está funcionando correctamente.</p>
                                                <br/>
                                                <p style="font-size: 0.8rem; color: #999;">Enviado el: ${new Date().toLocaleString()}</p>
                                            </div>
                                        `
                                    }).then(message => {
                                        btn.innerHTML = originalText;
                                        btn.disabled = false;
                                        if (message === "OK") {
                                            alert('¡CONEXIÓN EXITOSA! Revisa tu bandeja de entrada.');
                                        } else {
                                            alert('ERROR: ' + message);
                                        }
                                    }).catch(err => {
                                        btn.innerHTML = originalText;
                                        btn.disabled = false;
                                        alert('ERROR CRÍTICO: ' + (err.message || err));
                                    });
                                }}
                            >
                                <CheckCircle size={16} /> Verificar y Probar SMTP
                            </button>
                        </div>

                        <div className="glass card" style={{ background: '#6d28d911', borderColor: 'var(--primary)', marginTop: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                                <div style={{ background: 'var(--primary)', color: 'white', padding: '0.5rem', borderRadius: '8px' }}>
                                    <History size={20} />
                                </div>
                                <h2 style={{ fontSize: '1.2rem' }}>Sincronización en la Nube</h2>
                            </div>
                            <p style={{ fontSize: '0.9rem', marginBottom: '1rem', opacity: 0.8 }}>
                                Administra tus datos en la nube de Firebase. Puedes subir tu inventario local o jalarlo para sincronizar esta computadora.
                            </p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <button
                                    className="primary"
                                    style={{ width: '100%', padding: '1rem' }}
                                    onClick={async () => {
                                        if (window.confirm('¿Quieres subir todos tus datos locales actuales a la nube? Esto combinará o reemplazará los datos remotos.')) {
                                            const btn = document.activeElement;
                                            const originalText = btn.innerHTML;
                                            btn.innerHTML = '<span class="spin">⌛</span> Subiendo datos a Firebase...';
                                            btn.disabled = true;

                                            try {
                                                const businessId = "negocio_floria_principal";
                                                const { db } = await import('../firebase');
                                                const { doc, setDoc } = await import('firebase/firestore');

                                                // Guardar todo en Firebase
                                                await setDoc(doc(db, 'inventory', businessId), { value: products });
                                                await setDoc(doc(db, 'sales', businessId), { value: sales });
                                                await setDoc(doc(db, 'settings', businessId), { value: settings });
                                                await setDoc(doc(db, 'wholesale_customers', businessId), { value: wholesaleCustomers });
                                                await setDoc(doc(db, 'common_customers', businessId), { value: commonCustomers });

                                                alert('¡Sincronización iniciada con éxito! Tus datos se han guardado en la nube. Ya puedes verlos en la versión Web.');
                                            } catch (err) {
                                                alert('Error al sincronizar: ' + err.message);
                                            } finally {
                                                btn.innerHTML = originalText;
                                                btn.disabled = false;
                                            }
                                        }
                                    }}
                                >
                                    Subir datos actuales a la nube
                                </button>


                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                        <div style={{ background: '#3498db22', color: '#3498db', padding: '0.5rem', borderRadius: '8px' }}>
                            <Users size={20} />
                        </div>
                        <h2 style={{ fontSize: '1.2rem' }}>Clientes Comunes</h2>
                    </div>

                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {commonCustomers.length === 0 ? (
                            <p style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>No hay clientes comunes registrados.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {commonCustomers.map((customer, index) => {
                                    const isObject = typeof customer !== 'string';
                                    const name = isObject ? customer.name : customer;
                                    const phone = isObject ? customer.phone : 'Sin teléfono';
                                    const email = isObject ? customer.email : 'Sin correo';

                                    return (
                                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: 'var(--glass)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: '600' }}>{name}</span>
                                                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{phone}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                <button
                                                    onClick={() => {
                                                        const name = isObject ? customer.name : customer;
                                                        setHistoryCustomer(isObject ? customer : { name, phone: '', email: '' });
                                                    }}
                                                    style={{ background: 'var(--primary)', padding: '0.4rem' }}
                                                    title="Ver Historial"
                                                >
                                                    <FileText size={14} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const name = isObject ? customer.name : customer;
                                                        setEditingCustomer(isObject ? { ...customer, originalName: name } : { name, phone: '', email: '', originalName: name });
                                                        setEditType('common');
                                                    }}
                                                    style={{ background: '#3498db', padding: '0.4rem' }}
                                                    title="Editar Perfil"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => importToWholesale(customer)}
                                                    style={{ background: '#e67e22', padding: '0.4rem' }}
                                                    title="Convertir a Mayorista"
                                                >
                                                    <UserPlus size={14} />
                                                </button>
                                                <button className="ghost" onClick={() => removeCommonCustomer(customer)} style={{ color: '#d00', padding: '0.4rem' }}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="glass card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                        <div style={{ background: '#e67e2222', color: '#e67e22', padding: '0.5rem', borderRadius: '8px' }}>
                            <Users size={20} />
                        </div>
                        <h2 style={{ fontSize: '1.2rem' }}>Base de Datos Mayoreo</h2>
                    </div>

                    <form onSubmit={addWholesaleCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' }}>
                        <input
                            type="text"
                            placeholder="Nombre completo..."
                            value={newCustomer.name}
                            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                        />
                        <div style={{ position: 'relative' }}>
                            <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <input
                                type="tel"
                                placeholder="Número de teléfono..."
                                value={newCustomer.phone}
                                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                style={{ paddingLeft: '3rem' }}
                            />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <input
                                type="email"
                                placeholder="Correo electrónico..."
                                value={newCustomer.email}
                                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                style={{ paddingLeft: '3rem' }}
                            />
                        </div>
                        <button type="submit" style={{ padding: '0.8rem', background: '#e67e22', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <UserPlus size={20} /> Registrar Cliente
                        </button>
                    </form>

                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {wholesaleCustomers.length === 0 ? (
                            <p style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>No hay clientes registrados.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {wholesaleCustomers.map((customer, index) => {
                                    const isObject = typeof customer !== 'string';
                                    const name = isObject ? customer.name : customer;
                                    const phone = isObject ? customer.phone : 'Sin teléfono';
                                    const email = isObject ? customer.email : 'Sin correo';

                                    return (
                                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: 'var(--glass)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: '600' }}>{name}</span>
                                                <span style={{ fontSize: '0.8rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <Phone size={12} /> {phone}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <Mail size={12} /> {email}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                <button
                                                    onClick={() => {
                                                        const name = isObject ? customer.name : customer;
                                                        setHistoryCustomer(isObject ? customer : { name, phone, email });
                                                    }}
                                                    style={{ background: 'var(--primary)', padding: '0.4rem' }}
                                                    title="Ver Historial"
                                                >
                                                    <FileText size={14} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const name = isObject ? customer.name : customer;
                                                        setEditingCustomer(isObject ? { ...customer, originalName: name } : { name, phone: '', email: '', originalName: name });
                                                        setEditType('wholesale');
                                                    }}
                                                    style={{ background: '#3498db', padding: '0.4rem' }}
                                                    title="Editar Perfil"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button className="ghost" onClick={() => removeWholesaleCustomer(customer)} style={{ color: '#d00', padding: '0.4rem' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Historial */}
            {historyCustomer && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
                    <div className="glass card" style={{ width: '90%', maxWidth: '800px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <History size={24} color="var(--primary)" />
                                <div>
                                    <h2 style={{ fontSize: '1.2rem' }}>Historial: {historyCustomer.name}</h2>
                                    <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>{historyCustomer.phone} • {historyCustomer.email}</p>
                                </div>
                            </div>
                            <button className="ghost" onClick={() => setHistoryCustomer(null)}><X size={24} /></button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                            {sales.filter(s => s.customerName.toLowerCase() === historyCustomer.name.toLowerCase()).length === 0 ? (
                                <p style={{ textAlign: 'center', opacity: 0.5, padding: '3rem' }}>No hay ventas registradas para este cliente.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {[...sales].filter(s => s.customerName.toLowerCase() === historyCustomer.name.toLowerCase()).reverse().map(sale => (
                                        <div key={sale.id} className="glass" style={{ padding: '1rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                                                <div>
                                                    <span style={{ fontWeight: '700', color: 'var(--primary)' }}>Folio: #{sale.id.slice(-6)}</span>
                                                    <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>{new Date(sale.date).toLocaleString()}</p>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{ fontSize: '1.1rem', fontWeight: '800' }}>${sale.total.toFixed(2)}</span>
                                                    {sale.items.some(i => i.priceType === 'wholesale') && (
                                                        <span style={{ display: 'block', fontSize: '0.65rem', background: '#e67e22', color: 'white', padding: '0.1rem 0.3rem', borderRadius: '4px', marginTop: '0.2rem' }}>MAYOREO</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ fontSize: '0.85rem', marginBottom: '1rem', opacity: 0.8 }}>
                                                {sale.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                                            </div>

                                            <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '0.8rem' }}>
                                                <button onClick={() => printReceipt(sale)} style={{ flex: 1, background: 'var(--secondary)', color: 'var(--text)', gap: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
                                                    <Printer size={16} /> Reimprimir
                                                </button>
                                                <button onClick={() => deleteSale(sale.id)} style={{ padding: '0.8rem', background: '#ffebeb', color: '#d00', border: 'none' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {editingCustomer && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 210, backdropFilter: 'blur(4px)' }}>
                    <div className="glass card" style={{ width: '400px', padding: '2rem', background: 'var(--background)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.2rem' }}>Editar Perfil</h2>
                            <button className="ghost" onClick={() => setEditingCustomer(null)}><X size={20} /></button>
                        </div>
                        <form onSubmit={updateCustomerProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div>
                                <label style={{ fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Nombre Completo</label>
                                <input
                                    type="text"
                                    value={editingCustomer.name}
                                    onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Teléfono</label>
                                <input
                                    type="tel"
                                    value={editingCustomer.phone}
                                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>Correo Electrónico</label>
                                <input
                                    type="email"
                                    value={editingCustomer.email}
                                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="ghost" style={{ flex: 1 }} onClick={() => setEditingCustomer(null)}>Cancelar</button>
                                <button type="submit" style={{ flex: 1 }}>Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
