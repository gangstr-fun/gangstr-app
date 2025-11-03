"use client";

import React from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { 
  Bot, 
  TrendingUp, 
  Search, 
  Target, 
  BarChart3, 
  Shield, 
  Zap, 
  ArrowRight,
  ChevronLeft
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

/**
 * Pro Mode Landing Page - Gateway to advanced features
 * Shows all the professional tools and AI-powered features
 */
export default function ProModePage() {
  const { login, authenticated } = usePrivy();
  const router = useRouter();

  const handleGetStarted = async () => {
    if (!authenticated) {
      await login();
    } else {
      router.push('/pro/agent');
    }
  };

  const features = [
    {
      icon: Bot,
      title: "AI Agent Chat",
      description: "Interact with our advanced AI agent for personalized DeFi strategies and portfolio management.",
      href: "/pro/agent/chat",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      icon: BarChart3,
      title: "Portfolio Analytics",
      description: "Deep dive into your portfolio performance with advanced analytics and risk assessment.",
      href: "/pro/portfolio",
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      icon: Search,
      title: "On-Chain Research",
      description: "Access comprehensive research tools and market intelligence for informed decision making.",
      href: "/pro/research",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      icon: Target,
      title: "Strategy Builder",
      description: "Create and backtest custom DeFi strategies with our advanced strategy builder.",
      href: "/pro/strategy",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    },
    {
      icon: TrendingUp,
      title: "Risk Assessment",
      description: "Comprehensive risk analysis and portfolio optimization recommendations.",
      href: "/pro/research/risk-assessment",
      color: "text-red-500",
      bgColor: "bg-red-500/10"
    },
    {
      icon: Zap,
      title: "Agent Configuration",
      description: "Fine-tune your AI agent's behavior and risk preferences for optimal performance.",
      href: "/pro/agent/configure",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href="/dashboard" 
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={20} />
              <span>Back to Basic</span>
            </Link>
            <div className="w-px h-6 bg-border"></div>
            <Link href="/pro" className="flex items-center space-x-2">
              <Image src="/new-logo.svg" alt="Gangstr" width={32} height={32} />
              <span className="text-xl font-semibold text-foreground">Gangstr Pro</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {authenticated ? (
              <Link href="/pro/agent">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Enter Pro Mode
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
            ) : (
              <Button 
                onClick={handleGetStarted}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Get Started
                <ArrowRight size={16} className="ml-2" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Shield size={16} />
              <span>Professional DeFi Tools</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Unlock the full power of{" "}
              <span className="text-primary">AI-driven DeFi</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Access advanced portfolio analytics, AI-powered research, custom strategy building, 
              and comprehensive risk assessment tools designed for serious DeFi investors.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {authenticated ? 'Enter Pro Mode' : 'Get Started'}
                <ArrowRight size={20} className="ml-2" />
              </Button>
              
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-4 text-lg font-semibold rounded-xl border-2 hover:bg-muted/50 transition-all duration-200"
                >
                  Try Basic Mode
                </Button>
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">
              Professional Features
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <Link key={index} href={authenticated ? feature.href : '#'} className="group">
                    <GlassPanel className="p-6 h-full hover:shadow-lg transition-all duration-200 group-hover:scale-105">
                      <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                        <IconComponent className={feature.color} size={24} />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {feature.description}
                      </p>
                      <div className="flex items-center mt-4 text-primary text-sm font-medium">
                        <span>Learn more</span>
                        <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </GlassPanel>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Comparison Section */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">
              Basic vs Pro Mode
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Basic Mode */}
              <GlassPanel className="p-8">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="text-green-500" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Basic Mode</h3>
                  <p className="text-muted-foreground">Simple, automated yield optimization</p>
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Automatic vault selection</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Daily optimization</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Simple dashboard</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>One-click top-up</span>
                  </li>
                </ul>
              </GlassPanel>

              {/* Pro Mode */}
              <GlassPanel className="p-8 border-2 border-primary/20">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="text-primary" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Pro Mode</h3>
                  <p className="text-muted-foreground">Advanced tools for serious investors</p>
                </div>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>AI agent consultation</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Advanced portfolio analytics</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Custom strategy building</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>On-chain research tools</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Risk assessment & optimization</span>
                  </li>
                </ul>
              </GlassPanel>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Image src="/new-logo.svg" alt="Gangstr" width={24} height={24} />
              <span className="text-sm text-muted-foreground">© 2025 Gangstr Pro. All rights reserved.</span>
            </div>
            <div className="flex space-x-6">
              <Link href="/support" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Support
              </Link>
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Basic Mode
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}