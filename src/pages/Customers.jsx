import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomerStore } from '../store/useCustomerStore';
import { useAuthStore } from '../store/useAuthStore';
import { Users, Plus, Phone, Mail, Search, Edit2, Trash2, X, Star, Loader2 } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { useSettingsStore } from '../store/useSettingsStore';
import { toast } from 'sonner';

export default function Customers() {
    const { customers, addCustomer, updateCustomer, deleteCustomer, isLoading, fetchCustomers } = useCustomerStore();
    const { storeId } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const { language } = useSettingsStore();

    // FIX #4: Fetch customers on mount (with storeId as dep to avoid race condition)
    useEffect(() => {
        if (storeId) fetchCustomers();
    }, [storeId]);

    // Form state
    const [formData, setFormData] = useState({ name: '', phone: '', email: '' });

    const filteredCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (c.phone && c.phone.includes(searchQuery))
    );

    const handleOpenModal = (customer = null) => {
        if (customer) {
            setEditingCustomer(customer);
            setFormData({ name: customer.name, phone: customer.phone || '', email: customer.email || '' });
        } else {
            setEditingCustomer(null);
            setFormData({ name: '', phone: '', email: '' });
        }
        setIsModalOpen(true);
    };

    // FIX #11: Loading state on save to prevent double-submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingCustomer) {
                await updateCustomer(editingCustomer.id, formData);
                toast.success(language === 'en' ? 'Customer updated!' : 'Pelanggan diperbarui!');
            } else {
                await addCustomer(formData);
                toast.success(language === 'en' ? 'Customer added!' : 'Pelanggan ditambahkan!');
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error(err);
            toast.error(language === 'en' ? 'Error saving customer. Please try again.' : 'Gagal menyimpan pelanggan.');
        } finally {
            setIsSaving(false);
        }
    };

    // FIX #5: Replace window.confirm with Sonner action toast
    const handleDelete = (id, name) => {
        toast(`${language === 'en' ? 'Delete' : 'Hapus'} "${name}"?`, {
            action: {
                label: language === 'en' ? 'Delete' : 'Hapus',
                onClick: async () => {
                    try {
                        await deleteCustomer(id);
                        toast.success(language === 'en' ? 'Customer deleted.' : 'Pelanggan dihapus.');
                    } catch {
                        toast.error(language === 'en' ? 'Failed to delete customer.' : 'Gagal menghapus pelanggan.');
                    }
                },
            },
            cancel: { label: language === 'en' ? 'Cancel' : 'Batal', onClick: () => {} },
        });
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-24">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-black text-foreground flex items-center gap-3">
                        <Users className="text-primary" size={32} />
                        {language === 'en' ? 'Customers & Loyalty' : 'Pelanggan & Loyalitas'}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm font-medium">
                        {language === 'en' ? 'Manage your VIPs and track loyalty points.' : 'Kelola pelanggan VIP dan lacak poin loyalitas.'}
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md active:scale-95"
                >
                    <Plus size={20} />
                    {language === 'en' ? 'Add Customer' : 'Tambah Pelanggan'}
                </button>
            </div>

            <div className="bg-card rounded-2xl shadow-sm border border-border p-4">
                <div className="relative mb-6">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
                        <Search size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder={language === 'en' ? 'Search by name or phone...' : 'Cari nama atau nomor telepon...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
                    />
                </div>

                {isLoading ? (
                    <div className="py-12 flex justify-center text-primary"><div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin"></div></div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="py-16 flex flex-col items-center justify-center text-muted-foreground">
                        <Users size={48} className="opacity-20 mb-4" />
                        <h3 className="font-bold text-lg text-foreground">{language === 'en' ? 'No customers found' : 'Pelanggan tidak ditemukan'}</h3>
                        <p className="text-sm">{language === 'en' ? 'Add some to start tracking loyalty points.' : 'Tambahkan untuk mulai melacak poin loyalitas.'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="font-bold text-muted-foreground px-4 py-3 text-sm">{language === 'en' ? 'Name' : 'Nama'}</th>
                                    <th className="font-bold text-muted-foreground px-4 py-3 text-sm">{language === 'en' ? 'Contact' : 'Kontak'}</th>
                                    <th className="font-bold text-muted-foreground px-4 py-3 text-sm text-right">{language === 'en' ? 'Points' : 'Poin'}</th>
                                    <th className="font-bold text-muted-foreground px-4 py-3 text-sm text-right">{language === 'en' ? 'Total Spent' : 'Total Belanja'}</th>
                                    <th className="font-bold text-muted-foreground px-4 py-3 text-sm text-center">{language === 'en' ? 'Actions' : 'Aksi'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map(customer => (
                                    <tr key={customer.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-4 font-bold text-foreground">
                                            {customer.name}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col gap-1 text-sm">
                                                {customer.phone && <span className="flex items-center gap-1.5 text-muted-foreground"><Phone size={14}/> {customer.phone}</span>}
                                                {customer.email && <span className="flex items-center gap-1.5 text-muted-foreground"><Mail size={14}/> {customer.email}</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="inline-flex items-center gap-1.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-1 rounded-md font-bold text-sm">
                                                <Star size={14} className="fill-current" />
                                                {customer.points || 0}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right font-bold text-primary">
                                            {formatCurrency(customer.total_spent || 0)}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleOpenModal(customer)} className="p-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(customer.id, customer.name)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors">
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
                                <Users className="text-primary" />
                                {editingCustomer
                                    ? (language === 'en' ? 'Edit Customer' : 'Edit Pelanggan')
                                    : (language === 'en' ? 'Add New Customer' : 'Tambah Pelanggan Baru')
                                }
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-muted-foreground">{language === 'en' ? 'Full Name *' : 'Nama Lengkap *'}</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium text-sm"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-muted-foreground">{language === 'en' ? 'Phone Number' : 'Nomor Telepon'}</label>
                                    <input 
                                        type="tel" 
                                        value={formData.phone}
                                        onChange={e => setFormData({...formData, phone: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium text-sm"
                                        placeholder="+62 812 3456 7890"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-muted-foreground">Email</label>
                                    <input 
                                        type="email" 
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium text-sm"
                                        placeholder="john@example.com"
                                    />
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={isSaving}
                                    className="w-full py-3 mt-6 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
                                >
                                    {isSaving ? <><Loader2 size={18} className="animate-spin" /> {language === 'en' ? 'Saving...' : 'Menyimpan...'}</> : (editingCustomer ? (language === 'en' ? 'Save Changes' : 'Simpan Perubahan') : (language === 'en' ? 'Create Customer' : 'Buat Pelanggan'))}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
