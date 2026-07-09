import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Camera, Search, X } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { copyImageToLocal } from '../hooks/useLocalDatabase';

const Inventory = ({ products, setProducts, settings }) => {
    const getImageUrl = (imagePath, productId) => {
        if (!imagePath) {
            // Si la nube no tiene ruta, buscamos en la memoria local de esta PC
            return localStorage.getItem(`img_${productId}`) || '';
        }

        if (imagePath === 'LOCAL_IMAGE') {
            return localStorage.getItem(`img_${productId}`) || '';
        }

        // Si ya es una URL web o Base64 directo (aunque intentaremos evitar Base64 en la nube)
        if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
            return imagePath;
        }

        // Si tiene el protocolo file:// (App de Escritorio)
        if (imagePath.startsWith('file:')) {
            const pathOnly = imagePath.replace(/^file:\/+/, '');
            return `file:///${pathOnly}`;
        }

        // Convertir ruta de Windows a URL de archivo funcional
        const cleanPath = imagePath.replace(/\\/g, '/');
        return `file:///${cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath}`;
    };

    const calculateRoundedPrice = (cost, percentage) => {
        if (!cost || isNaN(cost)) return 0;
        const rawPrice = cost * (1 + (percentage / 100));
        // Round up to the nearest 0 or 5
        return Math.ceil(rawPrice / 5) * 5;
    };

    const isElectron = /electron/i.test(navigator.userAgent);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        cost: '',
        price: '',
        wholesalePrice: '',
        quantity: '',
        image: '',
        category: 'Arreglos',
        details: ''
    });
    const [previewUrl, setPreviewUrl] = useState('');
    const [calcValue, setCalcValue] = useState('');

    const handleCalcClick = (val) => {
        if (val === '=') {
            try {
                // Evaluar de forma segura
                const result = eval(calcValue.replace(/x/g, '*'));
                // Redondear a 2 decimales para que no salgan números raros
                const formattedResult = Number(result.toFixed(2));
                setCalcValue(formattedResult.toString());
            } catch (e) {
                setCalcValue('Error');
                setTimeout(() => setCalcValue(''), 1000);
            }
        } else if (val === 'C') {
            setCalcValue('');
        } else {
            setCalcValue(prev => prev + val);
        }
    };

    const applyCalcToField = (field) => {
        if (!calcValue || calcValue === 'Error') return;
        setFormData(prev => ({ ...prev, [field]: calcValue }));
    };

    // Soporte para teclado en la calculadora
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isModalOpen) return;

            // Si el usuario está escribiendo en los campos del formulario, no capturamos los números
            const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

            const key = e.key;

            if (!isInputFocused) {
                if (/[0-9]/.test(key)) {
                    handleCalcClick(key);
                } else if (key === '+') {
                    handleCalcClick('+');
                } else if (key === '-') {
                    handleCalcClick('-');
                } else if (key === '*') {
                    handleCalcClick('x');
                } else if (key === '/') {
                    handleCalcClick('/');
                } else if (key === '.') {
                    handleCalcClick('.');
                } else if (key === 'Enter' || key === '=') {
                    e.preventDefault();
                    handleCalcClick('=');
                } else if (key === 'Backspace' || key.toLowerCase() === 'c') {
                    handleCalcClick('C');
                }
            } else {
                // Si está en un input y presiona Enter, evaluamos si es un campo de precio?
                // Mejor dejarlo así para no romper el flujo natural del formulario
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isModalOpen, calcValue]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };

            // Auto-calculate prices if cost changes
            if (name === 'cost') {
                const costNum = parseFloat(value);
                if (!isNaN(costNum)) {
                    newData.price = calculateRoundedPrice(costNum, settings.retailPercentage).toString();
                    newData.wholesalePrice = calculateRoundedPrice(costNum, settings.wholesalePercentage).toString();
                }
            }
            return newData;
        });
    };

    const [imageFile, setImageFile] = useState(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);

            // Siempre mostramos preview con Base64 mientras selecciona
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validación básica
        if (!formData.name.trim()) {
            alert("El nombre del producto es obligatorio");
            return;
        }

        setIsSaving(true);

        try {
            let imageForCloud = '';
            const productId = editingProduct ? editingProduct.id : Date.now().toString();

            // 1. GESTIÓN DE IMAGEN
            if (imageFile) {
                if (isElectron && imageFile.path) {
                    // En Electron: COPIAMOS el archivo a la carpeta de datos de la app
                    // Así la imagen persiste aunque el archivo original se mueva o borre
                    console.log("Copiando imagen a carpeta de datos...", imageFile.path);
                    const copiedPath = await copyImageToLocal(imageFile.path);
                    imageForCloud = copiedPath;
                    console.log("Imagen guardada permanentemente en:", copiedPath);
                } else {
                    // Si es Base64 (Navegador o sin ruta real), comprimimos y guardamos en localStorage
                    const options = { maxSizeMB: 0.1, maxWidthOrHeight: 600, useWebWorker: true };
                    try {
                        const compressedFile = await imageCompression(imageFile, options);
                        const base64 = await imageCompression.getDataUrlFromFile(compressedFile);
                        localStorage.setItem(`img_${productId}`, base64);
                        imageForCloud = 'LOCAL_IMAGE';
                    } catch (e) { console.error(e); }
                }
            } else if (previewUrl && !previewUrl.startsWith('data:')) {
                // Si ya hay una ruta de archivo guardada (no base64), la mantenemos
                imageForCloud = previewUrl;
            } else if (previewUrl && previewUrl.startsWith('data:')) {
                // Base64 existente
                imageForCloud = 'LOCAL_IMAGE';
                if (editingProduct) {
                    localStorage.setItem(`img_${editingProduct.id}`, previewUrl);
                }
            }

            // 2. Preparar el nuevo producto
            const productData = {
                id: productId,
                name: formData.name.trim(),
                cost: Number(formData.cost) || 0,
                price: Number(formData.price) || 0,
                wholesalePrice: Number(formData.wholesalePrice) || 0,
                quantity: Number(formData.quantity) || 0,
                category: formData.category,
                details: formData.details || '',
                image: imageForCloud
            };

            // 3. LIMPIEZA TOTAL: Quitamos cualquier Base64 viejo que esté pesando en otros productos
            // Esto es lo que quita el "Error de conexión" definitivamente
            const superCleanProducts = products.map(p => {
                let currentImg = p.image || '';
                if (currentImg.startsWith('data:')) {
                    // Lo movemos a local para no perderlo, pero lo quitamos de la nube
                    localStorage.setItem(`img_${p.id}`, currentImg);
                    currentImg = 'LOCAL_IMAGE';
                }
                return { ...p, image: currentImg };
            });

            // 4. Actualizar la lista en la nube
            let updatedList;
            if (editingProduct) {
                updatedList = superCleanProducts.map(p => p.id === productId ? productData : p);
            } else {
                updatedList = [...superCleanProducts, productData];
            }

            await setProducts(updatedList);
            closeModal();
        } catch (error) {
            console.error("FIREBASE ERROR:", error);
            alert("Error: Los datos aún son muy pesados. Intenta guardar el producto sin imagen una vez para limpiar la base de datos.");
        } finally {
            setIsSaving(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
        setImageFile(null);
        setPreviewUrl('');
        setFormData({ name: '', cost: '', price: '', wholesalePrice: '', quantity: '', image: '', category: 'Arreglos', details: '' });
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        setFormData({ ...product });
        setPreviewUrl(product.image || '');
        setIsModalOpen(true);
    };

    const deleteProduct = (id) => {
        if (window.confirm('¿Estás seguro de eliminar este producto?')) {
            setProducts(products.filter(p => p.id !== id));
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fade-in">
            {isModalOpen ? (
                <div style={{
                    maxWidth: '850px',
                    margin: '0 auto',
                    padding: '1.5rem',
                    animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', background: 'linear-gradient(to right, var(--primary), #a67c52)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                            </h2>
                        </div>
                        <button className="ghost" onClick={closeModal} style={{ borderRadius: '50px', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                            <X size={16} /> Cancelar
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                        {/* Formulario */}
                        <div className="glass" style={{ flex: 1.5, padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                {/* Sección Superior Compacta */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block', color: 'var(--primary)' }}>Nombre</label>
                                            <input
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="Ej: Ramo Imperial"
                                                style={{ padding: '0.7rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem', display: 'block', color: 'var(--primary)' }}>Categoría</label>
                                            <select name="category" value={formData.category} onChange={handleInputChange} style={{ padding: '0.7rem' }}>
                                                <option value="Arreglos">Arreglos</option>
                                                <option value="Flores Sueltas">Flores Sueltas</option>
                                                <option value="Plantas">Plantas</option>
                                                <option value="Accesorios">Accesorios</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{
                                            width: '100%',
                                            aspectRatio: '1',
                                            borderRadius: '12px',
                                            border: '2px dashed var(--primary-light)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            background: 'var(--background)',
                                            cursor: 'pointer'
                                        }} onClick={() => document.getElementById('fileInput').click()}>
                                            {previewUrl ? (
                                                <img src={getImageUrl(previewUrl, editingProduct?.id)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#f8f8f8' }} />
                                            ) : (
                                                <div style={{ opacity: 0.5 }}>
                                                    <Camera size={24} />
                                                    <p style={{ fontSize: '0.6rem' }}>Foto</p>
                                                </div>
                                            )}
                                            <input id="fileInput" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                                        </div>
                                    </div>
                                </div>

                                {/* Precios y Stock más juntos */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '1rem',
                                    background: 'rgba(212, 163, 115, 0.05)',
                                    padding: '1rem',
                                    borderRadius: '12px'
                                }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.3rem', display: 'block' }}>Costo ($)</label>
                                        <input name="cost" type="number" step="0.01" value={formData.cost} onChange={handleInputChange} required style={{ padding: '0.6rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.3rem', display: 'block' }}>Stock</label>
                                        <input name="quantity" type="number" value={formData.quantity} onChange={handleInputChange} required style={{ padding: '0.6rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.3rem', display: 'block', color: 'var(--primary)' }}>Venta Menudeo</label>
                                        <input name="price" type="number" step="0.01" value={formData.price} onChange={handleInputChange} required style={{ padding: '0.6rem', border: '1px solid var(--primary)' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.3rem', display: 'block', color: 'var(--primary)' }}>Venta Mayoreo</label>
                                        <input name="wholesalePrice" type="number" step="0.01" value={formData.wholesalePrice} onChange={handleInputChange} required style={{ padding: '0.6rem', border: '1px solid var(--primary)' }} />
                                    </div>
                                </div>

                                <div>
                                    <textarea
                                        name="details"
                                        value={formData.details}
                                        onChange={handleInputChange}
                                        placeholder="Notas adicionales..."
                                        style={{ width: '100%', minHeight: '60px', padding: '0.8rem', borderRadius: '8px', fontSize: '0.85rem' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button type="button" className="ghost" onClick={closeModal} style={{ flex: 1, padding: '0.8rem' }}>Volver</button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        style={{
                                            flex: 2,
                                            padding: '0.8rem',
                                            fontSize: '1rem',
                                            opacity: isSaving ? 0.7 : 1
                                        }}
                                    >
                                        {isSaving ? 'Guardando...' : editingProduct ? 'Actualizar' : 'Guardar Producto'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Calculadora a un costado */}
                        <div className="glass" style={{ flex: 1, padding: '1.2rem', borderRadius: '16px', background: 'rgba(0,0,0,0.1)', height: 'fit-content' }}>
                            <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', opacity: 0.7, textAlign: 'center' }}>Calculadora de Precios</h4>
                            <div style={{ background: 'white', borderRadius: '8px', padding: '1rem', marginBottom: '0.5rem', textAlign: 'right', fontSize: '1.2rem', fontWeight: '700', minHeight: '3rem', color: '#333', overflow: 'hidden' }}>
                                {calcValue || '0'}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginBottom: '1rem' }}>
                                <button type="button" onClick={() => applyCalcToField('quantity')} style={{ background: 'var(--secondary)', color: 'var(--text)', padding: '0.4rem', fontSize: '0.7rem' }}>
                                    En Stock
                                </button>
                                <button type="button" onClick={() => applyCalcToField('price')} style={{ background: 'var(--primary)', color: 'white', padding: '0.4rem', fontSize: '0.7rem' }}>
                                    En Menudeo
                                </button>
                                <button type="button" onClick={() => applyCalcToField('wholesalePrice')} style={{ background: 'var(--primary)', color: 'white', padding: '0.4rem', fontSize: '0.7rem' }}>
                                    En Mayoreo
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                {['7', '8', '9', '/', '4', '5', '6', 'x', '1', '2', '3', '-', 'C', '0', '.', '+', '='].map(btn => (
                                    <button
                                        key={btn}
                                        type="button"
                                        onClick={() => handleCalcClick(btn)}
                                        className={btn === '=' ? '' : 'ghost'}
                                        style={{
                                            padding: '0.8rem 0',
                                            fontSize: '1rem',
                                            borderRadius: '8px',
                                            gridColumn: btn === '=' ? 'span 4' : 'auto',
                                            background: btn === '=' ? 'var(--primary)' : (btn === 'C' ? '#ff8b8b33' : 'rgba(255,255,255,0.1)'),
                                            color: btn === 'C' ? '#d00' : (btn === '=' ? 'white' : 'var(--text)')
                                        }}
                                    >
                                        {btn}
                                    </button>
                                ))}
                            </div>

                            <p style={{ fontSize: '0.7rem', marginTop: '1rem', opacity: 0.5, textAlign: 'center' }}>Usa esta calculadora para sacar costos + % margen</p>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h1>Inventario</h1>
                        <button onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem', borderRadius: '50px' }}>
                            <Plus size={18} /> Nuevo Producto
                        </button>
                    </div>

                    <div className="glass card" style={{ marginBottom: '2rem', padding: '1rem', borderRadius: '50px' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '1.5rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <input
                                type="text"
                                placeholder="Escribe el nombre del producto..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '3.5rem', borderRadius: '40px', border: 'none', background: 'transparent' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {filteredProducts.map(product => (
                            <div key={product.id} className="glass card" style={{ borderRadius: '24px', overflow: 'hidden', padding: '0' }}>
                                <div style={{ height: '220px', overflow: 'hidden', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                    {product.image || localStorage.getItem(`img_${product.id}`) ? (
                                        <img
                                            src={getImageUrl(product.image, product.id)}
                                            alt={product.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'contain', background: 'rgba(0,0,0,0.03)' }}
                                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex'); }}
                                        />
                                    ) : (
                                        <Camera size={48} style={{ opacity: 0.2 }} />
                                    )}
                                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.9)', padding: '0.3rem 0.8rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)' }}>
                                        {product.category}
                                    </div>
                                </div>
                                <div style={{ padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <h3 style={{ fontSize: '1.1rem' }}>{product.name}</h3>
                                        <p style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--primary)' }}>${product.price ? product.price.toFixed(2) : '0.00'}</p>
                                    </div>
                                    <div style={{ marginTop: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '50px', background: product.quantity > 5 ? 'var(--primary-light)' : '#ff8b8b33', color: product.quantity > 5 ? 'var(--text)' : '#d00', fontWeight: '600' }}>
                                            Stock: {product.quantity}
                                        </span>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="ghost" onClick={() => openEditModal(product)} style={{ padding: '0.6rem', borderRadius: '12px' }}><Edit3 size={16} /></button>
                                            <button className="ghost" onClick={() => deleteProduct(product.id)} style={{ padding: '0.6rem', borderRadius: '12px', color: '#d00' }}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredProducts.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '5rem', opacity: 0.5 }}>
                                <p style={{ fontSize: '1.2rem' }}>No se encontraron productos en tu catálogo.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default Inventory;
