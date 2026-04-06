'use client';

import { useEffect, useState } from 'react';

import { 
  Mic, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  ArrowRight, 
  Zap, 
  Target, 
  Gauge,
  Layers,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function LandingContent() {
  const [platform, setPlatform] = useState<'android' | 'ios' | 'huawei' | 'desktop'>('desktop');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const ua = navigator.userAgent.toLowerCase();
      let newPlatform: 'android' | 'ios' | 'huawei' | 'desktop' = 'desktop';
      if (ua.includes('huawei') || ua.includes('harmonyos') || ua.includes('appgallery')) {
        newPlatform = 'huawei';
      } else if (/android/i.test(ua)) {
        newPlatform = 'android';
      } else if (/ipad|iphone|ipod/.test(ua)) {
        newPlatform = 'ios';
      }
      setPlatform(newPlatform);
      setIsClient(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="mesh-bg relative min-h-screen overflow-x-hidden font-sans text-slate-900 selection:bg-blue-500/30 dark:text-slate-100">
      <div className="noise-overlay" />
      
      {/* Navigation */}
      <nav className="glass sticky top-0 z-50 border-b border-white/20 px-6 py-4 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg bg-blue-600 shadow-lg shadow-blue-500/50 transition-transform group-hover:scale-110">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-blue-400" />
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">S</div>
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400">SILHOUETTE</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="hover:text-blue-500 transition-colors">Funzionalità</a>
            <a href="#innovation" className="hover:text-blue-500 transition-colors">Innovazione</a>
            <a href="#benefits" className="hover:text-blue-500 transition-colors">Vantaggi</a>
            <Link href="/sign-in" className="glass rounded-full px-5 py-2 hover:bg-white/40 transition-all border-white/50">
              Accedi
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative px-6 pt-20 pb-32 md:pt-32">
          <div className="mx-auto max-w-7xl grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 backdrop-blur-sm">
                <Sparkles size={14} />
                <span>Il primo CRM Vocale per il Retail</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
                Governa il tuo <br />
                <span className="text-blue-600 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">Business</span> con la <br />
                tua <span className="underline decoration-blue-500/30">Voce</span>.
              </h1>
              
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
                Silhouette trasforma il magazzino in un assistente decisionale. Più velocità, meno errori, più profitto. Ideale per boutique che puntano all&apos;eccellenza tecnologica.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link 
                  href="/sign-up" 
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 font-bold text-white shadow-xl shadow-blue-600/30 hover:bg-blue-700 transition-all hover:-translate-y-1 active:translate-y-0"
                >
                  Inizia ora gratuito <ArrowRight size={18} />
                </Link>
                <a 
                  href="#features" 
                  className="glass inline-flex items-center justify-center gap-2 rounded-2xl px-8 py-4 font-bold hover:bg-white/40 transition-all border-white/50"
                >
                  Scopri di più
                </a>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 rounded-[40px] blur-3xl" />
              <div className="glass relative overflow-hidden rounded-[32px] border-white/40 shadow-2xl transition-transform hover:scale-[1.02] duration-700">
                <Image 
                  src="/silhouette-hero.png" 
                  alt="Silhouette Dashboard" 
                  width={1000}
                  height={800}
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
              </div>
              
              {/* Floating Element */}
              <div className="glass absolute -bottom-6 -left-6 rounded-2xl p-4 shadow-xl border-white/60">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-slate-200" />
                    ))}
                  </div>
                  <div className="text-xs">
                    <p className="font-bold">+400 Esercenti</p>
                    <p className="text-slate-500">Già a bordo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="bg-white/30 py-24 backdrop-blur-md dark:bg-slate-900/30">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-16 text-center space-y-4">
              <h2 className="text-3xl font-bold md:text-5xl tracking-tight">Gestire non è mai stato così <span className="text-blue-600">fluido</span>.</h2>
              <p className="text-slate-600 dark:text-slate-400 mx-auto max-w-2xl text-lg">Tutto ciò di cui ha bisogno il tuo negozio, racchiuso in un&apos;interfaccia pensata per la massima velocità operativa.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { 
                  icon: <Package className="text-blue-500" />, 
                  title: "Giacenze Smart", 
                  desc: "Monitoraggio in tempo reale con alert per scorte basse e best-seller." 
                },
                { 
                  icon: <ShoppingCart className="text-indigo-500" />, 
                  title: "Proposte d&apos;Ordine", 
                  desc: "Sistema intelligente che genera ordini basandosi sull&apos;andamento vendite." 
                },
                { 
                  icon: <Zap className="text-amber-500" />, 
                  title: "Carico Rapido", 
                  desc: "Inserisci nuovi arrivi in pochi secondi con categorizzazione automatica." 
                },
                { 
                  icon: <BarChart3 className="text-emerald-500" />, 
                  title: "Analytics Power", 
                  desc: "Margini, tendenze e report giornalieri in splendide grafiche." 
                }
              ].map((f, i) => (
                <div key={i} className="glass group rounded-3xl p-8 border-white/40 shadow-sm hover:shadow-xl transition-all hover:-translate-y-2">
                  <div className="mb-6 h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-md dark:bg-slate-800">
                    {f.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Voice Innovation Section */}
        <section id="innovation" className="relative px-6 py-32 overflow-hidden">
          <div className="mx-auto max-w-7xl grid md:grid-cols-2 gap-20 items-center">
            <div className="order-2 md:order-1 relative">
              <div className="glass aspect-square rounded-full flex items-center justify-center p-12 border-blue-500/20 shadow-inner">
                <div className="relative w-full h-full">
                  {/* Waveform Visualization */}
                  <div className="absolute inset-0 flex items-center justify-center gap-1.5">
                    {[1,2,3,4,5,6,7,8,7,6,5,4,3,2,1].map((h, i) => (
                      <div 
                        key={i} 
                        className="w-1.5 rounded-full bg-blue-500 animate-pulse"
                        style={{ height: `${h * 10}%` }}
                      />
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-24 w-24 rounded-full bg-blue-600/10 flex items-center justify-center border border-blue-500/30">
                      <Mic className="text-blue-600 animate-pulse" size={40} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="glass absolute -top-4 -right-4 rounded-2xl p-3 text-[10px] font-bold shadow-lg border-white/60">
                &quot;Silhouette, giacenze Ray-Ban?&quot;
              </div>
              <div className="glass absolute bottom-12 -left-8 rounded-2xl p-3 text-[10px] font-bold shadow-lg border-white/60">
                &quot;Aggiunti 10 pezzi a magazzino.&quot;
              </div>
            </div>
            
            <div className="order-1 md:order-2 space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-600">
                <Zap size={14} />
                <span>La Vera Rivoluzione Locale</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight">Smetti di cliccare, <br /><span className="text-indigo-600">Inizia a parlare.</span></h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                L&apos;assistente vocale di Silhouette non è solo una funzione, è l&apos;interfaccia del futuro. Consulta dati complessi mentre servi un cliente o gestisci il magazzino a mani libere.
              </p>
              
              <ul className="space-y-4">
                {[
                  "Natural Language Processing in Italiano",
                  "Velocità Operativa aumentata del 60%",
                  "Interazione mani libere per magazzino",
                  "Consulente AI sempre al tuo fianco"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 font-medium">
                    <div className="h-5 w-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-600">
                      <ChevronRight size={14} strokeWidth={3} />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="bg-slate-900 py-32 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-600/10 blur-[120px] rounded-full" />
          <div className="mx-auto max-w-7xl px-6 relative z-10">
            <div className="grid md:grid-cols-2 gap-16">
              <div>
                <h2 className="text-4xl md:text-6xl font-bold mb-8">Vantaggi estremi <br /> per il tuo <span className="text-blue-500">Negozio.</span></h2>
                <p className="text-slate-400 leading-relaxed text-lg mb-12">
                  Abbiamo progettato Silhouette per l&apos;esercente che non vuole compromessi tra praticità e potenza. Il tuo business merita uno strumento alla sua altezza.
                </p>
                <div className="space-y-12">
                  {[
                    { 
                      icon: <Gauge className="text-blue-400" />, 
                      title: "Risparmio di Tempo", 
                      desc: "Dimentica la burocrazia lenta. Silhouette gestisce i dati alla velocità del parlato." 
                    },
                    { 
                      icon: <Target className="text-emerald-400" />, 
                      title: "Precisione Chirurgica", 
                      desc: "Riduzione drastica degli errori di magazzino grazie all&apos;assistente IA." 
                    },
                    { 
                      icon: <Layers className="text-purple-400" />, 
                      title: "Immagine di Brand", 
                      desc: "Utilizza la tecnologia più avanzata sul mercato e distinguiti dalla concorrenza." 
                    }
                  ].map((b, i) => (
                    <div key={i} className="flex gap-6">
                      <div className="h-14 w-14 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        {b.icon}
                      </div>
                      <div>
                        <h4 className="text-xl font-bold mb-2">{b.title}</h4>
                        <p className="text-slate-400 leading-relaxed">{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden md:block relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full animate-pulse" />
                <div className="relative border border-white/10 rounded-[40px] p-8 bg-slate-800/40 backdrop-blur-xl overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent" />
                  <div className="space-y-6">
                    <div className="h-4 w-1/3 bg-white/20 rounded-full" />
                    <div className="h-24 w-full bg-white/5 rounded-3xl" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-32 bg-white/5 rounded-3xl" />
                      <div className="h-32 bg-white/5 rounded-3xl" />
                    </div>
                    <div className="h-12 w-full bg-blue-600/20 rounded-2xl border border-blue-500/30 flex items-center justify-center">
                       <span className="text-blue-400 font-bold">Analisi Predittiva Attiva</span>
                    </div>
                  </div>
                  <div className="absolute -right-4 -bottom-4 h-32 w-32 bg-blue-600 rounded-full blur-[60px] group-hover:scale-150 transition-transform duration-1000" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6">
          <div className="mx-auto max-w-4xl glass rounded-[48px] p-12 md:p-20 text-center border-white/50 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -left-24 h-48 w-48 bg-blue-500/10 blur-[80px] rounded-full" />
            <div className="absolute -bottom-24 -right-24 h-48 w-48 bg-indigo-500/10 blur-[80px] rounded-full" />
            
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">Pronto ad evolvere?</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-xl mx-auto">
              Porta il tuo negozio nel futuro oggi stesso. Silhouette è il partner che stavi cercando per governare il tuo magazzino con eleganza.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {isClient && platform === 'android' ? (
                <Link 
                  href="/android-download" 
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-10 py-5 font-bold text-white shadow-2xl hover:bg-blue-700 transition-all hover:-translate-y-1"
                >
                  <ArrowRight size={20} />
                  Scarica per Android
                </Link>
              ) : isClient && platform === 'ios' ? (
                <button 
                  disabled
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-10 py-5 font-bold text-white/50 shadow-2xl cursor-not-allowed"
                >
                  Prossimamente su App Store
                </button>
              ) : isClient && platform === 'huawei' ? (
                <button 
                  disabled
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600/50 px-10 py-5 font-bold text-white/50 shadow-2xl cursor-not-allowed"
                >
                  Prossimamente su AppGallery
                </button>
              ) : (
                <Link 
                  href="/sign-up" 
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-10 py-5 font-bold text-white shadow-2xl hover:bg-black transition-all hover:-translate-y-1 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  Inizia ora gratuito <ArrowRight size={20} />
                </Link>
              )}

              {(!isClient || platform === 'desktop') && (
                <button className="glass inline-flex items-center justify-center gap-2 rounded-2xl px-10 py-5 font-bold border-white/60 hover:bg-white/40 transition-all">
                  Richiedi Demo
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-8">Nessuna carta di credito richiesta. Setup in 2 minuti.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 px-6 dark:border-slate-800">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-blue-600" />
            <span className="font-bold tracking-tight">SILHOUETTE</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-500">
            <a href="#" className="hover:text-blue-500">Privacy</a>
            <a href="#" className="hover:text-blue-500">Termini</a>
            <a href="#" className="hover:text-blue-500">Contatti</a>
          </div>
          <p className="text-xs text-slate-400">© 2026 Silhouette CRM. Made with Opencode Aesthetic.</p>
        </div>
      </footer>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}
