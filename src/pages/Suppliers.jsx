import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupplierStore } from '../store/useSupplierStore';
import { Truck, Plus, Phone, Mail, Search, Edit2, Trash2, X, MapPin, Printer } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { generatePO } from '../utils/exportData';

export default function Suppliers() {
    const { suppliers, addSupplier, updateSupplier, deleteSupplier, fetchSuppliers, loading } = useSupplierStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const { language } = useSettingsStore();

    useEffect(() => {
        fetchSuppliers();
    }, []);

    // Form state
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '' });

    const filteredSuppliers = suppliers.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (s.phone && s.phone.includes(searchQuery))
    );

    const handleOpenModal = (supplier = null) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setFormData({ name: supplier.name, phone: supplier.phone || '', email: supplier.email || '', address: supplier.address || '' });
        } else {
            setEditingSupplier(null);
            setFormData({ name: '', phone: '', email: '', address: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingSupplier) {
                await updateSupplier(editingSupplier.id, formData);
            } else {
                await addSupplier(formData);
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error(err);
            alert('Error saving supplier');
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this supplier?')) {
            await deleteSupplier(id);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-24">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-black text-foreground flex items-center gap-3">
                        <Truck className="text-primary" size={32} />
                        {language === 'en' ? 'Suppliers' : 'Pemasok'}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">
                        {language === 'en' ? 'Manage your supply chain contacts.' : 'Kelola kontak rantai pasokan Anda.'}
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md active:scale-95"
                >
                    <Plus size={20} />
                    {language === 'en' ? 'Add Supplier' : 'Tambah Pemasok'}
                </button>
            </div>

            <div className="bg-card rounded-2xl shadow-sm border border-border p-4">
                <div className="relative mb-6">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                        <Search size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder={language === 'en' ? "Search by name or phone..." : "Cari berdasarkan nama atau telepon..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
                    />
                </div>

                {loading ? (
                    <div className="py-12 flex justify-center text-primary"><div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin"></div></div>
                ) : filteredSuppliers.length === 0 ? (
                    <div className="py-16 flex flex-col items-center justify-center text-muted-foreground">
                        <Truck size={48} className="opacity-20 mb-4" />
                        <h3 className="font-bold text-lg text-foreground">
                            {language === 'en' ? 'No suppliers found' : 'Tidak ada pemasok'}
                        </h3>
                        <p className="text-sm">
                            {language === 'en' ? 'Add some to start managing vendors.' : 'Tambahkan beberapa untuk mulai mengelola vendor.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="font-bold text-muted-foreground px-4 py-3 text-sm">Name</th>
                                    <th className="font-bold text-muted-foreground px-4 py-3 text-sm">Contact</th>
                                    <th className="font-bold text-muted-foreground px-4 py-3 text-sm">Address</th>
                                    <th className="font-bold text-muted-foreground px-4 py-3 text-sm text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSuppliers.map(supplier => (
                                    <tr key={supplier.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-4 font-bold text-foreground">
                                            {supplier.name}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col gap-1 text-sm">
                                                {supplier.phone && <span className="flex items-center gap-1.5 text-muted-foreground"><Phone size={14}/> {supplier.phone}</span>}
                                                {supplier.email && <span className="flex items-center gap-1.5 text-muted-foreground"><Mail size={14}/> {supplier.email}</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            {supplier.address ? (
                                                <span className="flex items-start gap-1.5 text-sm text-muted-foreground">
                                                    <MapPin size={14} className="mt-0.5 shrink-0" />
                                                    <span className="line-clamp-2">{supplier.address}</span>
                                                </span>
                                            ) : (
                                                <span className="text-sm text-muted-foreground opacity-50">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => generatePO(supplier, [], language)} 
                                                    className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg transition-colors border border-transparent hover:border-blue-500/20"
                                                    title={language === 'en' ? 'Generate PO' : 'Buat PO'}
                                                >
                                                    <Printer size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleOpenModal(supplier)} 
                                                    className="p-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors border border-transparent hover:border-border"
                                                    title={language === 'en' ? 'Edit' : 'Edit'}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(supplier.id)} 
                                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                                                    title={language === 'en' ? 'Delete' : 'Hapus'}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-card w-full max-w-md rounded-2xl p-6 shadow-xl border border-border relative"
                        >
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 bg-muted hover:bg-muted/80 rounded-full transition-colors text-muted-foreground">
                                <X size={20} />
                            </button>
                            
                            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                                <Truck className="text-primary" />
                                {editingSupplier ? (language==='en'?'Edit Supplier':'Edit Pemasok') : (language==='en'?'Add Supplier':'Tambah Pemasok')}
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-muted-foreground">Name *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium text-sm"
                                        placeholder="Vendor XYZ"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-muted-foreground">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        value={formData.phone}
                                        onChange={e => setFormData({...formData, phone: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium text-sm"
                                        placeholder="+1 234 567 890"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-muted-foreground">Email</label>
                                    <input 
                                        type="email" 
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium text-sm"
                                        placeholder="contact@vendor.com"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-muted-foreground">Address</label>
                                    <textarea 
                                        value={formData.address}
                                        onChange={e => setFormData({...formData, address: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium text-sm resize-none"
                                        placeholder="123 Warehouse St..."
                                        rows={3}
                                    />
                                </div>

                                <button 
                                    type="submit" 
                                    className="w-full py-3 mt-6 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
                                >
                                    {editingSupplier ? (language==='en'?'Save Changes':'Simpan Perubahan') : (language==='en'?'Add Supplier':'Tambah Pemasok')}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
