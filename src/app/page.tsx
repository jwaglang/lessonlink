import Link from 'next/link';
import { BookOpenCheck, Star, Award, Users, Clock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LLButton } from '@/components/ll-button';
import { QuoteCarousel } from '@/components/quote-carousel';
import { ContactFAB } from '@/components/contact-modal';
import { HeroLogo } from '@/components/hero-logo';
import { DragonDork } from '@/components/dragon-dork';
import { NavBrand } from '@/components/nav-brand';

const DRAGONS = [
  { name: 'White Dragon', level: 'Pre-A1', ages: '5+', color: 'from-slate-200 to-slate-100', text: 'text-slate-700', description: 'First steps - sounds, alphabet, simple words. Learning feels like play.' },
  { name: 'Yellow Dragon', level: 'Pre-A1+', ages: '6–8', color: 'from-yellow-400 to-amber-300', text: 'text-yellow-900', description: 'Short phrases, greetings, personal details. Every "I did it!" celebrated.' },
  { name: 'Orange Dragon', level: 'A1', ages: '6–8', color: 'from-orange-400 to-amber-400', text: 'text-orange-900', description: 'Concrete vocabulary, routine situations, familiar topics explored freely.' },
  { name: 'Green Dragon', level: 'A2', ages: '6–8', color: 'from-green-400 to-emerald-300', text: 'text-green-900', description: 'Growing confidence - comprehension broadens, control increases.' },
  { name: 'Blue Dragon', level: 'A2+', ages: '8–11', color: 'from-blue-400 to-sky-300', text: 'text-blue-900', description: 'Independent exchanges, longer monologues, familiar topics with ease.' },
  { name: 'Purple Dragon', level: 'B1', ages: '8–11', color: 'from-purple-400 to-violet-300', text: 'text-purple-900', description: 'Complex sentences, unpredictable situations, full linguistic confidence.' },
];

const COURSES = [
  {
    title: 'Curious Explorers',
    subtitle: 'Solo English Classes',
    description: 'Personalized 1-on-1 lessons built around your child\'s passions. We unlock the door to their interests and use them as the gateway to fluency.',
    emoji: '🔍',
    badge: 'Most Popular',
  },
  {
    title: 'Kiddie Quests',
    subtitle: 'Group English Classes',
    description: 'Group expeditions in English for young learners. A communal adventure where kids motivate each other while building real fluency together.',
    emoji: '🗺️',
    badge: null,
  },
  {
    title: 'Bite-Sized Books',
    subtitle: 'Reading & Language Arts',
    description: 'What if reading were as addictive as video games? A fresh book every session, lifted off the page with high-energy gamified strategies.',
    emoji: '📚',
    badge: null,
  },
  {
    title: 'Captivating Chats',
    subtitle: 'Advanced Conversation (B1+)',
    description: 'For teens and advanced kids. Lively discussions on topics that matter to them - fluency through real conversation, not textbooks.',
    emoji: '💬',
    badge: 'Teens & Advanced',
  },
];

export default function KiddolandPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <NavBrand />
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <a href="#about" className="hover:text-primary transition-colors">About</a>
          <a href="#program" className="hover:text-primary transition-colors">Program</a>
          <a href="#courses" className="hover:text-primary transition-colors">Courses</a>
          <a href="#media" className="hover:text-primary transition-colors">Media</a>
        </div>
        <div className="flex items-center gap-2">
          <LLButton expandLeft flagsDown />
          <Link href="/login">
            <Button size="sm" variant="outline" className="border-primary/40 hover:border-primary">
              Login
            </Button>
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20">
        <HeroLogo />
        <h1 className="text-5xl md:text-7xl font-headline font-bold primary-gradient-text mb-4 leading-tight">
          Kiddoland
        </h1>
        <p className="text-2xl md:text-3xl font-headline text-muted-foreground mb-2">
          Not just <span className="text-primary font-bold">edu</span>cation,
        </p>
        <p className="text-2xl md:text-3xl font-headline primary-gradient-text font-bold mb-8">
          <span className="text-primary">in</span>spiration!
        </p>
        <p className="text-lg text-muted-foreground max-w-xl mb-10">
          Personalized English fluency lessons for kids, built around what they love.
          Where learning feels like an adventure.
        </p>
        <Link href="/login">
          <Button size="lg" className="text-lg px-8 py-6 font-headline">
            Book a Free Trial 🚀
          </Button>
        </Link>
        <a href="#about" className="mt-16 flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
          <span className="text-sm">Meet your teacher</span>
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </a>
      </section>

      {/* ── ABOUT JON ── */}
      <section id="about" className="py-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-headline font-bold mb-3">Meet Teacher Jon</h2>
          <p className="text-muted-foreground text-lg">Fluency Specialist · Certified Teacher · Native English speaker</p>
          <p className="text-muted-foreground/60 text-sm mt-1">Lisbon, Portugal</p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p className="text-foreground text-lg">
              I've spent 25 years helping kids fall in love with English - not by drilling grammar,
              but by following their curiosity into topics they actually care about.
            </p>
            <p>
              My approach is simple: find what fascinates your child and use it as the
              vehicle for language learning. The result? Kids who speak confidently
              because they've been having too much fun to notice they were learning.
            </p>
            <p>
              Every lesson, graded reader, and video in the Kiddoland curriculum is my own original work - built from scratch around how real kids I've taught actually learn. As a certified Cambridge Speaking Examiner, I've seen exactly what fluency looks like at all levels. Now I've built a program to get your child there.
            </p>
            <Link href="/login">
              <Button className="mt-4 font-headline">Book a Free Trial →</Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: <Users className="h-6 w-6" />, value: '5,000+', label: 'Students taught' },
              { icon: <Clock className="h-6 w-6" />, value: '25 yrs', label: 'Experience' },
              { icon: <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />, value: '5.0', label: 'Average Rating' },
              { icon: <Award className="h-6 w-6" />, value: '50,000+', label: 'Lessons completed' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-5 text-center">
                <div className="flex justify-center mb-2 text-primary">{stat.icon}</div>
                <div className="text-2xl font-bold font-headline primary-gradient-text">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
            <div className="col-span-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground space-y-1">
              <p>🎓 TESOL - Trinity College London (1998)</p>
              <p>🎭 BFA - New York University (1997)</p>
              <p>📋 Cambridge Speaking Examiner (2014-2020)</p>
              <p>📖 Curriculum Developer & Content Creator</p>
            </div>
          </div>
        </div>

        {/* Video */}
        <div className="mt-12 rounded-2xl overflow-hidden border border-border aspect-video">
          <iframe
            src="https://www.youtube.com/embed/OaB4ozR5Qmo"
            title="Teacher Jon profile video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>

        <QuoteCarousel />
      </section>

      {/* ── PROGRAM ── */}
      <section id="program" className="py-24 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-4">
            <h2 className="text-4xl font-headline font-bold mb-3">The Program</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Based on the CEFR framework and aligned with US Common Core - but with a twist.
              Learners choose their own topics and navigate freely, so motivation never runs out.
            </p>
          </div>

          {/* Cyclical Learning */}
          <div className="grid md:grid-cols-4 gap-4 mb-16 mt-12">
            {[
              { step: 'Learn', desc: 'Language targets introduced through songs, videos, and games.', emoji: '🎵' },
              { step: 'Engage', desc: 'Deeper exploration through discussions, searches, and gamified activities.', emoji: '🔎' },
              { step: 'Activate', desc: 'Knowledge applied through graded readers or a mini presentation.', emoji: '🎤' },
              { step: 'Explore', desc: 'Independent project - craft, research, or creative challenge.', emoji: '🚀' },
            ].map((phase, i) => (
              <div key={phase.step} className="rounded-xl border border-border bg-card p-5 text-center relative">
                <div className="text-3xl mb-3">{phase.emoji}</div>
                <div className="font-headline font-bold text-lg mb-2">{phase.step}</div>
                <div className="text-sm text-muted-foreground">{phase.desc}</div>
                {i < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 text-muted-foreground text-lg z-10">→</div>
                )}
              </div>
            ))}
          </div>

          {/* Dragon Levels */}
          <h3 className="text-2xl font-headline font-bold text-center mb-8 flex items-center justify-center gap-2">Enter the Dragon <DragonDork /></h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DRAGONS.map((dragon) => (
              <div key={dragon.name} className={`rounded-xl bg-gradient-to-br ${dragon.color} p-5`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-headline font-bold text-lg ${dragon.text}`}>{dragon.name}</span>
                  <span className={`text-xs font-mono font-bold ${dragon.text} opacity-70`}>{dragon.level}</span>
                </div>
                <div className={`text-xs font-medium mb-2 ${dragon.text} opacity-60`}>Ages {dragon.ages}</div>
                <p className={`text-sm ${dragon.text} opacity-80`}>{dragon.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COURSES ── */}
      <section id="courses" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-headline font-bold mb-3">Courses</h2>
            <p className="text-muted-foreground text-lg">Something for every kind of learner.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {COURSES.map((course) => (
              <div key={course.title} className="rounded-xl border border-border bg-card p-6 flex flex-col gap-3 relative">
                {course.badge && (
                  <span className="absolute top-4 right-4 text-xs font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-full border border-primary/30">
                    {course.badge}
                  </span>
                )}
                <div className="text-4xl">{course.emoji}</div>
                <div>
                  <h3 className="font-headline font-bold text-xl">{course.title}</h3>
                  <p className="text-sm text-primary font-medium">{course.subtitle}</p>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{course.description}</p>
                <Link href="/login" className="mt-auto">
                  <Button variant="outline" size="sm" className="border-primary/30 hover:border-primary">
                    Book a Trial →
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MEDIA ── */}
      <section id="media" className="py-24 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-headline font-bold mb-3">Free Content</h2>
            <p className="text-muted-foreground text-lg">Videos, podcasts and more - completely free.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { img: '/FIF.png', title: 'Phonics in a Flash', desc: 'Hilarious shorts covering the entire English phonics system with Dork & Larry.' },
              { img: '/FunVentures.png', title: 'FunVentures with Larry', desc: 'Curiosity videos about amazing topics from around the world.' },
              { img: '/KiddieQuests.png', title: 'Kiddie Quests', desc: 'Group English adventures - stories, quests, and language fun.' },
              { img: '/OUP.png', title: 'Once Upon A Pillow', desc: 'Original ESL podcast for kids - stories for listening and learning English.' },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-card p-5 flex flex-col items-center text-center gap-3">
                <div className="h-20 flex items-center justify-center">
                  <img src={item.img} alt={item.title} className="max-h-full max-w-full object-contain" />
                </div>
                <h3 className="font-headline font-bold text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <img src="/Logo Star Big.png" alt="Dork" className="w-20 h-20 object-contain mx-auto mb-6" />
          <h2 className="text-4xl font-headline font-bold mb-4 primary-gradient-text">
            Ready to start the adventure?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            First trial lesson is on us. No commitment, no pressure - just a fun class to see if it's the right fit.
          </p>
          <Link href="/login">
            <Button size="lg" className="text-lg px-10 py-6 font-headline">
              Book Your Free Trial 🚀
            </Button>
          </Link>
        </div>
      </section>

      <ContactFAB />

      {/* ── FOOTER ── */}
      <footer className="border-t border-border py-8 px-6 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src="/Logo Star Big.png" alt="Dork" className="w-6 h-6 object-contain" />
          <span className="font-headline font-bold">Kiddoland</span>
        </div>
        <p>Powered by <Link href="/login" className="text-primary hover:underline">LessonLink</Link> · Teacher Jon · Lisbon, Portugal</p>
      </footer>
    </div>
  );
}
