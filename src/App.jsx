import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminDashboard from './AdminDashboard'; 
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for React-Leaflet missing marker icons natively
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Red Icon for Crisis Events
const crisisIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

<<<<<<< HEAD
=======
// Custom Blue Icon for Standard Breaking News
const newsIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom Green Icon for User's Live Location
const userLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom Green Icon for User's Live Location
const userLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

>>>>>>> 75280cb1906eabf107b6f8afb1e9362567bf645a
// --- Icons ---
const MapPinIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ShieldCheckIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const SearchIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ThumbsUpIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
  </svg>
);

const ThumbsDownIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
  </svg>
);

const LayersIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const ClockIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertTriangleIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const formatDateTime = (dateString) => {
  if (!dateString) return "Unknown Date";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; 
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
  });
};

function NewsFeed() {
  const [activeRegion, setActiveRegion] = useState("Dhaka");
  
  // Filter States
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeSource, setActiveSource] = useState("All");
  const [searchQuery, setSearchQuery] = useState(""); // NEW: Search state
  
  // Alert & Location State (Feature 6)
  const [activeAlert, setActiveAlert] = useState(null); // Passive region alert
  const [localCrisisAlert, setLocalCrisisAlert] = useState(null); // Active GPS proximity alert
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCrises, setMapCrises] = useState([]);
  const [mapNews, setMapNews] = useState([]); // Array of grouped articles by region
  const [selectedRegionForSidebar, setSelectedRegionForSidebar] = useState(null); // The region currently clicked on map
  
  const [expandedSummaries, setExpandedSummaries] = useState({});
  const [newsFeed, setNewsFeed] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Authentication State ---
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('kagojer_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login"); 
  const [localVotes, setLocalVotes] = useState({});
  const [followedSources, setFollowedSources] = useState([]);
  
  // Form State
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const fetchNews = async () => {
      setIsLoading(true);
      try {
        let endpoint = `https://kagojerstup.onrender.com/api/news?region=${activeRegion}`;
        if (currentUser && currentUser.userId) {
           endpoint = `https://kagojerstup.onrender.com/api/news/personalized?region=${activeRegion}&userId=${currentUser.userId}`;
        }
        const response = await fetch(endpoint);
        const data = await response.json();
        setNewsFeed(Array.isArray(data) ? data : []);
        
        // Reset sub-filters when region changes
        setActiveCategory("All");
        setActiveSource("All");
        setSearchQuery(""); // Reset search on region change
        setExpandedSummaries({});
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch news:", error);
        setIsLoading(false);
      }
    };
    fetchNews();

    // Fetch Active Crises for the Map
    const fetchMapCrises = async () => {
      try {
        const response = await fetch('https://kagojerstup.onrender.com/api/crises');
        if (response.ok) setMapCrises(await response.json());
      } catch (error) {
        console.error("Failed to fetch map crises:", error);
      }
    };
    fetchMapCrises();
  }, [activeRegion, currentUser]); 

  // Passive alerts based on region dropdown
  useEffect(() => {
    const checkAlerts = async () => {
      if (activeRegion === 'All') {
        setActiveAlert(null);
        return;
      }
      try {
        const response = await fetch(`https://kagojerstup.onrender.com/api/alerts?region=${activeRegion}`);
        const data = await response.json();
        setActiveAlert((data && data.length > 0) ? data[0] : null);
      } catch (error) {
        console.error("Failed to check alerts:", error);
      }
    };
    checkAlerts(); 
    const intervalId = setInterval(checkAlerts, 30000); 
    return () => clearInterval(intervalId); 
  }, [activeRegion]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) {
        setLocalVotes({}); 
        setFollowedSources([]);
        return;
      }
      try {
        const voteRes = await fetch(`https://kagojerstup.onrender.com/api/user-votes/${currentUser.userId}`);
        if (voteRes.ok) setLocalVotes(await voteRes.json()); 

        const followRes = await fetch(`https://kagojerstup.onrender.com/api/user-follows/${currentUser.userId}`);
        if (followRes.ok) setFollowedSources(await followRes.json());
      } catch (error) {
        console.error("Failed to load user data:", error);
      }
    };
    fetchUserData();
  }, [currentUser]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    const endpoint = authMode === "login" ? "/api/login" : "/api/signup";
    const payload = authMode === "login" ? { email: authEmail, password: authPassword } : { name: authName, email: authEmail, password: authPassword };
    try {
      const response = await fetch(`https://kagojerstup.onrender.com${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Authentication failed");

      if (authMode === "signup") {
        setAuthMode("login");
        setAuthError("Signup successful! Please log in.");
        setAuthPassword(""); 
      } else {
        setCurrentUser(data);
        localStorage.setItem('kagojer_user', JSON.stringify(data)); 
        setIsAuthModalOpen(false);
        setAuthEmail("");
        setAuthPassword("");
      }
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('kagojer_user');
  };

  const handleVote = async (articleId, voteType) => {
    if (!currentUser) {
      setAuthMode("login");
      setIsAuthModalOpen(true);
      return;
    }
    const previousVote = localVotes[articleId];

    if (previousVote === voteType) {
      setNewsFeed(prevFeed => prevFeed.map(news => {
        if (news.id === articleId) {
          let newScore = news.score;
          let newReal = news.realVotes || 0;
          let newFake = news.fakeVotes || 0;
          if (voteType === 'vote_real') { newReal = Math.max(0, newReal - 1); newScore = Math.max(0, newScore - 2); } 
          else if (voteType === 'vote_fake') { newFake = Math.max(0, newFake - 1); newScore = Math.min(100, newScore + 5); }
          return { ...news, score: newScore, realVotes: newReal, fakeVotes: newFake };
        }
        return news;
      }));
      setLocalVotes(prev => { const newState = { ...prev }; delete newState[articleId]; return newState; });
      try {
        await fetch('https://kagojerstup.onrender.com/api/remove-vote', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUser.userId, articleId })
        });
      } catch (error) { console.error("Failed to remove vote:", error); }
      return; 
    }

    setNewsFeed(prevFeed => prevFeed.map(news => {
      if (news.id === articleId) {
        let newScore = news.score;
        let newReal = news.realVotes || 0;
        let newFake = news.fakeVotes || 0;
        if (previousVote === 'vote_real') { newReal = Math.max(0, newReal - 1); newScore -= 2; } 
        else if (previousVote === 'vote_fake') { newFake = Math.max(0, newFake - 1); newScore += 5; }

        if (voteType === 'vote_real') { newReal += 1; newScore = Math.min(100, newScore + 2); } 
        else if (voteType === 'vote_fake') { newFake += 1; newScore = Math.max(0, newScore - 5); }
        return { ...news, score: newScore, realVotes: newReal, fakeVotes: newFake };
      }
      return news;
    }));
    setLocalVotes(prev => ({ ...prev, [articleId]: voteType }));
    try {
      await fetch('https://kagojerstup.onrender.com/api/vote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUser.userId, articleId, voteType })
      });
    } catch (error) { console.error("Voting failed:", error); }
  };

  const handleArticleClick = async (articleId) => {
    if (!currentUser) return; 
    try {
      fetch('https://kagojerstup.onrender.com/api/track-activity', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.userId, articleId: articleId, activityType: 'click' })
      });
    } catch (error) { console.error("Failed to track click:", error); }
  };

  const handleLiveLocation = () => {
    setIsLocating(true);
    
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setUserLocation({ lat, lng: lon });

        const alertRes = await fetch('https://kagojerstup.onrender.com/api/check-crisis-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng: lon })
        });
        const alertData = await alertRes.json();
        if (alertData.inDangerZone) {
          setLocalCrisisAlert(alertData.alert);
        } else {
          setLocalCrisisAlert(null); 
        }
        
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
        const data = await response.json();
        const city = data.city || data.locality || "Dhaka"; 
        
        const validRegions = ["Dhaka", "Chattogram", "Sylhet", "Sunamganj", "Narsingdi", "Narayanganj", "Banani", "Mirpur", "Cox's Bazar", "Netrokona", "Gaibandha", "Keraniganj"];
        
        if (validRegions.includes(city)) {
          setActiveRegion(city);
        } else {
          setActiveRegion("Dhaka");
        }
      } catch (error) {
        console.error("Location error:", error);
        alert("Failed to determine location.");
      } finally {
        setIsLocating(false);
      }
    }, (error) => {
      alert("Please allow location permissions in your browser.");
      setIsLocating(false);
    });
  };

  const handleFollowToggle = async (sourceName) => {
    if (!currentUser) { setAuthMode("login"); setIsAuthModalOpen(true); return; }
    const isCurrentlyFollowing = followedSources.includes(sourceName);
    if (isCurrentlyFollowing) { setFollowedSources(prev => prev.filter(s => s !== sourceName)); } 
    else { setFollowedSources(prev => [...prev, sourceName]); }

    try {
      await fetch('https://kagojerstup.onrender.com/api/follow-source', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUser.userId, sourceName })
      });
    } catch (error) {
      if (isCurrentlyFollowing) { setFollowedSources(prev => [...prev, sourceName]); } 
      else { setFollowedSources(prev => prev.filter(s => s !== sourceName)); }
    }
  };

  const toggleSummary = (articleId) => {
    setExpandedSummaries(prev => ({ ...prev, [articleId]: !prev[articleId] }));
  };

  const uniqueCategories = ["All", ...new Set(newsFeed.map(item => item.category).filter(Boolean))];
  const uniqueSources = ["All", ...new Set(newsFeed.flatMap(item => item.sources).filter(Boolean))];

  // --- NEW: Updated Filtering Logic ---
  const filteredFeed = newsFeed.filter(news => {
    const matchCategory = activeCategory === 'All' || news.category === activeCategory;
    const matchSource = activeSource === 'All' || news.sources.includes(activeSource);
    
    // Check if the search query matches the title or the summary
    const query = searchQuery.toLowerCase();
    const matchSearch = searchQuery === "" || 
      (news.title && news.title.toLowerCase().includes(query)) || 
      (news.summary && news.summary.toLowerCase().includes(query));
      
    return matchCategory && matchSource && matchSearch;
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');
        body { font-family: 'Plus Jakarta Sans', 'Hind Siliguri', sans-serif; }
      `}} />

      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] selection:bg-blue-200 selection:text-blue-900">
        
        {/* ACTIVE CRISIS ALERT BANNER */}
        {localCrisisAlert && (
          <div className="bg-red-600 text-white w-full py-4 px-4 shadow-xl flex justify-between items-center z-[60] sticky top-0 animate-pulse border-b-4 border-red-800">
            <div className="max-w-7xl mx-auto flex items-center gap-4 w-full">
              <div className="bg-white rounded-full p-2">
                <AlertTriangleIcon className="w-6 h-6 flex-shrink-0 text-red-600" />
              </div>
              <div>
                <span className="font-extrabold uppercase tracking-widest text-red-100 text-xs block mb-1">
                  IMMEDIATE DANGER DETECTED NEAR YOUR LOCATION
                </span>
                <span className="font-bold text-lg sm:text-xl">
                  {localCrisisAlert.title}
                </span>
              </div>
            </div>
            <button onClick={() => setLocalCrisisAlert(null)} className="text-red-200 hover:text-white ml-4 font-bold text-xl px-2">✕</button>
          </div>
        )}

        {/* Passive Region Alert Banner */}
        {activeAlert && !localCrisisAlert && (
          <div className="bg-orange-500 text-white w-full py-2 px-4 shadow-md flex justify-between items-center z-50">
            <div className="max-w-7xl mx-auto flex items-center gap-3 w-full">
              <AlertTriangleIcon className="w-5 h-5 flex-shrink-0 text-orange-100" />
              <div>
                <span className="font-bold text-sm">
                  Alert for {activeAlert.region}: {activeAlert.title}
                </span>
              </div>
            </div>
            <button onClick={() => setActiveAlert(null)} className="text-white hover:text-orange-200 ml-4">✕</button>
          </div>
        )}

        {/* Navigation */}
        <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-[#E2E8F0] pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div 
                className="flex items-center gap-2 cursor-pointer group" 
                onClick={() => window.location.reload()}
              >
                <div className="w-8 h-8 rounded bg-[#2563EB] text-white flex items-center justify-center font-bold text-lg group-hover:bg-blue-700 transition-colors">ক</div>
                <span className="font-bold text-xl tracking-tight group-hover:text-[#2563EB] transition-colors">কাগজের স্তূপ</span>
              </div>
              <div className="hidden md:flex space-x-8">
                <a href="#" className="text-[#0F172A] font-medium hover:text-[#2563EB]">Home</a>
                <a href="#live-feed" className="text-[#64748B] font-medium hover:text-[#2563EB]">Live Feed</a>
                <a href="#crisis-map" className="text-red-600 font-bold hover:text-red-700 flex items-center gap-1"><AlertTriangleIcon className="w-4 h-4"/> Crisis Map</a>
              </div>
              <div className="flex items-center gap-4">
                {currentUser ? (
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-[#0F172A]">Hi, {currentUser.name.split(' ')[0]}</span>
                    <button onClick={handleLogout} className="text-[#64748B] hover:text-red-600 font-medium transition-colors text-sm">Logout</button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => {setAuthMode("login"); setIsAuthModalOpen(true);}} className="text-[#0F172A] font-medium hover:text-[#2563EB] transition-colors hidden sm:block">Sign In</button>
                    <button onClick={() => {setAuthMode("signup"); setIsAuthModalOpen(true);}} className="bg-[#2563EB] hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-600">Get Started</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <header className="relative pt-20 pb-24 overflow-hidden bg-white">
          <div className="absolute inset-0 bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              
              <div className="w-full lg:w-1/2 space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-medium text-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  Live Region-Based Sync
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0F172A] leading-[1.1]">
                  The news that matters, <br className="hidden sm:block"/>
                  <span className="text-[#2563EB]">where it matters.</span>
                </h1>
                <p className="text-lg sm:text-xl text-[#64748B] leading-relaxed max-w-xl">
                  Stop scrolling through global noise. Get instantly ranked news based on your location, verified by cross-referencing multiple trusted sources for uncompromised credibility.
                </p>
                
                {/* Location Input & CTAs */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 max-w-lg">
                    <div className="relative flex-grow group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPinIcon className="h-5 w-5 text-[#64748B] group-focus-within:text-[#2563EB] transition-colors" />
                      </div>
                      <select 
                        value={activeRegion}
                        onChange={(e) => setActiveRegion(e.target.value)}
                        className="block w-full pl-10 pr-12 py-3 border border-[#E2E8F0] rounded-lg leading-5 bg-[#F8FAFC] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] focus:bg-white transition-all sm:text-sm font-medium appearance-none cursor-pointer"
                        aria-label="Your location"
                      >
                        <option value="All">All Bangladesh</option>
                        <option value="Dhaka">Dhaka</option>
                        <option value="Chattogram">Chattogram</option>
                        <option value="Sylhet">Sylhet</option>
                        <option value="Sunamganj">Sunamganj</option>
                        <option value="Narsingdi">Narsingdi</option>
                        <option value="Narayanganj">Narayanganj</option>
                        <option value="Banani">Banani</option>
                        <option value="Mirpur">Mirpur</option>
                        <option value="Cox's Bazar">Cox's Bazar</option>
                        <option value="Netrokona">Netrokona</option>
                        <option value="Gaibandha">Gaibandha</option>
                        <option value="Keraniganj">Keraniganj</option>
                      </select>
                      <button 
                        onClick={handleLiveLocation}
                        disabled={isLocating}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-100 hover:bg-blue-200 text-blue-700 p-1.5 rounded-md transition-colors"
                        title="Use My Live Location & Enable Danger Alerts"
                      >
                        {isLocating ? '...' : '📍'}
                      </button>
                    </div>
                    <a href="#live-feed" className="flex-shrink-0 bg-[#2563EB] hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md shadow-blue-200 focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 flex justify-center items-center gap-2">
                      <SearchIcon className="w-5 h-5" /> Explore Local News
                    </a>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-medium">
                    <a href="#credibility" className="text-[#64748B] hover:text-[#0F172A] transition-colors flex items-center gap-1">
                      <ShieldCheckIcon className="w-4 h-4" /> Learn how we score credibility
                    </a>
                  </div>
                </div>
              </div>

              {/* Hero Visual Preview */}
              <div className="w-full lg:w-1/2 relative hidden lg:block">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-100 to-emerald-100 rounded-2xl blur-xl opacity-50"></div>
                <div className="relative bg-white border border-[#E2E8F0] rounded-2xl shadow-xl overflow-hidden p-6 hover:shadow-2xl transition-shadow duration-500">
                  <div className="flex justify-between items-start mb-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider">
                      <MapPinIcon className="w-3 h-3" /> Near You
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-bold">
                      <ShieldCheckIcon className="w-4 h-4" /> 94% Credibility
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#0F172A] mb-2 leading-tight">
                    Dhaka Metro Rail Line 6 Extends Operating Hours
                  </h3>
                  <p className="text-[#64748B] mb-6 line-clamp-2">
                    Authorities announce extended night operations for Line 6 starting next month to accommodate growing commuter demand in the capital, following multiple successful trials.
                  </p>
                  <div className="pt-4 border-t border-[#E2E8F0] flex justify-between items-center">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-600">DS</div>
                      <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-700">DT</div>
                    </div>
                    <span className="text-xs font-semibold text-[#64748B] flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5" /> Just updated
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </header>

        {/* Feature 3: Live News Preview */}
        <section id="live-feed" className="py-20 bg-[#F8FAFC] border-t border-[#E2E8F0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-10 gap-6">
              <div>
                <h2 className="text-2xl font-extrabold text-[#0F172A] mb-2">Live News Stream</h2>
                <p className="text-[#64748B]">Ranked for: <strong className="text-[#0F172A]">{activeRegion === 'All' ? 'Bangladesh (National)' : activeRegion}</strong></p>
              </div>
              
              {/* Filter & Search Dropdowns */}
              <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                
                {/* NEW: Keyword Search Input */}
                <div className="relative flex-grow md:flex-grow-0 w-full md:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] shadow-sm transition-colors"
                  />
                </div>

                <select 
                  value={activeCategory}
                  onChange={(e) => setActiveCategory(e.target.value)}
                  className="flex-1 lg:flex-none px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] cursor-pointer shadow-sm"
                >
                  {uniqueCategories.map(category => (
                    <option key={category} value={category}>{category === 'All' ? 'All Categories' : category}</option>
                  ))}
                </select>

                <select 
                  value={activeSource}
                  onChange={(e) => setActiveSource(e.target.value)}
                  className="flex-1 lg:flex-none px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-sm font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] cursor-pointer shadow-sm"
                >
                  {uniqueSources.map(source => (
                    <option key={source} value={source}>{source === 'All' ? 'All Portals' : source}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {isLoading ? (
                <div className="col-span-full py-12 flex justify-center items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
                </div>
              ) : filteredFeed.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white border border-[#E2E8F0] rounded-xl">
                  <p className="text-[#64748B] text-lg font-medium">No articles found matching your filters for {activeRegion}.</p>
                  {(activeCategory !== 'All' || activeSource !== 'All' || searchQuery !== "") && (
                    <button 
                      onClick={() => {
                        setActiveCategory('All'); 
                        setActiveSource('All');
                        setSearchQuery(""); // Clear search as well
                      }} 
                      className="mt-4 text-[#2563EB] font-semibold hover:underline focus:outline-none"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                filteredFeed.map((news) => (
                  <article key={news.id} className="bg-white border border-[#E2E8F0] rounded-xl p-6 hover:border-[#2563EB] hover:shadow-lg transition-all flex flex-col justify-between h-fit">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-2 items-center flex-wrap">
                          <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">{news.category}</span>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-md border flex items-center gap-1 bg-transparent text-slate-500 border-dashed border-slate-300">
                            <MapPinIcon className="w-3 h-3" /> {news.region}
                          </span>
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md border transition-colors
                          ${news.score >= 80 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 
                            news.score >= 50 ? 'bg-blue-50 text-blue-800 border-blue-200' : 
                            'bg-red-50 text-red-800 border-red-200'}`}>
                          <ShieldCheckIcon className="w-3.5 h-3.5" /> {news.score}% Trust Score
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-[#0F172A] mb-3 hover:text-[#2563EB] transition-colors leading-snug">
                        <a href={news.url || "#"} target="_blank" rel="noopener noreferrer" onClick={() => handleArticleClick(news.id)}>
                          {news.title}
                        </a>
                      </h3>
                      
                      <div className="mb-5 relative z-10">
                        <p className={`text-sm text-[#64748B] leading-relaxed transition-all duration-300 ${expandedSummaries[news.id] ? '' : 'line-clamp-2'}`}>
                          {news.summary}
                        </p>
                        {news.summary && news.summary.length > 100 && (
                          <button 
                            onClick={(e) => { e.preventDefault(); toggleSummary(news.id); }}
                            className="mt-2 text-xs font-bold text-[#2563EB] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>✨</span> {expandedSummaries[news.id] ? 'Hide Summary' : 'Read AI Summary'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className="text-xs text-slate-500 font-medium">Sources:</span>
                        {news.sources.map((source, idx) => {
                          const isFollowed = followedSources.includes(source);
                          return (
                            <div key={idx} className="flex items-center bg-slate-100 rounded overflow-hidden shadow-sm relative z-10">
                              <button 
                                onClick={() => setActiveSource(source)}
                                className="text-xs font-semibold text-[#0F172A] hover:bg-blue-100 hover:text-blue-700 px-2 py-1 transition-colors"
                              >
                                {source}
                              </button>
                              <button
                                onClick={() => handleFollowToggle(source)}
                                className={`px-2 py-1 text-xs border-l border-white transition-colors cursor-pointer 
                                  ${isFollowed ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-slate-200 text-slate-400 hover:bg-slate-300 hover:text-slate-600'}`}
                              >
                                ★
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="pt-4 border-t border-slate-100 flex flex-col xl:flex-row justify-between xl:items-center gap-4 relative z-10">
                        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium whitespace-nowrap">
                          <ClockIcon className="w-3.5 h-3.5" /> {formatDateTime(news.time)}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 font-medium mr-1">Verify:</span>
                          <button 
                            onClick={(e) => { e.preventDefault(); handleVote(news.id, 'vote_real'); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold cursor-pointer border ${localVotes[news.id] === 'vote_real' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                          >
                            <ThumbsUpIcon className="w-4 h-4" /> Real 
                          </button>
                          <button 
                            onClick={(e) => { e.preventDefault(); handleVote(news.id, 'vote_fake'); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold cursor-pointer border ${localVotes[news.id] === 'vote_fake' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                          >
                            <ThumbsDownIcon className="w-4 h-4" /> Fake 
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        {/* NEW CRISIS MAP SECTION */}
        <section id="crisis-map" className="py-20 bg-white border-t border-[#E2E8F0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangleIcon className="w-6 h-6 text-red-600" />
                  <h2 className="text-3xl font-extrabold text-[#0F172A]">Live Crisis Map</h2>
                </div>
                <p className="text-[#64748B]">Click on a <strong className="text-blue-600">blue pin</strong> to see breaking news, or a <strong className="text-red-600">red pin</strong> for active crises.</p>
              </div>
            </div>

            {/* Split View: Map (Left) and Sidebar (Right) */}
            <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[600px] w-full">
              
              {/* The Interactive Map */}
              <div className="w-full lg:w-2/3 h-[400px] lg:h-full rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-md relative z-10 bg-slate-100">
                <MapContainer 
                  center={[23.6850, 90.3563]} 
                  zoom={7} 
                  scrollWheelZoom={true} // Enabled scroll zooming
                  style={{ height: "100%", width: "100%", zIndex: 1 }}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {/* Draw standard breaking news (Blue Pins) */}
                  {mapNews.map((regionData) => (
                    <Marker 
                      key={regionData.region} 
                      position={[regionData.lat, regionData.lng]} 
                      icon={newsIcon}
                      eventHandlers={{
                        click: () => {
                          setSelectedRegionForSidebar(regionData);
                        },
                      }}
                    >
>>>>>>> 75280cb1906eabf107b6f8afb1e9362567bf645a
                      <Popup>
                        <div className="p-1 min-w-[200px]">
                          <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                            {crisis.crisis_type}
                          </span>
                          <h4 className="font-bold text-sm mt-2 mb-1 leading-tight">{crisis.title}</h4>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{crisis.summary}</p>
                        </div>
                      </Popup>
                    </Marker>
                    
                    {/* Draw the danger radius (convert km to meters) */}
                    <Circle 
                      center={[crisis.latitude, crisis.longitude]} 
                      radius={crisis.radius_km * 1000} 
                      pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.1, weight: 1 }}
                    />
                  </React.Fragment>
                ))}

<<<<<<< HEAD
                {/* Draw the user's location if known */}
                {userLocation && (
                  <Marker position={[userLocation.lat, userLocation.lng]}>
                    <Popup>Your Location</Popup>
                  </Marker>
=======
                  {/* Draw active crises (Red Pins & Radius) */}
                  {mapCrises.map((crisis) => (
                    <React.Fragment key={crisis.crisis_id}>
                      <Marker position={[crisis.latitude, crisis.longitude]} icon={crisisIcon}>
                        <Popup>
                          <div className="p-1 min-w-[200px]">
                            <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                              CRISIS: {crisis.crisis_type}
                            </span>
                            <h4 className="font-bold text-sm mt-2 mb-1 leading-tight">{crisis.title}</h4>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{crisis.summary}</p>
                          </div>
                        </Popup>
                      </Marker>
                      <Circle 
                        center={[crisis.latitude, crisis.longitude]} 
                        radius={crisis.radius_km * 1000} 
                        pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.1, weight: 1 }}
                      />
                    </React.Fragment>
                  ))}

                  {/* Draw user's live location if known */}
                  {userLocation && (
                    <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
                      <Popup>
                        <div className="p-1 text-center">
                          <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                            You are here
                          </span>
                          <h4 className="font-bold text-sm mt-2 mb-1">Your Live Location</h4>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>

              {/* The Dynamic Sidebar */}
              <div className="w-full lg:w-1/3 h-[500px] lg:h-full bg-slate-50 border border-[#E2E8F0] rounded-2xl p-4 overflow-y-auto map-sidebar shadow-inner flex flex-col">
                {selectedRegionForSidebar ? (
                  <>
                    <div className="sticky top-0 bg-slate-50 pb-4 border-b border-slate-200 mb-4 z-10 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Viewing News For</span>
                        <h3 className="text-xl font-extrabold text-[#2563EB] flex items-center gap-1.5 mt-1">
                          <MapPinIcon className="w-5 h-5" /> {selectedRegionForSidebar.region}
                        </h3>
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">
                        {selectedRegionForSidebar.articles.length} updates
                      </span>
                    </div>

                    <div className="space-y-4 flex-grow">
                      {selectedRegionForSidebar.articles.map(article => (
                        <div key={article.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              {article.category}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400">
                              {formatDateTime(article.published_at)}
                            </span>
                          </div>
                          
                          <a href={article.url} target="_blank" rel="noopener noreferrer" className="block group">
                            <h4 className="font-bold text-[#0F172A] text-sm leading-snug mb-2 group-hover:text-[#2563EB] transition-colors line-clamp-3">
                              {article.title}
                            </h4>
                          </a>
                          
                          <p className="text-xs text-[#64748B] line-clamp-2 mb-3">
                            {article.summary}
                          </p>
                          
                          <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-xs font-semibold text-slate-500">Source: <span className="text-slate-700">{article.source}</span></span>
                            <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-[#2563EB] hover:underline">
                              Read Full ↗
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center text-center px-6 opacity-50">
                    <MapPinIcon className="w-16 h-16 text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-500">No Region Selected</h3>
                    <p className="text-sm text-slate-400 mt-2">Click on any blue pin on the map to explore breaking news from that specific area.</p>
                  </div>
>>>>>>> 75280cb1906eabf107b6f8afb1e9362567bf645a
                )}
              </MapContainer>
            </div>
          </div>
        </section>

        {/* Feature 1: Region-Based News Ranking */}
        <section id="geo-ranking" className="py-20 bg-slate-50 border-t border-[#E2E8F0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-extrabold tracking-tight text-[#0F172A] sm:text-4xl mb-4">
                Your world, centered around you.
              </h2>
              <p className="text-lg text-[#64748B]">
                Our engine detects your geographical context and ranks database entities accordingly. You see critical local updates first, followed by national and international events.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-blue-200 via-slate-200 to-slate-200 -z-10 transform -translate-y-1/2"></div>
              {/* Card 1: High Priority */}
              <article className="bg-white rounded-2xl shadow-sm border border-[#2563EB] p-6 relative transform transition-transform hover:-translate-y-1 hover:shadow-md">
                <div className="absolute -top-4 left-6 bg-[#2563EB] text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                  <MapPinIcon className="w-3 h-3" /> Priority 1: Local
                </div>
                <div className="mt-4 mb-2 flex items-center gap-2 text-sm text-[#64748B]">
                  <span className="font-semibold text-[#0F172A]">Dhaka</span> • 2km away
                </div>
                <h3 className="text-xl font-bold text-[#0F172A] mb-2">Water logging alert in Dhanmondi</h3>
                <p className="text-sm text-[#64748B]">Heavy rainfall has caused severe water logging. Avoid Road 27 if possible.</p>
              </article>
              {/* Card 2: Medium Priority */}
              <article className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 relative transform transition-transform hover:-translate-y-1 hover:shadow-md opacity-95">
                <div className="absolute -top-4 left-6 bg-slate-700 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">Priority 2: National</div>
                <div className="mt-4 mb-2 flex items-center gap-2 text-sm text-[#64748B]">
                  <span className="font-semibold text-[#0F172A]">Bangladesh</span> • Regional
                </div>
                <h3 className="text-xl font-bold text-[#0F172A] mb-2">New Taxation Policy Announced</h3>
                <p className="text-sm text-[#64748B]">The NBR has updated the fiscal year tax brackets for individual taxpayers.</p>
              </article>
              {/* Card 3: Low Priority */}
              <article className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 relative transform transition-transform hover:-translate-y-1 hover:shadow-md opacity-75">
                <div className="absolute -top-4 left-6 bg-slate-300 text-slate-700 text-xs font-bold px-3 py-1 rounded-full shadow-sm">Priority 3: Global</div>
                <div className="mt-4 mb-2 flex items-center gap-2 text-sm text-[#64748B]">
                  <span className="font-semibold text-[#0F172A]">International</span> • Global
                </div>
                <h3 className="text-xl font-bold text-[#0F172A] mb-2">European Markets Close Higher</h3>
                <p className="text-sm text-[#64748B]">Tech stocks rally late in the day leading to a positive close across European indices.</p>
              </article>
            </div>
          </div>
        </section>

        {/* Feature 2: Source Credibility Scoring */}
        <section id="credibility" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="w-full lg:w-1/2 order-2 lg:order-1">
                {/* Visual DB Node Representation */}
                <div className="bg-slate-50 rounded-2xl p-8 border border-[#E2E8F0] relative flex justify-center items-center min-h-[350px]">
                  <div className="absolute z-10 bg-white border-2 border-[#2563EB] rounded-xl p-4 shadow-lg w-48 text-center text-sm font-bold text-[#0F172A]">
                    Event Entity: <br/> Election Results
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs border border-emerald-200">
                      Score: 92%
                    </div>
                  </div>
                  {/* Source Nodes */}
                  <div className="absolute top-8 left-8 bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-sm flex items-center gap-2 z-20">
                     <div className="w-6 h-6 rounded bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">B</div>
                     <span className="text-xs font-semibold">BBC News</span>
                  </div>
                  <div className="absolute top-8 right-8 bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-sm flex items-center gap-2 z-20">
                     <div className="w-6 h-6 rounded bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">R</div>
                     <span className="text-xs font-semibold">Reuters</span>
                  </div>
                  <div className="absolute bottom-8 right-16 bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-sm flex items-center gap-2 z-20">
                     <div className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">A</div>
                     <span className="text-xs font-semibold">Al Jazeera</span>
                  </div>
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <line x1="20%" y1="20%" x2="40%" y2="40%" stroke="#10B981" strokeWidth="2" strokeDasharray="4 4" />
                    <line x1="80%" y1="20%" x2="60%" y2="40%" stroke="#10B981" strokeWidth="2" strokeDasharray="4 4" />
                    <line x1="75%" y1="80%" x2="55%" y2="60%" stroke="#10B981" strokeWidth="2" strokeDasharray="4 4" />
                  </svg>
                </div>
              </div>

              <div className="w-full lg:w-1/2 space-y-6 order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold text-sm uppercase tracking-wide">
                  <ShieldCheckIcon className="w-4 h-4" /> Database-Verified Trust
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-[#0F172A] sm:text-4xl">
                  Truth through consensus.
                </h2>
                <p className="text-lg text-[#64748B]">
                  In an era of misinformation, single-source news isn't enough. Our backend algorithms map news articles to specific events and calculate a dynamic credibility score based on the weight and volume of trusted sources reporting it.
                </p>
                
                <ul className="space-y-4 mt-6">
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-[#0F172A]">High Credibility ({'>'}80%)</p>
                      <p className="text-sm text-[#64748B]">Event verified by multiple established global and national sources.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-[#0F172A]">Low Credibility ({'<'}50%)</p>
                      <p className="text-sm text-[#64748B]">Single-source report from an unverified or historically biased publication.</p>
                    </div>
                  </li>
                </ul>
              </div>

            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#0F172A] py-12 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded bg-[#2563EB] text-white flex items-center justify-center font-bold text-lg">ক</div>
                <span className="font-bold text-xl tracking-tight text-white">কাগজের স্তূপ</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                A Geo-Prioritized Multilingual News Retrieval and Content Management System. Built to surface the truth locally and globally through transparent data practices.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Local News</a></li>
                <li><a href="#credibility" className="hover:text-white transition-colors">Credibility Engine</a></li>
                <li><a href="#crisis-map" className="hover:text-white transition-colors">Crisis Alerts</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Transparency Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-sm text-slate-500 flex flex-col md:flex-row justify-between items-center gap-4">
            <p>&copy; 2026 কাগজের স্তূপ. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </footer>

        {/* Authentication Modal */}
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
              <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
                ✕
              </button>
              <div className="p-8">
                <h2 className="text-2xl font-bold text-[#0F172A] mb-2">{authMode === "login" ? "Sign In required" : "Create an account"}</h2>
                <p className="text-[#64748B] text-sm mb-6">
                  {authMode === "login" ? "You must be logged in to vote on news credibility." : "Join to verify news and get geo-prioritized alerts."}
                </p>
                {authError && <div className={`p-3 mb-4 text-sm rounded-lg ${authError.includes('successful') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{authError}</div>}
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {authMode === "signup" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                      <input type="text" required value={authName} onChange={(e) => setAuthName(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:outline-none" placeholder="John Doe"/>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:outline-none" placeholder="you@example.com"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required 
                        value={authPassword} 
                        onChange={(e) => setAuthPassword(e.target.value)} 
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:outline-none pr-10" 
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-700">
                        {showPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors mt-2">
                    {authMode === "login" ? "Sign In" : "Sign Up"}
                  </button>
                </form>
                <div className="mt-6 text-center text-sm text-slate-600">
                  {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
                  <button onClick={() => {setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError("");}} className="text-[#2563EB] font-bold hover:underline focus:outline-none">
                    {authMode === "login" ? "Sign Up" : "Log In"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<NewsFeed />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}