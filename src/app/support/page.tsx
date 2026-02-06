'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, MessageSquare, Package, RefreshCw, Shield, CreditCard, Send, Loader } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { toast } from 'sonner';
import Navigation from '@/components/NavBar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    orderNumber: '',
    issueType: '',
    description: '',
  });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      emailjs.init(process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '');

      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '',
        process.env.NEXT_PUBLIC_EMAILJS_SUPPORT_TEMPLATE_ID || '',
        {
          from_name: formData.name,
          from_email: formData.email,
          from_phone: formData.phone,
          order_number: formData.orderNumber,
          issue_type: formData.issueType,
          description: formData.description,
          to_name: 'Nusy Wears Support',
        }
      );

      toast.success('Request submitted successfully!', {
        description: 'Our support team will contact you within 24 hours.',
      });
      
      setFormData({
        name: '',
        email: '',
        phone: '',
        orderNumber: '',
        issueType: '',
        description: '',
      });
    } catch (err) {
      console.error('EmailJS error:', err);
      toast.error('Failed to submit support request', {
        description: 'Please try again or contact us via WhatsApp.',
      });
    } finally {
      setSending(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const supportCategories = [
    {
      icon: Package,
      title: 'Order Issues',
      description: 'Track orders, delivery status, or order modifications',
    },
    {
      icon: RefreshCw,
      title: 'Returns & Exchanges',
      description: 'Process returns or exchange products',
    },
    {
      icon: CreditCard,
      title: 'Payment Help',
      description: 'Payment problems or refund inquiries',
    },
    {
      icon: Shield,
      title: 'Product Quality',
      description: 'Report defects or quality concerns',
    },
  ];

  const faqs = [
    {
      question: 'How long does delivery take?',
      answer: 'Standard delivery within Lagos takes 2-3 business days. Other locations in Nigeria may take 4-7 business days. Express delivery options are available at checkout.',
    },
    {
      question: 'What is your return policy?',
      answer: 'We offer a 14-day return policy for unused products in original packaging. Customized lenses cannot be returned unless defective. Contact support to initiate a return.',
    },
    {
      question: 'How do I track my order?',
      answer: 'Visit our Track Order page and enter your order number and email address. You\'ll receive tracking updates via email and SMS.',
    },
    {
      question: 'Do you offer prescription lenses?',
      answer: 'Yes! We offer customized optical lenses. Select "Customized Optical Lens" when viewing a product, add your prescription details, and our team will provide a quote via WhatsApp.',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept payments via Paystack (card, bank transfer, USSD) and OPay. All payments are secure and encrypted.',
    },
    {
      question: 'Can I cancel or modify my order?',
      answer: 'Orders can be cancelled or modified within 2 hours of placement. After this, the order may have been processed. Contact support immediately for assistance.',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster richColors position="top-center" />
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/" className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" />
          Back to home
        </Link>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
            How Can We Help?
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get the support you need. Browse FAQs or submit a support request and we&apos;ll assist you promptly.
          </p>
        </div>

        {/* Support Categories */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {supportCategories.map((category, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                <category.icon className="w-6 h-6 text-[#1d4e89]" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{category.title}</h3>
              <p className="text-sm text-gray-600">{category.description}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {/* FAQs */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <HelpCircle className="w-6 h-6 text-[#1d4e89]" />
              <h2 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border-b border-gray-200 last:border-0">
                    <AccordionTrigger className="text-left font-semibold text-gray-900 hover:text-[#1d4e89] py-4">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600 pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>

          {/* Support Request Form */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="w-6 h-6 text-[#1d4e89]" />
              <h2 className="text-2xl font-bold text-gray-900">Submit a Support Request</h2>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+2348012345678"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="orderNumber">Order Number (if applicable)</Label>
                  <Input
                    id="orderNumber"
                    name="orderNumber"
                    type="text"
                    value={formData.orderNumber}
                    onChange={handleChange}
                    placeholder="ORD-123456"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="issueType">Issue Type *</Label>
                  <select
                    id="issueType"
                    name="issueType"
                    required
                    value={formData.issueType}
                    onChange={handleChange}
                    className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d4e89] focus:border-transparent"
                  >
                    <option value="">Select an issue type</option>
                    <option value="order">Order Issue</option>
                    <option value="delivery">Delivery Problem</option>
                    <option value="return">Return/Exchange</option>
                    <option value="payment">Payment Issue</option>
                    <option value="product">Product Quality</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="description">Describe Your Issue *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    required
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Please provide details about your issue..."
                    rows={5}
                    className="mt-2"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-[#1d4e89] hover:bg-[#15396b] text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Submit Request
                    </>
                  )}
                </Button>
              </form>

              {/* WhatsApp Alternative */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-3 text-center">Need immediate assistance?</p>
                <a
                  href="https://wa.me/2348082020919"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#25d366] text-white rounded-lg font-semibold hover:bg-[#21c45d] transition-colors"
                >
                  <MessageSquare className="w-5 h-5" />
                  Chat on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
