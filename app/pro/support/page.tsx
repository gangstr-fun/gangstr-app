"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, Search, Mail, Phone, MessageSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";

const faqs = [
  {
    question: "How do I connect my wallet?",
    answer:
      "To connect your wallet, navigate to the portfolio page and click on the 'Connect Wallet' button. Follow the on-screen instructions to select your wallet provider and authorize the connection.",
  },
  {
    question: "How can I create an agent?",
    answer:
      "You can create an agent from the 'Agents' page. Click on 'Create Agent', define its parameters, and deploy it to start automating your strategies.",
  },
  {
    question: "Where can I see my transaction history?",
    answer:
      "Your transaction history is available on the 'Portfolio' page, under the 'Transactions' tab. It displays a detailed list of all your past transactions.",
  },
  {
    question: "What is risk assessment?",
    answer:
      "Risk assessment is a feature that analyzes your portfolio and provides insights into its risk profile, helping you make more informed investment decisions.",
  },
];

export default function SupportPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSupportFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.success("Your support request has been submitted successfully!");
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        <header className="text-center space-y-2">
          <HelpCircle className="w-12 h-12 mx-auto text-[rgb(210,113,254)]" />
          <h1 className="text-4xl font-normal tracking-tight">
            Support Center
          </h1>
          <p className="text-gray-400">How can we help you?</p>
        </header>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Search for help articles..."
            className="w-full bg-gray-900 border-gray-800 pl-10 py-3 text-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* FAQ Section */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-gray-300">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact Us Section */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
            <CardDescription>
              Still need help? Get in touch with our team.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-8">
            {/* Contact Form */}
            <form className="space-y-4" onSubmit={handleSupportFormSubmit}>
              <Input
                type="email"
                placeholder="Your Email"
                className="bg-gray-800 border-gray-700"
                required
              />
              <Textarea
                placeholder="Describe your issue..."
                className="bg-gray-800 border-gray-700"
                rows={5}
                required
              />
              <Button type="submit" className="w-full">
                Send Message
              </Button>
            </form>

            {/* Contact Channels */}
            <div className="space-y-4">
              <Link href="mailto:support@stratifi.com">
                <div className="flex items-center space-x-3 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                  <Mail className="w-6 h-6 text-[rgb(210,113,254)]" />
                  <div>
                    <p className="font-semibold">Email Support</p>
                    <p className="text-sm text-gray-400">
                      support@stratifi.com
                    </p>
                  </div>
                </div>
              </Link>
              <Link href="#">
                <div className="flex items-center space-x-3 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                  <Phone className="w-6 h-6 text-[rgb(210,113,254)]" />
                  <div>
                    <p className="font-semibold">Phone Support</p>
                    <p className="text-sm text-gray-400">
                      (555) 123-4567 (Mon-Fri, 9am-5pm)
                    </p>
                  </div>
                </div>
              </Link>
              <Link href="#">
                <div className="flex items-center space-x-3 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                  <MessageSquare className="w-6 h-6 text-[rgb(210,113,254)]" />
                  <div>
                    <p className="font-semibold">Live Chat</p>
                    <p className="text-sm text-gray-400">Chat with us live</p>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
