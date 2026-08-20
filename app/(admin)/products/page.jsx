'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminProductsPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        description: '',
        image: ''
    });

    useEffect(() => {
        fetchProducts();
    }, []);

    async function fetchProducts() {
        try {
            const res = await fetch('/api/admin/products');
            if (res.ok) {
                const data = await res.json();
                setProducts(data.products || []);
            }
        } catch (err) {
            console.error('Failed to fetch products:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setFormData({ name: '', price: '', description: '', image: '' });
                setShowForm(false);
                fetchProducts();
            }
        } catch (err) {
            console.error('Failed to create product:', err);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Are you sure?')) return;

        try {
            const res = await fetch(`/api/admin/products/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                fetchProducts();
            }
        } catch (err) {
            console.error('Failed to delete product:', err);
        }
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-bone">Products</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-gold text-ink font-semibold rounded hover:opacity-90"
                >
                    {showForm ? 'Cancel' : 'Add Product'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="mb-8 p-6 rounded border border-hairline" style={{ background: 'var(--color-ink-2)' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="Product Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="px-4 py-2 border border-hairline rounded bg-ink text-bone focus:outline-none focus:border-gold"
                        />
                        <input
                            type="number"
                            placeholder="Price"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            required
                            className="px-4 py-2 border border-hairline rounded bg-ink text-bone focus:outline-none focus:border-gold"
                        />
                        <textarea
                            placeholder="Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="col-span-2 px-4 py-2 border border-hairline rounded bg-ink text-bone focus:outline-none focus:border-gold"
                        />
                        <input
                            type="text"
                            placeholder="Image URL"
                            value={formData.image}
                            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                            className="col-span-2 px-4 py-2 border border-hairline rounded bg-ink text-bone focus:outline-none focus:border-gold"
                        />
                    </div>
                    <button
                        type="submit"
                        className="mt-4 px-4 py-2 bg-gold text-ink font-semibold rounded hover:opacity-90"
                    >
                        Create Product
                    </button>
                </form>
            )}

            {loading ? (
                <p className="text-muted">Loading...</p>
            ) : products.length === 0 ? (
                <p className="text-muted">No products yet</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product) => (
                        <div key={product.id} className="p-6 rounded border border-hairline" style={{ background: 'var(--color-ink-2)' }}>
                            {product.image && (
                                <img src={product.image} alt={product.name} className="w-full h-40 object-cover rounded mb-4" />
                            )}
                            <h3 className="font-bold text-bone mb-2">{product.name}</h3>
                            <p className="text-muted text-sm mb-3">{product.description}</p>
                            <p className="text-gold font-semibold mb-4">₪{product.price}</p>
                            <div className="flex gap-2">
                                <Link
                                    href={`/admin/products/${product.id}`}
                                    className="flex-1 px-3 py-2 text-center text-xs bg-ink border border-gold text-gold rounded hover:bg-gold hover:text-ink transition-colors"
                                >
                                    Edit
                                </Link>
                                <button
                                    onClick={() => handleDelete(product.id)}
                                    className="flex-1 px-3 py-2 text-xs bg-ink border border-red-700 text-red-700 rounded hover:bg-red-700 hover:text-white transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
