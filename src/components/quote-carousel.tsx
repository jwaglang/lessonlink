'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Quote = { name: string; comment: string; translation?: string };

const QUOTES: Quote[] = [
  { name: 'Huiwei, Gordon\'s dad (60 lessons)', comment: "We have been learning with Teacher Jon for over a year. He has well developed teaching materials for students in different levels. He is always focused and energetic. And his class is well structured and interesting, especially young children." },
  { name: 'Daria, parent of Ilya (200 lessons)', comment: "I'm very grateful to Teacher Jon for his brilliant classes. My son 5,3 years old has started English lessons 5 months ago. It is his first experience to communicate with a person not speaking his mother tongue. The materials Teacher Jon provides are diverse, the tasks are always interesting. Teacher Jon has plenty of tricks to keep attention of my active boy and I really appreciate that English day by day becomes an essential part of my son's life." },
  { name: 'Luciana Mendes', comment: "Best teacher ever! Jon has an incredible empathy and didactic with children. My son loves taking classes with him. Lots of thanks, Jon!" },
  { name: 'Troy', comment: "Jon is the best teacher I have ever met! He is energetic all the time and pays lots of attention to kid's reaction. He changes his class style according to kid's reaction." },
  { name: 'Carayang', comment: "Jon is a good teacher who have made the class more interesting to get my son's attention. And he created the teaching contents by himself, which shows that he has his own ideas about teaching kids through his teaching experience all these years." },
  { name: 'Gabriel', comment: "Jon is an excellent teacher, he's very attentive and uses cool visual effects and games to keep kids engaged." },
  { name: 'vonderviszta', comment: "It was my son's trial lesson. Teacher Jon could make him laugh and at the same time taught him a lot of new things. We are fully satisfied! :)" },
  { name: "Zoé's & King's mom", comment: "My kid is a little bit timid but Teacher Jon is good at activating class atmosphere and making him willing to speak." },
  { name: 'petros', comment: "My son enjoyed his class so much. Teacher Jon has many materials to teach and it's very fun. For sure, my son will join his class again." },
  { name: 'Tingting', comment: "Jon is a very patient and funny teacher. He keeps the pace of the class well. Looking forward to our next lesson." },
  { name: 'Rui & Shaun', comment: "Extraordinarily passionate and skilled teacher with various activities - absolutely staying for more classes." },
  { name: 'Joy', comment: "Teacher Jon teaches with passion. My son likes this teacher the best for sure. I recommend!" },
  { name: 'Tristan', comment: "Jon is a good teacher. His class is interesting, my kid likes the customized lesson!" },
  { name: 'Jeffery LIU', comment: "It's a very interesting class. Teacher Jon is full of passion!" },
  { name: 'peterls', comment: "Great professional who really knows how to get the kid's attention." },
  { name: 'Ekaterina Strukova', comment: "Great style of communicating with kids! Easy and playful!" },
  { name: 'Baymax', comment: "Jon is really a professional and humorous teacher. Baymax loves his class a lot." },
  { name: 'Daria Penskaya', comment: "The trial lesson was very good. My son 4,10 really liked all the materials by Teacher Jon and all the different interactive tools that he uses in the class. For my son it was the first time to communicate with a native speaker and he stays very enthusiastic." },
  { name: 'Donna Hu', comment: "Jon is good at attracting my daughter's attention. He gives feedback and assigns homework after every class." },
  { name: 'Catherina & Angelina\'s mom', comment: "Teacher Jon's lesson is very interesting, my twins love the lesson." },
  { name: 'Van Simonetto', comment: "The best teacher so far. My boy just loved him!" },
  { name: 'jude-7years-old', comment: "Jon is a really great teacher, deserve all your respect! My boy loves him." },
  { name: 'D.V.', comment: "Jon tiene una estructura muy clara, segura y organizada de su forma de dar las clases. Me gusta." },
  { name: 'Angela', comment: "老师有自己的课程体系，孩子跟着学习进步很多。课程非常有趣，老师很用心，很专业。", translation: "The teacher has his own curriculum, and my child has improved a lot following it. The lessons are very interesting - the teacher is dedicated and highly professional." },
  { name: 'Angela', comment: "很喜欢上Jon老师的课，非常有趣。Jon老师很用心，教材成体系，有设计。希望一直跟随Jon老师学习。", translation: "We really enjoy Teacher Jon's classes - very interesting. He is very dedicated and his teaching materials are well-structured and thoughtfully designed. We hope to keep learning with Teacher Jon." },
  { name: 'Benjamin', comment: "Jon的课程非常活泼有趣，小朋友很投入，进步很明显。", translation: "Jon's lessons are very lively and fun. The children are fully engaged and the progress is very noticeable." },
  { name: 'italki user', comment: "John老师在儿童英语教学上的方法很独特，孩子非常喜欢，以后就跟他学习啦。", translation: "Teacher Jon's approach to teaching English to children is very unique. My child loves it, and we will definitely keep learning with him." },
  { name: 'Max', comment: "在课堂上，我们不仅学到了知识，更激发了兴趣与创造力。每一次尝试都是一种成长，每一次互动都是一次洗礼。让课堂成为知识的海洋，让学习成为一种享受。", translation: "In class, we don't just gain knowledge - we spark curiosity and creativity. Every attempt is growth, every interaction an inspiration. The classroom becomes an ocean of knowledge, and learning becomes a joy." },
];

const INTERVAL = 6000;

export function QuoteCarousel() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  const goTo = useCallback((next: number) => {
    setVisible(false);
    setShowTooltip(false);
    setTimeout(() => {
      setIndex(next);
      setVisible(true);
    }, 300);
  }, []);

  const prev = () => goTo((index - 1 + QUOTES.length) % QUOTES.length);
  const next = useCallback(() => goTo((index + 1) % QUOTES.length), [index, goTo]);

  useEffect(() => {
    const timer = setTimeout(next, INTERVAL);
    return () => clearTimeout(timer);
  }, [index, next]);

  const q = QUOTES[index];

  return (
    <div className="mt-12 max-w-2xl mx-auto">
      <div className="relative flex items-center gap-4">
        <button
          type="button"
          title="Previous quote"
          onClick={prev}
          className="flex-shrink-0 h-8 w-8 rounded-full border border-primary/30 flex items-center justify-center hover:bg-primary/10 hover:border-primary transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className={`flex-1 border-l-4 border-primary pl-6 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="relative group">
            <p className="text-lg italic text-muted-foreground">"{q.comment}"</p>
            {q.translation && (
              <>
                <button
                  type="button"
                  onClick={() => setShowTooltip((v) => !v)}
                  className="mt-1 text-xs text-primary/60 hover:text-primary transition-colors"
                >
                  🌐 Show translation
                </button>
                {showTooltip && (
                  <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground italic">
                    "{q.translation}"
                  </div>
                )}
              </>
            )}
          </div>
          <p className="text-sm not-italic mt-2 text-muted-foreground/70">- {q.name}</p>
        </div>

        <button
          type="button"
          title="Next quote"
          onClick={next}
          className="flex-shrink-0 h-8 w-8 rounded-full border border-primary/30 flex items-center justify-center hover:bg-primary/10 hover:border-primary transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-4">
        {QUOTES.map((_, i) => (
          <button
            key={i}
            type="button"
            title={`Go to quote ${i + 1}`}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all ${i === index ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-primary/30'}`}
          />
        ))}
      </div>
    </div>
  );
}
