// Seed script for Teacher Jon profile
// Run this once from the browser console or create a button to trigger it

import {
  createTeacherProfile,
  getTeacherProfileByUsername,
  updateTeacherProfile,
} from '@/lib/firestore';
import type { TeacherProfile } from '@/lib/types';

export const teacherJonProfile: Omit<TeacherProfile, 'id' | 'createdAt' | 'updatedAt'> = {
  username: 'teacherjon',
  email: 'jwag.lang@gmail.com',
  name: '👨🏫 Teacher Jon 🎓',
  headline: '🌟 Fluency Specialist for All Ages 🌟',
  avatarUrl: 'https://imagesavatar-static01.italki.com/9T010801680_Avatar_1.jpg',
  coverImageUrl: 'https://ofs-cdn.italki.com/u/1080168/cover/d37lnjjf4q7i632j7gg0_480x,q75.jpg',
  videoUrl: '', // Add your YouTube intro video URL here if you have one
  
  aboutMe: `✨ Hi there! I'm Teacher Jon, a native English speaking teacher with a passion for teaching communicatively, who will help you reach fluency fast!

🧭 I'm from the USA and currently live in Lisbon, Portugal where I had to master a foreign language, too. I am also a trained voice actor and media creator with TESOL certification and specialization certification in teaching young learners (elementary and primary).

🌟 I have taught on iTalki since 2011 and overall have 25 years of teaching experience. I also run successful Youtube and Rednote channels where I create English lessons for kids all over the world.

🚀 I can't wait to help you master English, too!`,

  teachingPhilosophy: `⭐️ Drawing on 25 years of teaching, I have specialized in young learners since 2014, with captivating classes. With 10s of thousands of hours taught, I seamlessly merge my teaching expertise with my background in performance to craft a distinctive, entertaining, and fun learning experience.

⭐️ My highly interactive lessons, though grounded in educational theory, put the student first.

⭐️ Through integrating the latest digital tools, I also ensure a dynamic educational journey where young learners take center stage, steering clear of rigid methodologies to embrace their individual interests.`,

  lessonStyle: `📣 My classes are FUN! 🥳
📣 Top 1% teacher for kids 🎉 (according to iTalki)
📣 Cambridge Speaking Examiner. Fluency Expert 👨‍🏫

⭐️ Contact me before booking! I have important info for you about my classroom & availability!

⭐️ I'm Teacher Jon! I'm a fun, friendly and TESOL-certified teacher, as well as a Cambridge University Speaking Examiner and a former accent coach!

⭐️ 25 years of teaching experience!
⭐️ Teacher, performer and content creator!
⭐️ Videos, songs, interactive media in a kid-friendly platform.`,

  teachingMaterials: [
    'Presentation slides/PPT',
    'Homework Assignments',
    'PDF file',
    'Audio files',
    'Flashcards',
    'Quizzes',
    'Video files',
    'Text Documents',
    'Test templates and examples',
    'Image files',
    'Articles and news',
    'Graphs and charts',
  ],

  nativeLanguage: 'English',
  otherLanguages: ['Portuguese', 'Chinese (Mandarin)'],
  
  specialties: ['Test Preparation', 'Kids', 'Conversation', 'Business English'],
  interests: ['Pets & Animals', 'Gaming', 'Animation & Comics', 'Films & TV Series'],
  
  countryFrom: 'United States',
  cityLiving: 'Lisbon, Portugal',
  timezone: 'Europe/Lisbon',
  teachingSince: 'Mar 16, 2013',

  certificates: [
    {
      title: 'TEFL Certification',
      issuer: 'Magic Ears / Accreditat',
      year: '2021',
      description: '150 Hour TEFL certification',
      verified: true,
    },
    {
      title: 'Magic Ears TEFL Certification',
      issuer: 'Accreditat',
      year: '2021',
      description: 'The Magic Ears TEFL Certification with international accreditation, primarily focused on second language acquisition for young learners ages 5 to 12.',
      verified: true,
    },
    {
      title: 'Cambridge Speaking Examiner',
      issuer: 'Cambridge University - English Language Assessment Division',
      year: '2016',
      description: 'Speaking examiner for IELTS, CAE, FCE & PET exams.',
      verified: true,
    },
    {
      title: 'Cambridge Speaking Examiner Certification',
      issuer: 'UCLES',
      year: '2016',
      description: 'The Cambridge Speaking Examiner Certification from The University of Cambridge Local Examinations Syndicate (UCLES) qualifies professionals to conduct speaking exams for selected Cambridge tests.',
      verified: true,
    },
    {
      title: 'Certificate in TESOL',
      issuer: 'Trinity College London',
      year: '1998',
      description: 'Certificate in Teaching English to Speakers of Other Languages',
      verified: true,
    },
  ],

  experience: [
    {
      title: 'Speaking Examiner',
      organization: 'Cambridge',
      location: 'Lisbon, Portugal',
      startYear: '2016',
      endYear: '2020',
      description: 'Certified Speaking Examiner for Cambridge PET, KET, First Certificate, Advanced, Proficiency English and IELTS exams.',
    },
    {
      title: 'Online English Teacher',
      organization: 'iTalki and many others',
      location: 'Remote',
      startYear: '2010',
      endYear: '2024',
      description: 'Taught online to children and adults almost exclusively since 2010.',
    },
    {
      title: 'Online Teaching Professional',
      organization: 'LearnShip Networks GmbH',
      location: 'Cologne, Germany',
      startYear: '2012',
      endYear: '',
      description: 'Face-to-face customized training individually or in small groups using an interactive and multimedia-based Live Teaching Method.',
    },
    {
      title: 'Online Teaching Professional',
      organization: 'Myngle Corporate Academy',
      location: 'Amsterdam, Netherlands',
      startYear: '2011',
      endYear: '',
      description: 'Private classes in Business English, CEFR level assessment and American pronunciation & accent training to executives of Boston Consulting Group, Bain Capital, Compagnia Generale Trattori – Caterpillar and LUISS University Rome.',
    },
    {
      title: 'Online Teaching Professional',
      organization: 'Englishtown (Education First)',
      location: 'Shanghai, China',
      startYear: '2010',
      endYear: '2012',
      description: 'Online group lessons, providing personalized after-class feedback to students & tailor-made curricula for private lessons.',
    },
    {
      title: 'Online Teaching Professional',
      organization: 'Verbling',
      location: 'San Francisco, United States',
      startYear: '2015',
      endYear: '',
      description: 'Develop and teach original courses in fluency, business English and conversation.',
    },
    {
      title: 'Online English Teacher',
      organization: 'iTutorGroup / TutorABC',
      location: 'Taipei, Taiwan',
      startYear: '2018',
      endYear: '2021',
      description: 'Teaching general English online to young learners from ages 4 to 18. Teaching group and one-to-one adult classes in conversational general English.',
    },
    {
      title: 'Online English Teacher',
      organization: 'Magic Ears',
      location: 'Beijing, China',
      startYear: '2021',
      endYear: '2021',
      description: 'Teaching English to Chinese young learners from 3 to 12 years of age through a state of the art interactive platform.',
    },
    {
      title: 'Online English Teacher',
      organization: 'GoGoKid',
      location: 'Beijing, China',
      startYear: '2020',
      endYear: '2021',
      description: 'One-on-one online language lessons based on U.S. Common Core State Standards through a virtual classroom infused with cutting-edge AI technology.',
    },
    {
      title: 'Online English Teacher',
      organization: 'Protostar Education',
      location: 'Hong Kong, China',
      startYear: '2020',
      endYear: '2021',
      description: 'Teaching English Phonics and reading skills in a dynamic, flipped classroom approach for young learners in groups of 2-4.',
    },
  ],

  stats: {
    rating: 5.0,
    totalStudents: 178,
    totalLessons: 1767,
    attendanceRate: 100,
    responseRate: 100,
  },

  isOnline: true,
  isPublished: true,
};

export async function seedTeacherJonProfile(): Promise<TeacherProfile> {
  // Check if profile already exists
  const existing = await getTeacherProfileByUsername('teacherjon');
  
  if (existing) {
    console.log('Profile exists, updating...');
    const updated = await updateTeacherProfile(existing.id, teacherJonProfile);
    console.log('Profile updated!');
    return updated;
  } else {
    console.log('Creating new profile...');
    const created = await createTeacherProfile({
        ...teacherJonProfile,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
    });
    console.log('Profile created!');
    return created;
  }
}
