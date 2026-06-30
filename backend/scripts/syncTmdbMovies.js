const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { db } = require('../lib/firebase');

const TMDB_API = 'https://api.themoviedb.org/3';
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w780';
const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/w1280';
const SEAT_COUNT = 120;
const DEMO_MOVIE_IDS = [
  'midnight-runway',
  'a-sky-full-of-notes',
  'orbit-seven',
  'the-last-recipe'
];
const SHOW_TEMPLATES = [
  { suffix: 'pvr-morning', theatre: 'PVR INOX Nexus Mall', auditorium: 'Audi 2', format: '2D', daysAhead: 0, time: '10:30 AM', price: 220 },
  { suffix: 'pvr-prime', theatre: 'PVR INOX Nexus Mall', auditorium: 'Audi 5', format: 'IMAX', daysAhead: 0, time: '07:15 PM', price: 380 },
  { suffix: 'inox-afternoon', theatre: 'INOX Central', auditorium: 'Screen 4', format: '2D', daysAhead: 1, time: '01:20 PM', price: 240 },
  { suffix: 'inox-evening', theatre: 'INOX Central', auditorium: 'Screen 4', format: '2D', daysAhead: 1, time: '04:00 PM', price: 260 },
  { suffix: 'cinepolis-late', theatre: 'Cinepolis Celebration Mall', auditorium: 'Audi 1', format: 'Dolby Atmos', daysAhead: 2, time: '09:45 PM', price: 310 },
  { suffix: 'miraj-matinee', theatre: 'Miraj Cinemas Downtown', auditorium: 'Screen 3', format: '2D', daysAhead: 3, time: '12:10 PM', price: 190 },
  { suffix: 'pvr-weekend', theatre: 'PVR INOX Phoenix', auditorium: 'Luxe', format: '4DX', daysAhead: 4, time: '06:30 PM', price: 460 }
];
const FALLBACK_REAL_MOVIES = [
  {
    id: 'real-the-great-grand-superhero-aliens-ka-aagman',
    title: 'The Great Grand Superhero: Aliens Ka Aagman',
    duration: 128,
    rating: 7.2,
    category: 'Bollywood',
    genre: 'Sci-Fi',
    language: 'Hindi',
    certificate: 'UA',
    synopsis: 'A new Hindi sci-fi release listed for cinemas on 29 May 2026.',
    releaseDate: '2026-05-29',
    catalogueTag: 'New release',
    poster: 'https://images.fandango.com/ImageRenderer/820/0/redesign/static/img/default_poster.png/0/images/masterrepository/fandango/245751/TheGreatGrandSuperhero-1080x1600.jpg'
  },
  {
    id: 'real-return-of-the-jungle',
    title: 'Return of the Jungle',
    duration: 116,
    rating: 7.8,
    category: 'Bollywood',
    genre: 'Animation / Family',
    language: 'Hindi',
    certificate: 'U',
    synopsis: 'An animated family release listed for cinemas on 29 May 2026.',
    releaseDate: '2026-05-29',
    catalogueTag: 'New release'
  },
  {
    id: 'real-krishna-aur-chitthi',
    title: 'Krishna Aur Chitthi',
    duration: 132,
    rating: 7.5,
    category: 'Bollywood',
    genre: 'Drama / Sport',
    language: 'Hindi',
    certificate: 'U',
    synopsis: 'A Hindi drama-sport film listed with ticket booking for 29 May 2026.',
    releaseDate: '2026-05-29',
    catalogueTag: 'Book tickets'
  },
  {
    id: 'real-chand-mera-dil',
    title: 'Chand Mera Dil',
    duration: 124,
    rating: 9.0,
    category: 'Bollywood',
    genre: 'Romance',
    language: 'Hindi',
    certificate: 'UA',
    synopsis: 'A new Hindi romance release starring Ananya Panday and Lakshya.',
    releaseDate: '2026-05-22',
    catalogueTag: 'Trending'
  },
  {
    id: 'real-aakhri-sawal',
    title: 'Aakhri Sawal',
    duration: 126,
    rating: 6.8,
    category: 'Bollywood',
    genre: 'Thriller',
    language: 'Hindi',
    certificate: 'UA 16+',
    synopsis: 'A Hindi thriller release featuring Sanjay Dutt, Namashi Chakraborthy, Nitu Chandra and Tridha Choudhury.',
    releaseDate: '2026-05-15',
    catalogueTag: 'Now showing'
  },
  {
    id: 'real-iiz-indian-institute-of-zombies',
    title: 'IIZ: Indian Institute of Zombies',
    duration: 118,
    rating: 8.4,
    category: 'Bollywood',
    genre: 'Horror / Thriller',
    language: 'Hindi',
    certificate: 'UA 16+',
    synopsis: 'A horror-thriller listed with cinema booking for May 2026.',
    releaseDate: '2026-05-15',
    catalogueTag: 'Trending'
  },
  {
    id: 'real-pati-patni-aur-woh-do',
    title: 'Pati Patni Aur Woh Do',
    duration: 136,
    rating: 9.6,
    category: 'Bollywood',
    genre: 'Drama',
    language: 'Hindi',
    certificate: 'UA',
    synopsis: 'A Hindi drama release with a large ensemble cast, listed for 15 May 2026.',
    releaseDate: '2026-05-15',
    catalogueTag: 'Popular'
  },
  {
    id: 'real-dhurandhar-the-revenge',
    title: 'Dhurandhar: The Revenge',
    duration: 148,
    rating: 7.5,
    category: 'Bollywood',
    genre: 'Action / Drama',
    language: 'Hindi',
    certificate: 'UA 16+',
    synopsis: 'A 2026 action-drama release featuring Ranveer Singh, Akshaye Khanna and Sanjay Dutt.',
    releaseDate: '2026-03-19',
    catalogueTag: 'Trending',
    poster: 'https://images.fandango.com/ImageRenderer/820/0/redesign/static/img/default_poster.png/0/images/masterrepository/fandango/244687/DhurandharTheRevenge-1080x1600.jpg'
  },
  {
    id: 'real-rajni-ki-baraat',
    title: 'Rajni Ki Baraat',
    duration: 122,
    rating: 7.4,
    category: 'Bollywood',
    genre: 'Comedy / Drama',
    language: 'Hindi',
    certificate: 'UA',
    synopsis: 'A Hindi comedy-drama release listed for 29 May 2026.',
    releaseDate: '2026-05-29',
    catalogueTag: 'New release'
  },
  {
    id: 'real-heer-sara-aur-pondicherry',
    title: 'Heer Sara Aur Pondicherry',
    duration: 130,
    rating: 7.6,
    category: 'Bollywood',
    genre: 'Drama / Adventure',
    language: 'Hindi',
    certificate: 'UA',
    synopsis: 'A Hindi drama-adventure release listed for 29 May 2026.',
    releaseDate: '2026-05-29',
    catalogueTag: 'New release'
  },
  {
    id: 'real-peddi',
    title: 'Peddi',
    duration: 150,
    rating: 8.3,
    category: 'South Indian',
    genre: 'Sports / Drama',
    language: 'Hindi',
    certificate: 'UA',
    synopsis: 'A sports-drama release listed for 4 June 2026 with Ram Charan and Janhvi Kapoor.',
    releaseDate: '2026-06-04',
    catalogueTag: 'Coming soon'
  },
  {
    id: 'real-maa-behen',
    title: 'Maa Behen',
    duration: 126,
    rating: 7.7,
    category: 'Bollywood',
    genre: 'Comedy / Thriller',
    language: 'Hindi',
    certificate: 'UA 13+',
    synopsis: 'A Hindi comedy-thriller listed for 4 June 2026.',
    releaseDate: '2026-06-04',
    catalogueTag: 'Coming soon'
  },
  {
    id: 'real-bandar',
    title: 'Bandar',
    duration: 135,
    rating: 8.1,
    category: 'Bollywood',
    genre: 'Crime / Thriller',
    language: 'Hindi',
    certificate: 'UA 16+',
    synopsis: 'A crime-thriller release listed for 5 June 2026 with Bobby Deol and Sanya Malhotra.',
    releaseDate: '2026-06-05',
    catalogueTag: 'Coming soon'
  },
  {
    id: 'real-hai-jawani-toh-ishq-hona-hai',
    title: 'Hai Jawani Toh Ishq Hona Hai',
    duration: 138,
    rating: 8.0,
    category: 'Bollywood',
    genre: 'Romance / Comedy',
    language: 'Hindi',
    certificate: 'UA',
    synopsis: 'A Hindi romance-comedy listed for 5 June 2026 with Varun Dhawan, Pooja Hegde and Mrunal Thakur.',
    releaseDate: '2026-06-05',
    catalogueTag: 'Coming soon'
  },
  {
    id: 'real-haunted-echoes-of-the-past',
    title: 'Haunted: Echoes Of The Past',
    duration: 124,
    rating: 7.9,
    category: 'Bollywood',
    genre: 'Horror',
    language: 'Hindi',
    certificate: 'UA 16+',
    synopsis: 'A supernatural horror release listed for 12 June 2026.',
    releaseDate: '2026-06-12',
    catalogueTag: 'Coming soon'
  },
  {
    id: 'real-bharat-bhhagya-vidhaata',
    title: 'Bharat Bhhagya Vidhaata',
    duration: 142,
    rating: 8.2,
    category: 'Bollywood',
    genre: 'Drama / Thriller',
    language: 'Hindi',
    certificate: 'UA',
    synopsis: 'A drama-thriller release listed for 12 June 2026 with Kangana Ranaut.',
    releaseDate: '2026-06-12',
    catalogueTag: 'Coming soon'
  },
  {
    id: 'real-cocktail-2',
    title: 'Cocktail 2',
    duration: 137,
    rating: 8.5,
    category: 'Bollywood',
    genre: 'Romance / Comedy',
    language: 'Hindi',
    certificate: 'UA',
    synopsis: 'A romance-comedy release listed for 19 June 2026.',
    releaseDate: '2026-06-19',
    catalogueTag: 'Most awaited'
  },
  {
    id: 'real-welcome-to-the-jungle',
    title: 'Welcome To The Jungle',
    duration: 150,
    rating: 8.6,
    category: 'Bollywood',
    genre: 'Comedy',
    language: 'Hindi',
    certificate: 'UA',
    synopsis: 'A comedy release listed for 26 June 2026 with Akshay Kumar, Sanjay Dutt and Suniel Shetty.',
    releaseDate: '2026-06-26',
    catalogueTag: 'Most awaited'
  },
  {
    id: 'real-alpha',
    title: 'Alpha',
    duration: 145,
    rating: 8.7,
    category: 'Bollywood',
    genre: 'Action / Thriller',
    language: 'Hindi',
    certificate: 'UA 16+',
    synopsis: 'An action-thriller release listed for 10 July 2026 with Alia Bhatt and Sharvari.',
    releaseDate: '2026-07-10',
    catalogueTag: 'Most awaited'
  },
  {
    id: 'south-pushpa-2-the-rule',
    title: 'Pushpa 2: The Rule',
    duration: 200,
    rating: 8.1,
    category: 'South Indian',
    genre: 'Action / Drama',
    language: 'Telugu',
    certificate: 'UA 16+',
    synopsis: 'Pushpa Raj returns in a high-stakes action drama with larger rivalries and bigger screens.',
    releaseDate: '2024-12-05',
    catalogueTag: 'South blockbuster'
  },
  {
    id: 'south-kalki-2898-ad',
    title: 'Kalki 2898 AD',
    duration: 181,
    rating: 8.0,
    category: 'South Indian',
    genre: 'Sci-Fi / Action',
    language: 'Telugu',
    certificate: 'UA 13+',
    synopsis: 'A mythological sci-fi spectacle set in a futuristic world.',
    releaseDate: '2024-06-27',
    catalogueTag: 'South blockbuster'
  },
  {
    id: 'south-leo',
    title: 'Leo',
    duration: 164,
    rating: 7.8,
    category: 'South Indian',
    genre: 'Action / Thriller',
    language: 'Tamil',
    certificate: 'UA 16+',
    synopsis: 'A cafe owner is pulled into a violent past in this Tamil action thriller.',
    releaseDate: '2023-10-19',
    catalogueTag: 'Fan favourite'
  },
  {
    id: 'south-salaar-part-1-ceasefire',
    title: 'Salaar: Part 1 - Ceasefire',
    duration: 175,
    rating: 7.9,
    category: 'South Indian',
    genre: 'Action / Drama',
    language: 'Telugu',
    certificate: 'UA 16+',
    synopsis: 'A fierce friendship and a kingdom of power collide in a large-scale action drama.',
    releaseDate: '2023-12-22',
    catalogueTag: 'South blockbuster'
  },
  {
    id: 'south-kgf-chapter-2',
    title: 'KGF: Chapter 2',
    duration: 168,
    rating: 8.4,
    category: 'South Indian',
    genre: 'Action / Crime',
    language: 'Kannada',
    certificate: 'UA 16+',
    synopsis: 'Rocky rises against enemies and empires in the explosive sequel.',
    releaseDate: '2022-04-14',
    catalogueTag: 'Fan favourite'
  },
  {
    id: 'south-rrr',
    title: 'RRR',
    duration: 182,
    rating: 8.6,
    category: 'South Indian',
    genre: 'Action / Drama',
    language: 'Telugu',
    certificate: 'UA 13+',
    synopsis: 'Two revolutionaries cross paths in a grand historical action drama.',
    releaseDate: '2022-03-25',
    catalogueTag: 'Fan favourite'
  },
  {
    id: 'hollywood-dune-part-two',
    title: 'Dune: Part Two',
    duration: 166,
    rating: 8.6,
    category: 'Hollywood',
    genre: 'Sci-Fi / Adventure',
    language: 'English',
    certificate: 'UA 13+',
    synopsis: 'Paul Atreides unites with Chani and the Fremen while seeking revenge and destiny.',
    releaseDate: '2024-03-01',
    catalogueTag: 'Hollywood hit'
  },
  {
    id: 'hollywood-deadpool-and-wolverine',
    title: 'Deadpool & Wolverine',
    duration: 128,
    rating: 8.0,
    category: 'Hollywood',
    genre: 'Action / Comedy',
    language: 'English',
    certificate: 'A',
    synopsis: 'Deadpool teams up with Wolverine for a chaotic multiverse adventure.',
    releaseDate: '2024-07-26',
    catalogueTag: 'Hollywood hit'
  },
  {
    id: 'hollywood-oppenheimer',
    title: 'Oppenheimer',
    duration: 180,
    rating: 8.8,
    category: 'Hollywood',
    genre: 'Biography / Drama',
    language: 'English',
    certificate: 'UA 16+',
    synopsis: 'The story of J. Robert Oppenheimer and the creation of the atomic bomb.',
    releaseDate: '2023-07-21',
    catalogueTag: 'Award winner'
  },
  {
    id: 'hollywood-avatar-the-way-of-water',
    title: 'Avatar: The Way of Water',
    duration: 192,
    rating: 7.8,
    category: 'Hollywood',
    genre: 'Sci-Fi / Adventure',
    language: 'English',
    certificate: 'UA 13+',
    synopsis: 'The Sully family explores the ocean clans of Pandora in a visual epic.',
    releaseDate: '2022-12-16',
    catalogueTag: 'Hollywood hit',
    poster: 'https://image.tmdb.org/t/p/w780/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg'
  },
  {
    id: 'hollywood-top-gun-maverick',
    title: 'Top Gun: Maverick',
    duration: 131,
    rating: 8.3,
    category: 'Hollywood',
    genre: 'Action / Drama',
    language: 'English',
    certificate: 'UA 13+',
    synopsis: 'Maverick trains a new generation of pilots for a dangerous mission.',
    releaseDate: '2022-05-27',
    catalogueTag: 'Fan favourite'
  },
  {
    id: 'hollywood-godzilla-x-kong-the-new-empire',
    title: 'Godzilla x Kong: The New Empire',
    duration: 115,
    rating: 7.1,
    category: 'Hollywood',
    genre: 'Action / Adventure',
    language: 'English',
    certificate: 'UA 13+',
    synopsis: 'Godzilla and Kong face a colossal hidden threat from the Hollow Earth.',
    releaseDate: '2024-03-29',
    catalogueTag: 'Hollywood hit'
  },
  {
    id: 'web-panchayat',
    title: 'Panchayat',
    duration: 145,
    rating: 9.0,
    category: 'Web Series',
    genre: 'Comedy / Drama',
    language: 'Hindi',
    certificate: 'UA',
    synopsis: 'Special big-screen binge screening of the beloved rural comedy-drama series.',
    about: 'A theatre-style binge event for Panchayat, focused on village life, warmth, bureaucracy and everyday comedy.',
    cast: ['Jitendra Kumar', 'Neena Gupta', 'Raghubir Yadav', 'Faisal Malik'],
    crew: ['Creator: The Viral Fever', 'Director: Deepak Kumar Mishra'],
    platform: 'Prime Video',
    trailerUrl: 'https://www.youtube.com/results?search_query=Panchayat+official+trailer',
    releaseDate: '2024-05-28',
    catalogueTag: 'Web series special'
  },
  {
    id: 'web-mirzapur',
    title: 'Mirzapur',
    duration: 150,
    rating: 8.5,
    category: 'Web Series',
    genre: 'Crime / Thriller',
    language: 'Hindi',
    certificate: 'A',
    synopsis: 'A special screening experience for the popular crime saga.',
    about: 'A gritty crime drama event built around power, revenge and family politics in Mirzapur.',
    cast: ['Pankaj Tripathi', 'Ali Fazal', 'Shweta Tripathi Sharma', 'Rasika Dugal'],
    crew: ['Creator: Puneet Krishna', 'Director: Gurmmeet Singh'],
    platform: 'Prime Video',
    trailerUrl: 'https://www.youtube.com/results?search_query=Mirzapur+official+trailer',
    releaseDate: '2024-07-05',
    catalogueTag: 'Web series special'
  },
  {
    id: 'web-the-family-man',
    title: 'The Family Man',
    duration: 148,
    rating: 8.7,
    category: 'Web Series',
    genre: 'Action / Thriller',
    language: 'Hindi',
    certificate: 'UA 16+',
    synopsis: 'A curated big-screen event for the espionage thriller series.',
    about: 'A spy-thriller screening event following Srikant Tiwari as he balances national security with family life.',
    cast: ['Manoj Bajpayee', 'Priyamani', 'Sharib Hashmi', 'Samantha Ruth Prabhu'],
    crew: ['Creators: Raj & DK', 'Directors: Raj & DK'],
    platform: 'Prime Video',
    trailerUrl: 'https://www.youtube.com/results?search_query=The+Family+Man+official+trailer',
    releaseDate: '2021-06-04',
    catalogueTag: 'Web series special'
  },
  {
    id: 'web-scam-1992',
    title: 'Scam 1992',
    duration: 155,
    rating: 9.2,
    category: 'Web Series',
    genre: 'Biography / Drama',
    language: 'Hindi',
    certificate: 'UA 13+',
    synopsis: 'A big-screen binge presentation of the stock-market drama series.',
    about: 'A financial drama based on the rise and fall of stockbroker Harshad Mehta.',
    cast: ['Pratik Gandhi', 'Shreya Dhanwanthary', 'Hemant Kher', 'Anjali Barot'],
    crew: ['Director: Hansal Mehta', 'Writer: Sumit Purohit'],
    platform: 'SonyLIV',
    trailerUrl: 'https://www.youtube.com/results?search_query=Scam+1992+official+trailer',
    releaseDate: '2020-10-09',
    catalogueTag: 'Web series special'
  },
  {
    id: 'web-stranger-things',
    title: 'Stranger Things',
    duration: 150,
    rating: 8.7,
    category: 'Web Series',
    genre: 'Sci-Fi / Horror',
    language: 'English',
    certificate: 'UA 16+',
    synopsis: 'A special screening event for the supernatural adventure series.',
    about: 'A supernatural adventure event set around friends, monsters and mysteries from the Upside Down.',
    cast: ['Millie Bobby Brown', 'Finn Wolfhard', 'David Harbour', 'Winona Ryder'],
    crew: ['Creators: The Duffer Brothers'],
    platform: 'Netflix',
    trailerUrl: 'https://www.youtube.com/results?search_query=Stranger+Things+official+trailer',
    releaseDate: '2022-07-01',
    catalogueTag: 'Web series special'
  },
  {
    id: 'web-money-heist',
    title: 'Money Heist',
    duration: 152,
    rating: 8.2,
    category: 'Web Series',
    genre: 'Crime / Thriller',
    language: 'Spanish',
    certificate: 'UA 16+',
    synopsis: 'A big-screen event for the globally popular heist series.',
    about: 'A heist-thriller event following the Professor and his crew through a high-pressure robbery.',
    cast: ['Álvaro Morte', 'Úrsula Corberó', 'Itziar Ituño', 'Pedro Alonso'],
    crew: ['Creator: Álex Pina'],
    platform: 'Netflix',
    trailerUrl: 'https://www.youtube.com/results?search_query=Money+Heist+official+trailer',
    releaseDate: '2021-12-03',
    catalogueTag: 'Web series special'
  },
  {
    id: 'web-taskaree-the-smugglers-web',
    title: "Taskaree: The Smuggler's Web",
    duration: 142,
    rating: 8.1,
    category: 'Web Series',
    genre: 'Crime / Thriller',
    language: 'Hindi',
    certificate: 'UA 16+',
    synopsis: 'A crime thriller about smuggling networks, power games and an investigation that keeps tightening.',
    about: 'A 2026 Netflix India crime-thriller event screening, built around smuggling, surveillance and a cat-and-mouse investigation.',
    cast: ['Neeraj Pandey ensemble'],
    crew: ['Creator: Neeraj Pandey', 'Writer: Vipul K Rawal'],
    platform: 'Netflix',
    trailerUrl: 'https://www.youtube.com/results?search_query=Taskaree+The+Smugglers+Web+official+trailer+Netflix',
    releaseDate: '2026-01-14',
    catalogueTag: 'Trending web series'
  },
  {
    id: 'web-satrangi-badle-ka-khel',
    title: 'Satrangi: Badle Ka Khel',
    duration: 136,
    rating: 7.8,
    category: 'Web Series',
    genre: 'Drama / Thriller',
    language: 'Hindi',
    certificate: 'UA 16+',
    synopsis: 'A revenge drama set in rural Uttar Pradesh with caste, identity and power at its centre.',
    about: 'A ZEE5 Hindi original drama series event about revenge, hierarchy and personal identity in rural India.',
    cast: ['ZEE5 Original ensemble'],
    crew: ['Platform: ZEE5 Global'],
    platform: 'ZEE5',
    trailerUrl: 'https://thebrewnews.com/thebrew-life-news/entertainment/satrangi-trailer-zee5-global-series/',
    releaseDate: '2026-05-22',
    catalogueTag: 'New release web series'
  },
  {
    id: 'web-vimal-khanna',
    title: 'Vimal Khanna',
    duration: 132,
    rating: 7.7,
    category: 'Web Series',
    genre: 'Survival / Thriller',
    language: 'Hindi',
    certificate: 'UA 16+',
    synopsis: 'A gritty survival thriller built around the question of whether Vimal Khanna will survive.',
    about: 'A tense Amazon MX Player series event led by Sunny Hinduja, designed as a survival-thriller screening.',
    cast: ['Sunny Hinduja'],
    crew: ['Platform: Amazon MX Player'],
    platform: 'Amazon MX Player',
    trailerUrl: 'https://www.indiatoday.in/entertainment/ott/story/vimal-khanna-trailer-out-sunny-hinduja-amazon-mx-player-may-15-2910599-2026-05-12',
    releaseDate: '2026-05-15',
    catalogueTag: 'Trending web series'
  },
  {
    id: 'web-detective-dhananjay-rahasyajaal',
    title: 'Detective Dhananjay: Rahasyajaal',
    duration: 128,
    rating: 7.6,
    category: 'Web Series',
    genre: 'Mystery / Crime',
    language: 'Hindi',
    certificate: 'UA 13+',
    synopsis: 'A detective mystery built around hidden clues, layered suspects and a dangerous case.',
    about: 'A ZEE5 mystery-crime event screening based on the 2026 trailer release.',
    cast: ['ZEE5 Original ensemble'],
    crew: ['Platform: ZEE5'],
    platform: 'ZEE5',
    trailerUrl: 'https://www.zee5.com/web-series/details/detective-dhananjay-rahasyajaal/0-6-4z5937801/detective-dhananjay-rahasyajaal-trailer/0-1-6z5937803',
    releaseDate: '2026-05-01',
    catalogueTag: 'New release web series'
  },
  {
    id: 'web-made-in-india-a-titan-story',
    title: 'Made In India: A Titan Story',
    duration: 140,
    rating: 8.0,
    category: 'Web Series',
    genre: 'Biography / Drama',
    language: 'Hindi',
    certificate: 'UA',
    synopsis: 'A vision-led Indian business story about ambition, craft and institution building.',
    about: 'A 2026 Amazon MX Player event based on the Titan story, led by Naseeruddin Shah and Jim Sarbh.',
    cast: ['Naseeruddin Shah', 'Jim Sarbh'],
    crew: ['Platform: Amazon MX Player'],
    platform: 'Amazon MX Player',
    trailerUrl: 'https://www.bollywoodhungama.com/news/features/made-in-india-a-titan-story-trailer-naseeruddin-shah-and-jim-sarbh-lead-the-story-about-a-great-vision-for-india/',
    releaseDate: '2026-05-26',
    catalogueTag: 'New release web series'
  },
  {
    id: 'web-the-boroughs',
    title: 'The Boroughs',
    duration: 150,
    rating: 7.9,
    category: 'Web Series',
    genre: 'Sci-Fi / Mystery',
    language: 'English',
    certificate: 'UA 16+',
    synopsis: 'A mystery sci-fi series event centred on residents confronting a strange threat.',
    about: 'A 2026 Netflix series event highlighted among new Netflix May releases.',
    cast: ['Netflix Original ensemble'],
    crew: ['Platform: Netflix'],
    platform: 'Netflix',
    trailerUrl: 'https://www.youtube.com/results?search_query=The+Boroughs+Netflix+official+trailer',
    releaseDate: '2026-05-21',
    catalogueTag: 'Trending web series'
  },
  {
    id: 'thriller-andhadhun',
    title: 'Andhadhun',
    duration: 139,
    rating: 8.4,
    category: 'Thriller',
    genre: 'Crime / Thriller',
    language: 'Hindi',
    certificate: 'UA 13+',
    synopsis: 'A blind pianist is pulled into a murder mystery full of sharp twists.',
    releaseDate: '2018-10-05',
    catalogueTag: 'Thriller pick'
  },
  {
    id: 'thriller-drishyam-2',
    title: 'Drishyam 2',
    duration: 140,
    rating: 8.2,
    category: 'Thriller',
    genre: 'Mystery / Thriller',
    language: 'Hindi',
    certificate: 'UA 13+',
    synopsis: 'A family secret returns as the police reopen a haunting case.',
    releaseDate: '2022-11-18',
    catalogueTag: 'Thriller pick'
  },
  {
    id: 'thriller-talaash',
    title: 'Talaash',
    duration: 140,
    rating: 7.9,
    category: 'Thriller',
    genre: 'Mystery / Thriller',
    language: 'Hindi',
    certificate: 'UA 13+',
    synopsis: 'A police officer investigates a film star death while confronting grief and secrets.',
    releaseDate: '2012-11-30',
    catalogueTag: 'Mystery night'
  },
  {
    id: 'thriller-kahaani',
    title: 'Kahaani',
    duration: 122,
    rating: 8.1,
    category: 'Thriller',
    genre: 'Mystery / Thriller',
    language: 'Hindi',
    certificate: 'UA',
    synopsis: 'A pregnant woman searches for her missing husband in Kolkata.',
    releaseDate: '2012-03-09',
    catalogueTag: 'Mystery night'
  },
  {
    id: 'thriller-ratsasan',
    title: 'Ratsasan',
    duration: 170,
    rating: 8.3,
    category: 'Thriller',
    genre: 'Crime / Thriller',
    language: 'Tamil',
    certificate: 'UA 16+',
    synopsis: 'A cop hunts a brutal serial killer in a tense psychological thriller.',
    releaseDate: '2018-10-05',
    catalogueTag: 'South thriller'
  },
  {
    id: 'thriller-vikram-vedha',
    title: 'Vikram Vedha',
    duration: 147,
    rating: 8.2,
    category: 'Thriller',
    genre: 'Action / Thriller',
    language: 'Tamil',
    certificate: 'UA 16+',
    synopsis: 'A cop and gangster battle through stories, morality and mind games.',
    releaseDate: '2017-07-21',
    catalogueTag: 'South thriller'
  },
  {
    id: 'thriller-gone-girl',
    title: 'Gone Girl',
    duration: 149,
    rating: 8.1,
    category: 'Thriller',
    genre: 'Mystery / Thriller',
    language: 'English',
    certificate: 'A',
    synopsis: 'A missing woman case turns into a media storm of suspicion and manipulation.',
    releaseDate: '2014-10-03',
    catalogueTag: 'Hollywood thriller'
  },
  {
    id: 'thriller-prisoners',
    title: 'Prisoners',
    duration: 153,
    rating: 8.2,
    category: 'Thriller',
    genre: 'Crime / Thriller',
    language: 'English',
    certificate: 'A',
    synopsis: 'A desperate father and a detective chase answers after two girls disappear.',
    releaseDate: '2013-09-20',
    catalogueTag: 'Hollywood thriller'
  }
];

function requiredToken() {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token || token === 'paste-your-tmdb-api-read-access-token-here') {
    throw new Error('Add TMDB_ACCESS_TOKEN to backend/.env before importing real movies.');
  }
  return token;
}

function hasTmdbToken() {
  const token = process.env.TMDB_ACCESS_TOKEN;
  return Boolean(token && token !== 'paste-your-tmdb-api-read-access-token-here');
}

async function tmdb(pathname) {
  const response = await fetch(`${TMDB_API}${pathname}`, {
    headers: {
      Authorization: `Bearer ${requiredToken()}`,
      accept: 'application/json'
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.status_message || `TMDB request failed (${response.status}).`);
  }
  return data;
}

function localDate(daysAhead) {
  const value = new Date();
  value.setDate(value.getDate() + daysAhead);
  return value.toISOString();
}

function languageName(code) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) || code;
  } catch (error) {
    return code || 'Multiple';
  }
}

function normalizePeople(people = []) {
  return people.map(person => {
    if (person && typeof person === 'object') {
      return {
        name: String(person.name || 'Unknown'),
        role: String(person.role || ''),
        photo: String(person.photo || '')
      };
    }
    return { name: String(person), role: '', photo: '' };
  });
}

function defaultReviews(item) {
  const tag = item.category === 'Web Series' ? 'binge screening' : 'movie';
  return [
    {
      name: 'Aarav',
      rating: Math.min(10, Math.round((Number(item.rating || 8) + 0.4) * 10) / 10),
      text: `Strong ${tag} experience with crisp sound and engaging pacing.`
    },
    {
      name: 'Meera',
      rating: Math.min(10, Math.round((Number(item.rating || 8) + 0.1) * 10) / 10),
      text: 'Loved the atmosphere, clean presentation and easy seat booking flow.'
    },
    {
      name: 'Kabir',
      rating: Math.max(0, Math.round((Number(item.rating || 8) - 0.2) * 10) / 10),
      text: 'Worth watching with friends, especially on the premium screens.'
    }
  ];
}

async function removeFictionalDemoMovies() {
  const batch = db.batch();
  DEMO_MOVIE_IDS.forEach(movieId => {
    batch.delete(db.collection('movies').doc(movieId));
    SHOW_TEMPLATES.forEach(template => {
      batch.delete(db.collection('shows').doc(`${movieId}-${template.suffix}`));
    });
  });
  await batch.commit();
}

function uniqueMovies(...collections) {
  const seen = new Set();
  return collections
    .flat()
    .filter(movie => {
      if (!movie?.id || seen.has(movie.id) || !movie.poster_path) {
        return false;
      }
      seen.add(movie.id);
      return true;
    });
}

async function createShows(movieId, now) {
  for (const template of SHOW_TEMPLATES) {
    const reference = db.collection('shows').doc(`${movieId}-${template.suffix}`);
    const existing = await reference.get();
    const data = {
      movieId,
      theatre: template.theatre,
      auditorium: template.auditorium,
      format: template.format,
      date: localDate(template.daysAhead),
      time: template.time,
      price: template.price,
      source: 'screenify-demo-showtime',
      updatedAt: now
    };
    if (existing.exists) {
      await reference.set(data, { merge: true });
      const existingData = existing.data();
      const existingSeats = Array.isArray(existingData.seats) ? existingData.seats : [];
      if (existingSeats.length < SEAT_COUNT) {
        await reference.set({
          seats: [...existingSeats, ...Array(SEAT_COUNT - existingSeats.length).fill(0)]
        }, { merge: true });
      }
    } else {
      await reference.set({
        ...data,
        seats: Array(SEAT_COUNT).fill(0),
        createdAt: now
      });
    }
  }
}

async function syncMovies() {
  if (!hasTmdbToken()) {
    await seedFallbackRealMovies();
    return;
  }

  const limit = Math.min(Math.max(Number(process.env.TMDB_MOVIE_LIMIT) || 12, 1), 20);
  const [nowPlaying, trending, upcoming] = await Promise.all([
    tmdb('/movie/now_playing?language=en-IN&region=IN&page=1'),
    tmdb('/trending/movie/week?language=en-IN'),
    tmdb('/movie/upcoming?language=en-IN&region=IN&page=1')
  ]);
  const candidates = uniqueMovies(nowPlaying.results, trending.results, upcoming.results).slice(0, limit);

  if (!candidates.length) {
    throw new Error('TMDB returned no now-playing movies with posters for India.');
  }

  await removeFictionalDemoMovies();
  const now = new Date().toISOString();

  for (const item of candidates) {
    const detail = await tmdb(`/movie/${item.id}?language=en-IN`);
    const movieId = `tmdb-${item.id}`;
    const movie = {
      title: detail.title,
      poster: `${TMDB_IMAGE}${detail.poster_path}`,
      backdrop: detail.backdrop_path ? `${TMDB_BACKDROP}${detail.backdrop_path}` : '',
      duration: detail.runtime || 120,
      rating: Math.round(Number(detail.vote_average || 0) * 10) / 10,
      category: 'Hollywood',
      genre: detail.genres.map(genre => genre.name).slice(0, 2).join(' / ') || 'Movie',
      language: languageName(detail.original_language),
      certificate: 'UA',
      synopsis: detail.overview || 'Now playing in cinemas.',
      about: detail.overview || 'Now playing in cinemas.',
      cast: [],
      crew: [],
      reviews: defaultReviews({
        rating: Math.round(Number(detail.vote_average || 0) * 10) / 10,
        category: 'Hollywood'
      }),
      platform: 'Theatre',
      trailerUrl: '',
      releaseDate: detail.release_date || '',
      tmdbId: detail.id,
      source: 'tmdb',
      catalogueTag: item.release_date ? 'New release' : 'Trending',
      popularity: Number(item.popularity || 0),
      updatedAt: now
    };
    await db.collection('movies').doc(movieId).set(
      { ...movie, createdAt: now },
      { merge: true }
    );
    await createShows(movieId, now);
    console.log(`Imported: ${movie.title}`);
  }

  console.log(`Imported ${candidates.length} real trending/new-release movies from TMDB for region IN.`);
  console.log('Showtimes and seat inventory are Screenify demo listings, not live theatre availability.');
}

async function seedFallbackRealMovies() {
  await removeFictionalDemoMovies();
  const now = new Date().toISOString();

  for (const item of FALLBACK_REAL_MOVIES) {
    const movie = {
      title: item.title,
      poster: item.poster || '',
      duration: item.duration,
      rating: item.rating,
      category: item.category || 'Bollywood',
      genre: item.genre,
      language: item.language,
      certificate: item.certificate,
      synopsis: item.synopsis,
      about: item.about || item.synopsis,
      cast: normalizePeople(item.cast || []),
      crew: normalizePeople(item.crew || []),
      reviews: item.reviews || defaultReviews(item),
      platform: item.platform || (item.category === 'Web Series' ? 'OTT' : 'Theatre'),
      trailerUrl: item.trailerUrl || '',
      releaseDate: item.releaseDate,
      catalogueTag: item.catalogueTag,
      source: 'curated-real-release-list',
      updatedAt: now,
      createdAt: now
    };
    await db.collection('movies').doc(item.id).set(movie, { merge: true });
    await createShows(item.id, now);
    console.log(`Seeded real movie: ${item.title}`);
  }

  console.log(`Seeded ${FALLBACK_REAL_MOVIES.length} real new-release/trending movies with demo showtimes.`);
  console.log('Add a valid TMDB_ACCESS_TOKEN later to import live posters and metadata automatically.');
}

syncMovies().catch(error => {
  console.error('TMDB movie import failed:', error.message);
  process.exitCode = 1;
});
