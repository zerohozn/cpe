import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged,
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  Utensils, 
  Users, 
  Clock, 
  ShieldCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  ChevronRight, 
  LogOut, 
  LogIn, 
  Menu as MenuIcon, 
  X, 
  Tv, 
  Calendar, 
  Sparkles, 
  Info, 
  FileText,
  Search,
  Check,
  RotateCcw,
  UserCheck
} from 'lucide-react';

// Firebase Configuration Setup
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "demo-key",
      authDomain: "aling-nenas.firebaseapp.com",
      projectId: "aling-nenas",
      storageBucket: "aling-nenas.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:demo"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'aling-nenas-carinderia';

const INITIAL_MENU = [
  {
    dishName: "Pork Sinigang sa Sampalok",
    category: "Sabaw",
    price: 110,
    status: "Available",
    day: "Today",
    description: "Tender pork ribs cooked in savory and sour tamarind broth with fresh kangkong and radish.",
    imageUrl: "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80"
  },
  {
    dishName: "Sizzling Pork Sisig",
    category: "Ulam",
    price: 120,
    status: "Available",
    day: "Today",
    description: "Crispy chopped pork belly served with calamansi, chili peppers, and topped with fresh egg.",
    imageUrl: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80"
  },
  {
    dishName: "Chicken Chicken Adobo",
    category: "Ulam",
    price: 95,
    status: "Available",
    day: "Both",
    description: "Classic braised chicken marinated in garlic, soy sauce, vinegar, and bay leaves.",
    imageUrl: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&q=80"
  },
  {
    dishName: "Beef Caldereta",
    category: "Ulam",
    price: 130,
    status: "Sold Out",
    day: "Today",
    description: "Rich beef stew rendered in tomato sauce with liver spread, bell peppers, and potatoes.",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80"
  },
  {
    dishName: "Pinakbet Tagalog",
    category: "Ulam",
    price: 75,
    status: "Available",
    day: "Tomorrow",
    description: "Sautéed local vegetables in bagoong alamang topped with crispy bagnet slices.",
    imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80"
  },
  {
    dishName: "Halo-Halo Special",
    category: "Dessert",
    price: 85,
    status: "Available",
    day: "Both",
    description: "Shaved ice dessert with sweetened beans, leche flan, ube halaya, and ice cream.",
    imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80"
  }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('Customer'); // 'Customer', 'Staff', 'Admin'
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'menu', 'queue', 'manage', 'readme'
  const [menuDayFilter, setMenuDayFilter] = useState('Today'); // 'Today', 'Tomorrow'
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Database collections state
  const [menuItems, setMenuItems] = useState([]);
  const [queueTickets, setQueueTickets] = useState([]);
  const [isDbLoading, setIsDbLoading] = useState(true);

  // Form & Modal States
  const [showDishModal, setShowDishModal] = useState(false);
  const [currentDish, setCurrentDish] = useState(null); // null for new, object for edit
  const [deleteTargetDish, setDeleteTargetDish] = useState(null);
  const [dishFormData, setDishFormData] = useState({
    dishName: '',
    category: 'Ulam',
    price: '',
    status: 'Available',
    day: 'Today',
    description: '',
    imageUrl: ''
  });
  const [formError, setFormError] = useState('');

  // Queue Modal State for Customers
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketType, setTicketType] = useState('Dine-in');
  const [customerName, setCustomerName] = useState('');
  const [myTicket, setMyTicket] = useState(null);
  const [readmeOpen, setReadmeOpen] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Initialization Error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // Sync Menu Items and Queue Tickets from Firestore
  useEffect(() => {
    if (!user) return;

    const menuRef = collection(db, 'artifacts', appId, 'public', 'data', 'menu');
    const queueRef = collection(db, 'artifacts', appId, 'public', 'data', 'queue');

    // Subscribe to Menu
    const unsubscribeMenu = onSnapshot(menuRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Seed default menu if empty
      if (items.length === 0) {
        INITIAL_MENU.forEach(async (dish) => {
          await addDoc(menuRef, dish);
        });
      } else {
        setMenuItems(items);
      }
      setIsDbLoading(false);
    }, (err) => {
      console.error("Menu Firestore sync error:", err);
      setIsDbLoading(false);
    });

    // Subscribe to Queue
    const unsubscribeQueue = onSnapshot(queueRef, (snapshot) => {
      const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by ticket creation time
      tickets.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setQueueTickets(tickets);
    }, (err) => {
      console.error("Queue Firestore sync error:", err);
    });

    return () => {
      unsubscribeMenu();
      unsubscribeQueue();
    };
  }, [user]);

  const handleRoleSelect = (role) => {
    setUserRole(role);
    if (role === 'Customer' && activeTab === 'manage') {
      setActiveTab('menu');
    }
  };

  const handleOpenDishModal = (dish = null) => {
    setFormError('');
    if (dish) {
      setCurrentDish(dish);
      setDishFormData({
        dishName: dish.dishName || '',
        category: dish.category || 'Ulam',
        price: dish.price || '',
        status: dish.status || 'Available',
        day: dish.day || 'Today',
        description: dish.description || '',
        imageUrl: dish.imageUrl || ''
      });
    } else {
      setCurrentDish(null);
      setDishFormData({
        dishName: '',
        category: 'Ulam',
        price: '',
        status: 'Available',
        day: 'Today',
        description: '',
        imageUrl: ''
      });
    }
    setShowDishModal(true);
  };

  const handleSaveDish = async (e) => {
    e.preventDefault();
    setFormError('');

    // Form Validation
    if (!dishFormData.dishName.trim()) {
      setFormError('Please enter a dish name.');
      return;
    }
    if (!dishFormData.price || Number(dishFormData.price) <= 0) {
      setFormError('Please enter a valid price greater than 0.');
      return;
    }

    const payload = {
      dishName: dishFormData.dishName.trim(),
      category: dishFormData.category,
      price: Number(dishFormData.price),
      status: dishFormData.status,
      day: dishFormData.day,
      description: dishFormData.description.trim() || 'Delicious home-style cooking.',
      imageUrl: dishFormData.imageUrl.trim() || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80'
    };

    try {
      const menuRef = collection(db, 'artifacts', appId, 'public', 'data', 'menu');
      if (currentDish) {
        const dishDoc = doc(db, 'artifacts', appId, 'public', 'data', 'menu', currentDish.id);
        await updateDoc(dishDoc, payload);
      } else {
        await addDoc(menuRef, payload);
      }
      setShowDishModal(false);
    } catch (err) {
      console.error("Error saving dish:", err);
      setFormError('Failed to save dish. Please try again.');
    }
  };

  const handleDeleteDish = async () => {
    if (!deleteTargetDish) return;
    try {
      const dishDoc = doc(db, 'artifacts', appId, 'public', 'data', 'menu', deleteTargetDish.id);
      await deleteDoc(dishDoc);
      setDeleteTargetDish(null);
    } catch (err) {
      console.error("Error deleting dish:", err);
    }
  };

  const handleGenerateTicket = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    // Generate Ticket Number e.g. A-101
    const prefix = ticketType === 'Dine-in' ? 'D' : 'T';
    const num = Math.floor(100 + Math.random() * 900);
    const ticketNumber = `${prefix}-${num}`;

    const newTicket = {
      ticketNumber,
      customerName: customerName.trim(),
      type: ticketType,
      status: 'Waiting', // 'Waiting', 'Preparing', 'Serving', 'Completed', 'Cancelled'
      createdAt: Date.now()
    };

    try {
      const queueRef = collection(db, 'artifacts', appId, 'public', 'data', 'queue');
      const docRef = await addDoc(queueRef, newTicket);
      const created = { id: docRef.id, ...newTicket };
      setMyTicket(created);
      setShowTicketModal(false);
      setCustomerName('');
    } catch (err) {
      console.error("Error creating queue ticket:", err);
    }
  };

  const handleUpdateTicketStatus = async (ticketId, nextStatus) => {
    try {
      const ticketDoc = doc(db, 'artifacts', appId, 'public', 'data', 'queue', ticketId);
      await updateDoc(ticketDoc, { status: nextStatus });
    } catch (err) {
      console.error("Error updating ticket status:", err);
    }
  };

  const handleResetQueue = async () => {
    if (!window.confirm("Are you sure you want to clear all active tickets?")) return;
    try {
      queueTickets.forEach(async (t) => {
        const ticketDoc = doc(db, 'artifacts', appId, 'public', 'data', 'queue', t.id);
        await deleteDoc(ticketDoc);
      });
      setMyTicket(null);
    } catch (err) {
      console.error("Error clearing queue:", err);
    }
  };

  const filteredDishes = useMemo(() => {
    return menuItems.filter(dish => {
      const matchesDay = dish.day === 'Both' || dish.day === menuDayFilter;
      const matchesCategory = categoryFilter === 'All' || dish.category === categoryFilter;
      return matchesDay && matchesCategory;
    });
  }, [menuItems, menuDayFilter, categoryFilter]);

  // Queue ticket classification
  const nowServingTickets = useMemo(() => queueTickets.filter(t => t.status === 'Serving'), [queueTickets]);
  const preparingTickets = useMemo(() => queueTickets.filter(t => t.status === 'Preparing'), [queueTickets]);
  const waitingTickets = useMemo(() => queueTickets.filter(t => t.status === 'Waiting'), [queueTickets]);

  return (
    <div className="min-h-screen bg-amber-50/50 text-slate-800 font-sans flex flex-col selection:bg-amber-200">
      
      {}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Business Logo / Title */}
            <div 
              onClick={() => setActiveTab('home')}
              className="flex items-center space-x-3 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                <Utensils className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 group-hover:text-amber-600 transition-colors">
                  Aling Nena's <span className="text-amber-600 font-extrabold">Carinderia</span>
                </h1>
                <p className="text-xs text-amber-700 font-medium">Lutong Bahay & Instant Queue</p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'home' ? 'bg-amber-100 text-amber-900' : 'text-slate-600 hover:text-slate-900 hover:bg-amber-50'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => setActiveTab('menu')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'menu' ? 'bg-amber-100 text-amber-900' : 'text-slate-600 hover:text-slate-900 hover:bg-amber-50'
                }`}
              >
                Today's Menu
              </button>
              <button
                onClick={() => setActiveTab('queue')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'queue' ? 'bg-amber-100 text-amber-900' : 'text-slate-600 hover:text-slate-900 hover:bg-amber-50'
                }`}
              >
                <Tv className="w-4 h-4 text-amber-600" />
                <span>Live Queue</span>
                {nowServingTickets.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                )}
              </button>
              
              {(userRole === 'Staff' || userRole === 'Admin') && (
                <button
                  onClick={() => setActiveTab('manage')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                    activeTab === 'manage' ? 'bg-amber-600 text-white shadow-md' : 'text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Staff Control Panel</span>
                </button>
              )}
            </nav>

            {/* Role Switcher & Disclosure Modal Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setReadmeOpen(true)}
                className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                title="View Requirements & AI Disclosure"
              >
                <FileText className="w-5 h-5" />
              </button>

              {/* Access Role Selector */}
              <div className="relative bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200">
                <button
                  onClick={() => handleRoleSelect('Customer')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    userRole === 'Customer' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Customer
                </button>
                <button
                  onClick={() => handleRoleSelect('Staff')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    userRole === 'Staff' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Staff
                </button>
                <button
                  onClick={() => handleRoleSelect('Admin')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    userRole === 'Admin' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>

          </div>
        </div>
      </header>

      {}
      <main className="flex-grow">
        
        {/* ==================== 1. LANDING PAGE ==================== */}
        {activeTab === 'home' && (
          <div className="space-y-16 py-8">
            
            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-amber-950 to-orange-950 text-white p-8 md:p-16 shadow-2xl">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]"></div>
                
                <div className="relative z-10 max-w-2xl space-y-6">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>authentic Filipino Home Cooking Daily</span>
                  </div>

                  <h2 className="text-3xl sm:text-5xl font-black leading-tight tracking-tight">
                    Mainit, Masarap, at <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-amber-200">
                      Laging Bagong Luto!
                    </span>
                  </h2>

                  <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
                    Welcome to Aling Nena's Carinderia! Check today's fresh cooked menu, plan tomorrow's cravings, or skip the physical line using our real-time digital queue system.
                  </p>

                  <div className="flex flex-wrap gap-4 pt-4">
                    <button
                      onClick={() => setActiveTab('menu')}
                      className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:brightness-110 shadow-lg shadow-orange-900/40 transition-all flex items-center space-x-2"
                    >
                      <Utensils className="w-5 h-5" />
                      <span>View Today's Dishes</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setActiveTab('queue');
                        setShowTicketModal(true);
                      }}
                      className="px-6 py-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold hover:bg-white/20 transition-all flex items-center space-x-2"
                    >
                      <Users className="w-5 h-5" />
                      <span>Get a Queue Ticket</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Features & Highlights */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <h3 className="text-2xl font-bold text-slate-900">Why Dine With Aling Nena?</h3>
                <p className="text-slate-600 text-sm mt-2">Connecting traditional turo-turo hospitality with modern digital convenience.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-white p-6 rounded-3xl border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mb-4">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">Today & Tomorrow's Menu</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Know exactly what dish is simmering today and preview tomorrow's specials to plan your meals ahead.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 mb-4">
                    <Tv className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">Live Queue Monitoring</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    No more waiting squeezed in line! Take a token on your phone and monitor the live TV display board in real-time.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">Fresh Daily Ingredients</h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Cooked with love every morning using fresh, locally sourced meat, fish, and market-vegetables.
                  </p>
                </div>
              </div>
            </section>

            {/* Featured Menu Snapshot */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Today's Specialties</h3>
                  <p className="text-slate-500 text-sm">Freshly prepared dish recommendations for today.</p>
                </div>
                <button
                  onClick={() => setActiveTab('menu')}
                  className="text-amber-600 font-bold hover:underline flex items-center space-x-1"
                >
                  <span>See All Dishes</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems.slice(0, 3).map((dish) => (
                  <div key={dish.id} className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                    <div className="h-48 relative overflow-hidden bg-slate-100">
                      <img 
                        src={dish.imageUrl} 
                        alt={dish.dishName} 
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'; }}
                      />
                      <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold shadow-md ${
                        dish.status === 'Available' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                      }`}>
                        {dish.status}
                      </span>
                    </div>
                    <div className="p-5 flex-grow flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-900 text-lg">{dish.dishName}</h4>
                          <span className="text-amber-600 font-black text-lg">₱{dish.price}</span>
                        </div>
                        <p className="text-slate-500 text-xs line-clamp-2 mb-4">{dish.description}</p>
                      </div>
                      <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-medium">
                        <span>Category: {dish.category}</span>
                        <span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg">{dish.day}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        )}

        {/* ==================== 2. MENU SYSTEM (CUSTOMER VIEW) ==================== */}
        {activeTab === 'menu' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-amber-100 shadow-sm">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Daily Carinderia Menu</h2>
                <p className="text-slate-500 text-sm mt-1">Browse savory home-cooked meals prepared with care.</p>
              </div>

              {/* Day Toggle Switch */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start md:self-auto">
                <button
                  onClick={() => setMenuDayFilter('Today')}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 ${
                    menuDayFilter === 'Today' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Today's Menu</span>
                </button>
                <button
                  onClick={() => setMenuDayFilter('Tomorrow')}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 ${
                    menuDayFilter === 'Tomorrow' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Tomorrow's Menu</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
              {['All', 'Ulam', 'Sabaw', 'Dessert', 'Rice/Extras'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    categoryFilter === cat 
                      ? 'bg-slate-900 text-white shadow-sm' 
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Dishes Display Grid */}
            {isDbLoading ? (
              <div className="text-center py-16">
                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-500 text-sm">Fetching daily dishes from kitchen...</p>
              </div>
            ) : filteredDishes.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8">
                <Utensils className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-700 text-lg">No Dishes Scheduled</h3>
                <p className="text-slate-500 text-xs mt-1">There are no dishes listed for this category or schedule yet.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDishes.map((dish) => (
                  <div key={dish.id} className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                    <div className="h-52 relative overflow-hidden bg-slate-100">
                      <img 
                        src={dish.imageUrl} 
                        alt={dish.dishName} 
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'; }}
                      />
                      <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold shadow-md ${
                        dish.status === 'Available' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                      }`}>
                        {dish.status}
                      </span>
                      <span className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-lg font-semibold">
                        {dish.category}
                      </span>
                    </div>

                    <div className="p-6 flex-grow flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-slate-900 text-lg leading-snug">{dish.dishName}</h3>
                          <span className="text-amber-600 font-black text-xl">₱{dish.price}</span>
                        </div>
                        <p className="text-slate-500 text-xs leading-relaxed mb-4">{dish.description}</p>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-xs text-slate-400">Serving: <strong className="text-slate-700">{dish.day}</strong></span>
                        <button
                          onClick={() => {
                            setActiveTab('queue');
                            setShowTicketModal(true);
                          }}
                          disabled={dish.status === 'Sold Out'}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                            dish.status === 'Available'
                              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {dish.status === 'Available' ? 'Order via Queue' : 'Unavailable'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== 3. DIGITAL QUEUEING SYSTEM ==================== */}
        {activeTab === 'queue' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            
            {/* Header & Generate Ticket CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white p-6 rounded-3xl shadow-lg">
              <div>
                <h2 className="text-2xl font-black">Digital Ordering Queue Display</h2>
                <p className="text-amber-100 text-sm mt-1">Track your order number in real-time on our live board.</p>
              </div>
              
              <button
                onClick={() => setShowTicketModal(true)}
                className="px-6 py-3 bg-white text-amber-900 font-bold rounded-2xl hover:bg-amber-50 transition-colors shadow-md flex items-center justify-center space-x-2 self-start sm:self-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Get Queue Ticket Number</span>
              </button>
            </div>

            {/* My Ticket Active Card Banner */}
            {myTicket && (
              <div className="bg-emerald-500 text-white p-6 rounded-3xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black">
                    {myTicket.ticketNumber}
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-100">Your Ticket</span>
                    <h3 className="text-xl font-bold">{myTicket.customerName} ({myTicket.type})</h3>
                    <p className="text-emerald-100 text-xs">Current Status: <span className="font-extrabold underline">{myTicket.status}</span></p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-emerald-100">Show this ticket at the counter when called.</span>
                </div>
              </div>
            )}

            {/* Live TV Screen Queue Board Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* NOW SERVING */}
              <div className="bg-white rounded-3xl border-2 border-emerald-500 overflow-hidden shadow-md">
                <div className="bg-emerald-500 text-white p-4 font-black text-center text-lg tracking-wide uppercase flex items-center justify-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-white animate-ping"></span>
                  <span>Now Serving</span>
                </div>
                <div className="p-6 min-h-[240px] flex flex-col items-center justify-center space-y-4">
                  {nowServingTickets.length === 0 ? (
                    <p className="text-slate-400 text-sm font-medium">No ticket currently at counter</p>
                  ) : (
                    nowServingTickets.map(ticket => (
                      <div key={ticket.id} className="text-center bg-emerald-50 p-4 rounded-2xl w-full border border-emerald-100">
                        <span className="text-4xl font-black text-emerald-700 block">{ticket.ticketNumber}</span>
                        <span className="text-slate-700 font-bold text-sm block mt-1">{ticket.customerName}</span>
                        <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md inline-block mt-1 font-semibold">{ticket.type}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* PREPARING */}
              <div className="bg-white rounded-3xl border-2 border-amber-400 overflow-hidden shadow-md">
                <div className="bg-amber-400 text-slate-900 p-4 font-black text-center text-lg tracking-wide uppercase">
                  Preparing
                </div>
                <div className="p-6 min-h-[240px] space-y-3">
                  {preparingTickets.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-12 font-medium">No dishes in preparation</p>
                  ) : (
                    preparingTickets.map(ticket => (
                      <div key={ticket.id} className="flex justify-between items-center p-3 bg-amber-50 rounded-2xl border border-amber-100">
                        <div>
                          <span className="font-black text-amber-900 text-lg block">{ticket.ticketNumber}</span>
                          <span className="text-xs text-slate-600 font-semibold">{ticket.customerName}</span>
                        </div>
                        <span className="text-xs bg-amber-200 text-amber-900 px-2.5 py-1 rounded-lg font-bold">{ticket.type}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* WAITING */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-slate-800 text-white p-4 font-black text-center text-lg tracking-wide uppercase">
                  Waiting List ({waitingTickets.length})
                </div>
                <div className="p-6 min-h-[240px] space-y-3 max-h-[360px] overflow-y-auto">
                  {waitingTickets.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-12 font-medium">Queue is currently clear</p>
                  ) : (
                    waitingTickets.map(ticket => (
                      <div key={ticket.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div>
                          <span className="font-bold text-slate-800 text-base block">{ticket.ticketNumber}</span>
                          <span className="text-xs text-slate-500">{ticket.customerName}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-medium">{ticket.type}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==================== 4. STAFF & ADMIN PANEL ==================== */}
        {activeTab === 'manage' && (userRole === 'Staff' || userRole === 'Admin') && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
            
            {/* Header Control Panel */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-lg">
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase ${
                    userRole === 'Admin' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-900'
                  }`}>
                    {userRole} Mode
                  </span>
                  <h2 className="text-2xl font-black">Staff Control Center</h2>
                </div>
                <p className="text-slate-400 text-sm mt-1">Manage kitchen menu dishes and control digital queue operations.</p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleOpenDishModal()}
                  className="px-5 py-2.5 bg-amber-500 text-slate-900 font-bold rounded-2xl hover:bg-amber-400 transition-colors shadow-md flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Dish</span>
                </button>
              </div>
            </div>

            {/* QUEUE CONTROL MANAGEMENT */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Active Queue Management</h3>
                  <p className="text-xs text-slate-500">Advance customer tickets through preparation and serving stages.</p>
                </div>

                {userRole === 'Admin' && (
                  <button
                    onClick={handleResetQueue}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Active Queue</span>
                  </button>
                )}
              </div>

              {queueTickets.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled').length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">No active tickets waiting in line.</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {queueTickets.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled').map(ticket => (
                    <div key={ticket.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xl font-black text-slate-900">{ticket.ticketNumber}</span>
                          <h4 className="text-sm font-bold text-slate-700">{ticket.customerName}</h4>
                          <span className="text-xs text-slate-400">{ticket.type}</span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          ticket.status === 'Serving' ? 'bg-emerald-100 text-emerald-800' :
                          ticket.status === 'Preparing' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-2">
                        {ticket.status === 'Waiting' && (
                          <button
                            onClick={() => handleUpdateTicketStatus(ticket.id, 'Preparing')}
                            className="px-3 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600"
                          >
                            Mark Preparing
                          </button>
                        )}
                        {ticket.status === 'Preparing' && (
                          <button
                            onClick={() => handleUpdateTicketStatus(ticket.id, 'Serving')}
                            className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                          >
                            Call to Counter
                          </button>
                        )}
                        {ticket.status === 'Serving' && (
                          <button
                            onClick={() => handleUpdateTicketStatus(ticket.id, 'Completed')}
                            className="px-3 py-1 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900"
                          >
                            Finish Order
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateTicketStatus(ticket.id, 'Cancelled')}
                          className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MENU DISHES CRUD TABLE */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Menu Dish Items (CRUD)</h3>
                  <p className="text-xs text-slate-500">Create, edit prices, update availability, or delete entries.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider rounded-xl">
                    <tr>
                      <th className="py-3 px-4 rounded-l-xl">Dish</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Price (PHP)</th>
                      <th className="py-3 px-4">Schedule</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right rounded-r-xl">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {menuItems.map((dish) => (
                      <tr key={dish.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center space-x-3">
                          <img 
                            src={dish.imageUrl} 
                            alt={dish.dishName} 
                            className="w-10 h-10 rounded-xl object-cover"
                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'; }}
                          />
                          <div>
                            <span className="block text-sm">{dish.dishName}</span>
                            <span className="text-[10px] text-slate-400 line-clamp-1">{dish.description}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold">{dish.category}</td>
                        <td className="py-3.5 px-4 font-black text-amber-600">₱{dish.price}</td>
                        <td className="py-3.5 px-4 font-medium">
                          <span className="bg-amber-50 text-amber-800 px-2 py-1 rounded-md">{dish.day}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-1 rounded-md font-bold text-[10px] ${
                            dish.status === 'Available' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {dish.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleOpenDishModal(dish)}
                              className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                              title="Edit Dish"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {userRole === 'Admin' && (
                              <button
                                onClick={() => setDeleteTargetDish(dish)}
                                className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                                title="Delete Dish"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {}
      
      {/* 1. ADD / EDIT DISH MODAL */}
      {showDishModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-900">
                {currentDish ? 'Edit Dish Entry' : 'Add New Carinderia Dish'}
              </h3>
              <button 
                onClick={() => setShowDishModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 text-rose-700 p-3 rounded-2xl text-xs font-semibold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDish} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dish Name *</label>
                <input
                  type="text"
                  value={dishFormData.dishName}
                  onChange={(e) => setDishFormData({...dishFormData, dishName: e.target.value})}
                  placeholder="e.g. Chicken Adobo"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={dishFormData.category}
                    onChange={(e) => setDishFormData({...dishFormData, category: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Ulam">Ulam (Main)</option>
                    <option value="Sabaw">Sabaw (Soup)</option>
                    <option value="Dessert">Dessert</option>
                    <option value="Rice/Extras">Rice/Extras</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price (₱ PHP) *</label>
                  <input
                    type="number"
                    value={dishFormData.price}
                    onChange={(e) => setDishFormData({...dishFormData, price: e.target.value})}
                    placeholder="95"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Served Schedule</label>
                  <select
                    value={dishFormData.day}
                    onChange={(e) => setDishFormData({...dishFormData, day: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Today">Today Only</option>
                    <option value="Tomorrow">Tomorrow Only</option>
                    <option value="Both">Both Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Availability Status</label>
                  <select
                    value={dishFormData.status}
                    onChange={(e) => setDishFormData({...dishFormData, status: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Available">Available</option>
                    <option value="Sold Out">Sold Out</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Image URL</label>
                <input
                  type="text"
                  value={dishFormData.imageUrl}
                  onChange={(e) => setDishFormData({...dishFormData, imageUrl: e.target.value})}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows="2"
                  value={dishFormData.description}
                  onChange={(e) => setDishFormData({...dishFormData, description: e.target.value})}
                  placeholder="Brief description of flavors and ingredients..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDishModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-900 font-bold text-sm hover:bg-amber-400 shadow-md"
                >
                  Save Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. CONFIRM DELETE MODAL */}
      {deleteTargetDish && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Confirm Dish Deletion</h3>
            <p className="text-slate-500 text-sm">
              Are you sure you want to remove <strong className="text-slate-900">{deleteTargetDish.dishName}</strong> from the menu database?
            </p>
            <div className="flex justify-center space-x-3 pt-2">
              <button
                onClick={() => setDeleteTargetDish(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50"
              >
                Keep Dish
              </button>
              <button
                onClick={handleDeleteDish}
                className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 shadow-md"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CUSTOMER GET TICKET MODAL */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-900">Request Queue Token</h3>
              <button 
                onClick={() => setShowTicketModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Your Name / Identifier *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Order Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTicketType('Dine-in')}
                    className={`py-3 rounded-2xl font-bold text-sm border transition-all ${
                      ticketType === 'Dine-in'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Dine-In
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketType('Take-out')}
                    className={`py-3 rounded-2xl font-bold text-sm border transition-all ${
                      ticketType === 'Take-out'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Take-Out
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 text-slate-900 font-black rounded-2xl hover:bg-amber-400 transition-colors shadow-md mt-2"
              >
                Generate Ticket
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. README & AI DISCLOSURE MODAL */}
      {readmeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 sticky top-0 bg-white">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <h3 className="text-xl font-bold text-slate-900">Project Requirements & AI Disclosure</h3>
              </div>
              <button 
                onClick={() => setReadmeOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
              <section>
                <h4 className="font-bold text-slate-900 text-sm mb-1">1. Business Name & Problem Solved</h4>
                <p>
                  <strong>Aling Nena's Carinderia</strong> solves physical queue chaos and manual menu board updates at local diners. Customers can preview Today and Tomorrow's menu from their phones and take digital queue tokens without standing in crowded lines.
                </p>
              </section>

              <section>
                <h4 className="font-bold text-slate-900 text-sm mb-1">2. Tech Stack</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Frontend:</strong> React, Tailwind CSS, Lucide Icons</li>
                  <li><strong>Backend & Database:</strong> Firebase Firestore (Realtime Sync)</li>
                  <li><strong>Authentication:</strong> Firebase Auth</li>
                </ul>
              </section>

              <section>
                <h4 className="font-bold text-slate-900 text-sm mb-1">3. AI Tools Used Disclosure</h4>
                <p>
                  Developed using <strong>Gemini AI Code Generation Tools</strong>. Used for architecting state handlers, real-time Firestore synchronization patterns, responsive layout styling, and generating seed dishes.
                </p>
              </section>

              <section>
                <h4 className="font-bold text-slate-900 text-sm mb-1">4. Access Test Roles</h4>
                <p>Use the role switch selector at the top right header to instantly toggle levels:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li><strong>Customer:</strong> View menu, request queue tokens, track queue display.</li>
                  <li><strong>Staff:</strong> Advance queue ticket status, edit menu dishes.</li>
                  <li><strong>Admin:</strong> Full CRUD on dishes (including delete confirmation), reset queue list.</li>
                </ul>
              </section>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setReadmeOpen(false)}
                className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800"
              >
                Close Documentation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p>© {new Date().getFullYear()} Aling Nena's Carinderia - Digital Ordering & Queue System.</p>
          <p className="text-slate-500">Built with React, Firebase Firestore, and Tailwind CSS.</p>
        </div>
      </footer>

    </div>
  );
}