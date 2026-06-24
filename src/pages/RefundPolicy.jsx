import React from 'react';
import { motion } from 'framer-motion';

export default function RefundPolicy() {
    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-12 overflow-y-auto">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl mx-auto bg-card border border-border rounded-3xl shadow-xl p-8"
            >
                <h1 className="text-3xl font-black mb-6">Refund and Cancellation Policy</h1>
                <p className="text-muted-foreground mb-8">Last Updated: June 24, 2026</p>

                <div className="space-y-6 text-sm leading-relaxed">
                    <p>At Inventor-E, we want to ensure you are fully satisfied with our inventory management and POS services. Since we provide digital software as a service (SaaS), our refund policy is structured as follows:</p>

                    <h2 className="text-xl font-bold mt-8 mb-2">1. Subscription Cancellations</h2>
                    <p>You may cancel your subscription at any time through your account settings or by contacting our support team.</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>If you cancel your subscription, the cancellation will take effect at the end of your current paid billing cycle.</li>
                        <li>You will retain full access to your premium features until the cycle ends.</li>
                    </ul>

                    <h2 className="text-xl font-bold mt-8 mb-2">2. Refund Eligibility</h2>
                    <p>We offer a <strong>7-Day Money-Back Guarantee</strong> for all new subscription purchases.</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>If you are not satisfied with Inventor-E within the first 7 days of your initial purchase, you may request a full refund.</li>
                        <li><strong>Renewals:</strong> We do not offer automatic refunds for subscription renewals. It is your responsibility to cancel your subscription before the renewal date if you no longer wish to use the Service.</li>
                    </ul>

                    <h2 className="text-xl font-bold mt-8 mb-2">3. Non-Refundable Scenarios</h2>
                    <p>Refunds will <strong>not</strong> be provided in the following cases:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Requests made after the 7-day initial purchase period.</li>
                        <li>Prorated refunds for unused time within an active billing cycle after cancellation.</li>
                        <li>Account termination due to a violation of our Terms and Conditions.</li>
                    </ul>

                    <h2 className="text-xl font-bold mt-8 mb-2">4. How to Request a Refund</h2>
                    <p>To request a refund within the eligible 7-day period, please contact our support team with your account details and the reason for your request. Refunds will be processed back to the original payment method (e.g., Midtrans, Credit Card, Bank Transfer) within 5-10 business days.</p>

                    <h2 className="text-xl font-bold mt-8 mb-2">5. Contact Us</h2>
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
