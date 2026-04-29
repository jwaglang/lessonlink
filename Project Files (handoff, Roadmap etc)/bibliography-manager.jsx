import React, { useState, useEffect } from 'react';
import { Search, Plus, Download, Trash2, Tag, BookOpen, Filter, X, Edit2, Check } from 'lucide-react';

const INITIAL_ENTRIES = [
  // === KIDDOLAND TOOLS ===
  {
    id: 'long1992',
    type: 'article',
    author: 'Long, Michael H. and Crookes, Graham',
    year: '1992',
    title: 'Three approaches to task-based syllabus design',
    journal: 'TESOL Quarterly',
    volume: '26',
    number: '1',
    pages: '27-56',
    tags: ['TBLT', 'syllabus-design', 'analytic-vs-synthetic'],
    source: 'kiddoland-tools',
    note: 'Foundational argument for analytic syllabus over synthetic. Rejects notional-functional syllabuses as still synthetic. Key source for why Kiddoland cannot pre-select linguistic targets.'
  },
  {
    id: 'long2016',
    type: 'article',
    author: 'Long, Michael H.',
    year: '2016',
    title: 'In Defense of Tasks and TBLT: Nonissues and Real Issues',
    journal: 'Annual Review of Applied Linguistics',
    volume: '36',
    pages: '5-33',
    tags: ['TBLT', 'task-complexity'],
    source: 'kiddoland-tools',
    note: 'Defends TBLT against critics. Clarifies that task complexity (not linguistic complexity) drives sequencing. Useful for addressing common misconceptions about TBLT.'
  },
  {
    id: 'robinson2011',
    type: 'incollection',
    author: 'Robinson, Peter',
    year: '2011',
    title: 'Second language task complexity, the Cognition Hypothesis, language learning, and performance',
    booktitle: 'Second Language Task Complexity: Researching the Cognition Hypothesis of Language Learning and Performance',
    editor: 'Robinson, Peter',
    publisher: 'John Benjamins',
    address: 'Amsterdam',
    tags: ['task-complexity', 'cognition-hypothesis', 'TBLT'],
    source: 'kiddoland-tools',
    note: 'Cognition Hypothesis: increased task complexity along resource-directing dimensions promotes linguistic complexity. Contrasts with Skehan Trade-Off Hypothesis. Key for understanding task sequencing rationale.'
  },
  {
    id: 'skehan1998',
    type: 'book',
    author: 'Skehan, Peter',
    year: '1998',
    title: 'A Cognitive Approach to Language Learning',
    publisher: 'Oxford University Press',
    address: 'Oxford',
    tags: ['task-complexity', 'trade-off-hypothesis', 'CAF'],
    source: 'kiddoland-tools',
    note: 'Trade-Off Hypothesis: learners have limited attention, so complexity/accuracy/fluency trade off. Contrasts with Robinson. Important for understanding why task design affects performance.'
  },
  {
    id: 'doughty1998',
    type: 'book',
    author: 'Doughty, Catherine and Williams, Jessica',
    year: '1998',
    title: 'Focus on Form in Classroom Second Language Acquisition',
    publisher: 'Cambridge University Press',
    address: 'Cambridge',
    tags: ['focus-on-form', 'SLA', 'grammar-instruction'],
    source: 'kiddoland-tools',
    note: 'Defines focus on form vs focus on formS. FonF draws attention to linguistic features in context during communicative activity. Essential distinction for Kiddoland pedagogy.'
  },
  {
    id: 'jordan-long-forthcoming',
    type: 'book',
    author: 'Jordan, Geoff and Long, Michael H.',
    year: 'forthcoming',
    title: 'English Language Teaching for Adults',
    publisher: 'Cambridge Scholars',
    tags: ['TBLT', 'ELT', 'practical-implementation'],
    source: 'kiddoland-tools',
    note: 'Practical TBLT implementation guide. Addresses real-world challenges of pure TBLT. Bridge between theory and classroom practice. Geoff Jordan is a personal contact.'
  },
  {
    id: 'pearson2022',
    type: 'misc',
    author: '{Pearson Education}',
    year: '2022',
    title: 'Global Scale of English Learning Objectives for Young Learners',
    howpublished: 'Pearson',
    tags: ['GSE', 'young-learners', 'functional-syllabus'],
    source: 'kiddoland-tools',
    note: 'Source for Fast Fluency Functional Framework functions. NOTE: GSE is a functional syllabus, NOT task-based. Used descriptively, not as prescriptive syllabus. Framework requires TBLT reframing.'
  },
  {
    id: 'long2015-framework',
    type: 'book',
    author: 'Long, Michael H.',
    year: '2015',
    title: 'Second Language Acquisition and Task-Based Language Teaching',
    publisher: 'Wiley-Blackwell',
    address: 'Malden, MA',
    tags: ['TBLT', 'task-complexity', 'young-learners', 'task-examples', 'framework'],
    source: 'kiddoland-tools',
    note: 'UPDATED ENTRY: Primary source for Task Complexity Framework structure. Provides theoretical foundation for sequencing tasks by cognitive complexity rather than linguistic complexity. Used to design TBLT task examples across all 7 dragon levels. Key claim: tasks are unit of analysis, language emerges through task performance.'
  },
  {
    id: 'shintani2016',
    type: 'book',
    author: 'Shintani, Natsuko',
    year: '2016',
    title: 'Input-based Tasks in Foreign Language Instruction for Young Learners',
    publisher: 'John Benjamins',
    address: 'Amsterdam',
    series: 'Task-Based Language Teaching',
    volume: '9',
    tags: ['TBLT', 'young-learners', 'input-based-tasks', 'beginner-learners', 'task-examples'],
    source: 'kiddoland-tools',
    note: 'Essential source for Kiddoland WHITE and YELLOW level tasks. Demonstrates TBLT works with complete beginners using input-based tasks (listen-and-do, listen-and-draw). Shows young learners can acquire vocabulary and grammar (plural -s) incidentally through comprehension-based tasks. Endorsed by Long himself. Directly informs task examples for early dragon levels.'
  },
  {
    id: 'prabhu1987',
    type: 'book',
    author: 'Prabhu, N. S.',
    year: '1987',
    title: 'Second Language Pedagogy',
    publisher: 'Oxford University Press',
    address: 'Oxford',
    tags: ['TBLT', 'bangalore-project', 'information-gap', 'reasoning-gap', 'opinion-gap', 'task-types'],
    source: 'kiddoland-tools',
    note: 'Origin of TBLT from Bangalore Project. Defines the three fundamental gap types used throughout Task Complexity Framework: (1) information gap - transfer information between people/forms, (2) reasoning gap - derive new information through inference, (3) opinion gap - express preferences/attitudes. These gap types classify every task example in the framework.'
  },
  {
    id: 'ellis2003',
    type: 'book',
    author: 'Ellis, Rod',
    year: '2003',
    title: 'Task-based Language Learning and Teaching',
    publisher: 'Oxford University Press',
    address: 'Oxford',
    tags: ['TBLT', 'task-definition', 'task-design', 'implementation', 'young-learners'],
    source: 'kiddoland-tools',
    note: 'Comprehensive task definition and design principles. Ellis defines task criteria: primary focus on meaning, gap, learners use own linguistic resources, clearly defined outcome. Used to validate task examples in framework. Also addresses TBLT with young/beginner learners, supporting input-based approach for early levels.'
  },
  // === LINGUISTICS LEARNING ===
  {
    id: 'yule2020',
    type: 'book',
    author: 'Yule, George',
    year: '2020',
    title: 'The Study of Language',
    edition: '7th',
    publisher: 'Cambridge University Press',
    address: 'Cambridge',
    tags: ['linguistics', 'introduction', 'phonology', 'morphology', 'syntax', 'semantics', 'pragmatics'],
    source: 'linguistics-learning',
    note: 'Core text for linguistics foundation. Covers all five levels of linguistic analysis. Accessible prose, establishes shared vocabulary with the field. Start here for passive fluency in linguistic metalanguage.'
  },
  {
    id: 'lightbown-spada2013',
    type: 'book',
    author: 'Lightbown, Patsy M. and Spada, Nina',
    year: '2013',
    title: 'How Languages Are Learned',
    edition: '4th',
    publisher: 'Oxford University Press',
    address: 'Oxford',
    tags: ['SLA', 'form-focused-instruction', 'developmental-sequences'],
    source: 'linguistics-learning',
    note: 'Decades of research on form-focused instruction. Key finding: instruction affects RATE but not ROUTE of acquisition. Interlanguage develops on its own timeline regardless of teaching order.'
  },
  {
    id: 'schmidt1990',
    type: 'article',
    author: 'Schmidt, Richard',
    year: '1990',
    title: 'The role of consciousness in second language learning',
    journal: 'Applied Linguistics',
    volume: '11',
    number: '2',
    pages: '129-158',
    tags: ['noticing', 'consciousness', 'SLA'],
    source: 'linguistics-learning',
    note: 'CAUTION: Noticing Hypothesis became SLA dogma but is contested. Claims conscious attention is necessary for acquisition. Contrast with detection-based accounts (Nick Ellis). Jordan/Long position: detection, not noticing, is key.'
  },
  {
    id: 'ellis-n2002',
    type: 'article',
    author: 'Ellis, Nick C.',
    year: '2002',
    title: 'Frequency effects in language processing',
    journal: 'Studies in Second Language Acquisition',
    volume: '24',
    number: '2',
    pages: '143-188',
    tags: ['implicit-learning', 'frequency', 'detection', 'SLA'],
    source: 'linguistics-learning',
    note: 'Implicit learning research. Brain registers statistical patterns below conscious awareness. Supports detection over noticing. Key theoretical foundation for why explicit grammar teaching has limited effects.'
  },
  {
    id: 'flege1995',
    type: 'article',
    author: 'Flege, James Emil',
    year: '1995',
    title: 'Second language speech learning: Theory, findings, and problems',
    booktitle: 'Speech Perception and Linguistic Experience',
    editor: 'Strange, Winifred',
    publisher: 'York Press',
    address: 'Baltimore',
    pages: '233-277',
    tags: ['phonology', 'L2-speech', 'speech-learning-model'],
    source: 'linguistics-learning',
    note: 'Speech Learning Model explains L1-L2 phonetic interaction. Why similar (not identical) L2 sounds are harder than new sounds. Essential for understanding pronunciation challenges in young learners.'
  },
  {
    id: 'laufer1998',
    type: 'article',
    author: 'Laufer, Batia',
    year: '1998',
    title: 'The development of passive and active vocabulary in a second language: Same or different?',
    journal: 'Applied Linguistics',
    volume: '19',
    number: '2',
    pages: '255-271',
    tags: ['vocabulary', 'receptive-productive', 'lexical-knowledge'],
    source: 'linguistics-learning',
    note: 'Vocabulary depth vs breadth. Receptive vs productive knowledge. Key for understanding vocabulary thresholds and why L2 vocabulary acquisition is more than memorizing translations.'
  },
  {
    id: 'kasper-rose2002',
    type: 'book',
    author: 'Kasper, Gabriele and Rose, Kenneth R.',
    year: '2002',
    title: 'Pragmatic Development in a Second Language',
    publisher: 'Blackwell',
    address: 'Oxford',
    tags: ['pragmatics', 'interlanguage-pragmatics', 'speech-acts'],
    source: 'linguistics-learning',
    note: 'Interlanguage pragmatics. Why grammatically correct utterances still fail. Pragmatic competence develops differently from grammatical competence. Important for understanding social appropriateness in young learners.'
  },
  {
    id: 'ladefoged-johnson2014',
    type: 'book',
    author: 'Ladefoged, Peter and Johnson, Keith',
    year: '2014',
    title: 'A Course in Phonetics',
    edition: '7th',
    publisher: 'Cengage Learning',
    address: 'Boston',
    tags: ['phonetics', 'phonology', 'IPA'],
    source: 'linguistics-learning',
    note: 'Advanced phonetics text. For deeper active competence in phonological analysis after Yule foundation. Not needed for passive fluency.'
  },
  {
    id: 'tallerman2011',
    type: 'book',
    author: 'Tallerman, Maggie',
    year: '2011',
    title: 'Understanding Syntax',
    edition: '3rd',
    publisher: 'Hodder Education',
    address: 'London',
    tags: ['syntax', 'phrase-structure', 'linguistics'],
    source: 'linguistics-learning',
    note: 'Advanced syntax text. For active analytical competence in syntactic analysis. Use after Yule if needed.'
  },
  {
    id: 'grice1975',
    type: 'incollection',
    author: 'Grice, H. Paul',
    year: '1975',
    title: 'Logic and conversation',
    booktitle: 'Syntax and Semantics, Vol. 3: Speech Acts',
    editor: 'Cole, Peter and Morgan, Jerry L.',
    publisher: 'Academic Press',
    address: 'New York',
    pages: '41-58',
    tags: ['pragmatics', 'implicature', 'maxims', 'conversation'],
    source: 'linguistics-learning',
    note: 'Foundational pragmatics. Conversational maxims (quantity, quality, relevance, manner) and implicature. Essential for understanding how meaning goes beyond literal semantics.'
  }
];

function generateBibTeX(entry) {
  const fields = [];
  
  const addField = (name, value) => {
    if (value) fields.push(`  ${name} = {${value}}`);
  };
  
  addField('author', entry.author);
  addField('year', entry.year);
  addField('title', entry.title);
  
  if (entry.type === 'article') {
    addField('journal', entry.journal);
    addField('volume', entry.volume);
    addField('number', entry.number);
    addField('pages', entry.pages);
  } else if (entry.type === 'book') {
    addField('publisher', entry.publisher);
    addField('address', entry.address);
    if (entry.edition) addField('edition', entry.edition);
  } else if (entry.type === 'incollection') {
    addField('booktitle', entry.booktitle);
    addField('editor', entry.editor);
    addField('publisher', entry.publisher);
    addField('address', entry.address);
    addField('pages', entry.pages);
  } else if (entry.type === 'misc') {
    addField('howpublished', entry.howpublished);
  }
  
  // Add relevance note and source tag
  const noteContent = `RELEVANCE: ${entry.note} [Source: ${entry.source}]`;
  addField('note', noteContent);
  
  return `@${entry.type}{${entry.id},\n${fields.join(',\n')}\n}`;
}

function formatAPA(entry) {
  let citation = '';
  
  // Author
  citation += entry.author.replace(' and ', ' & ');
  
  // Year
  citation += ` (${entry.year}). `;
  
  // Title
  if (entry.type === 'article') {
    citation += `${entry.title}. `;
    citation += `*${entry.journal}*, `;
    citation += `*${entry.volume}*`;
    if (entry.number) citation += `(${entry.number})`;
    if (entry.pages) citation += `, ${entry.pages}`;
    citation += '.';
  } else if (entry.type === 'book') {
    citation += `*${entry.title}*`;
    if (entry.edition) citation += ` (${entry.edition} ed.)`;
    citation += '. ';
    if (entry.address) citation += `${entry.address}: `;
    citation += `${entry.publisher}.`;
  } else if (entry.type === 'incollection') {
    citation += `${entry.title}. `;
    citation += `In ${entry.editor} (Ed.), *${entry.booktitle}* `;
    if (entry.pages) citation += `(pp. ${entry.pages}). `;
    if (entry.address) citation += `${entry.address}: `;
    citation += `${entry.publisher}.`;
  } else {
    citation += `*${entry.title}*. ${entry.howpublished || ''}.`;
  }
  
  return citation;
}

export default function BibliographyManager() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [filterTag, setFilterTag] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [notification, setNotification] = useState('');
  
  // Load from storage on mount, merging any new INITIAL_ENTRIES
  useEffect(() => {
    async function loadData() {
      try {
        const result = await window.storage.get('bibliography-entries');
        if (result && result.value) {
          const stored = JSON.parse(result.value);
          const storedIds = new Set(stored.map(e => e.id));
          
          // Find new entries in INITIAL_ENTRIES that aren't in storage
          const newEntries = INITIAL_ENTRIES.filter(e => !storedIds.has(e.id));
          
          if (newEntries.length > 0) {
            // Merge: stored entries + new entries
            const merged = [...stored, ...newEntries];
            setEntries(merged);
            await window.storage.set('bibliography-entries', JSON.stringify(merged));
          } else {
            setEntries(stored);
          }
        } else {
          // First time: load initial entries
          setEntries(INITIAL_ENTRIES);
          await window.storage.set('bibliography-entries', JSON.stringify(INITIAL_ENTRIES));
        }
      } catch (error) {
        // Storage not available or first load
        setEntries(INITIAL_ENTRIES);
      }
      setLoading(false);
    }
    loadData();
  }, []);
  
  // Save to storage whenever entries change
  useEffect(() => {
    if (!loading && entries.length > 0) {
      window.storage.set('bibliography-entries', JSON.stringify(entries)).catch(() => {});
    }
  }, [entries, loading]);
  
  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };
  
  const allTags = [...new Set(entries.flatMap(e => e.tags))].sort();
  
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = searchTerm === '' || 
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.note.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = filterSource === 'all' || entry.source === filterSource;
    const matchesTag = filterTag === '' || entry.tags.includes(filterTag);
    return matchesSearch && matchesSource && matchesTag;
  });
  
  const exportBibTeX = () => {
    const bibtex = filteredEntries.map(generateBibTeX).join('\n\n');
    const blob = new Blob([bibtex], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kiddoland-bibliography.bib';
    a.click();
    URL.revokeObjectURL(url);
    showNotification('BibTeX file downloaded!');
  };
  
  const deleteEntry = async (id) => {
    const newEntries = entries.filter(e => e.id !== id);
    setEntries(newEntries);
    showNotification('Entry deleted');
  };
  
  const addEntry = async (newEntry) => {
    const updatedEntries = [...entries, newEntry];
    setEntries(updatedEntries);
    setShowAddForm(false);
    showNotification('Entry added!');
  };
  
  const sourceColors = {
    'kiddoland-tools': 'bg-purple-100 text-purple-800 border-purple-200',
    'linguistics-learning': 'bg-blue-100 text-blue-800 border-blue-200'
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading bibliography...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">📚 Research Bibliography</h1>
        <p className="text-gray-600 text-sm">
          {entries.length} entries • Kiddoland Tools + Linguistics Learning
        </p>
      </div>
      
      {/* Notification */}
      {notification && (
        <div className="max-w-4xl mx-auto mb-4">
          <div className="bg-green-100 border border-green-200 text-green-800 px-4 py-2 rounded-lg">
            {notification}
          </div>
        </div>
      )}
      
      {/* Controls */}
      <div className="max-w-4xl mx-auto mb-6 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search titles, authors, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Sources</option>
            <option value="kiddoland-tools">Kiddoland Tools</option>
            <option value="linguistics-learning">Linguistics Learning</option>
          </select>
          
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          
          <button
            onClick={exportBibTeX}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
          >
            <Download className="w-4 h-4" />
            Export BibTeX
          </button>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        </div>
      </div>
      
      {/* Results count */}
      <div className="max-w-4xl mx-auto mb-4">
        <p className="text-sm text-gray-500">
          Showing {filteredEntries.length} of {entries.length} entries
        </p>
      </div>
      
      {/* Entries */}
      <div className="max-w-4xl mx-auto space-y-4">
        {filteredEntries.map(entry => (
          <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            {/* Source badge */}
            <div className="flex justify-between items-start mb-2">
              <span className={`text-xs px-2 py-0.5 rounded border ${sourceColors[entry.source]}`}>
                {entry.source === 'kiddoland-tools' ? '🐉 Kiddoland' : '📖 Linguistics'}
              </span>
              <button
                onClick={() => deleteEntry(entry.id)}
                className="text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            {/* Citation */}
            <div 
              className="text-gray-800 mb-3"
              dangerouslySetInnerHTML={{ 
                __html: formatAPA(entry)
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
              }}
            />
            
            {/* Note */}
            <div className="bg-gray-50 border-l-4 border-purple-400 p-3 mb-3 text-sm text-gray-700">
              <strong>Relevance:</strong> {entry.note}
            </div>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {entry.tags.map(tag => (
                <span 
                  key={tag}
                  onClick={() => setFilterTag(tag)}
                  className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded cursor-pointer hover:bg-gray-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Add Form Modal */}
      {showAddForm && (
        <AddEntryForm 
          onAdd={addEntry} 
          onCancel={() => setShowAddForm(false)}
          existingIds={entries.map(e => e.id)}
        />
      )}
    </div>
  );
}

function AddEntryForm({ onAdd, onCancel, existingIds }) {
  const [formData, setFormData] = useState({
    id: '',
    type: 'article',
    author: '',
    year: '',
    title: '',
    journal: '',
    volume: '',
    number: '',
    pages: '',
    publisher: '',
    address: '',
    edition: '',
    booktitle: '',
    editor: '',
    howpublished: '',
    tags: '',
    source: 'kiddoland-tools',
    note: ''
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Generate ID if not provided
    const id = formData.id || formData.author.split(',')[0].toLowerCase().replace(/\s/g, '') + formData.year;
    
    if (existingIds.includes(id)) {
      alert('An entry with this ID already exists');
      return;
    }
    
    const entry = {
      ...formData,
      id,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t)
    };
    
    onAdd(entry);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add New Entry</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="article">Article</option>
                <option value="book">Book</option>
                <option value="incollection">Book Chapter</option>
                <option value="misc">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Project</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({...formData, source: e.target.value})}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="kiddoland-tools">Kiddoland Tools</option>
                <option value="linguistics-learning">Linguistics Learning</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Author(s) *</label>
            <input
              type="text"
              required
              placeholder="Last, First and Last, First"
              value={formData.author}
              onChange={(e) => setFormData({...formData, author: e.target.value})}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
              <input
                type="text"
                required
                value={formData.year}
                onChange={(e) => setFormData({...formData, year: e.target.value})}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Citation Key</label>
              <input
                type="text"
                placeholder="auto-generated if blank"
                value={formData.id}
                onChange={(e) => setFormData({...formData, id: e.target.value})}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          
          {formData.type === 'article' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Journal</label>
                <input
                  type="text"
                  value={formData.journal}
                  onChange={(e) => setFormData({...formData, journal: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Volume</label>
                  <input
                    type="text"
                    value={formData.volume}
                    onChange={(e) => setFormData({...formData, volume: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number</label>
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({...formData, number: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pages</label>
                  <input
                    type="text"
                    value={formData.pages}
                    onChange={(e) => setFormData({...formData, pages: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
            </>
          )}
          
          {(formData.type === 'book' || formData.type === 'incollection') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Publisher</label>
                <input
                  type="text"
                  value={formData.publisher}
                  onChange={(e) => setFormData({...formData, publisher: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              placeholder="TBLT, vocabulary, young-learners"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Relevance Note *</label>
            <textarea
              required
              rows={3}
              placeholder="Why this source matters for the project..."
              value={formData.note}
              onChange={(e) => setFormData({...formData, note: e.target.value})}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
            >
              Add Entry
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
