import React from 'react';
import { motion } from 'framer-motion';

export default function Terms() {
    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-12 overflow-y-auto">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl mx-auto bg-card border border-border rounded-3xl shadow-xl p-8"
            >
                <h1 className="text-3xl font-black mb-6">Terms and Conditions</h1>
                <p className="text-muted-foreground mb-8">Last Updated: June 24, 2026</p>

                <div className="space-y-6 text-sm leading-relaxed">
                    <p>Welcome to Inventor-E. These Terms and Conditions govern your use of the Inventor-E application, website, and services (collectively, the "Service"). By registering for an account or using our Service, you agree to be bound by these terms.</p>

                    <h2 className="text-xl font-bold mt-8 mb-2">1. Description of Service</h2>
                    <p>Inventor-E provides point-of-sale (POS) and inventory management software as a service (SaaS) for businesses. The Service is provided on a subscription basis.</p>

                    <h2 className="text-xl font-bold mt-8 mb-2">2. Account Registration and Security</h2>
                    <p>You must provide accurate and complete information when creating an account. You are responsible for safeguarding the password and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.</p>

                    <h2 className="text-xl font-bold mt-8 mb-2">3. Subscription Fees and Payments</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Billing:</strong> Services are billed on a subscription basis in advance.</li>
                        <li><strong>Payment Gateway:</strong> Payments are processed securely via third-party payment gateways (e.g., Midtrans). We do not store your full credit card information.</li>
                        <li><strong>Taxes:</strong> Subscription fees are exclusive of applicable taxes unless stated otherwise.</li>
                    </ul>

                    <h2 className="text-xl font-bold mt-8 mb-2">4. Acceptable Use</h2>
                    <p>You agree not to use the Service for any unlawful purpose, to infringe upon the rights of others, or to interfere with the operation of the Service.</p>

                    <h2 className="text-xl font-bold mt-8 mb-2">5. Data Privacy</h2>
                    <p>Your use of the Service is also governed by our Privacy Policy. You retain all rights to the data you input into the Service. We implement industry-standard security measures to protect your data but cannot guarantee absolute security.</p>

                    <h2 className="text-xl font-bold mt-8 mb-2">6. Contact Us</h2>
                    <p>If you have any questions about these Terms and Conditions, please contact us at:</p>
                    <ul className="list-none space-y-1 mt-2">
                        <li><strong>Email:</strong> doublejaxk@gmail.com</li>
                        <li><strong>Phone:</strong> +6287761267280</li>
                    </ul>
                </div>
                
                <div className="mt-10 pt-6 border-t border-border flex justify-center">
                    <button onClick={() => window.history.back()} className="px-6 py-2 bg-muted hover:bg-muted/80 rounded-xl font-semibold transition-colors">
                        Go Back
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
